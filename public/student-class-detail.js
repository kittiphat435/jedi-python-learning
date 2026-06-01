// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDWiPuk0WP9z5_mjDe1FkqeVZ-vcYClyLs",
    authDomain: "python-learning-platform-596e1.firebaseapp.com",
    projectId: "python-learning-platform-596e1",
    storageBucket: "python-learning-platform-596e1.firebasestorage.app",
    messagingSenderId: "5262153531",
    appId: "1:5262153531:web:55f6246093e1780003491e"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

const __docCache = new Map();
const __docInflight = new Map();
async function getDocCached(collectionName, docId, ttlMs = 60000) {
    const key = `${collectionName}/${docId}`;
    const now = Date.now();
    const cached = __docCache.get(key);
    if (cached && (now - cached.fetchedAt) < ttlMs) {
        return cached.value;
    }
    const inflight = __docInflight.get(key);
    if (inflight) {
        return inflight;
    }
    const p = db.collection(collectionName).doc(docId).get().then((snap) => {
        const value = { id: snap.id, exists: snap.exists, data: snap.data() };
        __docCache.set(key, { value, fetchedAt: Date.now() });
        __docInflight.delete(key);
        return value;
    }).catch((err) => {
        __docInflight.delete(key);
        throw err;
    });
    __docInflight.set(key, p);
    return p;
}

function __chunkArray(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) {
        out.push(arr.slice(i, i + size));
    }
    return out;
}

// Auth State Observer
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('User is logged in:', user.email);
        const urlParams = new URLSearchParams(window.location.search);
        const classId = urlParams.get('id');
        const shouldRefresh = urlParams.get('refresh');

        if (classId) {
            checkEnrollment(classId, user.uid);

            // ถ้ามีการ refresh จาก quiz
            if (shouldRefresh) {
                window.history.replaceState({}, '', `student-class-detail.html?id=${classId}`);
                loadStats(classId, user.uid);
            }
        } else {
            alert('ไม่พบรหัสห้องเรียน');
            window.location.href = 'student-dashboard.html';
        }
    } else {
        window.location.href = 'index.html';
    }
});

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchProblem');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchProblems(e.target.value);
        });
    }
});

// ตรวจสอบการลงทะเบียน
async function checkEnrollment(classId, userId) {
    try {
        const enrollmentSnapshot = await db.collection('class_enrollments')
            .where('classId', '==', classId)
            .where('studentId', '==', userId)
            .get();

        if (enrollmentSnapshot.empty) {
            alert('คุณไม่ได้ลงทะเบียนในห้องเรียนนี้');
            window.location.href = 'student-dashboard.html';
            return;
        }

        await Promise.all([
            loadClassDetails(classId),
            loadProblems(classId, userId),
            loadStats(classId, userId),
            initProgressChart(classId, userId)
        ]);

        // เริ่มการอัพเดตอัตโนมัติหลังโหลดข้อมูลเสร็จ
        startStatsUpdate(classId, userId);

    } catch (error) {
        console.error("Error checking enrollment:", error);
        alert('เกิดข้อผิดพลาดในการตรวจสอบการลงทะเบียน');
    }
}
async function loadUserInfo(user, userRole) {
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        const userInfo = document.querySelector('.user-info');

        const profileContent = `
            <div class="profile-container">
                <img src="${user.photoURL || defaultAvatar}" 
                     alt="โปรไฟล์" 
                     class="profile-image"
                     onerror="this.src='${defaultAvatar}'"
                     style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover;">
                <div class="profile-details">
                    <div class="profile-name-container">
                        <span id="displayName">${userData.displayName || (userRole === 'teacher' ? 'อาจารย์' : 'นักเรียน')}</span>
                    </div>
                    <div class="profile-info">
                        <p>อีเมล: ${user.email}</p>
                        <p>โรงเรียน: ${userData.school || 'ไม่ระบุ'}</p>
                        ${userRole === 'teacher' ? `
                            <p>วิชาที่สอน: ${userData.subject || 'ไม่ระบุ'}</p>
                            <p>ระดับชั้นที่สอน: ${userData.teachingLevel || 'ไม่ระบุ'}</p>
                        ` : `
                            <p>ระดับชั้น: ${userData.grade || 'ไม่ระบุ'}</p>
                            <p>อายุ: ${userData.age || 'ไม่ระบุ'} ปี</p>
                        `}
                    </div>
                    <button onclick="editUserProfile()" class="edit-profile-btn">
                        แก้ไขข้อมูลส่วนตัว
                    </button>
                </div>
            </div>
            <button onclick="logout()" class="logout-btn">ออกจากระบบ</button>
        `;

        userInfo.innerHTML = profileContent;
    } catch (error) {
        console.error('Error loading user info:', error);
    }
}
async function editUserProfile() {
    const user = auth.currentUser;
    const userDoc = await db.collection('users').doc(user.uid).get();
    const userData = userDoc.data();

    // สร้าง Modal สำหรับแก้ไขข้อมูล
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';

    const content = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>แก้ไขข้อมูลส่วนตัว</h2>
                <span class="close" onclick="closeEditProfileModal()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="editProfileForm">
                    <div class="form-group">
                        <label>ชื่อ-นามสกุล</label>
                        <input type="text" id="editName" value="${userData.displayName || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>โรงเรียน</label>
                        <input type="text" id="editSchool" value="${userData.school || ''}" required>
                    </div>
                    ${userData.role === 'teacher' ? `
                        <div class="form-group">
                            <label>วิชาที่สอน</label>
                            <input type="text" id="editSubject" value="${userData.subject || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>ระดับชั้นที่สอน</label>
                            <select id="editTeachingLevel" required>
                                <option value="">เลือกระดับชั้น</option>
                                <!-- เพิ่มตัวเลือกระดับชั้น -->
                            </select>
                        </div>
                    ` : `
                        <div class="form-group">
                            <label>ระดับชั้น</label>
                            <select id="editGrade" required>
                                <option value="">เลือกระดับชั้น</option>
                                <!-- เพิ่มตัวเลือกระดับชั้น -->
                            </select>
                        </div>
                        <div class="form-group">
                            <label>อายุ</label>
                            <input type="number" id="editAge" value="${userData.age || ''}" min="6" max="20" required>
                        </div>
                    `}
                    <button type="submit" class="submit-btn">บันทึกข้อมูล</button>
                </form>
            </div>
        </div>
    `;

    modal.innerHTML = content;
    document.body.appendChild(modal);

    // เพิ่ม Event Listener สำหรับการ Submit Form
    document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateUserProfile(userData.role);
    });
}
async function updateUserProfile(role) {
    try {
        const user = auth.currentUser;
        const userData = {
            displayName: document.getElementById('editName').value,
            school: document.getElementById('editSchool').value,
        };

        if (role === 'teacher') {
            userData.subject = document.getElementById('editSubject').value;
            userData.teachingLevel = document.getElementById('editTeachingLevel').value;
        } else {
            userData.grade = document.getElementById('editGrade').value;
            userData.age = parseInt(document.getElementById('editAge').value);
        }

        await db.collection('users').doc(user.uid).update(userData);
        await user.updateProfile({ displayName: userData.displayName });

        alert('อัพเดทข้อมูลสำเร็จ');
        closeEditProfileModal();
        loadUserInfo(user, role);
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('เกิดข้อผิดพลาดในการอัพเดทข้อมูล');
    }
}

function closeEditProfileModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
}

// ตัวแปร default avatar สำหรับใช้เมื่อไม่มีรูป (ใส่ไว้ด้านบนไฟล์เหมือนกัน)
const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23999' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";

async function loadClassDetails(classId) {
    try {
        const classDoc = await getDocCached('classes', classId, 60000);
        if (!classDoc.exists) {
            throw new Error('ไม่พบห้องเรียน');
        }

        const classData = classDoc.data;

        // ดึงข้อมูลครู
        const teacherDoc = await getDocCached('users', classData.teacherId, 60000);
        if (!teacherDoc.exists) {
            throw new Error('ไม่พบข้อมูลครูผู้สอน');
        }

        const teacherData = teacherDoc.data;
        console.log('Teacher data:', teacherData); // เพิ่ม log ดูข้อมูลครู

        // อัพเดท UI
        const classInfoContainer = document.querySelector('.class-info');
        if (classInfoContainer) {
            classInfoContainer.innerHTML = `
                <div class="class-header">
                    <h2 id="className">${classData.name}</h2>
                    <div class="class-code">รหัสห้องเรียน: ${classData.code}</div>
                    <div class="teacher-profile">
                        <img src="${teacherData.photoURL || defaultAvatar}" 
                             alt="อาจารย์ผู้สอน"
                             class="teacher-image">
                        <div class="teacher-info">
                            <div class="teacher-name">
                                อาจารย์ ${teacherData.displayName || 'ไม่ระบุชื่อ'}
                            </div>
                            <div class="teacher-email">${teacherData.email}</div>
                        </div>
                    </div>
                </div>
            `;
        }

    } catch (error) {
        console.error("Error loading class details:", error);
        console.log('Error full details:', error); // เพิ่ม log รายละเอียด error
        alert('ไม่สามารถโหลดข้อมูลห้องเรียนได้ กรุณาลองใหม่อีกครั้ง');
    }
}

// ฟังก์ชัน Gravatar ที่ปรับปรุงแล้ว
function getGravatarUrl(email) {
    if (!email) return 'images/default-avatar.png';
    const hash = md5(email.trim().toLowerCase());
    return `https://gravatar.com/avatar/${hash}?d=identicon&s=200`;
}


// โหลดโจทย์ทั้งหมด
let allProblems = [];

// โหลดโจทย์ทั้งหมด (ฉบับแก้ไข: อ่านสถานะ completed และ timestamp ให้แม่นยำ)
// [student-class-detail.js]

async function loadProblems(classId, userId) {
    const problemList = document.getElementById('problemList');
    try {
        problemList.innerHTML = '<p>กำลังโหลดข้อมูล...</p>';

        // 1. ดึงโจทย์ทั้งหมดในห้องเรียน
        const classProblemSnapshot = await db.collection('class_problems')
            .where('classId', '==', classId)
            .get();

        if (classProblemSnapshot.empty) {
            problemList.innerHTML = '<p>ยังไม่มีโจทย์ในห้องเรียน</p>';
            return;
        }

        // 2. ดึงประวัติการส่งงาน (เหมือนเดิม)
        const submissionsSnapshot = await db.collection('submissions')
            .where('studentId', '==', userId)
            .where('classId', '==', classId)
            .get();

        // 3. สร้าง Map Submission (เหมือนเดิม)
        const submissionStatus = new Map();
        submissionsSnapshot.forEach(doc => {
           // ... (ใช้ Logic เดิมในการ map submission) ...
           // Copy Logic เดิมจากไฟล์ student-class-detail.js ของคุณมาใส่ตรงนี้ได้เลย
           // (ส่วนที่เช็ค timestamp และ completed status)
             const data = doc.data();
             const submissionTime = data.timestamp || data.submittedAt;
             const timeValue = submissionTime ? submissionTime.toDate().getTime() : 0;
             const existing = submissionStatus.get(data.problemId);
             if (!existing) {
                 submissionStatus.set(data.problemId, { ...data, sortTime: timeValue });
             } else {
                 const isNewCompleted = data.status === 'completed';
                 const isOldCompleted = existing.status === 'completed';
                 if (isNewCompleted && !isOldCompleted) {
                     submissionStatus.set(data.problemId, { ...data, sortTime: timeValue });
                 } else if (isNewCompleted === isOldCompleted) {
                     if (timeValue > existing.sortTime) {
                         submissionStatus.set(data.problemId, { ...data, sortTime: timeValue });
                     }
                 }
             }
        });

        // 4. วนลูปสร้างรายการโจทย์
        const problemPromises = classProblemSnapshot.docs.map(async (doc) => {
            const relationData = doc.data(); // ข้อมูลจาก class_problems (มี orderIndex)
            const problemDataId = relationData.problemId;
            let problemDoc;
            
            try {
                problemDoc = await getDocCached('problems', problemDataId, 60000);
            } catch (e) {
                return null;
            }

            if (!problemDoc.exists) return null;

            const submission = submissionStatus.get(problemDoc.id);

            let status = 'pending';
            let score = 0;
            let maxScore = 0;

            if (submission) {
                status = submission.status || 'pending';
                score = submission.score || 0;
                maxScore = submission.maxScore || 0;
            }

            return {
                id: problemDoc.id,
                ...problemDoc.data,
                classId: classId,
                status: status,
                score: score,
                maxScore: maxScore,
                // สำคัญ: เก็บ orderIndex ไว้ใช้ sort
                orderIndex: relationData.orderIndex || 0,
                addedAt: relationData.addedAt 
            };
        });

        // รอโหลดข้อมูลครบ
        let problemsData = (await Promise.all(problemPromises))
            .filter(p => p !== null);

        // 5. เรียงลำดับ (เหมือนฝั่งครู)
        problemsData.sort((a, b) => {
            if (a.orderIndex !== b.orderIndex) {
                return a.orderIndex - b.orderIndex;
            }
            // Fallback
            const timeA = a.addedAt ? a.addedAt.seconds : 0;
            const timeB = b.addedAt ? b.addedAt.seconds : 0;
            return timeA - timeB;
        });
        
        allProblems = problemsData;
        
        // แสดงผล
        displayProblems(allProblems);

    } catch (error) {
        console.error("Error loading problems:", error);
        problemList.innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดโจทย์</p>';
    }
}

// ใน student-class-detail.js
function displayProblems(problems) {
    const problemList = document.getElementById('problemList');
    problemList.innerHTML = '';

    problems.forEach(problem => {
        const div = document.createElement('div');
        div.className = 'problem-card';

        let statusText, buttonText, isViewMode;
        if (problem.status === 'completed') {
            statusText = '✅ ทำเสร็จแล้ว';
            buttonText = 'ดูผลลัพธ์';
            isViewMode = true;
        } else if (problem.status === 'inProgress') {
            statusText = '⚠️ ยังทำไม่เสร็จ';
            buttonText = 'ทำโจทย์ต่อ';
            isViewMode = false;
        } else {
            statusText = '❌ ยังไม่ได้ทำ';
            buttonText = 'เริ่มทำโจทย์';
            isViewMode = false;
        }

        // แก้ไขส่วนกำหนดไอคอนและข้อความตามประเภทโจทย์
        let typeIcon, typeText;
        switch (problem.type) {
            case 'python':
                typeIcon = '💻';
                typeText = 'โจทย์เขียนโปรแกรม';
                break;
            case 'comprehension':
                typeIcon = '📝';
                typeText = 'คำถามความเข้าใจ';
                break;
            case 'matching':
                typeIcon = '🔄';
                typeText = 'จับคู่';
                break;
            case 'flowchart':
                typeIcon = '📊';
                typeText = 'ผังงาน';
                break;
            case 'gui':
                typeIcon = '🪟';
                typeText = 'โจทย์สร้าง GUI';
                break;
            default:
                typeIcon = '❓';
                typeText = 'ไม่ระบุประเภท';
        }

        // แก้ไขส่วนเลือกเนื้อหาที่จะแสดง
        let contentToShow;
        if (problem.type === 'python' || problem.type === 'gui') {
            contentToShow = problem.description || 'ไม่มีคำอธิบาย';
        } else if (problem.type === 'comprehension') {
            contentToShow = problem.content || problem.passage || 'ไม่มีคำอธิบาย';
        } else if (problem.type === 'matching') {
            contentToShow = problem.description || 'ไม่มีคำอธิบาย';
        } else if (problem.type === 'flowchart') {
            contentToShow = problem.description || 'ไม่มีคำอธิบาย';
        }

        div.innerHTML = `
            <div class="problem-info">
                <div class="problem-header">
                    <span class="problem-type">${typeIcon} ${typeText}</span>
                    <span class="status-badge status-${problem.status}">${statusText}</span>
                </div>
                <h3>${problem.title}</h3>
                <p>${contentToShow}</p>
            </div>
            <button onclick="viewProblem('${problem.id}', '${problem.type}', ${isViewMode})" class="primary-btn">
                ${buttonText}
            </button>
        `;

        problemList.appendChild(div);
    });
}


// ค้นหาโจทย์
function searchProblems(searchText) {
    if (!searchText) {
        displayProblems(allProblems);
        return;
    }

    const searchLower = searchText.toLowerCase();
    const filteredProblems = allProblems.filter(problem =>
        problem.title.toLowerCase().includes(searchLower) ||
        problem.description.toLowerCase().includes(searchLower)
    );

    displayProblems(filteredProblems);
}

// โหลดสถิติ
// ใน student-class-detail.js
// ใน student-class-detail.js
async function loadStats(classId, userId) {
    try {
        const classProblemsSnapshot = await db.collection('class_problems')
            .where('classId', '==', classId)
            .get();

        const uniqueProblemIds = new Set();
        classProblemsSnapshot.forEach(doc => uniqueProblemIds.add(doc.data().problemId));
        const totalProblems = uniqueProblemIds.size;

        const submissionsSnapshot = await db.collection('submissions')
            .where('classId', '==', classId)
            .where('studentId', '==', userId)
            .get();

        const latestSubmissions = new Map();
        
        submissionsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            
            // ✅ แก้ไข: เช็คว่ามี timestamp หรือ submittedAt (อันไหนก็ได้)
            const submissionTime = data.timestamp || data.submittedAt;
            
            // ถ้าไม่มีเวลา ให้ข้ามไป (ป้องกัน Error)
            if (!submissionTime) return;

            const existing = latestSubmissions.get(data.problemId);
            
            // เปรียบเทียบเวลา
            if (!existing || submissionTime.toDate() > existing.timestamp.toDate()) {
                latestSubmissions.set(data.problemId, {
                    status: data.status,
                    score: data.score || 0,
                    maxScore: data.maxScore || 0,
                    timestamp: submissionTime, // เก็บไว้ใช้เทียบ
                    problemId: data.problemId,
                    type: data.type
                });
            }
        });

        let totalScore = 0;
        let totalMaxScore = 0;
        let completedProblems = 0;

        const problemIds = Array.from(uniqueProblemIds);
        const batches = __chunkArray(problemIds, 25);
        const problemDocs = [];
        for (const batch of batches) {
            const docs = await Promise.all(batch.map((id) => getDocCached('problems', id, 60000)));
            problemDocs.push(...docs);
        }

        for (let i = 0; i < problemDocs.length; i++) {
            const problemDoc = problemDocs[i];
            if (!problemDoc?.exists) continue;
            const problemId = problemDoc.id;
            const problemData = problemDoc.data;
            let maxScore = 0;

            if (problemData.type === 'flowchart') {
                maxScore = problemData.maxScore || 10;
            } else if (problemData.type === 'python' && problemData.testCases) {
                maxScore = problemData.testCases.reduce((sum, test) => sum + (test.score || 1), 0);
            } else if (problemData.type === 'comprehension' && problemData.questions) {
                maxScore = problemData.questions.reduce((sum, q) => sum + (q.score || 1), 0);
            } else if (problemData.type === 'matching' && problemData.pairs) {
                maxScore = problemData.pairs.reduce((sum, pair) => sum + (parseInt(pair.score) || 1), 0);
            } else if (problemData.type === 'gui') {
                if (problemData.maxScore) {
                    maxScore = problemData.maxScore;
                } else {
                    const wScore = (problemData.widgets || []).reduce((s, w) => s + (w.score || 1), 0);
                    const oScore = (problemData.widgets?.length >= 2) ? 5 : 0;
                    const tScore = (problemData.testCases || []).reduce((s, t) => s + (t.score || 1), 0);
                    maxScore = wScore + oScore + tScore;
                }
            }

            const submission = latestSubmissions.get(problemId);
            if (submission) {
                if (submission.maxScore && problemData.type === 'gui') {
                    maxScore = submission.maxScore;
                }
                if (submission.status === 'completed') {
                    completedProblems++;
                    totalScore += (submission.score > 0 ? submission.score : maxScore);
                }
            }

            totalMaxScore += maxScore;
        }

        const progress = totalProblems > 0 ? Math.round((completedProblems / totalProblems) * 100) : 0;
        const scorePercentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

        document.getElementById('totalProblems').textContent = totalProblems;
        document.getElementById('completedProblems').textContent = completedProblems;
        document.getElementById('problemProgress').textContent = `${progress}%`;
        document.getElementById('totalScore').textContent = `${totalScore}/${totalMaxScore}`;
        document.getElementById('scorePercentage').textContent = `(${scorePercentage}%)`;

    } catch (error) {
        console.error("Error loading stats:", error);
    }
}

// สร้างกราฟแสดงความคืบหน้า
// ใน student-class-detail.js
async function initProgressChart(classId, userId) {
    const ctx = document.getElementById('progressChart');
    if (!ctx) return;

    try {
        const chartInstance = Chart.getChart(ctx);
        if (chartInstance) {
            chartInstance.destroy();
        }

        const submissions = await db.collection('submissions')
            .where('studentId', '==', userId)
            .where('classId', '==', classId)
            .get();

        // ✅ แก้ไข: แปลงข้อมูลก่อนกรองและเรียง (จัดการ timestamp)
        let filteredSubmissions = submissions.docs
            .map(doc => {
                const data = doc.data();
                // Normalise timestamp
                return {
                    ...data,
                    timestamp: data.timestamp || data.submittedAt
                };
            })
            .filter(data => data.timestamp) // กรองเอาเฉพาะที่มีเวลา
            .sort((a, b) => a.timestamp.toDate() - b.timestamp.toDate()); // เรียงตามเวลา

        // สร้างข้อมูลสำหรับกราฟ
        let completedCount = 0;
        const data = filteredSubmissions.map(sub => {
            if (sub.status === 'completed') {
                completedCount++;
            }
            const date = sub.timestamp.toDate();
            return {
                x: date.toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'short'
                }),
                y: completedCount
            };
        });

        if (data.length === 0) {
            const today = new Date();
            data.push({
                x: today.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
                y: 0
            });
        }

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(item => item.x),
                datasets: [{
                    label: 'จำนวนโจทย์ที่ทำสำเร็จ',
                    data: data.map(item => item.y),
                    borderColor: '#1a73e8',
                    backgroundColor: 'rgba(26, 115, 232, 0.1)',
                    fill: true,
                    tension: 0.1,
                    pointRadius: 9,
                    pointHoverRadius: 12,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#1a73e8',
                    pointBorderWidth: 3,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                }
            }
        });

    } catch (error) {
        console.error("Error initializing chart:", error);
    }
}
function viewProblem(problemId, type, isViewMode = false) {
    const urlParams = new URLSearchParams(window.location.search);
    const classId = urlParams.get('id');

    if (!classId) {
        alert('ไม่พบรหัสห้องเรียน');
        return;
    }

    let url;
    // เพิ่มพารามิเตอร์ mode=view เมื่อ isViewMode เป็น true
    const viewModeParam = isViewMode ? '&mode=view' : '';

    switch (type) {
        case 'python':
            url = `student-problem-detail.html?id=${problemId}&classId=${classId}${viewModeParam}`;
            break;
        case 'matching':
            url = `student-matching-detail.html?id=${problemId}&classId=${classId}${viewModeParam}`;
            break;
        case 'flowchart':
            url = `student-flowchart-detail.html?id=${problemId}&classId=${classId}${viewModeParam}`;
            break;
        case 'gui':
            url = `student-gui.html?id=${problemId}&classId=${classId}${viewModeParam}`;
            break;
        default:
            url = `student-quiz-detail.html?id=${problemId}&classId=${classId}${viewModeParam}`;
    }

    window.location.href = url;
}


let statsInterval;
let statsInFlight = false;
let statsRefreshState = null;

function startStatsUpdate(classId, userId) {
    // เคลียร์ interval เดิมถ้ามี
    if (statsInterval) {
        clearInterval(statsInterval);
    }

    const tick = async () => {
        if (document.hidden) return;
        if (statsInFlight) return;
        statsInFlight = true;
        try {
            await loadStats(classId, userId);
        } finally {
            statsInFlight = false;
        }
    };

    statsRefreshState = { classId, userId, tick };
    tick();
    statsInterval = setInterval(tick, 10000);
}

document.addEventListener('visibilitychange', () => {
    if (!statsRefreshState) return;
    if (!document.hidden) {
        statsRefreshState.tick();
    }
});

window.addEventListener('beforeunload', () => {
    if (statsInterval) {
        clearInterval(statsInterval);
    }
});
// Export functions
window.viewProblem = viewProblem;
window.searchProblems = searchProblems;
