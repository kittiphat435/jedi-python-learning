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
async function loadUserInfo(user) {
    try {
        const userRef = db.collection('users').doc(user.uid);
        const userData = {
            email: user.email,
            displayName: user.displayName || 'อาจารย์',
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        };

        // ใช้รูปโปรไฟล์โดยตรงถ้ามี ถ้าไม่มีใช้ default
        const photoURL = user.photoURL || defaultAvatar;
        if (user.photoURL) {
            userData.photoURL = user.photoURL;
        }

        await userRef.set(userData, { merge: true });

        const userInfo = document.querySelector('.user-info');
        if (userInfo) {
            userInfo.innerHTML = `
                <div class="profile-container">
                    <img src="${photoURL}" 
                         alt="โปรไฟล์" 
                         class="profile-image"
                         onerror="this.src='${defaultAvatar}'"
                         style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover;">
                    <div class="profile-details">
                        <div class="profile-name-container">
                            <span id="displayName">${user.displayName || 'อาจารย์'}</span>
                            <button onclick="showEditNameForm()" class="edit-btn">
                                <i class="fas fa-edit"></i> แก้ไขชื่อ
                            </button>
                        </div>
                        <div id="editNameForm" style="display: none;">
                            <input type="text" id="newName" class="edit-name-input" 
                                   value="${user.displayName || 'อาจารย์'}"
                                   placeholder="กรอกชื่อใหม่">
                            <div class="edit-name-actions">
                                <button onclick="updateDisplayName()" class="save-btn">บันทึก</button>
                                <button onclick="cancelEditName()" class="cancel-btn">ยกเลิก</button>
                            </div>
                        </div>
                        <div class="profile-email">${user.email}</div>
                    </div>
                </div>
                <button onclick="logout()" class="logout-btn">ออกจากระบบ</button>
            `;
        }
    } catch (error) {
        console.error('Error loading user info:', error);
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

        // เติมข้อมูลพื้นฐาน
        document.getElementById('problemTitle').value = problemData.title || '';
        document.getElementById('problemType').value = problemData.type || 'python';
        document.getElementById('problemDifficulty').value = problemData.difficulty || 'medium';

        // เรียก toggle เพื่อแสดง/ซ่อนฟิลด์ที่เหมาะสม
        toggleProblemTypeFields();

        // จัดการรูปภาพถ้ามี
        const imageInput = document.getElementById('problemImage');
        const imagePreview = document.getElementById('imagePreview');
        if (problemData.image) {
            imageInput.value = problemData.image;
            imagePreview.innerHTML = `
                <div class="preview-container">
                    <img src="${problemData.image}" 
                         alt="ตัวอย่างรูปภาพ"
                         onerror="handleImageError(this)">
                </div>
            `;
            imagePreview.style.display = 'block';
        } else {
            imagePreview.innerHTML = '';
            imagePreview.style.display = 'none';
        }

        if (problemData.type === 'python') {
            // โหลดข้อมูลสำหรับโจทย์ Python
            document.getElementById('problemDescription').value = problemData.description || '';
            document.getElementById('templateCode').value = problemData.templateCode || '';

            // เคลียร์ test cases เก่า
            const testCasesList = document.getElementById('testCasesList');
            testCasesList.innerHTML = '';

            // เพิ่ม test cases จากข้อมูลเดิม
            if (problemData.testCases && problemData.testCases.length > 0) {
                problemData.testCases.forEach(testCase => {
                    const testCaseDiv = document.createElement('div');
                    testCaseDiv.className = 'test-case';

                    let inputsHtml = '';
                    if (testCase.inputs && testCase.inputs.length > 0) {
                        inputsHtml = testCase.inputs.map(input => `
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
                        `).join('');
                    }

                    testCaseDiv.innerHTML = `
                        <div class="test-case-content">
                            <div class="inputs-section">
                                <h4>Inputs</h4>
                                <div class="input-list">
                                    ${inputsHtml}
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
                                     value="${testCase.score || 1}"
                                     min="1" max="10">
                            </div>
                            <div class="form-group">
                                <label>คำอธิบาย Test Case</label>
                                <input type="text" class="test-explanation input-field" 
                                     value="${testCase.explanation || ''}">
                            </div>
                        </div>
                        <button type="button" onclick="removeTestCase(this)" class="delete-btn">ลบ Test Case</button>
                    `;
                    testCasesList.appendChild(testCaseDiv);
                });
            }
        } else if (problemData.type === 'comprehension') {
            // โหลดข้อมูลสำหรับคำถามความเข้าใจ
            document.getElementById('comprehensionContent').value = problemData.content || '';
            const questionsList = document.getElementById('questionsList');
            questionsList.innerHTML = ''; // เคลียร์คำถามเก่า

            // เพิ่มคำถามจากข้อมูลเดิม
            if (problemData.questions && problemData.questions.length > 0) {
                problemData.questions.forEach((question, index) => {
                    const questionDiv = document.createElement('div');
                    questionDiv.className = 'question-item';
                    questionDiv.innerHTML = `
                        <div class="question-header">
                            <h4>คำถามที่ ${index + 1}</h4>
                            <button type="button" onclick="removeComprehensionQuestion(this)" class="delete-btn">
                                ลบคำถาม
                            </button>
                        </div>
                        <div class="form-group">
                            <label>คำถาม *</label>
                            <textarea class="question-text input-field" required>${question.question || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>คำตอบที่ถูกต้อง *</label>
                            <textarea class="correct-answer input-field" required>${question.correctAnswer || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>คะแนน</label>
                            <input type="number" class="question-score input-field" 
                                value="${question.score || 1}" min="1" max="10">
                        </div>
                    
                    `;
                    questionsList.appendChild(questionDiv);
                });
            }
        }

        document.getElementById('problemForm').setAttribute('data-problem-id', problemId);
        document.getElementById('problemModal').style.display = 'flex';

    } catch (error) {
        console.error('Error editing problem:', error);
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูลโจทย์');
    }
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
function toggleProblemTypeFields() {
    const problemType = document.getElementById('problemType').value;

    // ส่วนของ Python Programming
    const pythonFields = [
        'explanGroup',// div ครอบ คำอธิบายโจทย์
        'inputFormatGroup',   // div ครอบ input format
        'outputFormatGroup',  // div ครอบ output format
        'exampleGroup',       // div ครอบ example
        'templateCodeGroup',  // div ครอบ template code
        'testCasesSection'    // div ครอบ test cases
    ];

    // ส่วนของคำถามความเข้าใจ
    const comprehensionFields = [
        'comprehensionContentGroup',  // div ครอบเนื้อหา
        'questionsSection'            // div ครอบคำถาม
    ];

    if (problemType === 'python') {
        // แสดงฟิลด์สำหรับ Python Programming
        pythonFields.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.style.display = 'block';
        });

        // ซ่อนฟิลด์สำหรับคำถามความเข้าใจ
        comprehensionFields.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.style.display = 'none';
        });

    } else {
        // ซ่อนฟิลด์สำหรับ Python Programming
        pythonFields.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.style.display = 'none';
        });

        // แสดงฟิลด์สำหรับคำถามความเข้าใจ
        comprehensionFields.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.style.display = 'block';
        });
    }
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
        const problemData = {
            title: document.getElementById('problemTitle')?.value?.trim() || '',
            type: problemType,
            difficulty: document.getElementById('problemDifficulty')?.value || 'medium',
            image: document.getElementById('problemImage')?.value?.trim() || '',
            teacherId: user.uid,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // ตรวจสอบข้อมูลพื้นฐาน
        if (!problemData.title) throw new Error('กรุณาใส่ชื่อโจทย์');

        // แยกการเก็บข้อมูลตามประเภทโจทย์
        if (problemType === 'python') {
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

        } else if (problemType === 'comprehension') {
            // เก็บข้อมูลสำหรับคำถามความเข้าใจ
            problemData.content = document.getElementById('comprehensionContent')?.value?.trim() || '';
            if (!problemData.content) throw new Error('กรุณาใส่เนื้อหา/บทความ');

            const questions = [];
            const questionElements = document.querySelectorAll('.question-item');

            if (!questionElements.length) {
                throw new Error('กรุณาเพิ่มอย่างน้อย 1 คำถาม');
            }

            questionElements.forEach((el, index) => {
                const question = el.querySelector('.question-text')?.value?.trim();
                const correctAnswer = el.querySelector('.correct-answer')?.value?.trim();
                const score = parseInt(el.querySelector('.question-score')?.value) || 1;
                const explanation = el.querySelector('.question-explanation')?.value?.trim() || '';

                if (!question || !correctAnswer) {
                    throw new Error(`กรุณากรอกคำถามและคำตอบให้ครบในคำถามที่ ${index + 1}`);
                }

                questions.push({ question, correctAnswer, score, explanation });
            });

            problemData.questions = questions;
        }

        // บันทึกข้อมูล
        if (isEditing) {
            await db.collection('problems').doc(problemId).update(problemData);
            alert('อัพเดทโจทย์สำเร็จ');
        } else {
            problemData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('problems').add(problemData);
            alert('บันทึกโจทย์สำเร็จ');
        }

        closeModal();
        loadProblems();

    } catch (error) {
        console.error('Error saving problem:', error);
        alert(`เกิดข้อผิดพลาด: ${error.message}`);
    }
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

            const typeIcon = problem.type === 'python' ? '💻' : '📝';
            const typeText = problem.type === 'python' ? 'โจทย์เขียนโปรแกรม' : 'คำถามความเข้าใจ';

            // เลือกเนื้อหาที่จะแสดงตามประเภทโจทย์
            const contentPreview = problem.type === 'python'
                ? (problem.description || 'ไม่มีคำอธิบาย')
                : (problem.passage || problem.content || 'ไม่มีเนื้อหา');

            div.innerHTML = `
                <div class="problem-info">
                    <div class="problem-header">
                        <span class="problem-type">${typeIcon} ${typeText}</span>
                    </div>
                    <h3>${problem.title || 'ไม่มีชื่อ'}</h3>
                    <p>${contentPreview}</p>
                    <p>จำนวน${problem.type === 'python' ? ' Test Cases' : 'คำถาม'}: 
                       ${problem.type === 'python' ?
                    (problem.testCases?.length || 0) :
                    (problem.questions?.length || 0)}</p>
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

// Export functions for HTML
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
