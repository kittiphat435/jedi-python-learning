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

async function loadProblems(classId, userId) {
    const problemList = document.getElementById('problemList');
    try {
        problemList.innerHTML = '<p>กำลังโหลดข้อมูล...</p>';

        const classProblemSnapshot = await db.collection('class_problems')
            .where('classId', '==', classId)
            .get();

        if (classProblemSnapshot.empty) {
            problemList.innerHTML = '<p>ยังไม่มีโจทย์ในห้องเรียน</p>';
            return;
        }

        // แก้ไขการดึง submissions โดยแยกเงื่อนไข
        const submissionsSnapshot = await db.collection('submissions')
            .where('studentId', '==', userId)
            .get();

        const submissionStatus = new Map();

        submissionsSnapshot.docs
            .filter(doc => doc.data().classId === classId) // กรอง classId ใน JavaScript
            .forEach(doc => {
                const data = doc.data();
                const existingStatus = submissionStatus.get(data.problemId);

                if (!existingStatus ||
                    (data.submittedAt &&
                        (!existingStatus.submittedAt ||
                            data.submittedAt.toDate() > existingStatus.submittedAt.toDate()))) {
                    submissionStatus.set(data.problemId, {
                        status: data.status || 'pending',
                        score: data.score || 0,
                        maxScore: data.maxScore || 0,
                        submittedAt: data.submittedAt
                    });
                }
            });

        const problemPromises = classProblemSnapshot.docs.map(async (doc) => {
            const problemDoc = await db.collection('problems')
                .doc(doc.data().problemId)
                .get();

            const submission = submissionStatus.get(problemDoc.id);

            let status = 'pending';
            if (submission) {
                if (submission.status === 'completed') {
                    status = 'completed';
                } else if (submission.score > 0) {
                    status = 'inProgress';
                }
            }

            return {
                id: problemDoc.id,
                ...problemDoc.data(),
                classId: classId,
                status: status,
                score: submission?.score || 0,
                maxScore: submission?.maxScore || 0
            };
        });

        allProblems = await Promise.all(problemPromises);
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
            const existing = latestSubmissions.get(data.problemId);
            if (!existing || data.submittedAt.toDate() > existing.submittedAt.toDate()) {
                latestSubmissions.set(data.problemId, {
                    status: data.status,
                    score: data.score || 0,
                    maxScore: data.maxScore || 0,
                    submittedAt: data.submittedAt,
                    problemId: data.problemId,
                    type: data.type // เก็บประเภทของโจทย์
                });
            }
        });

        let totalScore = 0;
        let totalMaxScore = 0;
        let completedProblems = 0;

        for (let problemId of uniqueProblemIds) {
            const problemDoc = await db.collection('problems').doc(problemId).get();
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
                maxScore = problemData.pairs.reduce((sum, pair) => sum + (pair.score || 1), 0);
            } else if (problemData.type === 'gui' && problemData.requirements) {
                // สำหรับโจทย์ GUI ให้ใช้คะแนนจาก requirements
                maxScore = problemData.requirements.reduce((sum, req) => sum + (req.score || 1), 0);
            }

            totalMaxScore += maxScore;

            // ตรวจสอบ submission 
            const submission = latestSubmissions.get(problemId);
            console.log('Checking problem:', { problemId, type: problemData.type, submission });

            if (submission) {
                if (problemData.type === 'flowchart' || problemData.type === 'gui') {
                    // ถ้าเป็น completed ให้ใช้ maxScore เป็นคะแนน
                    if (submission.status === 'completed') {
                        completedProblems++;
                        // ถ้า score เป็น 0 ให้ใช้ maxScore แทน
                        totalScore += (submission.score > 0 ? submission.score : submission.maxScore);
                        console.log('Added score:', {
                            problemId,
                            type: problemData.type,
                            status: submission.status,
                            score: submission.score,
                            maxScore: submission.maxScore,
                            addedScore: (submission.score > 0 ? submission.score : submission.maxScore),
                            newTotal: totalScore,
                            completedProblems
                        });
                    }
                } else if (submission.status === 'completed') {
                    completedProblems++;
                    totalScore += submission.score || 0;
                }
            }
        }

        const progress = totalProblems > 0 ? Math.round((completedProblems / totalProblems) * 100) : 0;
        const scorePercentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

        console.log('Score Details:', {
            totalScore,
            totalMaxScore,
            completedProblems,
            progress,
            scorePercentage
        });

        document.getElementById('totalProblems').textContent = totalProblems;
        document.getElementById('completedProblems').textContent = completedProblems;
        document.getElementById('problemProgress').textContent = `${progress}%`;
        document.getElementById('totalScore').textContent = `${totalScore}/${totalMaxScore}`;
        document.getElementById('scorePercentage').textContent = `(${scorePercentage}%)`;

    } catch (error) {
        console.error("Error loading stats:", error);
        document.getElementById('totalProblems').textContent = '0';
        document.getElementById('completedProblems').textContent = '0';
        document.getElementById('problemProgress').textContent = '0%';
        document.getElementById('totalScore').textContent = '0/0';
        document.getElementById('scorePercentage').textContent = '(0%)';
    }
}

// สร้างกราฟแสดงความคืบหน้า
async function initProgressChart(classId, userId) {
    const ctx = document.getElementById('progressChart');
    if (!ctx) return;

    try {
        // ถ้ามีกราฟเก่าให้ destroy ก่อน
        const chartInstance = Chart.getChart(ctx);
        if (chartInstance) {
            chartInstance.destroy();
        }

        // ดึงข้อมูลการส่งงาน
        const submissions = await db.collection('submissions')
            .where('studentId', '==', userId)
            .get();

        // กรองและเรียงข้อมูล
        let filteredSubmissions = submissions.docs
            .filter(doc => doc.data().classId === classId)
            .sort((a, b) => a.data().submittedAt.toDate() - b.data().submittedAt.toDate());

        // สร้างข้อมูลสำหรับกราฟ
        let completedCount = 0;
        const data = filteredSubmissions.map(doc => {
            if (doc.data().status === 'completed') {
                completedCount++;
            }
            const date = doc.data().submittedAt.toDate();
            return {
                x: date.toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'short'
                }),
                y: completedCount
            };
        });

        // กำหนดค่าเริ่มต้นถ้าไม่มีข้อมูล
        if (data.length === 0) {
            const today = new Date();
            data.push({
                x: today.toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'short'
                }),
                y: 0
            });
        }

        // สร้างกราฟใหม่ด้วยการปรับแต่งจุดให้ใหญ่ขึ้น
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
                    // เพิ่มการกำหนดค่าจุด
                    pointRadius: 9, // เพิ่มขนาดจุดเป็น 3 เท่า (เดิม 3)
                    pointHoverRadius: 12, // เพิ่มขนาดจุดตอน hover
                    pointBackgroundColor: '#ffffff', // สีพื้นหลังจุด
                    pointBorderColor: '#1a73e8', // สีขอบจุด
                    pointBorderWidth: 3, // ความหนาขอบจุด
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            font: {
                                size: 14 // เพิ่มขนาด font ของ legend
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            font: {
                                size: 14 // เพิ่มขนาด font ของแกน y
                            }
                        },
                        title: {
                            display: true,
                            text: 'จำนวนโจทย์ที่ทำสำเร็จ',
                            font: {
                                size: 14 // เพิ่มขนาด font ของชื่อแกน
                            }
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                size: 14 // เพิ่มขนาด font ของแกน x
                            }
                        }
                    }
                },
                elements: {
                    point: {
                        hitRadius: 10 // เพิ่มพื้นที่การคลิกของจุด
                    },
                    line: {
                        borderWidth: 3 // เพิ่มความหนาของเส้น
                    }
                }
            }
        });

    } catch (error) {
        console.error("Error initializing chart:", error);
        if (ctx.parentElement) {
            ctx.parentElement.innerHTML = '<p class="error-message">ไม่สามารถโหลดข้อมูลกราฟได้</p>';
        }
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

// เพิ่มฟังก์ชันโหลดคำถาม Admin
async function loadAdminQuestions() {
    try {
        const questionsSnapshot = await db.collection('adminQuestions')
            .where('isActive', '==', true)
            .orderBy('createdAt', 'desc')
            .get();
        
        const questionsList = document.getElementById('adminQuestionsList');
        questionsList.innerHTML = '';
        
        if (questionsSnapshot.empty) {
            questionsList.innerHTML = '<p class="no-questions">ยังไม่มีคำถามจาก Admin</p>';
            return;
        }
        
        questionsSnapshot.forEach(doc => {
            const question = doc.data();
            const questionElement = createAdminQuestionElement(doc.id, question);
            questionsList.appendChild(questionElement);
        });
    } catch (error) {
        console.error('Error loading admin questions:', error);
    }
}

function createAdminQuestionElement(questionId, question) {
    const questionDiv = document.createElement('div');
    questionDiv.className = 'admin-question-item';
    questionDiv.innerHTML = `
        <div class="question-header">
            <h3>${question.title}</h3>
            <div class="question-meta">
                <span class="question-type">${getQuestionTypeText(question.type)}</span>
                <span class="question-score">${question.score} คะแนน</span>
                <span class="question-time">${question.timeLimit} นาที</span>
            </div>
        </div>
        <div class="question-content">
            <p>${question.content}</p>
            <div id="answer-section-${questionId}" class="answer-section">
                ${createAnswerSection(questionId, question)}
            </div>
        </div>
        <div class="question-actions">
            <button class="primary-btn" onclick="submitAnswer('${questionId}', '${question.type}')">ส่งคำตอบ</button>
        </div>
    `;
    return questionDiv;
}

function getQuestionTypeText(type) {
    const types = {
        'multiple-choice': 'ปรนัย',
        'true-false': 'ถูก/ผิด',
        'short-answer': 'คำตอบสั้น',
        'essay': 'อัตนัย'
    };
    return types[type] || type;
}

function createAnswerSection(questionId, question) {
    switch(question.type) {
        case 'multiple-choice':
            return question.choices.map((choice, index) => 
                `<label class="choice-label">
                    <input type="radio" name="answer-${questionId}" value="${index}">
                    ${choice}
                </label>`
            ).join('');
            
        case 'true-false':
            return `
                <label class="choice-label">
                    <input type="radio" name="answer-${questionId}" value="true"> ถูก
                </label>
                <label class="choice-label">
                    <input type="radio" name="answer-${questionId}" value="false"> ผิด
                </label>
            `;
            
        case 'short-answer':
            return `<input type="text" id="answer-${questionId}" class="answer-input" placeholder="ใส่คำตอบของคุณ">`;
            
        case 'essay':
            return `<textarea id="answer-${questionId}" class="answer-textarea" rows="5" placeholder="ใส่คำตอบของคุณ"></textarea>`;
            
        default:
            return '';
    }
}

async function submitAnswer(questionId, questionType) {
    let answer;
    
    switch(questionType) {
        case 'multiple-choice':
        case 'true-false':
            const selectedOption = document.querySelector(`input[name="answer-${questionId}"]:checked`);
            if (!selectedOption) {
                alert('กรุณาเลือกคำตอบ');
                return;
            }
            answer = selectedOption.value;
            break;
            
        case 'short-answer':
        case 'essay':
            const answerInput = document.getElementById(`answer-${questionId}`);
            if (!answerInput.value.trim()) {
                alert('กรุณาใส่คำตอบ');
                return;
            }
            answer = answerInput.value.trim();
            break;
    }
    
    try {
        await db.collection('adminQuestionAnswers').add({
            questionId: questionId,
            studentId: auth.currentUser.uid,
            answer: answer,
            submittedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert('ส่งคำตอบเรียบร้อยแล้ว!');
        
        // ปิดการใช้งานส่วนตอบคำถาม
        const answerSection = document.getElementById(`answer-section-${questionId}`);
        const inputs = answerSection.querySelectorAll('input, textarea');
        inputs.forEach(input => input.disabled = true);
        
        const submitButton = answerSection.parentElement.querySelector('.primary-btn');
        submitButton.disabled = true;
        submitButton.textContent = 'ส่งแล้ว';
        
    } catch (error) {
        console.error('Error submitting answer:', error);
        alert('เกิดข้อผิดพลาดในการส่งคำตอบ');
    }
}

// เรียกใช้ฟังก์ชันโหลดคำถาม Admin เมื่อหน้าเว็บโหลดเสร็จ
auth.onAuthStateChanged(user => {
    if (user) {
        loadAdminQuestions();
    }
});