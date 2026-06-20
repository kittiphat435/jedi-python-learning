// admin-dashboard.js
import { checkAdminAuth } from './admin-auth.js';
import { ADMIN_EMAILS } from './admin-config.js';

// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDWiPuk0WP9z5_mjDe1FkqeVZ-vcYClyLs",
    authDomain: "python-learning-platform-596e1.firebaseapp.com",
    projectId: "python-learning-platform-596e1",
    storageBucket: "python-learning-platform-596e1.firebasestorage.app",
    messagingSenderId: "5262153531",
    appId: "1:5262153531:web:55f6246093e1780003491e"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// ป้องกันปัญหา Firestore Offline Cache พัง
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
if (isLocalhost) {
    // db.useEmulator('localhost', 8080); // ถ้าใช้ emulator ใน admin-dashboard ด้วย
} else {
    db.settings({ cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED });
    db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
        if (err.code === 'failed-precondition') {
            db.clearPersistence().catch(console.error);
        }
    });
}



// ประกาศที่ window.adminDashboard แทน
window.adminDashboard = {
    switchTab,
    closeModal,
    logout,
    showTeacherDetails,
    showClassStudents,
    showStudentDetails,
    viewProblem,
    viewTeacher,
    viewProblemDetails,
    viewTeacherDetails,
    viewClassStudents,  // เพิ่มอันนี้
    viewClassProblems,   // เพิ่มอันนี้
    loadStudents,
    viewStudentDetails,
};

// Initial load
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM Content Loaded");
    auth.onAuthStateChanged(async (user) => {
        console.log("Auth state changed:", user?.email);
        if (await checkAdminAuth(user)) {
            console.log("Admin authenticated");
            await loadDashboardStats();
            loadProblems();
        }
    });
});

// และฟังก์ชันอื่นๆ ที่เหลือ...
// Tab Switching
function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab content and activate button
    document.getElementById(`${tabName}Tab`).classList.add('active');
    document.querySelector(`[onclick*="switchTab('${tabName}')"]`).classList.add('active');

        // Load content based on selected tab
        switch (tabName) {
            case 'problems':
                loadProblems();
                break;
            case 'sharedProblems':
                loadSharedProblems();
                break;
            case 'classes':
                loadClasses();
                break;
            case 'teachers':
                loadTeachers();
                break;
            case 'students':
                loadStudents();
                break;
        }
}
async function viewProblemDetails(problemId) {
    const modal = document.getElementById('problemModal');
    const detailsDiv = document.getElementById('problemDetails');
    modal.style.display = 'block';
    detailsDiv.innerHTML = '<div class="loading">กำลังโหลดข้อมูล...</div>';

    try {
        const problemDoc = await db.collection('problems').doc(problemId).get();
        if (!problemDoc.exists) {
            detailsDiv.innerHTML = '<div class="error">ไม่พบข้อมูลโจทย์</div>';
            return;
        }

        const problem = problemDoc.data();
        const teacherDoc = await db.collection('users').doc(problem.teacherId).get();
        const teacher = teacherDoc.data();

        let detailsHTML = `
            <div class="problem-detail-content">
                <h3>${problem.title}</h3>
                <div class="problem-info">
                    <p><strong>ประเภท:</strong> ${getProblemTypeThai(problem.type)}</p>
                    <p><strong>ระดับความยาก:</strong> ${getProblemDifficultyThai(problem.difficulty)}</p>
                    <p><strong>ผู้สร้าง:</strong> ${teacher ? teacher.displayName : 'ไม่ระบุ'}</p>
                </div>`;

        switch (problem.type) {
            case 'python':
                detailsHTML += `
                    <div class="python-details">
                        <h4>คำอธิบายโจทย์</h4>
                        <div class="description">${problem.description}</div>
                        
                        <h4>โค้ดเริ่มต้น</h4>
                        <pre class="template-code">${problem.templateCode}</pre>
                        
                        <h4>Test Cases</h4>
                        <div class="test-cases">
                            ${problem.testCases.map((test, index) => `
                                <div class="test-case">
                                    <h5>Test Case ${index + 1} (${test.score} คะแนน)</h5>
                                    <p><strong>Input:</strong></p>
                                    <pre>${test.input}</pre>
                                    <p><strong>Expected Output:</strong></p>
                                    <pre>${test.expected}</pre>
                                </div>
                            `).join('')}
                        </div>
                    </div>`;
                break;

            case 'comprehension':
                detailsHTML += `
                    <div class="comprehension-details">
                        <h4>เนื้อหา</h4>
                        <div class="content">${problem.content}</div>
                        
                        <h4>คำถาม</h4>
                        <div class="questions">
                            ${problem.questions.map((q, index) => `
                                <div class="question">
                                    <h5>คำถามที่ ${index + 1} (${q.score} คะแนน)</h5>
                                    <p><strong>คำถาม:</strong> ${q.question}</p>
                                    <p><strong>คำตอบ:</strong> ${q.correctAnswer}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>`;
                break;

            case 'matching':
                detailsHTML += `
                    <div class="matching-details">
                        <h4>คำอธิบาย</h4>
                        <div class="description">${problem.description}</div>
                        
                        <h4>คู่คำถาม-คำตอบ</h4>
                        <div class="pairs">
                            ${problem.pairs.map((pair, index) => `
                                <div class="pair">
                                    <h5>คู่ที่ ${index + 1} (${pair.score} คะแนน)</h5>
                                    <p><strong>คำถาม:</strong> ${pair.question}</p>
                                    <p><strong>คำตอบ:</strong> ${pair.answer}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>`;
                break;

            case 'flowchart':
                detailsHTML += `
                    <div class="flowchart-details">
                        <h4>คำอธิบาย</h4>
                        <div class="description">${problem.description}</div>
                        
                        <h4>คะแนนเต็ม: ${problem.maxScore} คะแนน</h4>
                        
                        <h4>เกณฑ์การให้คะแนน</h4>
                        <div class="scoring-criteria">
                            ${problem.scoringCriteria.map((criteria, index) => `
                                <p><strong>เกณฑ์ที่ ${index + 1}:</strong> ${criteria.score} คะแนน</p>
                            `).join('')}
                        </div>
                        
                        <h4>Flowchart ต้นแบบ</h4>
                        <div class="flowchart-preview" id="flowchartPreviewContainer" style="height: 400px; border: 1px solid #ddd;">
                            <div id="flowchartPreview" style="width: 100%; height: 100%;"></div>
                        </div>
                    </div>`;

                setTimeout(() => {
                    const previewEditor = new FlowchartEditor('flowchartPreview');
                    if (problem.flowchartData) {
                        previewEditor.loadReadOnlyData(problem.flowchartData);
                    }
                }, 100);
                break;
        }

        detailsHTML += '</div>';
        detailsDiv.innerHTML = detailsHTML;

    } catch (error) {
        console.error('Error viewing problem details:', error);
        detailsDiv.innerHTML = '<div class="error">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    }
}

// Helper function for rendering flowchart preview
function renderFlowchartPreview(containerId, flowchartData) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Create SVG element
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '400');
    container.appendChild(svg);

    // Render symbols
    if (flowchartData.symbols) {
        flowchartData.symbols.forEach(symbol => {
            // Create group for symbol
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.setAttribute('transform', `translate(${symbol.x},${symbol.y})`);

            // Create shape based on symbol type
            let shape;
            switch (symbol.type) {
                case 'terminal':
                    shape = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                    shape.setAttribute('rx', '20');
                    shape.setAttribute('ry', '20');
                    break;
                case 'process':
                    shape = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                    break;
                case 'decision':
                    shape = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                    shape.setAttribute('points', "0,-30 60,0 0,30 -60,0");
                    break;
                // Add more symbol types as needed
            }

            if (shape) {
                shape.setAttribute('class', 'flowchart-symbol');
                g.appendChild(shape);
            }

            // Add text
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.textContent = symbol.text;
            text.setAttribute('text-anchor', 'middle');
            g.appendChild(text);

            svg.appendChild(g);
        });
    }

    // Render connections
    if (flowchartData.connections) {
        flowchartData.connections.forEach(conn => {
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute('class', 'flowchart-connection');
            path.setAttribute('d', calculatePathD(conn));
            svg.appendChild(path);
        });
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function logout() {
    if (confirm('ต้องการออกจากระบบใช่หรือไม่?')) {
        auth.signOut().then(() => {
            window.location.href = 'index.html';
        }).catch((error) => {
            console.error('Error signing out:', error);
            alert('เกิดข้อผิดพลาดในการออกจากระบบ');
        });
    }
}


let allProblems = [];

// Load Problems with Filter
async function loadProblems() {
    const problemsList = document.getElementById('problemsList');
    problemsList.innerHTML = '<div class="loading">กำลังโหลดข้อมูล...</div>';

    try {
        const snapshot = await db.collection('problems').get();
        allProblems = []; // รีเซ็ตข้อมูล

        for (const doc of snapshot.docs) {
            const problem = doc.data();
            if (problem.teacherId) {
                const teacherDoc = await db.collection('users').doc(problem.teacherId).get();
                const teacher = teacherDoc.data();

                if (teacher) {
                    allProblems.push({
                        id: doc.id,
                        ...problem,
                        teacherName: teacher.displayName || 'ไม่ระบุ',
                        teacherId: problem.teacherId,
                        teacherSchool: teacher.school || 'ไม่ระบุ',
                        teacherSubject: teacher.subject || 'ไม่ระบุ'
                    });
                }
            }
        }

        // Setup event listeners for filtering
        setupProblemFilters();
        // แสดงข้อมูลทั้งหมดครั้งแรก
        filterAndRenderProblems();
    } catch (error) {
        console.error('Error loading problems:', error);
        problemsList.innerHTML = '<div class="error">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    }
}
// ฟังก์ชันดูรายละเอียดโจทย์
async function viewProblem(problemId) {
    const modal = document.getElementById('problemModal');
    const detailsDiv = document.getElementById('problemDetails');
    detailsDiv.innerHTML = '<div class="loading">กำลังโหลดข้อมูล...</div>';
    modal.style.display = 'block';

    try {
        const problemDoc = await db.collection('problems').doc(problemId).get();
        if (!problemDoc.exists) {
            detailsDiv.innerHTML = '<div class="error">ไม่พบข้อมูลโจทย์</div>';
            return;
        }

        const problem = problemDoc.data();
        const teacherDoc = await db.collection('users').doc(problem.teacherId).get();
        const teacher = teacherDoc.data();

        detailsDiv.innerHTML = `
            <div class="problem-detail-content">
                <h3>${problem.title}</h3>
                <div class="problem-info">
                    <p><strong>ประเภท:</strong> ${getProblemTypeThai(problem.type)}</p>
                    <p><strong>ระดับความยาก:</strong> ${getProblemDifficultyThai(problem.difficulty)}</p>
                    <p><strong>ผู้สร้าง:</strong> ${teacher ? teacher.displayName : 'ไม่ระบุ'}</p>
                    <p><strong>โรงเรียน:</strong> ${teacher ? teacher.school : 'ไม่ระบุ'}</p>
                </div>
                <div class="problem-description">
                    <h4>คำอธิบายโจทย์:</h4>
                    <div class="description-content">
                        ${problem.description || 'ไม่มีคำอธิบายเพิ่มเติม'}
                    </div>
                </div>
                ${problem.testCases ? `
                    <div class="test-cases">
                        <h4>ตัวอย่างการทดสอบ:</h4>
                        <pre>${JSON.stringify(problem.testCases, null, 2)}</pre>
                    </div>
                ` : ''}
            </div>
        `;
    } catch (error) {
        console.error('Error viewing problem:', error);
        detailsDiv.innerHTML = '<div class="error">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    }
}

// ฟังก์ชันดูข้อมูลครู
async function viewTeacher(teacherId) {
    const modal = document.getElementById('teacherModal');
    const detailsDiv = document.getElementById('teacherDetails');
    detailsDiv.innerHTML = '<div class="loading">กำลังโหลดข้อมูล...</div>';
    modal.style.display = 'block';

    try {
        const teacherDoc = await db.collection('users').doc(teacherId).get();
        if (!teacherDoc.exists) {
            detailsDiv.innerHTML = '<div class="error">ไม่พบข้อมูลครู</div>';
            return;
        }

        const teacher = teacherDoc.data();

        // ดึงข้อมูลสถิติต่างๆ
        const [problems, classes, submissions] = await Promise.all([
            db.collection('problems').where('teacherId', '==', teacherId).get(),
            db.collection('classes').where('teacherId', '==', teacherId).get(),
            db.collection('submissions').where('teacherId', '==', teacherId).get()
        ]);

        detailsDiv.innerHTML = `
            <div class="teacher-detail-content">
                <div class="teacher-info">
                    <h3>${teacher.displayName || 'ไม่ระบุชื่อ'}</h3>
                    <p><strong>อีเมล:</strong> ${teacher.email}</p>
                    <p><strong>โรงเรียน:</strong> ${teacher.school || 'ไม่ระบุ'}</p>
                    <p><strong>วิชาที่สอน:</strong> ${teacher.subject || 'ไม่ระบุ'}</p>
                </div>
                <div class="teacher-stats">
                    <h4>สถิติการสอน</h4>
                    <div class="stats-grid">
                        <div class="stat-box">
                            <span class="stat-value">${problems.size}</span>
                            <span class="stat-label">โจทย์ที่สร้าง</span>
                        </div>
                        <div class="stat-box">
                            <span class="stat-value">${classes.size}</span>
                            <span class="stat-label">ห้องเรียน</span>
                        </div>
                        <div class="stat-box">
                            <span class="stat-value">${submissions.size}</span>
                            <span class="stat-label">การส่งงานทั้งหมด</span>
                        </div>
                    </div>
                </div>
                <div class="recent-problems">
                    <h4>โจทย์ล่าสุด</h4>
                    <div class="problems-list">
                        ${problems.size > 0 ?
                problems.docs.slice(0, 5).map(doc => {
                    const problem = doc.data();
                    return `
                                    <div class="problem-item" onclick="viewProblem('${doc.id}')">
                                        <span class="problem-title">${problem.title}</span>
                                        <span class="problem-type">${getProblemTypeThai(problem.type)}</span>
                                    </div>
                                `;
                }).join('')
                : '<p>ยังไม่มีโจทย์ที่สร้าง</p>'
            }
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error viewing teacher:', error);
        detailsDiv.innerHTML = '<div class="error">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    }
}

// Render Problems
function renderProblems(problems) {
    const problemsList = document.getElementById('problemsList');

    if (problems.length === 0) {
        problemsList.innerHTML = '<div class="no-data">ไม่พบข้อมูลโจทย์ที่ตรงกับเงื่อนไข</div>';
        return;
    }

    const headerRow = `
        <div class="problem-row header">
            <div>ชื่อโจทย์</div>
            <div>ประเภท</div>
            <div>ระดับ</div>
            <div>ผู้สร้าง</div>
        </div>
    `;

    const problemRows = problems.map(problem => `
        <div class="problem-row">
            <div class="title" onclick="window.adminDashboard.viewProblemDetails('${problem.id}')">${problem.title}</div>
            <div>${getProblemTypeThai(problem.type)}</div>
            <div>${getProblemDifficultyThai(problem.difficulty)}</div>
            <div class="teacher" onclick="window.adminDashboard.viewTeacherDetails('${problem.teacherId}')">${problem.teacherName}</div>
        </div>
    `).join('');

    problemsList.innerHTML = headerRow + problemRows;
}
async function viewTeacherDetails(teacherId) {
    const modal = document.getElementById('teacherModal');
    const detailsDiv = document.getElementById('teacherDetails');
    detailsDiv.innerHTML = '<div class="loading">กำลังโหลดข้อมูล...</div>';
    modal.style.display = 'block';

    try {
        const teacherDoc = await db.collection('users').doc(teacherId).get();
        if (!teacherDoc.exists) {
            detailsDiv.innerHTML = '<div class="error">ไม่พบข้อมูลครู</div>';
            return;
        }

        const teacher = teacherDoc.data();
        const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23999' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";

        // ดึงข้อมูลสถิติ
        const [classes, problems] = await Promise.all([
            db.collection('classes').where('teacherId', '==', teacherId).get(),
            db.collection('problems').where('teacherId', '==', teacherId).get(),
        ]);

        detailsDiv.innerHTML = `
            <div class="teacher-profile">
                <div class="teacher-header">
                    <img src="${teacher.photoURL || defaultAvatar}" 
                         alt="รูปครู ${teacher.displayName}"
                         class="teacher-profile-image"
                         onerror="this.src='${defaultAvatar}'">
                    <div class="teacher-info">
                        <h2>${teacher.displayName || 'ไม่ระบุชื่อ'}</h2>
                        <p>อีเมล: ${teacher.email}</p>
                        <p>โรงเรียน: ${teacher.school || 'ไม่ระบุ'}</p>
                        <p>วิชาที่สอน: ${teacher.subject || 'ไม่ระบุ'}</p>
                    </div>
                </div>
                
                <div class="statistics">
                    <h3>สถิติการสอน</h3>
                    <p>จำนวนห้องเรียน: ${classes.size}</p>
                    <p>จำนวนโจทย์ที่สร้าง: ${problems.size}</p>
                </div>

                <div class="recent-problems">
                    <h3>โจทย์ล่าสุด</h3>
                    ${problems.empty ? '<p>ยังไม่มีโจทย์ที่สร้าง</p>' :
                problems.docs.slice(0, 5).map(doc => {
                    const problem = doc.data();
                    return `
                                <div class="problem-item" onclick="window.adminDashboard.viewProblemDetails('${doc.id}')">
                                    <span class="problem-title">${problem.title}</span>
                                    <span class="problem-type">${getProblemTypeThai(problem.type)}</span>
                                </div>
                            `;
                }).join('')
            }
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error viewing teacher details:', error);
        detailsDiv.innerHTML = '<div class="error">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    }
}
// เพิ่มฟังก์ชันค้นหาและกรอง
function setupProblemFilters() {
    const searchInput = document.getElementById('problemSearch');
    const typeFilter = document.getElementById('problemTypeFilter');

    // Event listener สำหรับการพิมพ์ค้นหา
    searchInput.addEventListener('input', () => {
        filterAndRenderProblems();
    });

    // Event listener สำหรับการเลือกประเภท
    typeFilter.addEventListener('change', () => {
        filterAndRenderProblems();
    });
}
function filterAndRenderProblems() {
    const searchText = document.getElementById('problemSearch').value.toLowerCase();
    const selectedType = document.getElementById('problemTypeFilter').value;

    // กรองข้อมูลตามเงื่อนไข
    const filteredProblems = allProblems.filter(problem => {
        const matchesSearch =
            problem.title.toLowerCase().includes(searchText) ||
            problem.teacherName.toLowerCase().includes(searchText) ||
            problem.teacherSchool.toLowerCase().includes(searchText);

        const matchesType = !selectedType || problem.type === selectedType;

        return matchesSearch && matchesType;
    });

    renderProblems(filteredProblems);
}

// Load Classes
async function loadClasses() {
    try {
        const classesList = document.getElementById('classesList');
        classesList.innerHTML = '<div class="loading">กำลังโหลดข้อมูล...</div>';

        const classesSnapshot = await db.collection('classes').get();

        const classesData = await Promise.all(classesSnapshot.docs.map(async doc => {
            const classData = doc.data();

            // เปลี่ยนจาก class_students เป็น class_enrollments
            const studentsSnapshot = await db.collection('class_enrollments')
                .where('classId', '==', doc.id)
                .get();

            const [teacherDoc, problemsSnapshot] = await Promise.all([
                db.collection('users').doc(classData.teacherId).get(),
                db.collection('class_problems')
                    .where('classId', '==', doc.id)
                    .get()
            ]);

            return `
                <div class="class-card">
                    <div class="class-info">
                        <h3>${classData.name}</h3>
                        <p>ครูผู้สอน: <span class="teacher-link" onclick="window.adminDashboard.viewTeacherDetails('${classData.teacherId}')">
                            ${teacherDoc.data()?.displayName || 'ไม่ระบุ'}</span></p>
                        <p>รหัสห้องเรียน: ${classData.code}</p>
                        <p>จำนวนนักเรียน: ${studentsSnapshot.size} คน</p>
                        <p>จำนวนโจทย์: ${problemsSnapshot.size} ข้อ</p>
                        <div class="action-buttons">
                            <button onclick="window.adminDashboard.viewClassStudents('${doc.id}')" class="view-btn">ดูรายชื่อนักเรียน</button>
                            <button onclick="window.adminDashboard.viewClassProblems('${doc.id}')" class="view-btn">ดูรายการโจทย์</button>
                        </div>
                    </div>
                </div>
            `;
        }));

        classesList.innerHTML = classesData.join('');
    } catch (error) {
        console.error('Error:', error);
        classesList.innerHTML = '<div class="error">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    }
}

async function viewClassProblems(classId) {
    const modal = document.getElementById('problemModal');
    const detailsDiv = document.getElementById('problemDetails');
    detailsDiv.innerHTML = '<div class="loading">กำลังโหลดข้อมูล...</div>';
    modal.style.display = 'block';

    try {
        const problemsSnapshot = await db.collection('class_problems')
            .where('classId', '==', classId)
            .get();

        if (problemsSnapshot.empty) {
            detailsDiv.innerHTML = '<p>ยังไม่มีโจทย์ในห้องเรียนนี้</p>';
            return;
        }

        const problems = await Promise.all(
            problemsSnapshot.docs.map(async doc => {
                const problemDoc = await db.collection('problems')
                    .doc(doc.data().problemId)
                    .get();
                return {
                    id: problemDoc.id,  // เพิ่ม id
                    ...problemDoc.data()
                };
            })
        );

        detailsDiv.innerHTML = `
            <div class="problems-list">
                <h3>รายการโจทย์ในห้องเรียน</h3>
                ${problems.map((problem, index) => `
                    <div class="problem-item">
                        <h4>${index + 1}. ${problem.title}</h4>
                        <p>ประเภท: ${getProblemTypeThai(problem.type)}</p>
                        <p>ระดับ: ${getProblemDifficultyThai(problem.difficulty)}</p>
                        <button onclick="window.adminDashboard.viewProblemDetails('${problem.id}')" class="view-btn">
                            ดูรายละเอียด
                        </button>
                    </div>
                `).join('')}
            </div>
        `;

    } catch (error) {
        console.error('Error showing class problems:', error);
        detailsDiv.innerHTML = '<div class="error">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    }
}
async function viewClassStudents(classId) {
    const modal = document.getElementById('studentModal');
    const detailsDiv = document.getElementById('studentDetails');
    modal.style.display = 'block';
    detailsDiv.innerHTML = '<div class="loading">กำลังโหลดข้อมูล...</div>';

    try {
        const enrollmentsSnapshot = await db.collection('class_enrollments')
            .where('classId', '==', classId)
            .get();

        if (enrollmentsSnapshot.empty) {
            detailsDiv.innerHTML = '<p>ไม่มีนักเรียนในห้องเรียนนี้</p>';
            return;
        }

        const studentsData = await Promise.all(enrollmentsSnapshot.docs.map(async doc => {
            const studentDoc = await db.collection('users').doc(doc.data().studentId).get();
            const student = studentDoc.data();
            return `
                <div class="student-item">
                    <h4>${student.displayName || 'ไม่ระบุชื่อ'}</h4>
                    <p>อีเมล: ${student.email}</p>
                    <p>โรงเรียน: ${student.school || 'ไม่ระบุ'}</p>
                </div>
            `;
        }));

        detailsDiv.innerHTML = `<div class="students-list">${studentsData.join('')}</div>`;

    } catch (error) {
        console.error('Error:', error);
        detailsDiv.innerHTML = '<div class="error">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    }
}
async function loadTeachers() {
    const teachersList = document.getElementById('teachersList');
    teachersList.innerHTML = '<div class="loading">กำลังโหลดข้อมูล...</div>';

    try {
        const snapshot = await db.collection('users')
            .where('role', '==', 'teacher')
            .get();

        if (snapshot.empty) {
            teachersList.innerHTML = '<div class="no-data">ไม่พบรายชื่อครู</div>';
            return;
        }

        const teachers = snapshot.docs.map(doc => {
            const data = doc.data();
            return `
                <div class="teacher-list-item">
                    <div class="teacher-name">${data.displayName || 'ไม่ระบุชื่อ'}</div>
                    <div class="teacher-school">โรงเรียน: ${data.school || 'ไม่ระบุ'}</div>
                    <button onclick="window.adminDashboard.viewTeacherDetails('${doc.id}')" class="view-btn">
                        ดูรายละเอียด
                    </button>
                </div>
            `;
        }).join('');

        teachersList.innerHTML = teachers;

    } catch (error) {
        console.error('Error loading teachers:', error);
        teachersList.innerHTML = '<div class="error">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    }
}

// Load Students
async function loadStudents() {
    const studentsList = document.getElementById('studentsList');
    studentsList.innerHTML = '<div class="loading">กำลังโหลดข้อมูล...</div>';

    try {
        const snapshot = await db.collection('users')
            .where('role', '==', 'student')
            .get();

        if (snapshot.empty) {
            studentsList.innerHTML = '<div class="no-data">ไม่พบรายชื่อนักเรียน</div>';
            return;
        }

        const students = snapshot.docs.map(doc => {
            const data = doc.data();
            return `
                <div class="student-list-item">
                    <div class="student-name">${data.displayName || 'ไม่ระบุชื่อ'}</div>
                    <div class="student-school">โรงเรียน: ${data.school || 'ไม่ระบุ'}</div>
                    <button onclick="window.adminDashboard.viewStudentDetails('${doc.id}')" class="view-btn">
                        ดูรายละเอียด
                    </button>
                </div>
            `;
        }).join('');

        studentsList.innerHTML = students;

    } catch (error) {
        console.error('Error loading students:', error);
        studentsList.innerHTML = '<div class="error">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    }
}
async function viewStudentDetails(studentId) {
    const modal = document.getElementById('studentModal');
    const detailsDiv = document.getElementById('studentDetails');
    detailsDiv.innerHTML = '<div class="loading">กำลังโหลดข้อมูล...</div>';
    modal.style.display = 'block';

    try {
        const studentDoc = await db.collection('users').doc(studentId).get();
        if (!studentDoc.exists) {
            detailsDiv.innerHTML = '<div class="error">ไม่พบข้อมูลนักเรียน</div>';
            return;
        }

        const student = studentDoc.data();
        const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23999' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";

        // ดึงข้อมูลเพิ่มเติม เช่น จำนวนห้องเรียนที่ลงทะเบียน
        const enrollments = await db.collection('class_enrollments')
            .where('studentId', '==', studentId)
            .get();

        detailsDiv.innerHTML = `
            <div class="student-profile">
                <div class="student-header">
                    <img src="${student.photoURL || defaultAvatar}" 
                         alt="รูปนักเรียน ${student.displayName}"
                         class="student-profile-image"
                         onerror="this.src='${defaultAvatar}'">
                    <div class="student-info">
                        <h2>${student.displayName || 'ไม่ระบุชื่อ'}</h2>
                        <p><strong>อีเมล:</strong> ${student.email}</p>
                        <p><strong>โรงเรียน:</strong> ${student.school || 'ไม่ระบุ'}</p>
                        <p><strong>ระดับชั้น:</strong> ${student.grade || 'ไม่ระบุ'}</p>
                        <p><strong>อายุ:</strong> ${student.age || 'ไม่ระบุ'} ปี</p>
                    </div>
                </div>

                <div class="student-stats">
                    <h3>ข้อมูลการเรียน</h3>
                    <p>จำนวนห้องเรียนที่ลงทะเบียน: ${enrollments.size} ห้อง</p>
                </div>

                ${enrollments.size > 0 ? `
                    <div class="enrolled-classes">
                        <h3>ห้องเรียนที่ลงทะเบียน</h3>
                        <div class="classes-list">
                            ${await getEnrolledClassesHTML(enrollments)}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    } catch (error) {
        console.error('Error viewing student details:', error);
        detailsDiv.innerHTML = '<div class="error">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    }
}

// ฟังก์ชันช่วยดึงข้อมูลห้องเรียน
async function getEnrolledClassesHTML(enrollments) {
    const classesHTML = await Promise.all(enrollments.docs.map(async doc => {
        const classDoc = await db.collection('classes').doc(doc.data().classId).get();
        const classData = classDoc.data();
        if (!classData) return '';

        const teacherDoc = await db.collection('users').doc(classData.teacherId).get();
        const teacherData = teacherDoc.data();

        return `
            <div class="enrolled-class-item">
                <h4>${classData.name}</h4>
                <p>ครูผู้สอน: ${teacherData?.displayName || 'ไม่ระบุ'}</p>
                <p>รหัสห้องเรียน: ${classData.code}</p>
            </div>
        `;
    }));

    return classesHTML.join('');
}

// Render Classes
function renderClasses(classes) {
    const classesList = document.getElementById('classesList');
    classesList.innerHTML = classes.map(classData => `
        <div class="class-card">
            <div class="class-info">
                <h3>${classData.name}</h3>
                <p class="teacher-link" onclick="showTeacherDetails('${classData.teacherId}')">
                    ครูผู้สอน: ${classData.teacherName}
                </p>
                <p>รหัสห้องเรียน: ${classData.code}</p>
                <p>จำนวนนักเรียน: ${classData.studentsCount} คน</p>
                <button onclick="showClassStudents('${classData.id}')" class="view-btn">
                    ดูรายชื่อนักเรียน
                </button>
            </div>
        </div>
    `).join('');
}

// Show Teacher Details
async function showTeacherDetails(teacherId) {
    const modal = document.getElementById('teacherModal');
    const detailsDiv = document.getElementById('teacherDetails');
    detailsDiv.innerHTML = '<div class="loading">กำลังโหลดข้อมูล...</div>';
    modal.style.display = 'block';

    try {
        const teacherDoc = await db.collection('users').doc(teacherId).get();
        const teacher = teacherDoc.data();

        // Get teacher's statistics
        const [classes, problems, logins] = await Promise.all([
            db.collection('classes').where('teacherId', '==', teacherId).get(),
            db.collection('problems').where('teacherId', '==', teacherId).get(),
            db.collection('user_activity')
                .where('userId', '==', teacherId)
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get()
        ]);

        detailsDiv.innerHTML = `
            <div class="teacher-profile">
                <h2>${teacher.displayName || 'ไม่ระบุชื่อ'}</h2>
                <p>อีเมล: ${teacher.email}</p>
                <p>โรงเรียน: ${teacher.school || 'ไม่ระบุ'}</p>
                <p>วิชาที่สอน: ${teacher.subject || 'ไม่ระบุ'}</p>
                <p>ระดับชั้น: ${teacher.teachingLevel || 'ไม่ระบุ'}</p>
                
                <div class="statistics">
                    <h3>สถิติ</h3>
                    <p>จำนวนห้องเรียน: ${classes.size}</p>
                    <p>จำนวนโจทย์ที่สร้าง: ${problems.size}</p>
                </div>

                <div class="recent-activity">
                    <h3>การเข้าใช้งานล่าสุด</h3>
                    ${logins.empty ? '<p>ไม่มีข้อมูลการเข้าใช้งาน</p>' :
                logins.docs.map(doc => {
                    const activity = doc.data();
                    return `<p>${formatDate(activity.timestamp)}</p>`;
                }).join('')
            }
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error showing teacher details:', error);
        detailsDiv.innerHTML = '<div class="error">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    }
}

// Show Class Students
async function showClassStudents(classId) {
    const modal = document.getElementById('studentModal');
    const detailsDiv = document.getElementById('studentDetails');
    detailsDiv.innerHTML = '<div class="loading">กำลังโหลดข้อมูล...</div>';
    modal.style.display = 'block';

    try {
        const studentsSnapshot = await db.collection('class_students')
            .where('classId', '==', classId)
            .get();

        if (studentsSnapshot.empty) {
            detailsDiv.innerHTML = '<p>ไม่มีนักเรียนในห้องเรียนนี้</p>';
            return;
        }

        let studentsList = '<div class="students-list">';

        for (const doc of studentsSnapshot.docs) {
            const studentData = doc.data();
            const studentDoc = await db.collection('users').doc(studentData.studentId).get();
            const student = studentDoc.data();

            const submissions = await db.collection('submissions')
                .where('studentId', '==', studentData.studentId)
                .where('classId', '==', classId)
                .get();

            studentsList += `
                <div class="student-item">
                    <h3>${student.displayName || 'ไม่ระบุชื่อ'}</h3>
                    <p>งานที่ส่ง: ${submissions.size} ชิ้น</p>
                    <button onclick="showStudentDetails('${studentData.studentId}', '${classId}')" 
                            class="view-btn">
                        ดูรายละเอียด
                    </button>
                </div>
            `;
        }

        studentsList += '</div>';
        detailsDiv.innerHTML = studentsList;
    } catch (error) {
        console.error('Error showing class students:', error);
        detailsDiv.innerHTML = '<div class="error">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    }
}

// Show Student Details
async function showStudentDetails(studentId, classId) {
    const detailsDiv = document.getElementById('studentDetails');
    detailsDiv.innerHTML = '<div class="loading">กำลังโหลดข้อมูล...</div>';

    try {
        const [studentDoc, submissions, activities] = await Promise.all([
            db.collection('users').doc(studentId).get(),
            db.collection('submissions')
                .where('studentId', '==', studentId)
                .where('classId', '==', classId)
                .get(),
            db.collection('user_activity')
                .where('userId', '==', studentId)
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get()
        ]);

        const student = studentDoc.data();

        detailsDiv.innerHTML = `
            <div class="student-profile">
                <h2>${student.displayName || 'ไม่ระบุชื่อ'}</h2>
                <div class="submissions-section">
                    <h3>งานที่ส่ง (${submissions.size} ชิ้น)</h3>
                    ${await renderSubmissions(submissions)}
                </div>
                <div class="activity-section">
                    <h3>ประวัติการเข้าใช้งาน</h3>
                    ${renderActivities(activities)}
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error showing student details:', error);
        detailsDiv.innerHTML = '<div class="error">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    }
}

// Render student submissions
async function renderSubmissions(submissions) {
    if (submissions.empty) {
        return '<p class="no-data">ยังไม่มีการส่งงาน</p>';
    }

    const submissionsList = [];
    for (const doc of submissions.docs) {
        const submission = doc.data();

        // ดึงข้อมูลโจทย์ที่เกี่ยวข้อง
        const problemDoc = await db.collection('problems').doc(submission.problemId).get();
        const problem = problemDoc.data() || {};

        submissionsList.push(`
            <div class="submission-item">
                <div class="submission-header">
                    <h4>${problem.title || 'ไม่ระบุชื่อโจทย์'}</h4>
                    <span class="submission-status ${submission.passed ? 'passed' : 'failed'}">
                        ${submission.passed ? 'ผ่าน' : 'ไม่ผ่าน'}
                    </span>
                </div>
                <div class="submission-details">
                    <p>คะแนน: ${submission.score}/${submission.maxScore || 10}</p>
                    <p>ประเภท: ${getProblemTypeThai(problem.type)}</p>
                    <p>ส่งเมื่อ: ${formatDate(submission.submittedAt)}</p>
                </div>
            </div>
        `);
    }

    return submissionsList.join('');
}

// Render student activities
function renderActivities(activities) {
    if (activities.empty) {
        return '<p class="no-data">ไม่พบประวัติการใช้งาน</p>';
    }

    const activityList = activities.docs.map(doc => {
        const activity = doc.data();
        return `
            <div class="activity-item">
                <div class="activity-icon ${activity.type}"></div>
                <div class="activity-info">
                    <p class="activity-type">${getActivityTypeThai(activity.type)}</p>
                    <p class="activity-time">${formatDate(activity.timestamp)}</p>
                    ${activity.details ? `<p class="activity-details">${activity.details}</p>` : ''}
                </div>
            </div>
        `;
    }).join('');

    return `<div class="activity-list">${activityList}</div>`;
}

// Helper function for activity type translation
function getActivityTypeThai(type) {
    const types = {
        'login': 'เข้าสู่ระบบ',
        'view_problem': 'ดูโจทย์',
        'submit_answer': 'ส่งคำตอบ',
        'join_class': 'เข้าร่วมห้องเรียน',
        'view_class': 'เข้าดูห้องเรียน'
    };
    return types[type] || type;
}

// Helper function for problem type translation
function getProblemTypeThai(type) {
    const types = {
        'flowchart': 'ผังงาน',
        'python': 'Python',
        'comprehension': 'ความเข้าใจ',
        'matching': 'จับคู่'
    };
    return types[type] || type;
}

// Helper function for date formatting
function formatDate(timestamp) {
    if (!timestamp) return 'ไม่ระบุเวลา';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}
// เพิ่มส่วนแสดงสถิติรวมที่ส่วนบนของ dashboard
// admin-dashboard.js
async function loadDashboardStats() {
    try {
        console.log("Loading stats..."); // เพิ่ม log เพื่อเช็คว่าฟังก์ชันทำงาน
        // ดึงข้อมูลทั้งหมดพร้อมกัน
        const [problemsSnapshot, usersSnapshot, classesSnapshot] = await Promise.all([
            db.collection('problems').get(),
            db.collection('users').get(),
            db.collection('classes').get()
        ]);

        // นับจำนวนโจทย์แต่ละประเภท
        const problemStats = {
            total: problemsSnapshot.size,
            flowchart: 0,
            python: 0,
            comprehension: 0,
            matching: 0
        };

        problemsSnapshot.forEach(doc => {
            const type = doc.data().type;
            if (problemStats.hasOwnProperty(type)) {
                problemStats[type]++;
            }
        });

        // นับจำนวนครูและนักเรียน
        const userStats = {
            teachers: 0,
            students: 0
        };

        usersSnapshot.forEach(doc => {
            const role = doc.data().role;
            if (role === 'teacher') userStats.teachers++;
            if (role === 'student') userStats.students++;
        });

        console.log("Stats calculated:", { problemStats, userStats }); // เพิ่ม log

        // อัพเดทการแสดงผล
        document.getElementById('totalTeachers').textContent = `${userStats.teachers} คน`;
        document.getElementById('totalStudents').textContent = `${userStats.students} คน`;
        document.getElementById('totalClasses').textContent = `${classesSnapshot.size} ห้อง`;
        document.getElementById('totalProblems').textContent = `${problemStats.total} ข้อ`;
        document.getElementById('flowchartProblems').textContent = `${problemStats.flowchart} ข้อ`;
        document.getElementById('pythonProblems').textContent = `${problemStats.python} ข้อ`;
        document.getElementById('comprehensionProblems').textContent = `${problemStats.comprehension} ข้อ`;
        document.getElementById('matchingProblems').textContent = `${problemStats.matching} ข้อ`;

        // สร้างกราฟ
        createProblemTypePieChart({
            flowchart: problemStats.flowchart,
            python: problemStats.python,
            comprehension: problemStats.comprehension,
            matching: problemStats.matching
        });

    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}
// แก้ไขชื่อฟังก์ชันให้ตรงกัน
function createProblemTypePieChart(data) {
    const ctx = document.getElementById('problemTypeChart').getContext('2d');

    // ต้องเช็คว่ามี Chart เก่าไหม และทำลายถ้ามี
    if (window.myChart instanceof Chart) {
        window.myChart.destroy();
    }

    window.myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Flowchart', 'Python', 'Comprehension', 'Matching'],
            datasets: [{
                data: [data.flowchart, data.python, data.comprehension, data.matching],
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}
// Helper Functions
function getProblemDifficultyThai(difficulty) {
    const difficulties = {
        'easy': 'ง่าย',
        'medium': 'ปานกลาง',
        'hard': 'ยาก'
    };
    return difficulties[difficulty] || difficulty;
}


function updateStatsDisplay(userStats, problemStats, totalClasses) {
    // อัพเดทจำนวนผู้ใช้และห้องเรียน
    document.getElementById('totalTeachers').textContent = `${userStats.teachers} คน`;
    document.getElementById('totalStudents').textContent = `${userStats.students} คน`;
    document.getElementById('totalClasses').textContent = `${totalClasses} ห้อง`;

    // อัพเดทจำนวนโจทย์
    document.getElementById('totalProblems').textContent = `${problemStats.total} ข้อ`;
    document.getElementById('flowchartProblems').textContent = `${problemStats.flowchart} ข้อ`;
    document.getElementById('pythonProblems').textContent = `${problemStats.python} ข้อ`;
    document.getElementById('comprehensionProblems').textContent = `${problemStats.comprehension} ข้อ`;
    document.getElementById('matchingProblems').textContent = `${problemStats.matching} ข้อ`;
}

// สร้างกราฟวงกลมแสดงสัดส่วนประเภทโจทย์
function createProblemTypeChart(stats) {
    const ctx = document.getElementById('problemTypeChart').getContext('2d');

    // ทำลายกราฟเก่าถ้ามี
    if (window.problemTypeChart) {
        window.problemTypeChart.destroy();
    }

    window.problemTypeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Flowchart', 'Python', 'Comprehension', 'Matching'],
            datasets: [{
                data: [
                    stats.flowchart,
                    stats.python,
                    stats.comprehension,
                    stats.matching
                ],
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                }
            }
        }
    });
}

let allSharedProblems = [];

async function loadSharedProblems() {
    const sharedProblemsList = document.getElementById('sharedProblemsList');
    if (!sharedProblemsList) return;
    sharedProblemsList.innerHTML = '<div class="loading">กำลังโหลดข้อมูล...</div>';

    try {
        const snapshot = await db.collection('problems')
            .where('isShared', '==', true)
            .get();

        allSharedProblems = [];

        for (const doc of snapshot.docs) {
            const problem = doc.data();
            if (problem.teacherId) {
                const teacherDoc = await db.collection('users').doc(problem.teacherId).get();
                const teacher = teacherDoc.data();

                // กรองไม่แสดงโจทย์ที่แชร์โดย Admin
                if (teacher && teacher.role !== 'admin' && teacher.email !== 'kitti2@thawara.ac.th') {
                    allSharedProblems.push({
                        id: doc.id,
                        ...problem,
                        teacherName: teacher.displayName || 'ไม่ระบุ',
                        teacherSchool: teacher.school || 'ไม่ระบุ',
                        teacherSubject: teacher.subject || 'ไม่ระบุ'
                    });
                }
            }
        }

        setupSharedProblemFilters();
        filterAndRenderSharedProblems();
    } catch (error) {
        console.error('Error loading shared problems:', error);
        sharedProblemsList.innerHTML = '<div class="error">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    }
}

function setupSharedProblemFilters() {
    const searchInput = document.getElementById('sharedProblemSearch');
    const filterSelect = document.getElementById('sharedProblemTypeFilter');

    if (searchInput && !searchInput.dataset.listener) {
        searchInput.addEventListener('input', filterAndRenderSharedProblems);
        searchInput.dataset.listener = 'true';
    }
    if (filterSelect && !filterSelect.dataset.listener) {
        filterSelect.addEventListener('change', filterAndRenderSharedProblems);
        filterSelect.dataset.listener = 'true';
    }
}

function filterAndRenderSharedProblems() {
    const searchVal = document.getElementById('sharedProblemSearch')?.value?.toLowerCase() || '';
    const typeVal = document.getElementById('sharedProblemTypeFilter')?.value || '';
    const sharedProblemsList = document.getElementById('sharedProblemsList');
    if (!sharedProblemsList) return;

    const filtered = allSharedProblems.filter(prob => {
        const matchesSearch = prob.title?.toLowerCase().includes(searchVal) || 
                              prob.description?.toLowerCase().includes(searchVal) ||
                              prob.teacherName?.toLowerCase().includes(searchVal);
        const matchesType = !typeVal || prob.type === typeVal;
        return matchesSearch && matchesType;
    });

    if (filtered.length === 0) {
        sharedProblemsList.innerHTML = '<div class="no-data" style="padding: 20px; text-align: center; color: #666;">ไม่พบโจทย์ที่แชร์ที่ตรงตามเงื่อนไข</div>';
        return;
    }

    sharedProblemsList.innerHTML = '';
    filtered.forEach(prob => {
        const div = document.createElement('div');
        div.className = 'problem-card';
        div.innerHTML = `
            <div class="problem-info">
                <h3>${prob.title}</h3>
                <p style="margin-top: 5px; margin-bottom: 5px; color: #7f8c8d;">
                    <strong>ประเภท:</strong> ${getProblemTypeThai(prob.type)} | <strong>ระดับความยาก:</strong> ${getProblemDifficultyThai(prob.difficulty)}
                </p>
                <p style="margin-top: 0; margin-bottom: 5px; color: #2980b9;">
                    <strong>ผู้สร้าง:</strong> ${prob.teacherName} (${prob.teacherSchool})
                </p>
                <p class="description" style="color: #555;">${prob.description || 'ไม่มีคำอธิบาย'}</p>
            </div>
            <div class="problem-actions" style="display: flex; gap: 10px;">
                <button onclick="window.adminDashboard.viewProblemDetails('${prob.id}')" class="primary-btn">ดูรายละเอียด</button>
            </div>
        `;
        sharedProblemsList.appendChild(div);
    });
}