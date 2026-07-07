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

// Auth State Observer
auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log('User is logged in:', user.email);
        
        // Auto-patch email if missing
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            const userData = userDoc.exists ? userDoc.data() : null;
            if (userData && !userData.email && user.email) {
                await db.collection('users').doc(user.uid).update({
                    email: user.email,
                    photoURL: user.photoURL || null
                });
            }
        } catch (e) {
            console.error('Error auto-patching user:', e);
        }

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

        // แสดงรูปภาพและชื่อของตนเองดึงจาก Firebase
        const user = auth.currentUser;
        if (user) {
            db.collection('users').doc(userId).get().then(doc => {
                if (doc.exists) {
                    const userData = doc.data();
                    const displayName = userData.displayName || user.displayName || user.email;
                    const photoURL = userData.photoURL || user.photoURL || defaultAvatar;
                    
                    const nameEl = document.getElementById('studentName');
                    if (nameEl) nameEl.textContent = displayName;
                    
                    const picEl = document.getElementById('studentProfilePic');
                    if (picEl) {
                        picEl.src = photoURL;
                        picEl.onerror = function() {
                            this.src = defaultAvatar;
                        };
                    }
                }
            }).catch(err => console.error("Error loading profile details:", err));
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
        const classDoc = await db.collection('classes').doc(classId).get();
        if (!classDoc.exists) {
            throw new Error('ไม่พบห้องเรียน');
        }

        const classData = classDoc.data();

        // ดึงข้อมูลครู
        const teacherDoc = await db.collection('users').doc(classData.teacherId).get();
        if (!teacherDoc.exists) {
            throw new Error('ไม่พบข้อมูลครูผู้สอน');
        }

        const teacherData = teacherDoc.data();
        console.log('Teacher data:', teacherData); // เพิ่ม log ดูข้อมูลครู

        // อัพเดท UI
        const classInfoContainer = document.getElementById('classInfoContainer');
        if (classInfoContainer) {
            classInfoContainer.innerHTML = `
                <div class="class-header" style="display: flex; flex-direction: column; gap: 6px;">
                    <h2 id="className" style="font-size: 22px; font-weight: 700; margin: 0; color: #1e293b;">${classData.name}</h2>
                    <div style="font-size: 13px; color: #64748b;">รหัสห้องเรียน: <span style="font-weight: 600; color: #3b82f6;">${classData.code}</span></div>
                    
                    <div class="teacher-profile" style="display: flex; align-items: center; gap: 12px; padding: 8px 0; margin-top: 5px; border-top: 1px dashed #e2e8f0;">
                        <img src="${teacherData.photoURL || defaultAvatar}" 
                             alt="อาจารย์ผู้สอน"
                             class="teacher-image"
                             style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1.5px solid #e2e8f0; display: block;">
                        <div class="teacher-info" style="display: flex; flex-direction: column;">
                            <div class="teacher-name" style="font-size: 14px; font-weight: 600; color: #334155;">
                                อาจารย์ผู้สอน: ${teacherData.displayName || 'ไม่ระบุชื่อ'}
                            </div>
                            <div class="teacher-email" style="font-size: 12px; color: #64748b;">${teacherData.email}</div>
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
                problemDoc = await db.collection('problems').doc(problemDataId).get();
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
                ...problemDoc.data(),
                classId: classId,
                status: status,
                score: score,
                maxScore: maxScore,
                // สำคัญ: เก็บ orderIndex ไว้ใช้ sort
                orderIndex: relationData.orderIndex || 0,
                addedAt: relationData.addedAt,
                isClosed: relationData.isClosed || false
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
            case 'summary':
                typeIcon = '📋';
                typeText = 'สรุปผลการเรียน';
                break;
            default:
                typeIcon = '❓';
                typeText = 'ไม่ระบุประเภท';
        }

        // แก้ไขส่วนเลือกเนื้อหาที่จะแสดง
        let contentToShow;
        if (problem.type === 'python' || problem.type === 'gui' || problem.type === 'summary') {
            contentToShow = problem.description || 'ไม่มีคำอธิบาย';
        } else if (problem.type === 'comprehension') {
            contentToShow = problem.content || problem.passage || 'ไม่มีคำอธิบาย';
        } else if (problem.type === 'matching') {
            contentToShow = problem.description || 'ไม่มีคำอธิบาย';
        } else if (problem.type === 'flowchart') {
            contentToShow = problem.description || 'ไม่มีคำอธิบาย';
        }

        // ถ้าโจทย์ปิดรับคำตอบแล้ว และยังไม่ได้ทำเสร็จ ให้ disable ปุ่ม
        const isDisabled = problem.isClosed && !isViewMode;
        const finalButtonText = isDisabled ? 'ปิดรับคำตอบแล้ว' : buttonText;

        div.innerHTML = `
            <div class="problem-info">
                <div class="problem-header">
                    <span class="problem-type">${typeIcon} ${typeText}</span>
                    <span class="status-badge status-${problem.status}">${statusText}</span>
                    ${problem.isClosed ? '<span style="color: #e74c3c; font-weight: bold; font-size: 0.9em; margin-left: 10px;">(ปิดรับคำตอบ)</span>' : ''}
                </div>
                <h3>${problem.title}</h3>
                <p>${contentToShow}</p>
            </div>
            <button onclick="viewProblem('${problem.id}', '${problem.type}', ${isViewMode}, ${problem.isClosed || false})" class="primary-btn" ${isDisabled ? 'disabled style="background-color: #ccc; cursor: not-allowed;"' : ''}>
                ${finalButtonText}
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

        for (let problemId of uniqueProblemIds) {
            const problemDoc = await db.collection('problems').doc(problemId).get();
            if (!problemDoc.exists) continue; // กันเหนียว

            const problemData = problemDoc.data();
            let maxScore = 0;

            // กำหนดคะแนนเต็มตามประเภทโจทย์
            if (problemData.type === 'flowchart') {
                maxScore = problemData.maxScore || 10;
            } else if (problemData.type === 'python' && problemData.testCases) {
                maxScore = problemData.testCases.reduce((sum, test) => sum + (test.score || 1), 0);
            } else if (problemData.type === 'comprehension' && problemData.questions) {
                maxScore = problemData.questions.reduce((sum, q) => sum + (q.score || 1), 0);
            } else if (problemData.type === 'matching' && problemData.pairs) {
                // ใส่ parseInt เพื่อป้องกันการเอา string มาต่อกัน
                maxScore = problemData.pairs.reduce((sum, pair) => sum + (parseInt(pair.score) || 1), 0);
            } else if (problemData.type === 'gui') {
                // ✅ อ่านค่า maxScore จาก Database ได้เลย (ไม่ต้องคำนวณ widget+order เองแล้ว)
                // (ใส่ fallback คำนวณเผื่อโจทย์เก่าที่ยังไม่อัปเดต)
                if (problemData.maxScore) {
                    maxScore = problemData.maxScore;
                } else {
                    // Fallback: คำนวณสดสำหรับโจทย์เก่า
                    const wScore = (problemData.widgets || []).reduce((s, w) => s + (w.score || 1), 0);
                    const oScore = (problemData.widgets?.length >= 2) ? 5 : 0;
                    const tScore = (problemData.testCases || []).reduce((s, t) => s + (t.score || 1), 0);
                    maxScore = wScore + oScore + tScore;
                }
            }

            // ตรวจสอบ submission 
            const submission = latestSubmissions.get(problemId);

            if (submission) {
                // ใช้ maxScore จาก submission สำหรับโจทย์ GUI เพื่อป้องกันคะแนนเต็มไม่ตรงกัน (เช่น ส่งเก่าได้ 20 แต่ปัจจุบัน 21)
                if (submission.maxScore && problemData.type === 'gui') {
                    maxScore = submission.maxScore;
                }

                if (submission.status === 'completed') {
                    completedProblems++;
                    // ใช้คะแนนจริงที่ได้ (ถ้ามี) ถ้าไม่มีใช้เต็ม (เผื่อข้อมูลเก่า)
                    totalScore += (submission.score > 0 ? submission.score : maxScore);
                } else if (submission.status === 'inProgress' && submission.score > 0) {
                    // กรณีทำค้างไว้ (Optional: จะนับคะแนนหรือไม่แล้วแต่ Logic)
                    // totalScore += submission.score; 
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

        // คำนวณตั๋วและคะแนน Arcade
        // ดึงข้อมูล boughtTickets, usedTickets และคะแนนเกม จาก class_enrollments ของห้องนี้
        const enrollSnapshot = await db.collection('class_enrollments')
            .where('studentId', '==', userId)
            .where('classId', '==', classId).get();
            
        let enrollmentData = {};
        if (!enrollSnapshot.empty) {
            enrollmentData = enrollSnapshot.docs[0].data();
        }
        
        const boughtTickets = enrollmentData.boughtTickets || 0;
        const usedTickets = enrollmentData.usedTickets || 0;
        
        // คะแนนวิถีเซียน = คะแนนห้องเรียนทั้งหมด - (ตั๋วที่แลกไปแล้ว * 10)
        const arcadePoints = Math.max(0, totalScore - (boughtTickets * 10));
        
        // ตั๋วที่เหลือใช้ได้จริงๆ = ตั๋วที่แลกมา - ตั๋วที่ใช้ไปแล้ว
        const availableTickets = Math.max(0, boughtTickets - usedTickets);
        
        const elArcadePoints = document.getElementById('arcadePoints');
        if (elArcadePoints) elArcadePoints.textContent = `${arcadePoints}`;
        
        const elArcadeTickets = document.getElementById('arcadeTickets');
        if (elArcadeTickets) elArcadeTickets.textContent = `${availableTickets}`;
        
        // โหลด Highscore และรวมคะแนนประจำห้องนี้
        const arcadeHighscores = enrollmentData.arcadeHighscores || {};
        const snakeScore = arcadeHighscores.snake || 0;
        const dinoScore = arcadeHighscores.dino || 0;
        const tetrisScore = arcadeHighscores.tetris || 0;
        
        const totalArcadeScore = snakeScore + dinoScore + tetrisScore;
        
        // อัปเดต UI คะแนนเกมรวม (การ์ดด้านบน)
        const elTotalArcade = document.getElementById('totalArcadeScore');
        if (elTotalArcade) elTotalArcade.textContent = totalArcadeScore;
        
        const elTopSnake = document.getElementById('topSnakeScore');
        if (elTopSnake) elTopSnake.textContent = snakeScore;
        
        const elTopDino = document.getElementById('topDinoScore');
        if (elTopDino) elTopDino.textContent = dinoScore;
        
        const elTopTetris = document.getElementById('topTetrisScore');
        if (elTopTetris) elTopTetris.textContent = tetrisScore;

        // อัปเดต Highscore ในการ์ดเกมแต่ละอัน (ด้านล่าง)
        const elSnakeCard = document.getElementById('snakeHighscore');
        if (elSnakeCard) elSnakeCard.textContent = snakeScore;
        
        const elDinoCard = document.getElementById('dinoHighscore');
        if (elDinoCard) elDinoCard.textContent = dinoScore;
        
        const elTetrisCard = document.getElementById('tetrisHighscore');
        if (elTetrisCard) elTetrisCard.textContent = tetrisScore;

        // อัปเดต Rank ยศของนักเรียนตามเปอร์เซ็นต์ความคืบหน้าการส่งงาน
        updateStudentRank(progress);

    } catch (error) {
        console.error("Error loading stats:", error);
        const elArcadePoints = document.getElementById('arcadePoints');
        if (elArcadePoints) elArcadePoints.textContent = '0';
        const elArcadeTickets = document.getElementById('arcadeTickets');
        if (elArcadeTickets) elArcadeTickets.textContent = '0';
    }
}

// ฟังก์ชันอัปเดตยศความคืบหน้าการส่งงาน (RANK) พร้อมเปลี่ยนสไตล์แบบกรอบใส (Outlined Style)
function updateStudentRank(progress) {
    const badge = document.getElementById('studentRankBadge');
    const card = document.getElementById('studentProfileCard');
    const pic = document.getElementById('studentProfilePic');
    if (!badge || !card || !pic) return;

    let rankName = "คนจรจัด";
    
    // โทนสีตามยศ
    let rankColor = "#dc2626"; // แดง (คนจรจัด)
    let cardShadow = "0 4px 6px rgba(0, 0, 0, 0.02)"; // เงาแบบเดียวกับฝั่งครู
    let cardBorder = "1px solid #e2e8f0"; // กรอบแบบเดียวกับฝั่งครู
    let picBorder = "1.5px solid #e2e8f0"; // กรอบรูปโปรไฟล์แบบเดียวกับฝั่งครู

    // สไตล์ของ Badge
    let badgeBg = "transparent";
    let badgeColor = rankColor;
    let badgeBorderColor = rankColor;

    if (progress >= 100) {
        rankName = "เจไดโปรแกรมมิ่ง 🏆";
        rankColor = "#d97706"; // สีทอง/ส้มเข้ม
        cardShadow = "0 0 15px rgba(245, 158, 11, 0.35), 0 4px 6px rgba(0, 0, 0, 0.02)"; // เรืองแสงสีทองและเงาปกติ
        cardBorder = "1px solid rgba(245, 158, 11, 0.3)";
        picBorder = "1.5px solid #d97706"; // กรอบรูปสีทองสำหรับเจได
        badgeColor = rankColor;
        badgeBorderColor = rankColor;
    } else if (progress >= 80) {
        rankName = "จอมเวทโปรแกรม";
        rankColor = "#059669"; // เขียว
        badgeColor = rankColor;
        badgeBorderColor = rankColor;
    } else if (progress >= 60) {
        rankName = "อัศวินโค้ดดิ้ง";
        rankColor = "#7c3aed"; // ม่วง
        badgeColor = rankColor;
        badgeBorderColor = rankColor;
    } else if (progress >= 40) {
        rankName = "นักผจญภัย";
        rankColor = "#0284c7"; // ฟ้า
        badgeColor = rankColor;
        badgeBorderColor = rankColor;
    } else if (progress >= 20) {
        rankName = "เด็กฝึกหัด";
        rankColor = "#d97706"; // ส้มทองแดง
        badgeColor = rankColor;
        badgeBorderColor = rankColor;
    } else {
        rankName = "คนจรจัด";
        rankColor = "#dc2626"; // แดง
        badgeBg = "#dc2626"; // พื้นแดง
        badgeColor = "#ffffff"; // ตัวหนังสือขาว
        badgeBorderColor = "#dc2626"; // กรอบแดง
    }

    // อัปเดตสไตล์การ์ด (ให้คงสีขาวไว้ ไม่มีกรอบสีเข้ม ใช้เงาแบบเดียวกับฝั่งครูเพื่อความพรีเมียม)
    card.style.background = "#ffffff";
    card.style.border = cardBorder;
    card.style.boxShadow = cardShadow;
    
    // อัปเดตสไตล์รูปโปรไฟล์
    pic.style.border = picBorder;
    
    // อัปเดตสไตล์ Badge (กรอบใส มีขอบและสีตัวหนังสือตามยศ)
    badge.textContent = `ยศ: ${rankName}`;
    badge.style.background = badgeBg;
    badge.style.borderColor = badgeBorderColor;
    badge.style.color = badgeColor;
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
            .get();

        // ✅ แก้ไข: แปลงข้อมูลก่อนกรองและเรียง (จัดการ timestamp)
        let filteredSubmissions = submissions.docs
            .filter(doc => doc.data().classId === classId)
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

        // 1. จัดกลุ่มและสะสมจำนวนข้อที่สำเร็จรายวัน เพื่อไม่ให้จุดข้อมูลทับซ้อนกันหนาแน่นเกินไป
        const dailyProgress = new Map();
        let completedCount = 0;

        filteredSubmissions.forEach(sub => {
            if (sub.status === 'completed') {
                completedCount++;
            }
            const date = sub.timestamp.toDate();
            // จัดรูปแบบคีย์วันที่ เช่น "22 พ.ค."
            const dateStr = date.toLocaleDateString('th-TH', {
                day: 'numeric',
                month: 'short'
            });
            // อัพเดต/บันทึกยอดสะสมของวันนั้นๆ (ทับค่าเดิมในวันเดียวกันด้วยค่าที่ล่าสุดกว่า)
            dailyProgress.set(dateStr, completedCount);
        });

        // แปลง Map กลับเป็น Array
        const data = [];
        dailyProgress.forEach((count, dateStr) => {
            data.push({ x: dateStr, y: count });
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
                    tension: 0.3, // ทำให้เส้นโค้งมนนุ่มนวลขึ้น
                    pointRadius: 4, // ลดขนาดจุดจาก 9 เหลือ 4 ให้ดูสะอาดตา
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#1a73e8',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 1.5,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: {
                            display: false // ซ่อนเส้นตารางแนวตั้งเพื่อลดความรก
                        },
                        ticks: {
                            autoSkip: true, // ข้ามป้ายชื่ออัตโนมัติหากพื้นที่ไม่พอ
                            maxTicksLimit: 7, // จำกัดจำนวนป้ายชื่อบนแกน X สูงสุดไม่เกิน 7 จุด
                            maxRotation: 0, // ไม่เอียงข้อความหากไม่จำเป็น
                            minRotation: 0,
                            font: {
                                family: 'Sarabun',
                                size: 11
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#f1f5f9' // เปลี่ยนสีตารางแนวนอนให้อ่อนลง
                        },
                        ticks: { 
                            stepSize: 1,
                            precision: 0,
                            font: {
                                family: 'Sarabun',
                                size: 11
                            }
                        }
                    }
                },
                plugins: {
                    legend: { 
                        display: false // ซ่อนแถบอธิบายเนื่องจากมีข้อมูลเพียงชุดเดียวและมีหัวข้อชัดเจนแล้ว
                    }
                }
            }
        });

    } catch (error) {
        console.error("Error initializing chart:", error);
    }
}
function viewProblem(problemId, type, isViewMode = false, isClosed = false) {
    const urlParams = new URLSearchParams(window.location.search);
    const classId = urlParams.get('id');

    if (!classId) {
        alert('ไม่พบรหัสห้องเรียน');
        return;
    }

    let url;
    // เพิ่มพารามิเตอร์ mode=view เมื่อ isViewMode เป็น true
    const viewModeParam = isViewMode ? '&mode=view' : '';
    const closedParam = isClosed ? '&closed=true' : '';
    const extraParams = viewModeParam + closedParam;

    switch (type) {
        case 'python':
            url = `student-problem-detail.html?id=${problemId}&classId=${classId}${extraParams}`;
            break;
        case 'matching':
            url = `student-matching-detail.html?id=${problemId}&classId=${classId}${extraParams}`;
            break;
        case 'flowchart':
            url = `student-flowchart-detail.html?id=${problemId}&classId=${classId}${extraParams}`;
            break;
        case 'gui':
            url = `student-gui.html?id=${problemId}&classId=${classId}${extraParams}`;
            break;
        case 'summary':
            url = `student-summary-detail.html?id=${problemId}&classId=${classId}${extraParams}`;
            break;
        case 'iot':
            url = `student-iot-detail.html?id=${problemId}&classId=${classId}${extraParams}`;
            break;
        case 'iot_gui':
            url = `student-iot-gui.html?id=${problemId}&classId=${classId}${extraParams}`;
            break;
        default:
            url = `student-quiz-detail.html?id=${problemId}&classId=${classId}${extraParams}`;
    }

    window.location.href = url;
}


let statsInterval;

async function renderArcadeLeaderboard() {
    const leaderboardContainer = document.getElementById('arcadeLeaderboardList');
    if (!leaderboardContainer) return;

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const classId = urlParams.get('id');
        if (!classId) return;

        const enrollmentsSnapshot = await db.collection('class_enrollments').where('classId', '==', classId).get();
        if (enrollmentsSnapshot.empty) {
            leaderboardContainer.innerHTML = `<div style="text-align: center; color: #64748b; padding: 20px;">ยังไม่มีนักเรียนในห้องนี้</div>`;
            return;
        }

        // สร้าง map ของนักเรียนและคะแนนที่เก็บใน enrollment
        const enrollmentsData = {};
        enrollmentsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            enrollmentsData[data.studentId] = data.arcadeHighscores || {};
        });

        const studentIds = Object.keys(enrollmentsData);
        
        // Split into chunks of 10 if we use 'in' operator, but here we can just use Promise.all
        const studentPromises = studentIds.map(id => db.collection('users').doc(id).get());
        const studentDocs = await Promise.all(studentPromises);

        let leaderboardData = [];

        studentDocs.forEach(doc => {
            if (!doc.exists) return;
            const data = doc.data();
            const studentId = doc.id;
            
            // ดึงคะแนนเกมจาก enrollments แทนที่จะเป็น user profile
            const arcadeHighscores = enrollmentsData[studentId] || {};
            
            const tetrisScore = arcadeHighscores.tetris || 0;
            const snakeScore = arcadeHighscores.snake || 0;
            const dinoScore = arcadeHighscores.dino || 0;
            const jumpScore = arcadeHighscores.jump || 0;
            const totalScore = tetrisScore + snakeScore + dinoScore + jumpScore;

            if (totalScore > 0) {
                leaderboardData.push({
                    name: data.displayName || data.email || 'นักเรียนลึกลับ',
                    totalScore: totalScore,
                    photoURL: data.photoURL || defaultAvatar
                });
            }
        });

        leaderboardData.sort((a, b) => b.totalScore - a.totalScore);

        if (leaderboardData.length === 0) {
            leaderboardContainer.innerHTML = `<div style="text-align: center; color: #64748b; padding: 20px;">ยังไม่มีใครเล่นเกมเพื่อสะสมคะแนนในห้องนี้</div>`;
            return;
        }

        let html = `<div class="leaderboard-list">`;
        
        leaderboardData.forEach((student, index) => {
            const rank = index + 1;
            let rankClass = '';
            let rankIcon = rank;
            
            if (rank === 1) {
                rankClass = 'rank-1';
                rankIcon = '👑';
            } else if (rank === 2) {
                rankClass = 'rank-2';
            } else if (rank === 3) {
                rankClass = 'rank-3';
            }

            html += `
                <div class="leaderboard-item ${rankClass}">
                    <div class="leaderboard-rank">${rankIcon}</div>
                    <img src="${student.photoURL}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #fff;" onerror="this.src='${defaultAvatar}'">
                    <div class="leaderboard-name">${student.name}</div>
                    <div class="leaderboard-score">${student.totalScore} 🏆</div>
                </div>
            `;
        });
        
        html += `</div>`;
        leaderboardContainer.innerHTML = html;

    } catch (error) {
        console.error("Error rendering arcade leaderboard:", error);
        leaderboardContainer.innerHTML = `<div style="text-align: center; color: #ef4444; padding: 20px;">เกิดข้อผิดพลาดในการโหลดทำเนียบเซียน</div>`;
    }
}

function startStatsUpdate(classId, userId) {
    // เคลียร์ interval เดิมถ้ามี
    if (statsInterval) {
        clearInterval(statsInterval);
    }

    // อัพเดตทุก 10 วินาที
    statsInterval = setInterval(() => {
        loadStats(classId, userId);
    }, 10000);
}

window.addEventListener('beforeunload', () => {
    if (statsInterval) {
        clearInterval(statsInterval);
    }
});
// Export functions
window.viewProblem = viewProblem;
window.searchProblems = searchProblems;


// ==========================================
// Diagnostic Skill Analysis (Self-Analysis Tab)
// ==========================================

const TAGS_LIST = [
    { value: 'GUI', label: 'รูปแบบ GUI' },
    { value: 'Function', label: 'ฟังก์ชัน (Function)' },
    { value: 'Condition', label: 'เงื่อนไข (Condition)' },
    { value: 'Analysis', label: 'การวิเคราะห์ปัญหา' },
    { value: 'DataFlow', label: 'flow ข้อมูล (Data Flow)' },
    { value: 'DataScience', label: 'Data Science' },
    { value: 'IoT', label: 'IoT' },
    { value: 'Loop', label: 'วนซ้ำ (Loop)' },
    { value: 'Input', label: 'การรับค่าข้อมูล (Input)' }
];

function switchClassTab(tabName) {
    const tabs = ['problems', 'analysis', 'arcade'];
    tabs.forEach(t => {
        const btn = document.getElementById(`tabBtn-${t}`);
        const content = document.getElementById(`${t}TabContent`);
        if (!btn || !content) return;
        
        if (t === tabName) {
            btn.classList.add('active');
            btn.style.color = '#3b82f6';
            btn.style.borderBottom = '3px solid #3b82f6';
            content.style.display = 'block';
        } else {
            btn.classList.remove('active');
            btn.style.color = '#64748b';
            btn.style.borderBottom = '3px solid transparent';
            content.style.display = 'none';
        }
    });

    if (tabName === 'analysis') {
        renderSelfAnalysis();
    } else if (tabName === 'arcade') {
        renderArcadeLeaderboard();
    }
}
window.switchClassTab = switchClassTab;

async function renderSelfAnalysis() {
    const recommendationsList = document.getElementById('recommendationsList');
    if (!recommendationsList) return;

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const classId = urlParams.get('id');
        const userId = auth.currentUser ? auth.currentUser.uid : null;

        if (!classId || !userId) return;

        // 1. ดึงโจทย์ทั้งหมดในคลาสความสัมพันธ์
        const classProblemsSnap = await db.collection('class_problems')
            .where('classId', '==', classId)
            .get();

        if (classProblemsSnap.empty) {
            recommendationsList.innerHTML = `
                <div style="text-align: center; color: #64748b; padding: 20px;">
                    <i class="fas fa-exclamation-circle fa-2x"></i>
                    <p style="margin-top: 10px;">ยังไม่มีแบบฝึกหัดมอบหมายในห้องเรียนนี้</p>
                </div>
            `;
            return;
        }

        // 2. ดึงรายละเอียดโจทย์ทั้งหมดแบบคู่ขนาน (Parallel Fetch)
        const problemPromises = classProblemsSnap.docs.map(doc => 
            db.collection('problems').doc(doc.data().problemId).get()
        );
        const problemDocs = await Promise.all(problemPromises);

        // คัดกรองเฉพาะประเภท MCQ และ Matching
        const problems = problemDocs
            .filter(doc => doc.exists)
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(p => p.type === 'comprehension' || p.type === 'matching');

        if (problems.length === 0) {
            recommendationsList.innerHTML = `
                <div style="text-align: center; color: #64748b; padding: 20px;">
                    <i class="fas fa-info-circle fa-2x" style="color: #3b82f6;"></i>
                    <p style="margin-top: 10px;">ห้องเรียนนี้ยังไม่มีโจทย์วิเคราะห์หลักการ (คำถามความเข้าใจ หรือจับคู่) มอบหมาย</p>
                </div>
            `;
            // ล้างกราฟใยแมงมุมถ้ามี
            const radarCtx = document.getElementById('analysisRadarChart');
            if (radarCtx) {
                const existing = Chart.getChart(radarCtx);
                if (existing) existing.destroy();
            }
            return;
        }

        // 3. ดึงประวัติการส่งงานทั้งหมดของนักเรียนในห้องเรียนนี้
        const submissionsSnap = await db.collection('submissions')
            .where('studentId', '==', userId)
            .where('classId', '==', classId)
            .get();

        // นับจำนวนครั้งที่กดส่ง (attempts) และเก็บการส่งล่าสุด
        const problemAttempts = new Map();
        const latestSubmissions = new Map();

        submissionsSnap.forEach(doc => {
            const data = doc.data();
            const probId = data.problemId;
            problemAttempts.set(probId, (problemAttempts.get(probId) || 0) + 1);

            const existing = latestSubmissions.get(probId);
            const subTime = data.timestamp || data.submittedAt;
            const timeVal = subTime ? subTime.toDate().getTime() : 0;
            const existingTime = existing && (existing.timestamp || existing.submittedAt) ? 
                (existing.timestamp || existing.submittedAt).toDate().getTime() : 0;

            if (!existing || timeVal > existingTime) {
                latestSubmissions.set(probId, data);
            }
        });

        // 4. คำนวณคะแนนตามแท็กย่อย
        const tagStats = {};
        TAGS_LIST.forEach(tag => {
            tagStats[tag.value] = {
                totalQuestions: 0,
                correctQuestions: 0,
                scoresList: []
            };
        });

        problems.forEach(problem => {
            const submission = latestSubmissions.get(problem.id);
            const attempts = problemAttempts.get(problem.id) || 0;

            if (problem.type === 'comprehension' && problem.questions) {
                problem.questions.forEach((q, idx) => {
                    const tag = q.tag;
                    if (!tag || !tagStats[tag]) return;

                    tagStats[tag].totalQuestions++;

                    let isCorrect = false;
                    if (submission && submission.results && submission.results[idx]) {
                        isCorrect = submission.results[idx].isCorrect === true;
                    }

                    if (isCorrect) {
                        tagStats[tag].correctQuestions++;
                        // สูตรลดคะแนนความเชื่อมั่นตามจำนวนครั้งตรวจ
                        let confidence = 20;
                        if (attempts <= 1) confidence = 100;
                        else if (attempts === 2) confidence = 80;
                        else if (attempts === 3) confidence = 50;
                        tagStats[tag].scoresList.push(confidence);
                    } else {
                        tagStats[tag].scoresList.push(0);
                    }
                });
            } else if (problem.type === 'matching' && problem.pairs) {
                const answers = submission ? (submission.answers || {}) : {};
                problem.pairs.forEach((pair, idx) => {
                    const tag = pair.tag;
                    if (!tag || !tagStats[tag]) return;

                    tagStats[tag].totalQuestions++;

                    const studentAnswer = answers[idx] || answers[String(idx)] || '';
                    const isCorrect = studentAnswer && studentAnswer === pair.answer;

                    if (isCorrect) {
                        tagStats[tag].correctQuestions++;
                        let confidence = 20;
                        if (attempts <= 1) confidence = 100;
                        else if (attempts === 2) confidence = 80;
                        else if (attempts === 3) confidence = 50;
                        tagStats[tag].scoresList.push(confidence);
                    } else {
                        tagStats[tag].scoresList.push(0);
                    }
                });
            }
        });

        // 5. จัดเตรียมข้อมูลแสดงผลกราฟ Radar
        const activeLabels = [];
        const activeScores = [];
        const recommendations = [];

        TAGS_LIST.forEach(tag => {
            const stats = tagStats[tag.value];
            if (stats.totalQuestions > 0) {
                // คำนวณความเข้าของหัวข้อเฉลี่ย
                const masteryScore = stats.scoresList.reduce((sum, s) => sum + s, 0) / stats.totalQuestions;
                activeLabels.push(tag.label);
                activeScores.push(Math.round(masteryScore));

                // จัดเก็บข้อเสนอแนะ
                if (masteryScore >= 75) {
                    recommendations.push({
                        type: 'strength',
                        tagLabel: tag.label,
                        score: Math.round(masteryScore),
                        title: `จุดแข็งยอดเยี่ยม: ด้าน ${tag.label}`,
                        desc: `คุณเรียนรู้เรื่อง ${tag.label} ได้เป็นอย่างดี ทำแบบฝึกหัดถูกต้องได้รวดเร็วและใช้จำนวนการตรวจคำตอบน้อยมาก สะท้อนถึงการเข้าใจ Concept ที่มั่นคงครับ`
                    });
                } else if (masteryScore < 60) {
                    recommendations.push({
                        type: 'weakness',
                        tagLabel: tag.label,
                        score: Math.round(masteryScore),
                        title: `เรื่องที่ต้องปรับปรุง: ด้าน ${tag.label}`,
                        desc: `คุณยังมีข้อสงสัยในส่วนของ ${tag.label} คะแนนความเชี่ยวชาญอยู่ในระดับปานกลาง/ต่ำ (${Math.round(masteryScore)}%) แนะนำให้ทบทวนบทเรียน หรือทำแบบฝึกหัดความเข้าใจส่วนนี้ซ้ำเพื่อปรับปรุงความถูกต้องครับ`
                    });
                }
            }
        });

        // 6. เรนเดอร์กราฟ Radar
        const radarCtx = document.getElementById('analysisRadarChart');
        const radarPlaceholder = document.getElementById('radarPlaceholder');
        if (radarCtx) {
            if (activeScores.length === 0) {
                // แสดงสถานะเริ่มต้น หากมีคำถามแต่ยังไม่เคยทำส่งเลย
                radarCtx.style.display = 'none';
                if (radarPlaceholder) radarPlaceholder.style.display = 'block';
            } else {
                // แสดง canvas และซ่อน placeholder
                radarCtx.style.display = 'block';
                if (radarPlaceholder) radarPlaceholder.style.display = 'none';

                const existingChart = Chart.getChart(radarCtx);
                if (existingChart) existingChart.destroy();

                new Chart(radarCtx, {
                    type: 'radar',
                    data: {
                        labels: activeLabels,
                        datasets: [{
                            label: 'ความเชี่ยวชาญ (%)',
                            data: activeScores,
                            backgroundColor: 'rgba(59, 130, 246, 0.2)',
                            borderColor: 'rgba(59, 130, 246, 0.8)',
                            pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                            pointBorderColor: '#fff',
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            r: {
                                suggestedMin: 0,
                                suggestedMax: 100,
                                ticks: { stepSize: 20 },
                                pointLabels: {
                                    font: {
                                        family: 'Sarabun',
                                        size: 13,
                                        weight: 'bold'
                                    }
                                }
                            }
                        },
                        plugins: {
                            legend: { display: false }
                        }
                    }
                });
            }
        }

        // 7. แสดงรายการคำแนะนำ
        if (recommendations.length === 0) {
            recommendationsList.innerHTML = `
                <div style="text-align: center; color: #64748b; padding: 15px;">
                    <i class="far fa-smile fa-2x" style="color: #10b981; margin-bottom: 8px;"></i>
                    <p>ระบบกำลังรวบรวมทักษะเพื่อระบุจุดเด่น-จุดปรับปรุง แนะนำให้ส่งคำตอบแบบฝึกหัดเพิ่มเพื่อเริ่มการประเมินทักษะที่ชัดเจนครับ!</p>
                </div>
            `;
        } else {
            // เรียงลำดับเอาเรื่องที่ควรปรับปรุง (weakness) ขึ้นก่อนเพื่อส่งเสริมให้เด็กกลับไปทบทวน
            const sortedRecs = recommendations.sort((a, b) => {
                if (a.type === 'weakness' && b.type === 'strength') return -1;
                if (a.type === 'strength' && b.type === 'weakness') return 1;
                return a.score - b.score;
            });

            recommendationsList.innerHTML = sortedRecs.map(rec => `
                <div class="recommendation-item ${rec.type}">
                    <div class="rec-icon">${rec.type === 'strength' ? '🏆' : '💡'}</div>
                    <div>
                        <div class="rec-title" style="color: inherit;">${rec.title} (${rec.score}%)</div>
                        <div class="rec-desc">${rec.desc}</div>
                    </div>
                </div>
            `).join('');
        }

    } catch (error) {
        console.error('Error rendering self analysis:', error);
        recommendationsList.innerHTML = `
            <div style="text-align: center; color: #ef4444; padding: 20px;">
                <i class="fas fa-times-circle fa-2x"></i>
                <p style="margin-top: 10px;">เกิดข้อผิดพลาดในการคำนวณและประมวลผลทักษะของคุณ</p>
            </div>
        `;
    }
}

// ฟังก์ชันควบคุม Arcade Room (ไม่ใช้ Modal แล้ว)
async function playGame(gameName) {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    // ดึงจำนวนตั๋วปัจจุบันที่แสดงอยู่บนหน้าเว็บ
    const ticketText = document.getElementById('arcadeTickets').textContent;
    const availableTickets = parseInt(ticketText) || 0;
    
    if (availableTickets > 0) {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const classId = urlParams.get('id');
            
            // ดึงข้อมูล class_enrollments ปัจจุบันเพื่อดูว่าเคยใช้ตั๋วไปกี่ใบแล้ว
            const enrollSnapshot = await db.collection('class_enrollments')
                .where('studentId', '==', user.uid)
                .where('classId', '==', classId).get();
                
            if (!enrollSnapshot.empty) {
                const enrollDoc = enrollSnapshot.docs[0];
                const usedTickets = enrollDoc.data().usedTickets || 0;
                
                // อัปเดตตั๋วที่ใช้ไปแล้วใน Firebase (+1)
                await enrollDoc.ref.update({
                    usedTickets: usedTickets + 1
                });
            }
            
            // อัปเดต UI แบบ Real-time
            const newAvailable = availableTickets - 1;
            document.getElementById('arcadeTickets').textContent = `${newAvailable}`;
            
            alert(`หัก 1 ตั๋วสำเร็จ!\nตั๋วคงเหลือ: ${newAvailable} ใบ\n\nกำลังเข้าสู่เกม ${gameName}...`);
            
            // เปิดเกมในหน้าเดียวกันเลย พร้อมแนบ classId
            window.location.href = `game-${gameName}.html?classId=${classId}`;
            
        } catch (error) {
            console.error('Error updating tickets:', error);
            alert('เกิดข้อผิดพลาดในการหักตั๋ว กรุณาลองใหม่');
        }
    } else {
        alert('ตั๋วไม่พอ! กรุณาทำโจทย์เพิ่มเพื่อสะสมคะแนน (10 คะแนน = 1 ตั๋ว)');
    }
}
window.playGame = playGame;

// ฟังก์ชันแลกตั๋ว
window.exchangeTicket = async function() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    const btn = document.getElementById('exchangeBtn');
    btn.disabled = true;
    btn.textContent = "กำลังแลก...";
    
    try {
        const elArcadePoints = document.getElementById('arcadePoints');
        const elArcadeTickets = document.getElementById('arcadeTickets');
        
        let currentPoints = parseInt(elArcadePoints.textContent) || 0;
        
        if (currentPoints < 10) {
            alert('คะแนนวิถีเซียนไม่พอ! (ต้องการ 10 คะแนน ต่อ 1 ตั๋ว)');
            btn.disabled = false;
            btn.textContent = "แลกตั๋ว (-10 คะแนน)";
            return;
        }
        
        // อัปเดตใน Firebase สำหรับห้องเรียนนี้
        const urlParams = new URLSearchParams(window.location.search);
        const classId = urlParams.get('id');
        const enrollSnapshot = await db.collection('class_enrollments')
            .where('studentId', '==', user.uid)
            .where('classId', '==', classId).get();
            
        if (!enrollSnapshot.empty) {
            await enrollSnapshot.docs[0].ref.update({
                boughtTickets: firebase.firestore.FieldValue.increment(1)
            });
        }
        
        // แอนิเมชันตัวเลขลด-เพิ่ม
        let tickets = parseInt(elArcadeTickets.textContent) || 0;
        
        elArcadePoints.style.transition = "transform 0.3s";
        elArcadePoints.style.transform = "scale(1.5)";
        elArcadePoints.style.color = "#e74c3c"; // สีแดงตอนลด
        
        setTimeout(() => {
            elArcadePoints.textContent = currentPoints - 10;
            elArcadePoints.style.transform = "scale(1)";
            elArcadePoints.style.color = "#009432";
            
            elArcadeTickets.style.transition = "transform 0.3s";
            elArcadeTickets.style.transform = "scale(1.5)";
            elArcadeTickets.style.color = "#2ecc71"; // สีเขียวตอนเพิ่ม
            
            setTimeout(() => {
                elArcadeTickets.textContent = tickets + 1;
                elArcadeTickets.style.transform = "scale(1)";
                elArcadeTickets.style.color = "#d35400";
                
                btn.disabled = false;
                btn.textContent = "แลกตั๋ว (-10 คะแนน)";
            }, 300);
        }, 300);
        
    } catch (error) {
        console.error('Error exchanging ticket:', error);
        alert('เกิดข้อผิดพลาดในการแลกตั๋ว กรุณาลองใหม่');
        btn.disabled = false;
        btn.textContent = "แลกตั๋ว (-10 คะแนน)";
    }
}