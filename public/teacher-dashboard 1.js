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
const defaultAvatar = `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <path fill="#999" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
    </svg>
  `)}`;
function getProfileImage(user) {
    if (!user || !user.photoURL) {
        return defaultAvatar;
    }

    // Cache รูปภาพใน localStorage
    const cachedImage = localStorage.getItem(`profileImage_${user.uid}`);
    if (cachedImage) {
        return cachedImage;
    }

    // ถ้าไม่มี cache ให้ใช้ defaultAvatar ก่อน แล้วค่อยๆ โหลดรูปจริง
    setTimeout(() => {
        fetch(user.photoURL)
            .then(response => response.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    localStorage.setItem(`profileImage_${user.uid}`, reader.result);
                    const profileImages = document.querySelectorAll(`.profile-image[data-uid="${user.uid}"]`);
                    profileImages.forEach(img => img.src = reader.result);
                };
                reader.readAsDataURL(blob);
            })
            .catch(() => {
                localStorage.setItem(`profileImage_${user.uid}`, defaultAvatar);
            });
    }, 1000);

    return defaultAvatar;
}
// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // ปุ่มแก้ไขชื่อ
    const editNameBtn = document.getElementById('editNameBtn');
    const editNameForm = document.getElementById('editNameForm');
    const saveNameBtn = document.getElementById('saveNameBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const createClassBtn = document.getElementById('createClassBtn');
    const createProblemBtn = document.getElementById('createProblemBtn');

    // Event listeners สำหรับการแก้ไขชื่อ
    if (editNameBtn) {
        editNameBtn.addEventListener('click', () => {
            document.getElementById('displayName').style.display = 'none';
            editNameForm.style.display = 'block';
        });
    }

    if (saveNameBtn) {
        saveNameBtn.addEventListener('click', updateDisplayName);
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            document.getElementById('displayName').style.display = 'block';
            editNameForm.style.display = 'none';
        });
    }

    // Event listener สำหรับการสร้างห้องเรียน
    if (createClassBtn) {
        createClassBtn.addEventListener('click', createClass);
    }

    // Event listener สำหรับการสร้างโจทย์
    if (createProblemBtn) {
        createProblemBtn.addEventListener('click', () => {
            document.getElementById('problemModal').style.display = 'flex';
        });
    }

    // Event listener สำหรับการออกจากระบบ
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.signOut().then(() => {
                window.location.href = 'index.html';
            }).catch((error) => {
                console.error('Error signing out:', error);
            });
        });
    }
});






window.toggleProblemTypeFields = function () {
    const problemType = document.getElementById('problemType').value;
    const sections = ['pythonSection', 'comprehensionContentGroup',
        'questionsSection', 'matchingSection', 'flowchartSection'];

    sections.forEach(section => {
        const element = document.getElementById(section);
        if (element) {
            element.style.display = 'none';
        }
    });

    if (problemType === 'flowchart') {
        document.getElementById('flowchartSection').style.display = 'block';
        // สร้าง FlowchartEditor ใหม่ถ้ายังไม่มี
        if (!window.flowchartEditor) {
            window.flowchartEditor = new FlowchartEditor('flowchartCanvas');
        }
    } else if (problemType === 'python') {
        document.getElementById('pythonSection').style.display = 'block';
    } else if (problemType === 'comprehension') {
        document.getElementById('comprehensionContentGroup').style.display = 'block';
        document.getElementById('questionsSection').style.display = 'block';
    } else if (problemType === 'matching') {
        document.getElementById('matchingSection').style.display = 'block';
    }
};

function initFlowchartEditor() {
    if (!window.flowchartEditor) {
        window.flowchartEditor = new FlowchartEditor('flowchartCanvas');

        // เพิ่ม event listener สำหรับการเปลี่ยน tool
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const toolType = e.currentTarget.dataset.type;

                // ลบ active state จากทุกปุ่ม
                document.querySelectorAll('.tool-btn').forEach(b => {
                    b.classList.remove('active');
                });

                // เพิ่ม active state ให้ปุ่มที่เลือก
                e.currentTarget.classList.add('active');

                // อัพเดทการแสดง connection points
                const canvas = document.getElementById('flowchartCanvas');
                if (toolType === 'arrow') {
                    canvas.classList.add('show-connection-points');
                } else {
                    canvas.classList.remove('show-connection-points');
                }

                // อัพเดท cursor style
                if (toolType === 'arrow') {
                    canvas.style.cursor = 'crosshair';
                } else if (toolType === 'delete') {
                    canvas.style.cursor = 'no-drop';
                } else {
                    canvas.style.cursor = 'default';
                }
            });
        });
    }
}

// ฟังก์ชันอัพเดทการแสดงผลโปรไฟล์
function getUserProfileImage(user) {
    if (user.photoURL) {
        // ถ้ามีรูปจาก Google Account
        return user.photoURL;
    } else if (user.email) {
        // ถ้าไม่มีรูปจาก Google ใช้ Gravatar
        const hash = md5(user.email.trim().toLowerCase());
        return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=200`;
    } else {
        // ถ้าไม่มีทั้งสองอย่าง
        return '/images/default-avatar.png';
    }
}

// Check Teacher Role
async function checkTeacherRole(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists && userDoc.data().role === 'teacher') {
            await loadClasses(userId);
            await loadProblems();
        } else {
            alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error("Error checking role:", error);
        alert('เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์');
    }
}




// แก้ไขใน auth.onAuthStateChanged
auth.onAuthStateChanged(async (user) => {
    if (user) {
        try {
            console.log('User logged in:', user.email);
            await loadUserInfo(user);
            await checkTeacherRole(user.uid);

        } catch (error) {
            console.error('Error setting up dashboard:', error);
            console.log('Error details:', error);
        }
    } else {
        window.location.href = 'index.html';
    }
});
// แก้ไขฟังก์ชัน loadUserInfo
async function loadUserInfo(user, userRole) {
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        const userInfo = document.querySelector('.user-info');

        // ไม่ต้องใช้เงื่อนไข userRole แล้ว เพราะเราต้องการแสดงเฉพาะข้อมูลพื้นฐาน
        const profileContent = `
            <div class="profile-container">
                <img src="${user.photoURL || defaultAvatar}" 
                     alt="โปรไฟล์" 
                     class="profile-image"
                     onerror="this.src='${defaultAvatar}'"
                     style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover;">
                <div class="profile-details">
                    <div class="profile-name-container">
                        <span id="displayName">${userData.displayName || 'กิตติพัฒน์ จิตต์สว่าง'}</span>
                    </div>
                    <div class="profile-info">
                        <p>อีเมล: ${user.email || 'zaddam.ranger@thawara.ac.th'}</p>
                        <p>โรงเรียน: ${userData.school || 'ถ.น111'}</p>
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
                        <label>ชื่อ-นามสกุล *</label>
                        <input type="text" id="editName" value="${userData.displayName || ''}" required
                               placeholder="กรุณากรอกชื่อ-นามสกุล">
                    </div>
                    <div class="form-group">
                        <label>โรงเรียน *</label>
                        <input type="text" id="editSchool" value="${userData.school || ''}" required
                               placeholder="กรุณากรอกชื่อโรงเรียน">
                    </div>
                    ${userData.role === 'teacher' ? `
                        <div class="form-group">
                            <label>วิชาที่สอน *</label>
                            <input type="text" id="editSubject" value="${userData.subject || ''}" required
                                   placeholder="กรุณากรอกวิชาที่สอน">
                        </div>
                        <div class="form-group">
                            <label>ระดับชั้นที่สอน *</label>
                            <select id="editTeachingLevel" multiple required>
                                <optgroup label="ประถมศึกษา">
                                    <option value="ป.1" ${(userData.teachingLevel || []).includes('ป.1') ? 'selected' : ''}>ป.1</option>
                                    <option value="ป.2" ${(userData.teachingLevel || []).includes('ป.2') ? 'selected' : ''}>ป.2</option>
                                    <option value="ป.3" ${(userData.teachingLevel || []).includes('ป.3') ? 'selected' : ''}>ป.3</option>
                                    <option value="ป.4" ${(userData.teachingLevel || []).includes('ป.4') ? 'selected' : ''}>ป.4</option>
                                    <option value="ป.5" ${(userData.teachingLevel || []).includes('ป.5') ? 'selected' : ''}>ป.5</option>
                                    <option value="ป.6" ${(userData.teachingLevel || []).includes('ป.6') ? 'selected' : ''}>ป.6</option>
                                </optgroup>
                                <optgroup label="มัธยมศึกษา">
                                    <option value="ม.1" ${(userData.teachingLevel || []).includes('ม.1') ? 'selected' : ''}>ม.1</option>
                                    <option value="ม.2" ${(userData.teachingLevel || []).includes('ม.2') ? 'selected' : ''}>ม.2</option>
                                    <option value="ม.3" ${(userData.teachingLevel || []).includes('ม.3') ? 'selected' : ''}>ม.3</option>
                                    <option value="ม.4" ${(userData.teachingLevel || []).includes('ม.4') ? 'selected' : ''}>ม.4</option>
                                    <option value="ม.5" ${(userData.teachingLevel || []).includes('ม.5') ? 'selected' : ''}>ม.5</option>
                                    <option value="ม.6" ${(userData.teachingLevel || []).includes('ม.6') ? 'selected' : ''}>ม.6</option>
                                </optgroup>
                            </select>
                            <small>*กดปุ่ม Ctrl (Windows) หรือ Command (Mac) เพื่อเลือกหลายระดับชั้น</small>
                        </div>
                    ` : `
                        <div class="form-group">
                            <label>ระดับชั้น *</label>
                            <select id="editGrade" required>
                                <option value="">กรุณาเลือกระดับชั้น</option>
                                <optgroup label="ประถมศึกษา">
                                    <option value="ป.1" ${userData.grade === 'ป.1' ? 'selected' : ''}>ป.1</option>
                                    <option value="ป.2" ${userData.grade === 'ป.2' ? 'selected' : ''}>ป.2</option>
                                    <option value="ป.3" ${userData.grade === 'ป.3' ? 'selected' : ''}>ป.3</option>
                                    <option value="ป.4" ${userData.grade === 'ป.4' ? 'selected' : ''}>ป.4</option>
                                    <option value="ป.5" ${userData.grade === 'ป.5' ? 'selected' : ''}>ป.5</option>
                                    <option value="ป.6" ${userData.grade === 'ป.6' ? 'selected' : ''}>ป.6</option>
                                </optgroup>
                                <optgroup label="มัธยมศึกษา">
                                    <option value="ม.1" ${userData.grade === 'ม.1' ? 'selected' : ''}>ม.1</option>
                                    <option value="ม.2" ${userData.grade === 'ม.2' ? 'selected' : ''}>ม.2</option>
                                    <option value="ม.3" ${userData.grade === 'ม.3' ? 'selected' : ''}>ม.3</option>
                                    <option value="ม.4" ${userData.grade === 'ม.4' ? 'selected' : ''}>ม.4</option>
                                    <option value="ม.5" ${userData.grade === 'ม.5' ? 'selected' : ''}>ม.5</option>
                                    <option value="ม.6" ${userData.grade === 'ม.6' ? 'selected' : ''}>ม.6</option>
                                </optgroup>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>อายุ *</label>
                            <input type="number" id="editAge" value="${userData.age || ''}" min="6" max="20" required
                                   placeholder="กรุณากรอกอายุ">
                        </div>
                    `}
                    <div class="form-actions">
                        <button type="submit" class="submit-btn">บันทึกข้อมูล</button>
                        <button type="button" class="cancel-btn" onclick="closeEditProfileModal()">ยกเลิก</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    modal.innerHTML = content;
    document.body.appendChild(modal);

    // เพิ่ม Event Listener สำหรับการ Submit Form
    document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        // ตรวจสอบการเลือกระดับชั้นสำหรับครู
        if (userData.role === 'teacher') {
            const teachingLevelSelect = document.getElementById('editTeachingLevel');
            if (teachingLevelSelect.selectedOptions.length === 0) {
                alert('กรุณาเลือกระดับชั้นที่สอนอย่างน้อย 1 ระดับ');
                return;
            }
        }

        await updateUserProfile(userData.role);
    });
}

async function updateUserProfile(role) {
    try {
        const user = auth.currentUser;
        const userData = {
            displayName: document.getElementById('editName').value.trim(),
            school: document.getElementById('editSchool').value.trim(),
        };

        if (role === 'teacher') {
            userData.subject = document.getElementById('editSubject').value.trim();
            const teachingLevelSelect = document.getElementById('editTeachingLevel');
            userData.teachingLevel = Array.from(teachingLevelSelect.selectedOptions).map(option => option.value);
        } else {
            userData.grade = document.getElementById('editGrade').value;
            userData.age = parseInt(document.getElementById('editAge').value);
        }

        await db.collection('users').doc(user.uid).update(userData);
        await user.updateProfile({ displayName: userData.displayName });

        alert('อัพเดทข้อมูลสำเร็จ');
        closeEditProfileModal();
        
        // สั่ง refresh page หลังจากปิด modal
        window.location.reload(true); // true คือการบังคับให้โหลดใหม่จาก server ไม่ใช้ cache (เหมือน Ctrl+F5)
        
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('เกิดข้อผิดพลาดในการอัพเดทข้อมูล');
    }
}


function closeEditProfileModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.remove();
        }, 150);
    }
}
function addVariable() {
    const variablesList = document.getElementById('variablesList');
    if (!variablesList) return;

    const varItem = document.createElement('div');
    varItem.className = 'variable-item';
    varItem.innerHTML = `
        <input type="text" class="var-name" placeholder="ชื่อตัวแปร เช่น num1, total" required>
        <textarea class="var-description" placeholder="คำอธิบายตัวแปร เช่น ตัวเลขที่ 1, ผลรวมทั้งหมด" required></textarea>
        <div class="variable-actions">
            <button type="button" class="delete-var-btn" onclick="deleteVariable(this)">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    variablesList.appendChild(varItem);
}

function deleteVariable(button) {
    if (confirm('คุณต้องการลบตัวแปรนี้ใช่หรือไม่?')) {
        const varItem = button.closest('.variable-item');
        varItem.remove();
    }
}
// เพิ่มฟังก์ชันที่จำเป็น
function showEditNameForm() {
    document.getElementById('displayName').style.display = 'none';
    document.getElementById('editNameForm').style.display = 'block';
}

function cancelEditName() {
    document.getElementById('displayName').style.display = 'block';
    document.getElementById('editNameForm').style.display = 'none';
}

async function updateDisplayName() {
    const newName = document.getElementById('newName').value.trim();
    if (!newName) {
        alert('กรุณากรอกชื่อ');
        return;
    }

    try {
        const user = auth.currentUser;
        await db.collection('users').doc(user.uid).update({
            displayName: newName
        });

        // อัพเดท displayName ใน Firebase Auth
        await user.updateProfile({
            displayName: newName
        });

        document.getElementById('displayName').textContent = newName;
        document.getElementById('displayName').style.display = 'block';
        document.getElementById('editNameForm').style.display = 'none';

        alert('อัพเดทชื่อสำเร็จ');
    } catch (error) {
        console.error('Error updating name:', error);
        alert('เกิดข้อผิดพลาดในการอัพเดทชื่อ');
    }
}

async function logout() {
    try {
        await auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error signing out:', error);
        alert('เกิดข้อผิดพลาดในการออกจากระบบ');
    }
}



// Create Class
async function createClass() {
    const className = document.getElementById('className').value;
    if (!className) {
        alert('กรุณาใส่ชื่อห้องเรียน');
        return;
    }

    try {
        const user = auth.currentUser;
        const classCode = generateClassCode();

        await db.collection('classes').add({
            name: className,
            code: classCode,
            teacherId: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert(`สร้างห้องเรียนสำเร็จ!\nรหัสห้องเรียน: ${classCode}`);
        document.getElementById('className').value = '';
        loadClasses(user.uid);
    } catch (error) {
        console.error('Error creating class:', error);
        alert('เกิดข้อผิดพลาดในการสร้างห้องเรียน');
    }
}

// Load Classes
async function loadClasses(userId) {
    const classList = document.getElementById('classList');
    if (!classList) return;

    try {
        classList.innerHTML = '<p>กำลังโหลดข้อมูล...</p>';

        const snapshot = await db.collection('classes')
            .where('teacherId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get();

        if (snapshot.empty) {
            classList.innerHTML = '<p>ยังไม่มีห้องเรียน</p>';
            return;
        }

        classList.innerHTML = '';
        snapshot.forEach(doc => {
            const classData = doc.data();
            const classDiv = document.createElement('div');
            classDiv.className = 'class-card';
            classDiv.innerHTML = `
                <div class="class-info">
                    <h3>${classData.name}</h3>
                    <p class="class-code">รหัสห้องเรียน: ${classData.code}</p>
                </div>
                <div class="class-actions">
                    <button onclick="viewClass('${doc.id}')" class="secondary-btn">ดูรายละเอียด</button>
                    <button onclick="deleteClass('${doc.id}')" class="delete-btn">ลบห้องเรียน</button>
                </div>
            `;
            classList.appendChild(classDiv);
        });
    } catch (error) {
        console.error('Error loading classes:', error);
        classList.innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    }
}

// Load Problems
async function loadProblem(problemId, userId) {
    try {
        const problemDoc = await db.collection('problems').doc(problemId).get();

        if (!problemDoc.exists) {
            throw new Error('ไม่พบโจทย์');
        }

        // ดึงข้อมูลและทำความสะอาด test cases
        let problemData = problemDoc.data();

        // ทำความสะอาด test cases
        if (problemData.testCases) {
            problemData.testCases = problemData.testCases.map(testCase => ({
                ...testCase,
                // ลบ quotes และ extra escapes
                input: testCase.input.replace(/^["']|["']$/g, '').replace(/\\\\/g, '\\'),
                expected: testCase.expected.replace(/^["']|["']$/g, '')
            }));
        }

        currentProblem = {
            id: problemDoc.id,
            ...problemData,
            createdAt: problemData.createdAt?.toDate() || null,
            updatedAt: problemData.updatedAt?.toDate() || null
        };

        // อัพเดทการแสดงผล
        updateProblemDisplay();
        await loadLastSubmission(problemId, userId);

        return true;
    } catch (error) {
        console.error('Error loading problem:', error);
        throw error;
    }
}

// Generate Class Code
function generateClassCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Handle Problem Modal
function closeModal() {
    const modal = document.getElementById('problemModal');
    const form = document.getElementById('problemForm');

    // รีเซ็ตฟอร์ม
    form.reset();
    form.removeAttribute('data-problem-id');

    // รีเซ็ตข้อความปุ่มบันทึก
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'บันทึก';
    }

    // ซ่อน modal
    modal.style.display = 'none';
}
function addTestCase() {
    const testCasesList = document.getElementById('testCasesList');
    if (!testCasesList) return;

    const testCase = document.createElement('div');
    testCase.className = 'test-case';
    testCase.innerHTML = `
        <div class="test-case-content">
            <div class="inputs-section">
                <h4>Inputs</h4>
                <div class="input-list">
                    <!-- จะถูกเพิ่มด้วย addInputToTestCase -->
                </div>
                <button type="button" class="secondary-btn add-input-btn" onclick="addInputToTestCase(this)">
                    + เพิ่ม Input
                </button>
            </div>
            
            <div class="form-group">
                <label>Expected Output *</label>
                <input type="text" class="test-output input-field" 
                    placeholder="เช่น: ผลบวก 5 + 3 = 8"
                    required>
            </div>

            <div class="form-group">
                <label>คะแนน</label>
                <input type="number" class="test-score input-field" 
                    value="1" min="1" max="10">
            </div>
            
            <div class="form-group">
                <label>คำอธิบาย Test Case</label>
                <input type="text" class="test-explanation input-field" 
                    placeholder="อธิบายเพิ่มเติมเกี่ยวกับ test case นี้">
            </div>
        </div>
        <button type="button" onclick="removeTestCase(this)" class="delete-btn">ลบ Test Case</button>
    `;
    testCasesList.appendChild(testCase);

    // เพิ่ม input แรกอัตโนมัติ
    const addInputBtn = testCase.querySelector('.add-input-btn');
    addInputToTestCase(addInputBtn);
}
// ในฟังก์ชัน addTestCase()
function addInputToTestCase(button) {
    const inputList = button.parentElement.querySelector('.input-list');
    const inputCount = inputList.children.length + 1;

    const inputDiv = document.createElement('div');
    inputDiv.className = 'input-entry';
    inputDiv.innerHTML = `
        <div class="input-entry-content">
            <div class="form-group">
                <label>ชื่อ Input</label>
                <input type="text" class="input-name input-field" 
                    value="ตัวเลขที่ ${inputCount}" required>
            </div>
            <div class="form-group">
                <label>ค่า</label>
                <input type="text" class="input-value input-field" required>
            </div>
        </div>
        <button type="button" class="delete-btn small" onclick="removeInput(this)">ลบ</button>
    `;
    inputList.appendChild(inputDiv);
}

function removeInput(button) {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบ input นี้?')) {
        const inputEntry = button.parentElement;
        const inputList = inputEntry.parentElement;
        inputEntry.remove();

        // รีเนมเบอร์ inputs ที่เหลือ
        inputList.querySelectorAll('.input-entry').forEach((entry, index) => {
            const nameInput = entry.querySelector('.input-name');
            if (nameInput.value.startsWith('ตัวเลขที่')) {
                nameInput.value = `ตัวเลขที่ ${index + 1}`;
            }
        });
    }
}

// เพิ่มฟังก์ชันลบ Test Case
function removeTestCase(button) {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบ Test Case นี้?')) {
        button.parentElement.remove();
    }
}
async function editProblem(problemId) {
    try {
        const problemDoc = await db.collection('problems').doc(problemId).get();
        if (!problemDoc.exists) {
            alert('ไม่พบโจทย์');
            return;
        }

        const problemData = problemDoc.data();
        console.log("Loading problem data:", problemData);

        // แสดง modal ก่อน
        const modal = document.getElementById('problemModal');
        if (modal) {
            modal.style.display = 'flex';
        }

        // รอให้ DOM สร้างเสร็จ
        await new Promise(resolve => setTimeout(resolve, 100));

        // เติมข้อมูลพื้นฐาน
        const problemTitle = document.getElementById('problemTitle');
        const problemType = document.getElementById('problemType');
        const problemDifficulty = document.getElementById('problemDifficulty');

        if (problemTitle && problemType && problemDifficulty) {
            problemTitle.value = problemData.title || '';
            problemType.value = problemData.type || 'python';
            problemDifficulty.value = problemData.difficulty || 'medium';

            // เรียก toggle หลังจากเซ็ตค่า
            toggleProblemTypeFields();
        }

        // โหลดข้อมูลตัวแปร
        const variablesList = document.getElementById('variablesList');
        if (variablesList) {
            variablesList.innerHTML = ''; // เคลียร์ข้อมูลเดิม
            if (problemData.variables && problemData.variables.length > 0) {
                problemData.variables.forEach(variable => {
                    const varItem = document.createElement('div');
                    varItem.className = 'variable-item';
                    varItem.innerHTML = `
                        <input type="text" class="var-name" value="${variable.name}" placeholder="ชื่อตัวแปร เช่น num1, total" required>
                        <textarea class="var-description" placeholder="คำอธิบายตัวแปร เช่น ตัวเลขที่ 1, ผลรวมทั้งหมด" required>${variable.description}</textarea>
                        <div class="variable-actions">
                            <button type="button" class="delete-var-btn" onclick="deleteVariable(this)">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                    variablesList.appendChild(varItem);
                });
            }
        }

        // จัดการรูปภาพ
        const imageInput = document.getElementById('problemImage');
        const imagePreview = document.getElementById('imagePreview');
        if (problemData.image && imageInput && imagePreview) {
            imageInput.value = problemData.image;
            imagePreview.innerHTML = `
                <div class="preview-container">
                    <img src="${problemData.image}" 
                         alt="ตัวอย่างรูปภาพ"
                         onerror="handleImageError(this)">
                </div>
            `;
            imagePreview.style.display = 'block';
        } else if (imagePreview) {
            imagePreview.innerHTML = '';
            imagePreview.style.display = 'none';
        }

        // โหลดข้อมูลตามประเภทโจทย์
        switch (problemData.type) {
            case 'python':
                // โหลดข้อมูลโจทย์ Python
                if (document.getElementById('problemDescription')) {
                    document.getElementById('problemDescription').value = problemData.description || '';
                }
                if (document.getElementById('templateCode')) {
                    document.getElementById('templateCode').value = problemData.templateCode || '';
                }

                // โหลด test cases
                const testCasesList = document.getElementById('testCasesList');
                // โหลด test cases

                if (testCasesList) {
                    testCasesList.innerHTML = ''; // เคลียร์ข้อมูลเก่า
                
                    if (problemData.testCases && problemData.testCases.length > 0) {
                        problemData.testCases.forEach(testCase => {
                            // สร้าง test case element
                            const testCaseDiv = document.createElement('div');
                            testCaseDiv.className = 'test-case';
                            testCaseDiv.innerHTML = `
                                <div class="test-case-content">
                                    <div class="inputs-section">
                                        <h4>Inputs</h4>
                                        <div class="input-list">
                                            ${testCase.inputs ? testCase.inputs.map(input => `
                                                <div class="input-entry">
                                                    <div class="input-entry-content">
                                                        <div class="form-group">
                                                            <label>ชื่อ Input</label>
                                                            <input type="text" class="input-name input-field" 
                                                                value="${input.name}" required>
                                                        </div>
                                                        <div class="form-group">
                                                            <label>ค่า</label>
                                                            <input type="text" class="input-value input-field" 
                                                                value="${input.value}" required>
                                                        </div>
                                                    </div>
                                                    <button type="button" class="delete-btn small" onclick="removeInput(this)">ลบ</button>
                                                </div>
                                            `).join('') : ''}
                                        </div>
                                        <button type="button" class="secondary-btn add-input-btn" onclick="addInputToTestCase(this)">
                                            + เพิ่ม Input
                                        </button>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label>Expected Output *</label>
                                        <input type="text" class="test-output input-field" 
                                            value="${testCase.expected || ''}"
                                            required>
                                    </div>
                
                                    <div class="form-group">
                                        <label>คะแนน</label>
                                        <input type="number" class="test-score input-field" 
                                            value="${testCase.score || 1}" min="1" max="10">
                                    </div>
                                </div>
                                <button type="button" onclick="removeTestCase(this)" class="delete-btn">ลบ Test Case</button>
                            `;
                            testCasesList.appendChild(testCaseDiv);
                        });
                    }
                }
                break;

            case 'matching':
                // โหลดคำอธิบาย
                const matchingDescription = document.getElementById('matchingDescription');
                if (matchingDescription) {
                    matchingDescription.value = problemData.description || '';
                }

                // หา elements รายการคำถามและคำตอบ
                const matchingQuestionsList = document.getElementById('matchingQuestionsList');
                const matchingAnswersList = document.getElementById('matchingAnswersList');

                // เคลียร์ข้อมูลเก่า
                if (matchingQuestionsList) matchingQuestionsList.innerHTML = '';
                if (matchingAnswersList) matchingAnswersList.innerHTML = '';

                // โหลดคู่คำถาม-คำตอบ
                if (problemData.pairs && problemData.pairs.length > 0) {
                    problemData.pairs.forEach((pair) => {
                        // เพิ่มคำถาม
                        addMatchingQuestion({
                            question: pair.question,
                            score: pair.score
                        });

                        // ใส่ข้อความคำถาม
                        const lastQuestion = matchingQuestionsList.lastElementChild;
                        if (lastQuestion) {
                            const questionText = lastQuestion.querySelector('.question-text');
                            if (questionText) questionText.value = pair.question;

                            const scoreInput = lastQuestion.querySelector('.score');
                            if (scoreInput) scoreInput.value = pair.score || 1;
                        }

                        // เพิ่มคำตอบ
                        addMatchingAnswer();

                        // ใส่ข้อความคำตอบ
                        const lastAnswer = matchingAnswersList.lastElementChild;
                        if (lastAnswer) {
                            const answerText = lastAnswer.querySelector('.answer-text');
                            if (answerText) answerText.value = pair.answer;
                        }
                    });
                }
                break;

            case 'comprehension':
                // โหลดข้อมูลโจทย์ความเข้าใจ
                if (document.getElementById('comprehensionContent')) {
                    document.getElementById('comprehensionContent').value = problemData.content || '';
                }

                const comprehensionQuestionsList = document.getElementById('questionsList');
                if (comprehensionQuestionsList && problemData.questions) {
                    comprehensionQuestionsList.innerHTML = '';

                    problemData.questions.forEach(question => {
                        const questionDiv = document.createElement('div');
                        questionDiv.className = 'question-item';
                        questionDiv.innerHTML = `
                            <div class="question-header">
                                <h4>คำถามที่ ${comprehensionQuestionsList.children.length + 1}</h4>
                                <button type="button" onclick="removeComprehensionQuestion(this)" class="delete-btn">
                                    ลบคำถาม
                                </button>
                            </div>
                            <div class="form-group">
                                <label>คำถาม *</label>
                                <textarea class="question-text input-field" required>${question.question}</textarea>
                            </div>
                            <div class="form-group">
                                <label>คำตอบที่ถูกต้อง *</label>
                                <textarea class="correct-answer input-field" required>${question.correctAnswer}</textarea>
                            </div>
                            <div class="form-group">
                                <label>คะแนน</label>
                                <input type="number" class="question-score input-field" value="${question.score || 1}" min="1" max="10">
                            </div>
                        `;
                        comprehensionQuestionsList.appendChild(questionDiv);
                    });
                }
                break;

            case 'flowchart':
                if (document.getElementById('flowchartDescription')) {
                    document.getElementById('flowchartDescription').value = problemData.description || '';
                }

                // โหลดค่าคะแนนและเกณฑ์การตรวจ
                if (document.getElementById('flowchartMaxScore')) {
                    document.getElementById('flowchartMaxScore').value = problemData.maxScore || 10;
                }

                // โหลดคะแนนเกณฑ์การตรวจ
                const scoringInputs = document.querySelectorAll('.score-input');
                if (problemData.scoringCriteria && scoringInputs.length === 3) {
                    problemData.scoringCriteria.forEach((criteria, index) => {
                        if (scoringInputs[index]) {
                            scoringInputs[index].value = criteria.score || 0;
                        }
                    });
                }

                if (window.flowchartEditor) {
                    console.log('Initial flowchart data:', problemData.flowchartData);

                    setTimeout(() => {
                        if (typeof window.flowchartEditor.clearCanvas === 'function') {
                            window.flowchartEditor.clearCanvas();
                            console.log('Canvas cleared');
                        }

                        if (problemData.flowchartData) {
                            console.log('Loading flowchart data:', {
                                symbols: problemData.flowchartData.symbols,
                                connections: problemData.flowchartData.connections?.map(c => ({
                                    id: c.id,
                                    bendPoints: c.bendPoints
                                }))
                            });

                            window.flowchartEditor.loadData(problemData.flowchartData);
                            console.log('Current editor state:', window.flowchartEditor.getState());
                        }
                    }, 100);
                }
                break;
        }

        // แสดง modal
        const problemForm = document.getElementById('problemForm');
        if (problemForm) {
            problemForm.setAttribute('data-problem-id', problemId);
            document.getElementById('problemModal').style.display = 'flex';
        }

    } catch (error) {
        console.error('Error editing problem:', error);
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูลโจทย์');
    }
}
function logFlowchartData(message, data) {
    console.log(`[Flowchart Debug] ${message}:`, JSON.stringify(data, null, 2));
}

// ฟังก์ชันดูตัวอย่างรูปภาพ
function previewImage() {
    const imageUrl = document.getElementById('problemImage').value;
    const preview = document.getElementById('imagePreview');

    if (!imageUrl) {
        preview.style.display = 'none';
        preview.innerHTML = '';
        return;
    }

    preview.innerHTML = `
        <div class="preview-container">
            <img src="${imageUrl}" 
                 alt="ตัวอย่างรูปภาพ"
                 onerror="handleImageError(this)">
        </div>
    `;
    preview.style.display = 'block';
}

function handleImageError(img) {
    const container = img.parentElement;
    container.innerHTML = `
        <div class="error-message" style="color: #dc3545; text-align: center; padding: 20px;">
            ไม่สามารถโหลดรูปภาพได้ กรุณาตรวจสอบ URL
        </div>
    `;
}

function handleImageSuccess(img) {
    img.parentElement.style.display = 'block';
}


function addComprehensionQuestion() {
    const questionsList = document.getElementById('questionsList');
    const questionNumber = questionsList.children.length + 1;

    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-item';
    questionDiv.innerHTML = `
        <div class="question-header">
            <h4>คำถามที่ ${questionNumber}</h4>
            <button type="button" onclick="removeComprehensionQuestion(this)" class="delete-btn">
                ลบคำถาม
            </button>
        </div>

        <div class="form-group">
            <label>คำถาม *</label>
            <textarea class="question-text input-field" required 
                placeholder="พิมพ์คำถามที่ต้องการถามนักเรียน"></textarea>
        </div>

        <div class="form-group">
            <label>คำตอบที่ถูกต้อง *</label>
            <textarea class="correct-answer input-field" required 
                placeholder="ใส่คำตอบที่ถูกต้อง"></textarea>
        </div>

        <div class="form-group">
            <label>คะแนน</label>
            <input type="number" class="question-score input-field" 
                value="1" min="1" max="10">
        </div>

       
    `;

    questionsList.appendChild(questionDiv);
}

function removeComprehensionQuestion(button) {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบคำถามนี้?')) {
        const questionItem = button.closest('.question-item');
        questionItem.remove();

        // รีเนมเบอร์คำถามที่เหลือ
        const questions = document.querySelectorAll('.question-item');
        questions.forEach((q, index) => {
            q.querySelector('h4').textContent = `คำถามที่ ${index + 1}`;
        });
    }
}

function removeQuestion(button) {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบคำถามนี้?')) {
        const questionItem = button.closest('.question-item');
        questionItem.remove();

        // รีเนมเบอร์คำถามที่เหลือ
        const questions = document.querySelectorAll('.question-item');
        questions.forEach((q, index) => {
            q.querySelector('h4').textContent = `คำถามที่ ${index + 1}`;
        });
    }
}

// Save Problem
async function saveProblem() {
    try {
        const user = auth.currentUser;
        const form = document.getElementById('problemForm');
        if (!form) throw new Error('ไม่พบฟอร์ม');

        const problemId = form.getAttribute('data-problem-id');
        const isEditing = !!problemId;
        const problemType = document.getElementById('problemType').value;

        // เก็บข้อมูลพื้นฐาน
        let problemData = {
            title: document.getElementById('problemTitle')?.value?.trim() || '',
            type: problemType,
            difficulty: document.getElementById('problemDifficulty')?.value || 'medium',
            image: document.getElementById('problemImage')?.value?.trim() || '',
            teacherId: user.uid,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // ตรวจสอบข้อมูลพื้นฐาน
        if (!problemData.title) throw new Error('กรุณาใส่ชื่อโจทย์');

        // เก็บข้อมูลตัวแปร
        const variables = [];
        document.querySelectorAll('.variable-item').forEach(item => {
            const name = item.querySelector('.var-name')?.value?.trim();
            const description = item.querySelector('.var-description')?.value?.trim();
            if (name && description) {
                variables.push({ name, description });
            }
        });
        problemData.variables = variables;

        // แยกการเก็บข้อมูลตามประเภทโจทย์
        switch (problemType) {
            case 'flowchart':
                // เก็บข้อมูลคำอธิบายและคะแนน
                problemData.description = document.getElementById('flowchartDescription')?.value?.trim() || '';
                if (!problemData.description) throw new Error('กรุณาใส่คำอธิบายโจทย์');

                // เก็บคะแนนและเกณฑ์การตรวจ
                const maxScoreInput = document.getElementById('flowchartMaxScore');
                const scoringInputs = document.querySelectorAll('.score-input');

                problemData.maxScore = maxScoreInput ? parseInt(maxScoreInput.value) || 10 : 10;
                problemData.scoringCriteria = Array.from(scoringInputs).map((input, index) => ({
                    criteriaNo: index + 1,
                    score: parseInt(input.value) || 0
                }));

                // ตรวจสอบผลรวมคะแนน
                const totalCriteriaScore = problemData.scoringCriteria.reduce((sum, criteria) =>
                    sum + criteria.score, 0);
                if (totalCriteriaScore !== problemData.maxScore) {
                    throw new Error('ผลรวมคะแนนเกณฑ์การตรวจต้องเท่ากับคะแนนเต็ม');
                }

                // เก็บข้อมูล flowchart
                if (window.flowchartEditor) {
                    const currentFlowchartData = window.flowchartEditor.getData();
                    console.log('Raw flowchart data:', currentFlowchartData);

                    // แก้ตรงนี้
                    const cleanConnections = currentFlowchartData?.connections?.map(conn => {
                        // ทำความสะอาด bendPoints
                        const cleanBendPoints = (conn.bendPoints || []).map(point => {
                            if (typeof point === 'object' && 'x' in point && 'y' in point) {
                                return {
                                    x: parseFloat(point.x) || 0,
                                    y: parseFloat(point.y) || 0
                                };
                            }
                            return null;
                        }).filter(point => point !== null);

                        return {
                            id: conn.id,
                            sourceSymbol: conn.sourceSymbol,
                            targetSymbol: conn.targetSymbol,
                            sourcePoint: conn.sourcePoint,
                            targetPoint: conn.targetPoint,
                            text: conn.text || '',
                            bendPoints: cleanBendPoints
                        };
                    }) || [];

                    problemData.flowchartData = {
                        symbols: cleanSymbols,
                        connections: cleanConnections
                    };

                    if (!isEditing && !problemData.flowchartData.symbols.length) {
                        throw new Error('กรุณาสร้าง Flowchart อย่างน้อย 1 รูปแบบ');
                    }
                }
                break;

            case 'python':
                // เก็บข้อมูลสำหรับโจทย์ Python
                const pythonSection = document.getElementById('pythonSection');
                if (!pythonSection) throw new Error('ไม่พบส่วนของโจทย์ Python');

                problemData.description = document.getElementById('problemDescription')?.value?.trim() || '';
                problemData.templateCode = document.getElementById('templateCode')?.value?.trim() || '';

                if (!problemData.description) throw new Error('กรุณาใส่คำอธิบายโจทย์');
                if (!problemData.templateCode) throw new Error('กรุณาใส่โค้ดเริ่มต้น');

                // รวบรวม test cases
                const testCases = [];
                const testCaseElements = pythonSection.querySelectorAll('.test-case');

                if (!testCaseElements.length) {
                    throw new Error('กรุณาเพิ่มอย่างน้อย 1 test case');
                }

                testCaseElements.forEach((testCase, index) => {
                    const inputs = Array.from(testCase.querySelectorAll('.input-entry')).map(entry => ({
                        name: entry.querySelector('.input-name')?.value?.trim() || '',
                        value: entry.querySelector('.input-value')?.value?.trim() || ''
                    }));

                    const output = testCase.querySelector('.test-output')?.value?.trim() || '';
                    const explanation = testCase.querySelector('.test-explanation')?.value?.trim() || '';
                    const score = parseInt(testCase.querySelector('.test-score')?.value) || 1;

                    if ((!inputs.length && !output) || (inputs.length && !output)) {
                        throw new Error(`กรุณากรอกข้อมูลให้ครบใน Test Case ที่ ${index + 1}`);
                    }

                    testCases.push({
                        inputs: inputs,
                        input: inputs.map(input => input.value).join('\n'),
                        expected: output,
                        explanation: explanation,
                        score: score
                    });
                });

                problemData.testCases = testCases;
                break;

            case 'comprehension':
                problemData.content = document.getElementById('comprehensionContent')?.value?.trim() || '';
                if (!problemData.content) throw new Error('กรุณาใส่เนื้อหา/บทความ');

                const comprehensionQuestions = [];
                const comprehensionElements = document.querySelectorAll('.question-item');

                if (!comprehensionElements.length) {
                    throw new Error('กรุณาเพิ่มอย่างน้อย 1 คำถาม');
                }

                comprehensionElements.forEach((el, index) => {
                    const question = el.querySelector('.question-text')?.value?.trim();
                    const correctAnswer = el.querySelector('.correct-answer')?.value?.trim();
                    const score = parseInt(el.querySelector('.question-score')?.value) || 1;
                    const explanation = el.querySelector('.question-explanation')?.value?.trim() || '';

                    if (!question || !correctAnswer) {
                        throw new Error(`กรุณากรอกคำถามและคำตอบให้ครบในคำถามที่ ${index + 1}`);
                    }

                    comprehensionQuestions.push({ question, correctAnswer, score, explanation });
                });

                problemData.questions = comprehensionQuestions;
                break;

            // แก้ไขส่วนที่เกี่ยวข้องกับการบันทึกโจทย์จับคู่ในฟังก์ชัน saveProblem
            case 'matching':
                problemData.description = document.getElementById('matchingDescription')?.value?.trim();
                if (!problemData.description) throw new Error('กรุณาใส่คำอธิบายโจทย์');

                // รวบรวมคำถามและคำตอบ
                const questions = Array.from(document.querySelectorAll('.question-text')).map(el => ({
                    text: el.value.trim(),
                    score: parseInt(el.closest('.pair-item').querySelector('.score')?.value) || 1
                }));

                const answers = Array.from(document.querySelectorAll('.answer-text')).map(el => ({
                    text: el.value.trim()
                }));

                // ตรวจสอบจำนวนคู่
                if (questions.length === 0 || answers.length === 0) {
                    throw new Error('กรุณาเพิ่มอย่างน้อย 1 คู่คำถาม-คำตอบ');
                }

                if (questions.length !== answers.length) {
                    throw new Error('จำนวนคำถามและคำตอบไม่เท่ากัน');
                }

                // ตรวจสอบข้อมูลและสร้างคู่
                const pairs = [];
                for (let i = 0; i < questions.length; i++) {
                    const questionText = questions[i].text;
                    const answerText = answers[i].text;

                    if (!questionText || !answerText) {
                        throw new Error(`กรุณากรอกคำถามและคำตอบให้ครบในคู่ที่ ${i + 1}`);
                    }

                    pairs.push({
                        question: questionText,
                        answer: answerText,
                        score: questions[i].score
                    });
                }

                problemData.pairs = pairs;
                break;
        }

        // บันทึกข้อมูล
        if (isEditing) {
            await db.collection('problems').doc(problemId).update(problemData);
        } else {
            problemData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('problems').add(problemData);
        }

        alert(isEditing ? 'อัพเดทโจทย์สำเร็จ' : 'บันทึกโจทย์สำเร็จ');
        closeModal();
        loadProblems();

    } catch (error) {
        console.error('Error saving problem:', error);
        alert(`เกิดข้อผิดพลาด: ${error.message}`);
    }
}
function initConnectionPoints(symbolElement) {
    const connectionPoints = [];
    const positions = ['top', 'right', 'bottom', 'left'];
    const symbolBBox = symbolElement.getBBox();

    positions.forEach((position, index) => {
        const point = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        let x, y;

        switch (position) {
            case 'top':
                x = symbolBBox.x + symbolBBox.width / 2;
                y = symbolBBox.y;
                break;
            case 'right':
                x = symbolBBox.x + symbolBBox.width;
                y = symbolBBox.y + symbolBBox.height / 2;
                break;
            case 'bottom':
                x = symbolBBox.x + symbolBBox.width / 2;
                y = symbolBBox.y + symbolBBox.height;
                break;
            case 'left':
                x = symbolBBox.x;
                y = symbolBBox.y + symbolBBox.height / 2;
                break;
        }

        point.setAttribute('cx', x);
        point.setAttribute('cy', y);
        point.setAttribute('r', 4);
        point.setAttribute('class', `connection-point ${position}`);
        point.setAttribute('data-position', position);

        // เพิ่ม event listeners สำหรับการลากเส้น
        point.addEventListener('mousedown', startConnection);
        point.addEventListener('mouseover', () => {
            if (window.flowchartEditor?.state?.isConnecting) {
                point.classList.add('active');
            }
        });
        point.addEventListener('mouseout', () => {
            point.classList.remove('active');
        });

        symbolElement.appendChild(point);
        connectionPoints.push(point);
    });

    return connectionPoints;
}
function sanitizeConnectionData(connection) {
    // ลบ properties ที่เป็น DOM elements
    const { element, elements, ...cleanData } = connection;
    return cleanData;
}

function startConnection(event) {
    const state = window.flowchartEditor.state;
    if (!state || state.currentTool !== 'arrow') return;

    event.stopPropagation();
    const point = event.target;
    const symbol = point.closest('.flowchart-symbol');

    state.isConnecting = true;
    state.sourceSymbol = symbol;
    state.sourcePoint = {
        x: parseFloat(point.getAttribute('cx')),
        y: parseFloat(point.getAttribute('cy')),
        position: point.getAttribute('data-position')
    };

    // สร้างเส้นชั่วคราว
    const svg = document.querySelector('#flowchartCanvas svg');
    state.tempLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
    state.tempLine.setAttribute('class', 'temp-connection');
    state.tempLine.setAttribute('stroke', '#666');
    state.tempLine.setAttribute('stroke-width', '2');
    svg.appendChild(state.tempLine);

    // เพิ่ม event listeners
    svg.addEventListener('mousemove', updateConnection);
    svg.addEventListener('mouseup', finishConnection);
}
function updateConnection(event) {
    const state = window.flowchartEditor.state;
    if (!state.isConnecting || !state.tempLine) return;

    const svg = document.querySelector('#flowchartCanvas svg');
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const transformedPoint = point.matrixTransform(svg.getScreenCTM().inverse());

    const d = `M ${state.sourcePoint.x} ${state.sourcePoint.y} L ${transformedPoint.x} ${transformedPoint.y}`;
    state.tempLine.setAttribute('d', d);
}

function finishConnection(event) {
    const state = window.flowchartEditor.state;
    if (!state.isConnecting) return;

    const targetPoint = event.target;
    if (targetPoint.classList.contains('connection-point')) {
        const targetSymbol = targetPoint.closest('.flowchart-symbol');
        if (targetSymbol && targetSymbol !== state.sourceSymbol) {
            createConnection(
                state.sourceSymbol,
                targetSymbol,
                state.sourcePoint,
                {
                    x: parseFloat(targetPoint.getAttribute('cx')),
                    y: parseFloat(targetPoint.getAttribute('cy')),
                    position: targetPoint.getAttribute('data-position')
                }
            );
        }
    }

    // ทำความสะอาด
    if (state.tempLine) {
        state.tempLine.remove();
        state.tempLine = null;
    }

    const svg = document.querySelector('#flowchartCanvas svg');
    svg.removeEventListener('mousemove', updateConnection);
    svg.removeEventListener('mouseup', finishConnection);

    state.isConnecting = false;
    state.sourceSymbol = null;
    state.sourcePoint = null;
}

function createConnection(sourceSymbol, targetSymbol, sourcePoint, targetPoint) {
    const connectionId = `connection-${Date.now()}`;
    const connection = {
        id: connectionId,
        sourceSymbol: sourceSymbol.id,
        targetSymbol: targetSymbol.id,
        sourcePoint: sourcePoint.position,
        targetPoint: targetPoint.position,
        bendPoints: []
    };

    const path = createConnectionPath(connection);
    window.flowchartEditor.addConnection(connection);
}

async function saveComprehensionProblem() {
    try {
        const problemData = {
            title: document.getElementById('problemTitle').value.trim(),
            type: 'comprehension',
            difficulty: document.getElementById('problemDifficulty').value,
            content: document.getElementById('comprehensionContent').value.trim(),
            questions: [],
            teacherId: auth.currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // รวบรวมคำถาม
        const questionElements = document.querySelectorAll('.question-item');
        questionElements.forEach((el, index) => {
            problemData.questions.push({
                number: index + 1,
                question: el.querySelector('.question-text').value.trim(),
                correctAnswer: el.querySelector('.correct-answer').value.trim(),
                score: parseInt(el.querySelector('.question-score').value) || 1,
                explanation: el.querySelector('.question-explanation').value.trim()
            });
        });

        // ตรวจสอบข้อมูล
        if (!problemData.title) throw new Error('กรุณาใส่ชื่อโจทย์');
        if (!problemData.content) throw new Error('กรุณาใส่เนื้อหา/บทความ');
        if (problemData.questions.length === 0) throw new Error('กรุณาเพิ่มอย่างน้อย 1 คำถาม');

        // บันทึกข้อมูล
        await db.collection('problems').add(problemData);
        alert('บันทึกโจทย์สำเร็จ');
        closeModal();
        loadProblems(); // รีโหลดรายการโจทย์

    } catch (error) {
        console.error('Error saving comprehension problem:', error);
        alert(error.message || 'เกิดข้อผิดพลาดในการบันทึกโจทย์');
    }
}

async function loadProblems() {
    const problemList = document.getElementById('problemList');
    if (!problemList) return;

    try {
        const user = auth.currentUser;
        problemList.innerHTML = '<p>กำลังโหลดข้อมูล...</p>';

        const snapshot = await db.collection('problems')
            .where('teacherId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .get();

        if (snapshot.empty) {
            problemList.innerHTML = '<p>ยังไม่มีโจทย์</p>';
            return;
        }

        problemList.innerHTML = '';
        snapshot.forEach(doc => {
            const problem = doc.data();
            const div = document.createElement('div');
            div.className = 'problem-card';

            // แปลงประเภทโจทย์เป็นภาษาไทย
            const typeMapping = {
                'python': 'โจทย์เขียนโปรแกรม',
                'comprehension': 'คำถามความเข้าใจ',
                'matching': 'จับคู่',
                'flowchart': 'ผังงาน'
            };

            // เลือกไอคอนตามประเภทโจทย์
            const iconMapping = {
                'python': '💻',
                'comprehension': '📝',
                'matching': '🔄',
                'flowchart': '📊'
            };

            const typeIcon = iconMapping[problem.type] || '📄';
            const typeText = typeMapping[problem.type] || 'ไม่ระบุประเภท';

            // เลือกเนื้อหาที่จะแสดงตามประเภทโจทย์
            let contentPreview = '';
            let countText = '';

            if (problem.type === 'flowchart') {
                contentPreview = problem.description || 'ไม่มีคำอธิบาย';
                // นับจำนวน symbols ถ้ามี flowchartData
                const symbolCount = problem.flowchartData?.symbols?.length || 0;
                countText = `จำนวน Symbols: ${symbolCount}`;
            } else if (problem.type === 'python') {
                contentPreview = problem.description || 'ไม่มีคำอธิบาย';
                countText = `จำนวน Test Cases: ${problem.testCases?.length || 0}`;
            } else if (problem.type === 'comprehension') {
                contentPreview = problem.content || 'ไม่มีเนื้อหา';
                countText = `จำนวนคำถาม: ${problem.questions?.length || 0}`;
            } else if (problem.type === 'matching') {
                contentPreview = problem.description || 'ไม่มีคำอธิบาย';
                countText = `จำนวนคู่คำถาม-คำตอบ: ${problem.pairs?.length || 0}`;
            }

            div.innerHTML = `
                <div class="problem-info">
                    <div class="problem-header">
                        <span class="problem-type">${typeIcon} ${typeText}</span>
                    </div>
                    <h3>${problem.title || 'ไม่มีชื่อ'}</h3>
                    <p>${contentPreview}</p>
                    <p>${countText}</p>
                </div>
                <div class="problem-actions">
                    <button onclick="editProblem('${doc.id}')" class="secondary-btn">แก้ไข</button>
                    <button onclick="deleteProblem('${doc.id}')" class="delete-btn">ลบ</button>
                </div>
            `;
            problemList.appendChild(div);
        });
    } catch (error) {
        console.error('Error loading problems:', error);
        problemList.innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    }
}

// Delete Problem
async function deleteProblem(problemId) {
    try {
        // เช็คการใช้งานโจทย์ในห้องเรียนต่างๆ
        const problem = await db.collection('problems').doc(problemId).get();
        const classProblems = await db.collection('class_problems')
            .where('problemId', '==', problemId)
            .get();

        if (!classProblems.empty) {
            // ถ้ามีการใช้งานในห้องเรียน
            const usedClassNames = problem.data().classNames || [];
            const confirmMessage = `โจทย์นี้กำลังถูกใช้งานในห้องเรียน:\n${usedClassNames.join(', ')}\n\nการลบโจทย์จะทำให้โจทย์หายไปจากทุกห้องเรียน\nยืนยันที่จะลบหรือไม่?`;

            if (!confirm(confirmMessage)) {
                return;
            }
        } else {
            // ถ้าไม่มีการใช้งานในห้องเรียน
            if (!confirm('คุณแน่ใจหรือไม่ที่จะลบโจทย์นี้?')) {
                return;
            }
        }

        // ลบความสัมพันธ์กับห้องเรียนทั้งหมด
        const deleteClassProblems = classProblems.docs.map(doc => doc.ref.delete());

        // ลบโจทย์
        const deleteProblem = db.collection('problems').doc(problemId).delete();

        // ดำเนินการลบทั้งหมดพร้อมกัน
        await Promise.all([...deleteClassProblems, deleteProblem]);

        alert('ลบโจทย์สำเร็จ');
        loadProblems();
    } catch (error) {
        console.error('Error deleting problem:', error);
        alert('เกิดข้อผิดพลาดในการลบโจทย์');
    }
}

// Delete Class
async function deleteClass(classId) {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบห้องเรียนนี้?')) return;

    try {
        await db.collection('classes').doc(classId).delete();
        alert('ลบห้องเรียนสำเร็จ');
        loadClasses(auth.currentUser.uid);
    } catch (error) {
        console.error('Error deleting class:', error);
        alert('เกิดข้อผิดพลาดในการลบห้องเรียน');
    }
}



// View Class
function viewClass(classId) {
    window.location.href = `class-detail.html?id=${classId}`;
}
function toggleProblemTypeFields() {
    const problemType = document.getElementById('problemType').value;

    // ซ่อนทุก section ก่อน
    const sections = ['pythonSection', 'comprehensionContentGroup', 'questionsSection', 'matchingSection', 'flowchartSection'];
    sections.forEach(section => {
        const element = document.getElementById(section);
        if (element) element.style.display = 'none';
    });

    // แสดง section ตามประเภทที่เลือก
    if (problemType === 'flowchart') {
        document.getElementById('flowchartSection').style.display = 'block';
        // ไม่ต้อง initialize ใหม่ถ้ามีอยู่แล้ว
        if (!window.flowchartEditor) {
            window.flowchartEditor = new FlowchartEditor('flowchartCanvas');
        }
    } else if (problemType === 'python') {
        document.getElementById('pythonSection').style.display = 'block';
    } else if (problemType === 'comprehension') {
        document.getElementById('comprehensionContentGroup').style.display = 'block';
        document.getElementById('questionsSection').style.display = 'block';
    } else if (problemType === 'matching') {
        document.getElementById('matchingSection').style.display = 'block';
    }
}

let flowchartData = {
    shapes: [],
    connections: []
};

function initConnectorEvents() {
    const canvas = document.getElementById('flowchartCanvas');
    let isDrawing = false;
    let currentPath = null;
    let points = [];

    canvas.addEventListener('mousedown', (e) => {
        if (flowchartState.isConnecting) {
            isDrawing = true;
            points = [`M ${e.offsetX} ${e.offsetY}`];
            currentPath = createPath(points);
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isDrawing) {
            points.push(`L ${e.offsetX} ${e.offsetY}`);
            updatePath(currentPath, points);
        }
    });

    canvas.addEventListener('click', (e) => {
        if (isDrawing) {
            // เพิ่มจุดดัด
            flowchartState.bendPoints.push({ x: e.offsetX, y: e.offsetY });
            createBendPoint(e.offsetX, e.offsetY);
        }
    });

    canvas.addEventListener('dblclick', () => {
        if (isDrawing) {
            isDrawing = false;
            finalizePath(currentPath);
        }
    });
}

function createBendPoint(x, y) {
    const svgCanvas = document.querySelector('#flowchartCanvas svg');
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', 4);
    circle.setAttribute('fill', '#1a73e8');
    circle.setAttribute('class', 'bend-point');
    circle.draggable = true;

    // เพิ่ม event listener สำหรับการลากจุดดัด
    circle.addEventListener('mousedown', startDraggingBendPoint);
    svgCanvas.appendChild(circle);
}

function updatePathWithBendPoints() {
    const points = [flowchartState.startPoint, ...flowchartState.bendPoints];
    const pathData = points.reduce((path, point, index) => {
        return index === 0 ? `M ${point.x} ${point.y}` : `${path} L ${point.x} ${point.y}`;
    }, '');

    const currentPath = document.querySelector('.current-path');
    if (currentPath) {
        currentPath.setAttribute('d', pathData);
    }
}

function saveFlowchart() {
    const flowchartData = {
        symbols: flowchartState.symbols,
        connections: flowchartState.connections,
        bendPoints: flowchartState.bendPoints
    };
    return flowchartData;
}

function loadFlowchart(data) {
    clearCanvas();
    flowchartState = {
        symbols: data.symbols || [],
        connections: data.connections || [],
        bendPoints: data.bendPoints || [],
        selectedElement: null,
        isDragging: false,
        isConnecting: false,
        startPoint: null
    };

    // วาด symbols และ connections
    flowchartState.symbols.forEach(renderSymbol);
    flowchartState.connections.forEach(renderConnection);
}

function initDragAndDrop() {
    const toolButtons = document.querySelectorAll('.tool-btn');
    const canvas = document.getElementById('flowchartCanvas');

    toolButtons.forEach(btn => {
        btn.addEventListener('dragstart', (e) => {
            const type = btn.getAttribute('data-symbol-type');
            e.dataTransfer.setData('symbol-type', type);
        });
    });

    canvas.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('symbol-type');
        createSymbol(type, e.offsetX, e.offsetY);
    });
}
function createSymbol(type, x, y) {
    const symbol = {
        id: `symbol-${Date.now()}`,
        type: type,
        x: x,
        y: y,
        text: ''
    };

    flowchartState.symbols.push(symbol);
    renderSymbol(symbol);
}

function renderSymbol(symbol) {
    const svgCanvas = document.querySelector('#flowchartCanvas svg');
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute('id', symbol.id);
    g.setAttribute('transform', `translate(${symbol.x},${symbol.y})`);

    // สร้างรูปร่างตามประเภท
    const shape = createSymbolShape(symbol.type);
    g.appendChild(shape);

    // เพิ่ม text element
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.textContent = symbol.text;
    text.setAttribute('text-anchor', 'middle');
    g.appendChild(text);

    // เพิ่ม event listeners
    g.addEventListener('mousedown', startDragging);
    g.addEventListener('dblclick', editText);

    svgCanvas.appendChild(g);
}

function addFlowchartShape(type) {
    const shape = {
        id: `shape_${Date.now()}`,
        type: type,
        text: '',
        position: { x: 50, y: 50 }
    };

    flowchartData.shapes.push(shape);
    renderFlowchartShape(shape);
}

function renderFlowchartShape(shape) {
    const canvas = document.getElementById('flowchartCanvas');
    const shapeElement = document.createElement('div');
    shapeElement.id = shape.id;
    shapeElement.className = `flowchart-shape ${shape.type}`;
    shapeElement.draggable = true;

    // สร้าง HTML สำหรับแต่ละรูปแบบ
    shapeElement.innerHTML = `
        <div class="shape-content">
            <textarea placeholder="คลิกเพื่อพิมพ์">${shape.text}</textarea>
        </div>
    `;

    canvas.appendChild(shapeElement);
    makeShapeDraggable(shapeElement);
}

function makeShapeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    element.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

function addMatchingPair() {
    try {
        const questionsList = document.getElementById('questionsList');
        const answersList = document.getElementById('answersList');

        if (!questionsList || !answersList) {
            console.error('Cannot find questionsList or answersList');
            return;
        }

        const pairIndex = questionsList.children.length + 1;

        // สร้างคำถาม
        const questionDiv = document.createElement('div');
        questionDiv.className = 'pair-item';

        // สร้าง label
        const questionLabel = document.createElement('label');
        questionLabel.textContent = `คำถามที่ ${pairIndex}`;

        // สร้าง textarea
        const questionTextarea = document.createElement('textarea');
        questionTextarea.className = 'question-text';
        questionTextarea.required = true;

        // สร้างปุ่มลบ
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'ลบ';
        deleteBtn.onclick = () => deleteMatchingPair(pairIndex);

        // ประกอบส่วนของคำถาม
        questionDiv.appendChild(questionLabel);
        questionDiv.appendChild(questionTextarea);
        questionDiv.appendChild(deleteBtn);

        // สร้างคำตอบ
        const answerDiv = document.createElement('div');
        answerDiv.className = 'pair-item';

        // สร้าง label สำหรับคำตอบ
        const answerLabel = document.createElement('label');
        answerLabel.textContent = `คำตอบที่ ${pairIndex}`;

        // สร้าง textarea สำหรับคำตอบ
        const answerTextarea = document.createElement('textarea');
        answerTextarea.className = 'answer-text';
        answerTextarea.required = true;

        // ประกอบส่วนของคำตอบ
        answerDiv.appendChild(answerLabel);
        answerDiv.appendChild(answerTextarea);

        // เพิ่มเข้าไปในรายการ
        questionsList.appendChild(questionDiv);
        answersList.appendChild(answerDiv);

        console.log('Added new pair successfully');
    } catch (error) {
        console.error('Error adding matching pair:', error);
    }
}

function deleteMatchingPair(index) {
    try {
        if (confirm('คุณแน่ใจหรือไม่ที่จะลบคู่คำถาม-คำตอบนี้?')) {
            const questionsList = document.getElementById('questionsList');
            const answersList = document.getElementById('answersList');

            if (!questionsList || !answersList) {
                console.error('Cannot find lists');
                return;
            }

            // ลบคำถามและคำตอบ
            if (questionsList.children[index - 1]) {
                questionsList.children[index - 1].remove();
            }
            if (answersList.children[index - 1]) {
                answersList.children[index - 1].remove();
            }

            // รีเนมเบอร์คู่ที่เหลือ
            Array.from(questionsList.children).forEach((item, i) => {
                const label = item.querySelector('label');
                if (label) {
                    label.textContent = `คำถามที่ ${i + 1}`;
                }
            });

            Array.from(answersList.children).forEach((item, i) => {
                const label = item.querySelector('label');
                if (label) {
                    label.textContent = `คำตอบที่ ${i + 1}`;
                }
            });
        }
    } catch (error) {
        console.error('Error deleting matching pair:', error);
    }
}



function addMatchingQuestion(data = null) {
    const questionsList = document.getElementById('matchingQuestionsList');

    if (!questionsList) {
        console.error('matchingQuestionsList element not found');
        return;
    }

    const pairIndex = questionsList.children.length + 1;
    const questionDiv = document.createElement('div');
    questionDiv.className = 'pair-item';
    questionDiv.innerHTML = `
        <div class="pair-header">
            <div class="pair-label">คำถามที่ ${pairIndex}</div>
            <div class="score-input">
                <input type="number" 
                       class="score" 
                       value="${data?.score || 1}" 
                       min="1" 
                       max="10">
                <span>คะแนน</span>
            </div>
            <button type="button" class="delete-btn" onclick="deleteMatchingItem(this.parentElement.parentElement, 'question')">ลบ</button>
        </div>
        <textarea 
            class="question-text" 
            placeholder="พิมพ์คำถามที่นี่..." 
            required
        >${data?.question || ''}</textarea>
    `;

    questionsList.appendChild(questionDiv);
}

function addMatchingAnswer() {
    const answersList = document.getElementById('matchingAnswersList');

    if (!answersList) {
        console.error('matchingAnswersList element not found');
        return;
    }

    const pairIndex = answersList.children.length + 1;
    const answerDiv = document.createElement('div');
    answerDiv.className = 'pair-item';
    answerDiv.innerHTML = `
        <div class="pair-header">
            <div class="pair-label">คำตอบที่ ${pairIndex}</div>
            <button type="button" class="delete-btn" onclick="deleteMatchingItem(this.parentElement.parentElement, 'answer')">ลบ</button>
        </div>
        <textarea 
            class="answer-text" 
            placeholder="พิมพ์คำตอบที่นี่..." 
            required
        ></textarea>
    `;

    answersList.appendChild(answerDiv);
}

function deleteMatchingItem(element, type) {
    if (confirm(`คุณแน่ใจหรือไม่ที่จะลบ${type === 'question' ? 'คำถาม' : 'คำตอบ'}นี้?`)) {
        element.remove();
        // Renumber remaining items
        const listId = type === 'question' ? 'matchingQuestionsList' : 'matchingAnswersList';
        const list = document.getElementById(listId);
        if (list) {
            Array.from(list.children).forEach((item, i) => {
                const label = item.querySelector('.pair-label');
                if (label) {
                    label.textContent = `${type === 'question' ? 'คำถาม' : 'คำตอบ'}ที่ ${i + 1}`;
                }
            });
        }
    }
}
function clearFlowchart() {
    if (confirm('คุณแน่ใจหรือไม่ที่จะล้าง Flowchart?')) {
        try {
            // ล้าง state ทั้งหมด
            if (window.flowchartEditor) {
                window.flowchartEditor.clearCanvas();
            }

            // ล้าง elements ทั้งหมดใน SVG ยกเว้น defs
            const svg = document.querySelector('#flowchartCanvas svg');
            if (svg) {
                const defs = svg.querySelector('defs');
                svg.innerHTML = '';
                if (defs) {
                    svg.appendChild(defs);
                }
            }

            // รีเซ็ต state
            if (window.flowchartEditor) {
                window.flowchartEditor.state = {
                    symbols: [],
                    connections: [],
                    isConnecting: false,
                    sourceSymbol: null,
                    sourcePoint: null,
                    tempLine: null,
                    currentTool: null,
                    isDragging: false,
                    selectedElement: null
                };
            }

            console.log('Canvas cleared successfully');
        } catch (error) {
            console.error('Error clearing canvas:', error);
        }
    }
}



// Export functions for HTML
window.clearFlowchart = clearFlowchart;
window.logout = logout;
window.addTestCase = addTestCase;
window.closeModal = closeModal;
window.saveProblem = saveProblem;
window.deleteProblem = deleteProblem;
window.editProblem = editProblem;
window.viewClass = viewClass;
window.deleteClass = deleteClass;
window.removeTestCase = removeTestCase;
window.showEditNameForm = showEditNameForm;
window.cancelEditName = cancelEditName;
window.updateDisplayName = updateDisplayName;
window.addComprehensionQuestion = addComprehensionQuestion;
window.removeComprehensionQuestion = removeComprehensionQuestion;
window.addMatchingQuestion = addMatchingQuestion;
window.addMatchingAnswer = addMatchingAnswer;
window.deleteMatchingItem = deleteMatchingItem;
window.addVariable = addVariable;
window.deleteVariable = deleteVariable;