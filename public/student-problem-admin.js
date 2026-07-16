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
        checkStudentRole(user.uid);
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

// ตรวจสอบสถานะนักเรียนและโหลดข้อมูล
async function checkStudentRole(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists || userDoc.data().role !== 'student') {
            alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้ เฉพาะนักเรียนเท่านั้น');
            window.location.href = 'index.html';
            return;
        }

        // หา UID ของ admin (kitti2@thawara.ac.th)
        const adminSnapshot = await db.collection('users')
            .where('email', '==', 'kitti2@thawara.ac.th')
            .get();

        if (adminSnapshot.empty) {
            alert('ไม่พบข้อมูลผู้ดูแลระบบ');
            window.location.href = 'student-dashboard.html';
            return;
        }

        const adminId = adminSnapshot.docs[0].id;
        const adminData = adminSnapshot.docs[0].data();

        // แสดงข้อมูล Admin แทนข้อมูลห้องเรียน
        displayAdminInfo(adminData);

        await Promise.all([
            loadProblems(adminId, userId),
            loadStats(adminId, userId),
            initProgressChart('admin', userId)
        ]);

        // เริ่มการอัพเดตอัตโนมัติ
        startStatsUpdate(adminId, userId);

    } catch (error) {
        console.error("Error checking role:", error);
        alert('เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์');
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

function displayAdminInfo(adminData) {
    const classInfoContainer = document.querySelector('.class-info');
    if (classInfoContainer) {
        classInfoContainer.innerHTML = `
            <div class="admin-section" style="padding: 10px 15px; margin-bottom: 20px; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div class="admin-avatar" style="width: 40px; height: 40px; font-size: 1.2em; flex-shrink: 0; background: linear-gradient(135deg, #6c5ce7, #a29bfe); display: flex; justify-content: center; align-items: center; color: white; border-radius: 50%;">
                        <i class="fas fa-user-shield"></i>
                    </div>
                    <div>
                        <h2 style="font-size: 1.1em; margin: 0; color: #2d3436;">โจทย์พิเศษจากผู้ดูแลระบบ <span style="font-size: 0.8em; color: #636e72; font-weight: normal;">(สำหรับทุกคน)</span></h2>
                    </div>
                </div>
                <div class="admin-profile" style="margin: 0; font-size: 0.85em; color: #636e72; display: flex; align-items: center; gap: 10px;">
                    <img src="${adminData.photoURL || defaultAvatar}" alt="Admin" style="width: 25px; height: 25px; border-radius: 50%; object-fit: cover;">
                    <span style="font-weight: bold; color: #2d3436;">${adminData.displayName || 'Admin'}</span>
                </div>
            </div>
        `;
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

async function loadProblems(adminId, userId) {
    const problemList = document.getElementById('problemList');
    try {
        problemList.innerHTML = '<p>กำลังโหลดข้อมูล...</p>';

        const adminProblemsSnapshot = await db.collection('problems')
            .where('teacherId', '==', adminId)
            .get();

        if (adminProblemsSnapshot.empty) {
            problemList.innerHTML = '<p>ยังไม่มีโจทย์จาก Admin</p>';
            return;
        }

        const submissionsSnapshot = await db.collection('submissions')
            .where('studentId', '==', userId)
            .get();

        const submissionStatus = new Map();

        submissionsSnapshot.docs
            .filter(doc => !doc.data().classId || doc.data().classId === 'admin')
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

        const problemPromises = adminProblemsSnapshot.docs.map(async (doc) => {
            const problemData = doc.data();
            const submission = submissionStatus.get(doc.id);

            let status = 'pending';
            if (submission) {
                if (submission.status === 'completed') {
                    status = 'completed';
                } else if (submission.score > 0) {
                    status = 'inProgress';
                }
            }

            return {
                id: doc.id,
                ...problemData,
                classId: 'admin',
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

    // จัดกลุ่มตามหมวดหมู่
    const topicMapping = {
        'basic': '1. พื้นฐาน Python',
        'condition': '2. เงื่อนไข (If-Else)',
        'loop': '3. การวนซ้ำ (Loop)',
        'function': '4. ฟังก์ชัน',
        'datastructure': '5. โครงสร้างข้อมูล',
        'gui': '6. การสร้างหน้าต่าง (GUI)',
        'other': '7. อื่นๆ'
    };

    const groupedProblems = {};
    problems.forEach(p => {
        const topic = p.topic || 'other';
        if (!groupedProblems[topic]) {
            groupedProblems[topic] = [];
        }
        groupedProblems[topic].push(p);
    });

    // เรียงตาม key เพื่อให้ 1, 2, 3... อยู่ตามลำดับ
    const sortedTopics = Object.keys(groupedProblems).sort();

    sortedTopics.forEach(topicKey => {
        const topicProblems = groupedProblems[topicKey];
        const topicName = topicMapping[topicKey] || topicKey;

        // คำนวณความคืบหน้าของหมวดหมู่นี้
        const totalInTopic = topicProblems.length;
        const completedInTopic = topicProblems.filter(p => p.status === 'completed').length;
        const topicProgress = totalInTopic > 0 ? Math.round((completedInTopic / totalInTopic) * 100) : 0;

        // สร้าง Header ของหมวดหมู่
        const topicHeader = document.createElement('div');
        topicHeader.className = 'topic-header';
        topicHeader.style.marginTop = '20px';
        topicHeader.style.marginBottom = '10px';
        topicHeader.style.padding = '10px';
        topicHeader.style.backgroundColor = '#f1f8e9';
        topicHeader.style.borderLeft = '5px solid #4CAF50';
        topicHeader.style.borderRadius = '4px';
        
        let certificateHtml = '';
        if (topicProgress === 100 && totalInTopic > 0) {
            certificateHtml = `<button onclick="downloadCertificate('${topicName}')" style="background-color: #FFD700; color: #000; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-left: 10px;">🏆 รับเกียรติบัตร</button>`;
        }

        topicHeader.innerHTML = `
            <h3 style="margin: 0; color: #2e7d32; display: flex; align-items: center;">
                ${topicName} 
                <span style="font-size: 0.8em; margin-left: 10px; background-color: #c8e6c9; padding: 2px 8px; border-radius: 12px;">
                    สำเร็จ ${completedInTopic}/${totalInTopic} (${topicProgress}%)
                </span>
                ${certificateHtml}
            </h3>
        `;
        problemList.appendChild(topicHeader);

        // สร้างรายการโจทย์ในหมวดหมู่นั้น
        const topicGrid = document.createElement('div');
        topicGrid.className = 'problem-grid';
        topicGrid.style.display = 'grid';
        // ปรับให้การ์ดแคบลง (จาก minmax(300px, 1fr) เป็น minmax(200px, 250px)) เพื่อให้ขนาดพอดีกับปุ่มสั้นๆ
        topicGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 250px))';
        topicGrid.style.gap = '15px';

        topicProblems.forEach(problem => {
            const div = document.createElement('div');
            div.className = 'problem-card';
            div.style.margin = '0'; // reset margin because grid handles gap

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
                    typeText = 'เขียนโปรแกรม';
                    break;
                case 'comprehension':
                    typeIcon = '📝';
                    typeText = 'ความเข้าใจ';
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
                    typeText = 'GUI';
                    break;
                case 'code_order':
                    typeIcon = '🧩';
                    typeText = 'เรียงลำดับ Code';
                    break;
                default:
                    typeIcon = '❓';
                    typeText = 'ไม่ระบุ';
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

            // ถ้าโจทย์ปิดรับคำตอบแล้ว และยังไม่ได้ทำเสร็จ ให้ disable ปุ่ม
            const isDisabled = problem.isClosed && !isViewMode;
            const finalButtonText = isDisabled ? 'ปิดรับคำตอบแล้ว' : buttonText;

            div.innerHTML = `
                <div class="problem-info" style="display: flex; flex-direction: column; height: 100%;">
                    <div class="problem-header" style="display: flex; flex-direction: column; align-items: flex-start; margin-bottom: 12px; gap: 8px;">
                        <span class="problem-type" style="background: #e3f2fd; color: #1565c0; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;">
                            ${typeIcon} <span>${typeText}</span>
                        </span>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="status-badge status-${problem.status}" style="font-size: 0.85em; white-space: nowrap;">
                                ${statusText}
                            </span>
                            ${problem.isClosed ? '<span style="color: #e74c3c; font-weight: bold; font-size: 0.85em;">(ปิดรับคำตอบ)</span>' : ''}
                        </div>
                    </div>
                    <div style="flex-grow: 1;">
                        <h3 style="margin: 0 0 8px 0; font-size: 1.1em; line-height: 1.3;">${problem.title}</h3>
                        <p style="margin: 0; font-size: 0.9em; color: #666; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.4;">
                            ${contentToShow}
                        </p>
                    </div>
                    <div style="margin-top: auto; padding-top: 15px;">
                        <button onclick="viewProblem('${problem.id}', '${problem.type}', ${isViewMode}, ${problem.isClosed || false})" class="primary-btn" style="width: 100%; padding: 8px; border-radius: 4px; font-weight: bold; ${isDisabled ? 'background-color: #ccc; cursor: not-allowed;' : ''}" ${isDisabled ? 'disabled' : ''}>
                            ${finalButtonText}
                        </button>
                    </div>
                </div>
            `;

            topicGrid.appendChild(div);
        });

        problemList.appendChild(topicGrid);
    });
}

function downloadCertificate(topicName) {
    const userName = document.getElementById('displayName')?.textContent || 'นักเรียน';
    
    // สร้าง Canvas เพื่อวาดเกียรติบัตร
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');

    // พื้นหลัง
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // ขอบ
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 10;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
    ctx.strokeStyle = '#81c784';
    ctx.lineWidth = 2;
    ctx.strokeRect(35, 35, canvas.width - 70, canvas.height - 70);

    // ข้อความ
    ctx.textAlign = 'center';
    ctx.fillStyle = '#2e7d32';
    
    ctx.font = 'bold 40px "Sarabun", sans-serif';
    ctx.fillText('เกียรติบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า', canvas.width / 2, 150);
    
    ctx.font = 'bold 50px "Sarabun", sans-serif';
    ctx.fillStyle = '#000000';
    ctx.fillText(userName, canvas.width / 2, 250);
    
    ctx.font = '30px "Sarabun", sans-serif';
    ctx.fillStyle = '#333333';
    ctx.fillText('ได้ผ่านการทดสอบและทำโจทย์ครบถ้วนในหัวข้อ', canvas.width / 2, 330);
    
    ctx.font = 'bold 35px "Sarabun", sans-serif';
    ctx.fillStyle = '#1565c0';
    ctx.fillText(topicName, canvas.width / 2, 400);

    ctx.font = '20px "Sarabun", sans-serif';
    ctx.fillStyle = '#666666';
    const dateStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    ctx.fillText(`ให้ไว้ ณ วันที่ ${dateStr}`, canvas.width / 2, 500);

    ctx.font = '24px "Sarabun", sans-serif';
    ctx.fillStyle = '#000000';
    ctx.fillText('JediCode Platform', canvas.width / 2, 550);

    // ดาวน์โหลด
    const link = document.createElement('a');
    link.download = `Certificate_${topicName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
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
async function loadStats(adminId, userId) {
    try {
        const adminProblemsSnapshot = await db.collection('problems')
            .where('teacherId', '==', adminId)
            .get();

        const totalProblems = adminProblemsSnapshot.size;

        const submissionsSnapshot = await db.collection('submissions')
            .where('studentId', '==', userId)
            .get();

        const latestSubmissions = new Map();
        submissionsSnapshot.docs
            .filter(doc => !doc.data().classId || doc.data().classId === 'admin')
            .forEach(doc => {
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

        for (const doc of adminProblemsSnapshot.docs) {
            const problemId = doc.id;
            const problemData = doc.data();
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

            // ตรวจสอบ submission 
            const submission = latestSubmissions.get(problemId);

            if (submission) {
                // ใช้ maxScore จาก submission สำหรับโจทย์ GUI เพื่อป้องกันคะแนนเต็มไม่ตรงกัน
                if (submission.maxScore && problemData.type === 'gui') {
                    maxScore = submission.maxScore;
                }
                
                if (problemData.type === 'flowchart' || problemData.type === 'gui') {
                    // ถ้าเป็น completed ให้ใช้ maxScore เป็นคะแนน
                    if (submission.status === 'completed') {
                        completedProblems++;
                        // ถ้า score เป็น 0 ให้ใช้ maxScore แทน
                        totalScore += (submission.score > 0 ? submission.score : submission.maxScore);
                    }
                } else if (submission.status === 'completed') {
                    completedProblems++;
                    totalScore += submission.score || 0;
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
            .filter(doc => !doc.data().classId || doc.data().classId === 'admin')
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
    const classId = 'admin';

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
        case 'summary':
            url = `student-summary-detail.html?id=${problemId}&classId=${classId}${viewModeParam}`;
            break;
        case 'iot':
            url = `student-iot-detail.html?id=${problemId}&classId=${classId}${viewModeParam}`;
            break;
        case 'code_order':
            url = `student-code-order-detail.html?id=${problemId}&classId=${classId}${viewModeParam}`;
            break;
        default:
            url = `student-quiz-detail.html?id=${problemId}&classId=${classId}${viewModeParam}`;
    }

    window.location.href = url;
}


let statsInterval;

function startStatsUpdate(adminId, userId) {
    // เคลียร์ interval เดิมถ้ามี
    if (statsInterval) {
        clearInterval(statsInterval);
    }

    // อัพเดตทุกๆ 5 วินาที
    statsInterval = setInterval(() => {
        loadStats(adminId, userId);
        // ยกเลิกการเรียก loadProblems ซ้ำๆ เพื่อไม่ให้หน้าเว็บกระพริบ
        // loadProblems(adminId, userId); 
        // ยกเลิกการเรียก initProgressChart ซ้ำๆ ด้วยเหตุผลเดียวกัน
        // initProgressChart('admin', userId);
    }, 5000);
}

window.addEventListener('beforeunload', () => {
    if (statsInterval) {
        clearInterval(statsInterval);
    }
});
// โหลดข้อมูล Admin
async function loadAdminInfo(adminId) {
    try {
        const adminDoc = await db.collection('users').doc(adminId).get();
        if (adminDoc.exists) {
            const adminData = adminDoc.data();
            const adminProfileDiv = document.getElementById('adminProfile');
            if(adminProfileDiv) {
                adminProfileDiv.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="${adminData.photoURL || getAvatarUrl(adminData.email)}" 
                             alt="Admin" 
                             style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;">
                        <span style="font-weight: bold; color: #2d3436;">${adminData.displayName || 'Admin ไม่ระบุชื่อ'}</span>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error("Error loading admin info:", error);
    }
}

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