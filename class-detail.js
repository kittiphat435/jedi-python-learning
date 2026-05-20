// Initialize Firebase
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

// เช็คการล็อกอิน
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('User is logged in:', user.email);
        const urlParams = new URLSearchParams(window.location.search);
        const classId = urlParams.get('id');
        if (classId) {
            loadClassDetails(classId);
            loadClassStats(classId);
            loadProblems(classId);
            loadStudents(classId);
        } else {
            alert('ไม่พบรหัสห้องเรียน');
            window.location.href = 'teacher-dashboard.html';
        }
    } else {
        window.location.href = 'index.html';
    }
});

// Event Listeners
document.addEventListener('DOMContentLoaded', function () {
    const createProblemBtn = document.getElementById('createProblemBtn');
    const problemBankBtn = document.getElementById('problemBankBtn');
    const createProblemForm = document.getElementById('createProblemForm');

    if (createProblemBtn) {
        createProblemBtn.addEventListener('click', function () {
            showCreateProblemModal();
        });
    }

    if (problemBankBtn) {
        problemBankBtn.addEventListener('click', function () {
            document.getElementById('problemBankModal').style.display = 'block';
            loadProblemBank();
        });
    }

    if (createProblemForm) {
        createProblemForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            await createProblem();
        });
    }

    // Event listener สำหรับการค้นหา
    const searchInput = document.getElementById('searchProblem');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchProblems(e.target.value);
        });
    }
});

// โหลดข้อมูลห้องเรียน
async function loadClassDetails(classId) {
    try {
        const classDoc = await db.collection('classes').doc(classId).get();
        if (!classDoc.exists) {
            alert('ไม่พบห้องเรียน');
            window.location.href = 'teacher-dashboard.html';
            return;
        }

        const classData = classDoc.data();

        // ดึงข้อมูลครูผู้สอน
        const teacherDoc = await db.collection('users').doc(classData.teacherId).get();
        const teacherData = teacherDoc.data();

        // แสดงข้อมูลห้องเรียนและครูผู้สอน
        const classInfoSection = document.querySelector('.section');
        if (classInfoSection) {
            const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23999' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";

            classInfoSection.innerHTML = `
                <div class="class-header">
                    <div class="class-info">
                        <h2 id="className">${classData.name}</h2>
                        <p id="classCode" class="class-code">รหัสห้องเรียน: ${classData.code}</p>
                    </div>
                    <div class="teacher-info">
                        <img src="${teacherData.photoURL || defaultAvatar}" 
                             alt="รูปครูผู้สอน" 
                             class="teacher-avatar"
                             onerror="this.src='${defaultAvatar}'">
                        <div class="teacher-details">
                            <h3 class="teacher-name">${teacherData.displayName || 'ไม่ระบุชื่อ'}</h3>
                            <p class="teacher-email">${teacherData.email}</p>
                            <span class="teacher-label">ครูผู้สอน</span>
                        </div>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error("Error loading class details:", error);
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูลห้องเรียน');
    }
}

// โหลดสถิติห้องเรียน
async function loadClassStats(classId) {
    try {
        const studentCount = await db.collection('class_enrollments')
            .where('classId', '==', classId)
            .get()
            .then(snap => snap.size);

        const problemCount = await db.collection('class_problems')
            .where('classId', '==', classId)
            .get()
            .then(snap => snap.size);

        document.getElementById('studentCount').textContent = studentCount;
        document.getElementById('problemCount').textContent = problemCount;

    } catch (error) {
        console.error("Error loading stats:", error);
    }
}
// แสดง modal สร้างโจทย์
function showCreateProblemModal(problemData = null) {
    const modal = document.getElementById('createProblemModal');
    const form = document.getElementById('createProblemForm');

    if (!modal || !form) return;

    // รีเซ็ตฟอร์ม
    form.reset();
    form.removeAttribute('data-problem-id');

    // ถ้ามี problemData แสดงว่าเป็นการแก้ไข
    if (problemData) {
        form.setAttribute('data-problem-id', problemData.id);
        document.getElementById('problemTitle').value = problemData.title;
        document.getElementById('problemDescription').value = problemData.description;
        document.getElementById('templateCode').value = problemData.templateCode || '';

        // แสดง test cases ที่มีอยู่
        const testCasesContainer = document.getElementById('testCases');
        testCasesContainer.innerHTML = '';
        if (problemData.testCases && problemData.testCases.length > 0) {
            problemData.testCases.forEach(testCase => {
                addTestCase(JSON.stringify(testCase.input), JSON.stringify(testCase.expected));
            });
        } else {
            addTestCase(); // เพิ่ม test case เปล่า 1 อัน
        }
    } else {
        // เพิ่ม test case เปล่าเริ่มต้น
        const testCasesContainer = document.getElementById('testCases');
        testCasesContainer.innerHTML = '';
        addTestCase();
    }

    modal.style.display = 'block';
}

// ปิด modal สร้างโจทย์
function closeCreateProblemModal() {
    const modal = document.getElementById('createProblemModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ตัวแปรเก็บข้อมูลโจทย์ทั้งหมด
let allProblems = [];

// โหลดรายการโจทย์
async function loadProblems(classId) {
    const problemList = document.getElementById('problemList');
    try {
        const snapshot = await db.collection('class_problems')
            .where('classId', '==', classId)
            .get();

        if (snapshot.empty) {
            problemList.innerHTML = '<p>ยังไม่มีโจทย์ในห้องเรียน</p>';
            allProblems = [];
            return;
        }

        const problemPromises = snapshot.docs.map(async (doc) => {
            try {
                const problemDoc = await db.collection('problems')
                    .doc(doc.data().problemId)
                    .get();

                if (!problemDoc.exists) {
                    await doc.ref.delete();
                    return null;
                }

                return { id: problemDoc.id, ...problemDoc.data() };
            } catch (error) {
                console.error("Error loading problem:", error);
                return null;
            }
        });

        const problems = (await Promise.all(problemPromises))
            .filter(problem => problem !== null);

        allProblems = problems;
        displayProblems(problems);
    } catch (error) {
        console.error("Error loading problems:", error);
        problemList.innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดโจทย์</p>';
    }
}


// แสดงโจทย์
function displayProblems(problems) {
    const problemList = document.getElementById('problemList');
    problemList.innerHTML = '';

    problems.forEach(problem => {
        const div = document.createElement('div');
        div.className = 'problem-card';

        div.innerHTML = `
            <div class="problem-info">
                <div class="problem-header">
                    <span class="problem-type">${problem.type === 'python' ? '💻 โจทย์เขียนโปรแกรม' : '📝 คำถามความเข้าใจ'}</span>
                </div>
                <h3>${problem.title}</h3>
                <p>${problem.description || 'ไม่มีคำอธิบาย'}</p>
            </div>
            <button onclick="viewProblem('${problem.id}')" class="primary-btn">
                ดูโจทย์
            </button>
        `;
        problemList.appendChild(div);
    });
}
async function viewProblem(problemId) {
    try {
        const classId = new URLSearchParams(window.location.search).get('id');

        // โหลดข้อมูลโจทย์
        const problemDoc = await db.collection('problems').doc(problemId).get();
        if (!problemDoc.exists) {
            alert('ไม่พบโจทย์');
            return;
        }
        const problemData = problemDoc.data();

        // โหลดข้อมูลการส่งงานของนักเรียนทั้งหมดในห้อง
        const submissions = await db.collection('submissions')
            .where('problemId', '==', problemId)
            .where('classId', '==', classId)
            .get();

        // โหลดข้อมูลนักเรียนทั้งหมดในห้อง
        const enrollments = await db.collection('class_enrollments')
            .where('classId', '==', classId)
            .get();

        // รวบรวมข้อมูลนักเรียนและการส่งงาน
        const studentSubmissions = new Map();

        // เก็บข้อมูลการส่งงานล่าสุดของแต่ละคน
        submissions.docs.forEach(doc => {
            const data = doc.data();
            const existing = studentSubmissions.get(data.studentId);
            if (!existing || data.submittedAt.toDate() > existing.submittedAt.toDate()) {
                studentSubmissions.set(data.studentId, data);
            }
        });

        // สร้าง Modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'problemDetailsModal';
        modal.style.display = 'block';

        let submissionsHTML = '';

        // สร้าง HTML สำหรับแต่ละนักเรียน
        for (const enrollment of enrollments.docs) {
            const studentId = enrollment.data().studentId;
            const studentDoc = await db.collection('users').doc(studentId).get();
            const studentData = studentDoc.data();
            const submission = studentSubmissions.get(studentId);

            submissionsHTML += `
                <div class="submission-item">
                    <div class="student-info">
                        <img src="${studentData.photoURL || defaultAvatar}" 
                             alt="Student" 
                             class="student-avatar"
                             onerror="this.src='${defaultAvatar}'">
                        <div class="student-details">
                            <div class="student-name">${studentData.displayName || 'ไม่ระบุชื่อ'}</div>
                            <div class="student-email">${studentData.email}</div>
                        </div>
                    </div>
                    ${submission ? `
                        <span class="submission-status status-submitted">ส่งแล้ว</span>
                        <button class="expand-btn" onclick="toggleSubmission(this)">ดูคำตอบ</button>
                        <div class="submission-expand" style="display: none;">
                            <div class="submission-date">ส่งเมื่อ: ${submission.submittedAt.toDate().toLocaleString('th-TH')}</div>
                            <div class="code-preview">${submission.code || submission.answer || ''}</div>
                        </div>
                    ` : `
                        <span class="submission-status status-pending">ยังไม่ส่ง</span>
                    `}
                </div>
            `;
        }

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${problemData.title}</h2>
                    <button class="close-btn" onclick="closeProblemDetailsModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="problem-content">
                        <p>${problemData.description || ''}</p>
                        ${problemData.templateCode ? `
                            <div class="template-code">
                                <pre><code>${problemData.templateCode}</code></pre>
                            </div>
                        ` : ''}
                    </div>
                    <div class="submissions-section">
                        <h3>การส่งงานของนักเรียน</h3>
                        <div class="submissions-list">
                            ${submissionsHTML}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    } catch (error) {
        console.error('Error viewing problem:', error);
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    }
}

function closeProblemDetailsModal() {
    const modal = document.getElementById('problemDetailsModal');
    if (modal) {
        modal.remove();
    }
}

function toggleSubmission(button) {
    const submissionItem = button.closest('.submission-item');
    const submissionExpand = submissionItem.querySelector('.submission-expand');

    if (submissionExpand.style.display === 'none') {
        submissionExpand.style.display = 'block';
        button.textContent = 'ซ่อนคำตอบ';
    } else {
        submissionExpand.style.display = 'none';
        button.textContent = 'ดูคำตอบ';
    }
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

// โหลดรายชื่อนักเรียน
async function loadStudents(classId) {
    const studentList = document.getElementById('studentList');
    if (!studentList) return;

    try {
        // แสดง Loading
        studentList.innerHTML = '<p class="text-center">กำลังโหลดข้อมูล...</p>';

        // ดึงข้อมูลการลงทะเบียนพร้อมกับข้อมูลนักเรียน
        const enrollments = await db.collection('class_enrollments')
            .where('classId', '==', classId)
            .orderBy('joinedAt', 'desc')  // เรียงตามวันที่เข้าร่วมล่าสุด
            .get();

        if (enrollments.empty) {
            studentList.innerHTML = `
                <div class="empty-state">
                    <p>ยังไม่มีนักเรียนในห้องเรียน</p>
                    <p class="hint">นักเรียนสามารถเข้าร่วมได้ด้วยรหัสห้องเรียน</p>
                </div>
            `;
            return;
        }

        // ดึงข้อมูลนักเรียนแต่ละคน
        const studentPromises = enrollments.docs.map(async (enrollment) => {
            const studentDoc = await db.collection('users')
                .doc(enrollment.data().studentId)
                .get();

            // รวมข้อมูลนักเรียนและข้อมูลการลงทะเบียน
            return {
                id: studentDoc.id,
                joinedAt: enrollment.data().joinedAt,
                ...studentDoc.data()
            };
        });

        const students = await Promise.all(studentPromises);
        studentList.innerHTML = ''; // เคลียร์ loading

        const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23999' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";

        students.forEach(student => {
            const studentDiv = document.createElement('div');
            studentDiv.className = 'student-card';

            // แปลง timestamp เป็นวันที่
            const joinDate = student.joinedAt ? student.joinedAt.toDate().toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : 'ไม่ระบุ';

            studentDiv.innerHTML = `
                <div class="student-info">
                    <img src="${student.photoURL || defaultAvatar}" 
                         alt="โปรไฟล์" 
                         class="student-avatar"
                         onerror="this.src='${defaultAvatar}'">
                    <div class="student-details">
                        <h3>${student.displayName || 'ไม่ระบุชื่อ'}</h3>
                        <p class="student-email">${student.email}</p>
                        <p class="join-date">เข้าร่วมเมื่อ: ${joinDate}</p>
                    </div>
                </div>
                <div class="student-actions">
                    <button onclick="viewProgress('${student.id}')" class="secondary-btn">
                        <i class="fas fa-chart-line"></i> ดูความคืบหน้า
                    </button>
                    <button onclick="removeStudent('${student.id}')" class="delete-btn">
                        <i class="fas fa-user-minus"></i> นำออก
                    </button>
                </div>
            `;
            studentList.appendChild(studentDiv);
        });

    } catch (error) {
        console.error("Error loading students:", error);
        studentList.innerHTML = `
            <div class="error-state">
                <p>เกิดข้อผิดพลาดในการโหลดรายชื่อนักเรียน</p>
                <button onclick="loadStudents('${classId}')" class="retry-btn">
                    ลองใหม่
                </button>
            </div>
        `;
    }
}

async function viewProgress(studentId) {
    try {
        const classId = new URLSearchParams(window.location.search).get('id');

        // สร้าง Modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'progressModal';
        modal.style.display = 'block';

        // ใส่ loading state ก่อน
        modal.innerHTML = `
            <div class="modal-content progress-modal">
                <div class="modal-header">
                    <h2>ความคืบหน้าของนักเรียน</h2>
                    <button class="close-btn" onclick="closeProgressModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="loading">กำลังโหลดข้อมูล...</div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // ดึงข้อมูลนักเรียน
        const studentDoc = await db.collection('users').doc(studentId).get();
        const studentData = studentDoc.data();

        // ดึงข้อมูลการส่งงานทั้งหมดของนักเรียนในห้องเรียนนี้
        const submissions = await db.collection('submissions')
            .where('studentId', '==', studentId)
            .where('classId', '==', classId)
            .get();

        // สร้าง Map เก็บข้อมูลการส่งงาน
        const submissionMap = {};
        submissions.docs.forEach(doc => {
            const data = doc.data();
            submissionMap[data.problemId] = {
                status: data.status,
                submittedAt: data.submittedAt,
                score: data.score
            };
        });

        // ดึงข้อมูลโจทย์ทั้งหมดในห้องเรียน
        const classProblems = await db.collection('class_problems')
            .where('classId', '==', classId)
            .get();

        // ดึงรายละเอียดของแต่ละโจทย์
        const problemsData = await Promise.all(
            classProblems.docs.map(async (doc) => {
                const problemDoc = await db.collection('problems')
                    .doc(doc.data().problemId)
                    .get();
                return {
                    id: problemDoc.id,
                    ...problemDoc.data()
                };
            })
        );

        // คำนวณสถิติ
        const totalProblems = problemsData.length;
        const completedProblems = submissions.docs.filter(doc =>
            doc.data().status === 'completed'
        ).length;

        // อัพเดท Modal content
        const modalContent = document.querySelector('#progressModal .modal-body');
        modalContent.innerHTML = `
            <div class="student-profile">
                <img src="${studentData.photoURL || defaultAvatar}" 
                     alt="โปรไฟล์" 
                     class="student-avatar"
                     onerror="this.src='${defaultAvatar}'">
                <div class="student-details">
                    <h3>${studentData.displayName || 'ไม่ระบุชื่อ'}</h3>
                    <p>${studentData.email}</p>
                </div>
            </div>

            <div class="progress-summary">
                <div class="progress-stat">
                    <div class="stat-value">${completedProblems}</div>
                    <div class="stat-label">ทำสำเร็จ</div>
                </div>
                <div class="progress-stat">
                    <div class="stat-value">${totalProblems}</div>
                    <div class="stat-label">โจทย์ทั้งหมด</div>
                </div>
                <div class="progress-stat">
                    <div class="stat-value">${Math.round(completedProblems / totalProblems * 100)}%</div>
                    <div class="stat-label">ความคืบหน้า</div>
                </div>
            </div>

            <div class="progress-list">
                ${problemsData.map(problem => {
            const submission = submissionMap[problem.id];
            const submissionDate = submission?.submittedAt
                ? submission.submittedAt.toDate().toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })
                : null;

            return `
                        <div class="progress-item">
                            <div class="problem-info">
                                <h4>${problem.title}</h4>
                                <p>${problem.description || ''}</p>
                            </div>
                            <div class="submission-status">
                                ${submission ? `
                                    <div class="status ${submission.status}">
                                        <span class="status-badge">
                                            ${submission.status === 'completed' ? 'ส่งแล้ว' : 'กำลังทำ'}
                                        </span>
                                        ${submission.score !== undefined ?
                        `<span class="score">คะแนน: ${submission.score}</span>`
                        : ''}
                                        <div class="submission-date">
                                            ส่งเมื่อ: ${submissionDate}
                                        </div>
                                    </div>
                                ` : `
                                    <div class="status not-submitted">
                                        <span class="status-badge">ยังไม่ส่ง</span>
                                    </div>
                                `}
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;

    } catch (error) {
        console.error('Error viewing progress:', error);
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูลความคืบหน้า');
    }
}

function closeProgressModal() {
    const modal = document.getElementById('progressModal');
    if (modal) {
        modal.remove();
    }
}

async function removeStudent(studentId) {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะนำนักเรียนออกจากห้องเรียน?')) {
        return;
    }

    try {
        const classId = new URLSearchParams(window.location.search).get('id');

        // ลบการลงทะเบียน
        const enrollmentSnapshot = await db.collection('class_enrollments')
            .where('classId', '==', classId)
            .where('studentId', '==', studentId)
            .get();

        const deletePromises = enrollmentSnapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(deletePromises);

        alert('นำนักเรียนออกจากห้องเรียนสำเร็จ');

        // โหลดข้อมูลใหม่
        await Promise.all([
            loadStudents(classId),
            loadClassStats(classId)
        ]);

    } catch (error) {
        console.error('Error removing student:', error);
        alert('เกิดข้อผิดพลาดในการนำนักเรียนออก');
    }
}

// เพิ่มตัวแปร defaultAvatar ที่ด้านบนของไฟล์
const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23999' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";

async function loadStudents(classId) {
    const studentList = document.getElementById('studentList');
    if (!studentList) return;

    try {
        studentList.innerHTML = '<p class="loading">กำลังโหลดข้อมูล...</p>';

        // ดึงข้อมูลการลงทะเบียนพร้อมกับข้อมูลนักเรียน
        const enrollments = await db.collection('class_enrollments')
            .where('classId', '==', classId)
            .orderBy('joinedAt', 'desc')
            .get();

        if (enrollments.empty) {
            studentList.innerHTML = `
                <div class="empty-state">
                    <p>ยังไม่มีนักเรียนในห้องเรียน</p>
                    <p class="hint">นักเรียนสามารถเข้าร่วมได้ด้วยรหัสห้องเรียน</p>
                </div>
            `;
            return;
        }

        // ดึงข้อมูลนักเรียนแต่ละคน
        const studentPromises = enrollments.docs.map(async (enrollment) => {
            const studentDoc = await db.collection('users')
                .doc(enrollment.data().studentId)
                .get();

            return {
                id: studentDoc.id,
                joinedAt: enrollment.data().joinedAt,
                ...studentDoc.data()
            };
        });

        const students = await Promise.all(studentPromises);
        studentList.innerHTML = ''; // เคลียร์ loading

        students.forEach(student => {
            const studentDiv = document.createElement('div');
            studentDiv.className = 'student-card';

            // แปลง timestamp เป็นวันที่
            const joinDate = student.joinedAt ? student.joinedAt.toDate().toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }) : 'ไม่ระบุ';

            // ทำ URL ของรูปให้ถูกต้อง
            let photoURL = student.photoURL || defaultAvatar;

            studentDiv.innerHTML = `
                <div class="student-info">
                    <img src="${photoURL}" 
                         alt="โปรไฟล์" 
                         class="student-avatar"
                         onerror="this.src='${defaultAvatar}'">
                    <div class="student-details">
                        <h3>${student.displayName || 'ไม่ระบุชื่อ'}</h3>
                        <p class="student-email">${student.email}</p>
                        <p class="join-date">เข้าร่วมเมื่อ: ${joinDate}</p>
                    </div>
                </div>
                <div class="student-actions">
                    <button onclick="viewProgress('${student.id}')" class="secondary-btn">
                        ดูความคืบหน้า
                    </button>
                    <button onclick="removeStudent('${student.id}')" class="delete-btn">
                        นำออก
                    </button>
                </div>
            `;
            studentList.appendChild(studentDiv);
        });

    } catch (error) {
        console.error("Error loading students:", error);
        studentList.innerHTML = `
            <div class="error-state">
                <p>เกิดข้อผิดพลาดในการโหลดรายชื่อนักเรียน</p>
                <button onclick="loadStudents('${classId}')" class="retry-btn">
                    ลองใหม่
                </button>
            </div>
        `;
    }
}

// ฟังก์ชันสำหรับสลับแท็บ
function showTab(tabName) {
    // ซ่อนทุก tab content
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // ยกเลิกการเลือกทุกแท็บ
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // แสดง content ของแท็บที่เลือก
    document.getElementById(`${tabName}Tab`).classList.add('active');

    // เพิ่ม active class ให้กับแท็บที่เลือก
    document.querySelector(`.tab[onclick="showTab('${tabName}')"]`).classList.add('active');
}
// โหลดคลังโจทย์
async function loadProblemBank() {
    const problemBankList = document.getElementById('problemBankList');
    if (!problemBankList) return;

    try {
        // แสดง Loading
        problemBankList.innerHTML = '<div style="text-align: center; padding: 20px;">กำลังโหลดข้อมูล...</div>';

        const currentClassId = new URLSearchParams(window.location.search).get('id');

        // โหลดข้อมูลทั้งหมดพร้อมกัน
        const [currentClass, problemsSnapshot, classProblemSnapshot] = await Promise.all([
            db.collection('classes').doc(currentClassId).get(),
            db.collection('problems')
                .where('teacherId', '==', auth.currentUser.uid)
                .orderBy('createdAt', 'desc')
                .get(),
            db.collection('class_problems')
                .where('classId', '==', currentClassId)
                .get()
        ]);

        // สร้าง Set ของ problemIds ที่มีในห้องเรียนแล้ว
        const existingProblemIds = new Set(
            classProblemSnapshot.docs.map(doc => doc.data().problemId)
        );

        // กรองโจทย์ที่ยังไม่มีในห้องเรียน
        const availableProblems = problemsSnapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            .filter(problem => !existingProblemIds.has(problem.id));

        // อัพเดต UI
        if (availableProblems.length === 0) {
            problemBankList.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <p>ไม่พบโจทย์ที่สามารถเพิ่มได้</p>
                    <p style="font-size: 14px; color: #666;">ทุกโจทย์ถูกเพิ่มในห้องเรียนแล้ว</p>
                </div>`;
            return;
        }

        problemBankList.innerHTML = '';
        availableProblems.forEach(problem => {
            const div = document.createElement('div');
            div.className = 'problem-bank-item';
            div.innerHTML = `
                <div class="problem-info">
                    <h3>${problem.title}</h3>
                    <p>${problem.description || ''}</p>
                    ${problem.classNames && problem.classNames.length > 0 ?
                    `<p class="used-in">ใช้ในห้อง: ${problem.classNames.join(', ')}</p>` :
                    '<p class="not-used">ยังไม่เคยใช้ในห้องใดๆ</p>'}
                </div>
                <div class="problem-actions">
                    <button onclick="addProblemToClass('${problem.id}')" class="primary-btn" data-problem-id="${problem.id}">
                        เพิ่มในห้องเรียน
                    </button>
                </div>
            `;
            problemBankList.appendChild(div);
        });

    } catch (error) {
        console.error("Error loading problem bank:", error);
        problemBankList.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #dc3545;">
                เกิดข้อผิดพลาดในการโหลดข้อมูล: ${error.message}
                <br><button onclick="loadProblemBank()" class="secondary-btn" style="margin-top: 10px;">ลองใหม่</button>
            </div>`;
    }
}
async function addProblemToClass(problemId) {
    try {
        const classId = new URLSearchParams(window.location.search).get('id');

        // หา button และ disable ก่อน
        const addButton = document.querySelector(`button[data-problem-id="${problemId}"]`);
        if (addButton) {
            addButton.disabled = true;
            addButton.textContent = 'กำลังเพิ่ม...';
        }

        // เช็คก่อนว่ามีโจทย์นี้ในห้องเรียนแล้วหรือไม่
        const existingProblem = await db.collection('class_problems')
            .where('classId', '==', classId)
            .where('problemId', '==', problemId)
            .get();

        if (!existingProblem.empty) {
            alert('โจทย์นี้มีอยู่ในห้องเรียนแล้ว');
            return;
        }

        // เพิ่มโจทย์เข้าห้องเรียน
        await db.collection('class_problems').add({
            problemId: problemId,
            classId: classId,
            addedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // อัพเดท classNames
        const classDoc = await db.collection('classes').doc(classId).get();
        const className = classDoc.data().name;

        // อัพเดตชื่อห้องเรียนในโจทย์
        const problemDoc = await db.collection('problems').doc(problemId).get();
        const currentClassNames = problemDoc.data().classNames || [];
        if (!currentClassNames.includes(className)) {
            await db.collection('problems').doc(problemId).update({
                classNames: firebase.firestore.FieldValue.arrayUnion(className)
            });
        }

        // รอให้ข้อมูลอัพเดต
        await new Promise(resolve => setTimeout(resolve, 1000));

        // โหลดข้อมูลใหม่
        await Promise.all([
            loadProblems(classId),
            loadClassStats(classId)
        ]);

        alert('เพิ่มโจทย์เข้าห้องเรียนสำเร็จ');

        // โหลดคลังโจทย์ใหม่หลังจากการเพิ่มสำเร็จ
        await loadProblemBank();

    } catch (error) {
        console.error('Error adding problem to class:', error);
        alert('เกิดข้อผิดพลาดในการเพิ่มโจทย์: ' + error.message);
    } finally {
        // คืนสถานะปุ่มไม่ว่าจะสำเร็จหรือไม่
        const addButton = document.querySelector(`button[data-problem-id="${problemId}"]`);
        if (addButton) {
            addButton.disabled = false;
            addButton.textContent = 'เพิ่มในห้องเรียน';
        }
    }
}

// สร้างหรือแก้ไขโจทย์
async function createProblem() {
    try {
        const form = document.getElementById('createProblemForm');
        const problemId = form.getAttribute('data-problem-id');
        const isEditing = !!problemId;
        const classId = new URLSearchParams(window.location.search).get('id');

        const problemData = {
            title: document.getElementById('problemTitle').value,
            description: document.getElementById('problemDescription').value,
            templateCode: document.getElementById('templateCode').value,
            teacherId: auth.currentUser.uid,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (!isEditing) {
            problemData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            problemData.classNames = [];
        }

        const testCases = [];
        document.querySelectorAll('.test-case').forEach(testCase => {
            const input = testCase.querySelector('.test-input').value;
            const output = testCase.querySelector('.test-output').value;
            if (input && output) {
                try {
                    testCases.push({
                        input: JSON.parse(input),
                        expected: JSON.parse(output)
                    });
                } catch (error) {
                    console.error('Invalid test case format:', error);
                }
            }
        });
        problemData.testCases = testCases;

        if (isEditing) {
            // แก้ไขโจทย์
            await db.collection('problems').doc(problemId).update(problemData);
            alert('อัพเดทโจทย์สำเร็จ');
            closeCreateProblemModal();
            await loadProblems(classId);
        } else {
            // สร้างโจทย์ใหม่
            const problemRef = await db.collection('problems').add(problemData);

            // เพิ่มเข้าห้องเรียน
            await db.collection('class_problems').add({
                problemId: problemRef.id,
                classId: classId,
                addedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // อัพเดท classNames
            const classDoc = await db.collection('classes').doc(classId).get();
            await problemRef.update({
                classNames: firebase.firestore.FieldValue.arrayUnion(classDoc.data().name)
            });

            alert('สร้างโจทย์สำเร็จ');
            closeCreateProblemModal();

            // โหลดข้อมูลใหม่ทั้งหมดพร้อมกัน
            await Promise.all([
                loadProblems(classId),
                loadClassStats(classId),
                loadProblemBank()
            ]);
        }

    } catch (error) {
        console.error('Error saving problem:', error);
        alert('เกิดข้อผิดพลาดในการบันทึกโจทย์: ' + error.message);
    }
}
function closeProblemBankModal() {
    const modal = document.getElementById('problemBankModal');
    if (modal) {
        modal.style.display = 'none';
        // เคลียร์เนื้อหาใน problemBankList เมื่อปิด modal
        const problemBankList = document.getElementById('problemBankList');
        if (problemBankList) {
            problemBankList.innerHTML = '';
        }
    }
}
// เพิ่มฟังก์ชันลบโจทย์ในห้องเรียน
async function deleteProblem(problemId) {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบโจทย์นี้ออกจากห้องเรียน?')) {
        return;
    }

    try {
        const classId = new URLSearchParams(window.location.search).get('id');

        // ลบแค่ความสัมพันธ์ระหว่างห้องเรียนกับโจทย์
        const classProblemsSnapshot = await db.collection('class_problems')
            .where('classId', '==', classId)
            .where('problemId', '==', problemId)
            .get();

        // ลบความสัมพันธ์
        const deletePromises = classProblemsSnapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(deletePromises);

        // ลบชื่อห้องเรียนออกจาก classNames ในโจทย์
        const classDoc = await db.collection('classes').doc(classId).get();
        await db.collection('problems').doc(problemId).update({
            classNames: firebase.firestore.FieldValue.arrayRemove(classDoc.data().name)
        });

        alert('ลบโจทย์ออกจากห้องเรียนสำเร็จ');

        // โหลดข้อมูลใหม่
        await Promise.all([
            loadProblems(classId),
            loadClassStats(classId)
        ]);

    } catch (error) {
        console.error('Error removing problem from class:', error);
        alert('เกิดข้อผิดพลาดในการลบโจทย์ออกจากห้องเรียน');
    }
}
// แสดง/ปิด Modal คลังโจทย์
function showProblemBankModal() {
    const modal = document.getElementById('problemBankModal');
    if (modal) {
        modal.style.display = 'block';
        loadProblemBank(); // โหลดรายการโจทย์
    }
}

// เพิ่ม test case
function addTestCase(input = '', output = '') {
    const testCasesContainer = document.getElementById('testCases');
    const testCaseDiv = document.createElement('div');
    testCaseDiv.className = 'test-case';
    testCaseDiv.innerHTML = `
        <div class="test-case-header">
            <span>Test Case #${testCasesContainer.children.length + 1}</span>
            <button type="button" class="delete-btn" onclick="removeTestCase(this)">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="test-case-inputs">
            <div class="form-group">
                <label>Input (JSON):</label>
                <textarea class="test-input">${input}</textarea>
            </div>
            <div class="form-group">
                <label>Expected Output (JSON):</label>
                <textarea class="test-output">${output}</textarea>
            </div>
        </div>
    `;
    testCasesContainer.appendChild(testCaseDiv);
}
// ลบ test case
function removeTestCase(button) {
    const testCase = button.closest('.test-case');
    if (testCase) {
        testCase.remove();
        // ปรับเลข test case ใหม่
        document.querySelectorAll('.test-case').forEach((tc, index) => {
            tc.querySelector('span').textContent = `Test Case #${index + 1}`;
        });
    }
}

// Export functions สำหรับใช้งานจาก HTML
window.deleteProblem = deleteProblem;
window.showTab = showTab;
window.showCreateProblemModal = showCreateProblemModal;
window.closeCreateProblemModal = closeCreateProblemModal;
window.addTestCase = addTestCase;
window.removeTestCase = removeTestCase;
window.addProblemToClass = addProblemToClass;
window.closeProblemBankModal = closeProblemBankModal;
window.searchProblems = searchProblems;
window.viewProgress = viewProgress;
window.removeStudent = removeStudent;
window.viewProblem = viewProblem;
window.closeProblemDetailsModal = closeProblemDetailsModal;
window.toggleSubmission = toggleSubmission;