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

// Auth State Observer
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // แสดงอีเมล
        const userEmail = document.getElementById('userEmail');
        if (userEmail) {
            userEmail.textContent = `อีเมล: ${user.email}`;
        }

        // แสดงชื่อผู้ใช้
        const userName = document.getElementById('userName');
        if (userName) {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                userName.textContent = userDoc.data().displayName || 'ไม่ระบุชื่อ';
            }
        }

        // เช็คสิทธิ์และโหลดข้อมูล
        checkTeacherRole(user.uid);
    } else {
        window.location.href = 'index.html';
    }
});

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

// Update Display Name
async function updateDisplayName() {
    const newName = document.getElementById('newName').value;
    if (!newName) {
        alert('กรุณากรอกชื่อ');
        return;
    }

    try {
        const user = auth.currentUser;
        await db.collection('users').doc(user.uid).update({
            displayName: newName
        });

        document.getElementById('userName').textContent = newName;
        document.getElementById('displayName').style.display = 'block';
        document.getElementById('editNameForm').style.display = 'none';
        alert('อัพเดทชื่อสำเร็จ');
    } catch (error) {
        console.error('Error updating name:', error);
        alert('เกิดข้อผิดพลาดในการอัพเดทชื่อ');
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
            div.innerHTML = `
                <div class="problem-info">
                    <h3>${problem.title}</h3>
                    <p>${problem.description}</p>
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

// Add Test Case
function addTestCase() {
    const testCasesList = document.getElementById('testCasesList');
    const testCase = document.createElement('div');
    testCase.className = 'test-case';
    testCase.innerHTML = `
        <div class="form-group">
            <label>Input</label>
            <input type="text" class="test-input input-field" placeholder='{"x": 1, "y": 2}'>
        </div>
        <div class="form-group">
            <label>Expected Output</label>
            <input type="text" class="test-output input-field" placeholder="3">
        </div>
        <button type="button" onclick="this.parentElement.remove()" class="delete-btn">ลบ</button>
    `;
    testCasesList.appendChild(testCase);
}
async function editProblem(problemId) {
    try {
        // ดึงข้อมูลโจทย์
        const problemDoc = await db.collection('problems').doc(problemId).get();
        if (!problemDoc.exists) {
            alert('ไม่พบโจทย์');
            return;
        }

        const problemData = problemDoc.data();

        // เติมข้อมูลในฟอร์ม
        document.getElementById('problemTitle').value = problemData.title;
        document.getElementById('problemDescription').value = problemData.description;
        document.getElementById('templateCode').value = problemData.templateCode || '';

        // เคลียร์ test cases เก่า
        const testCasesList = document.getElementById('testCasesList');
        testCasesList.innerHTML = '';

        // เพิ่ม test cases จากข้อมูลเดิม
        if (problemData.testCases && problemData.testCases.length > 0) {
            problemData.testCases.forEach(testCase => {
                const testCaseDiv = document.createElement('div');
                testCaseDiv.className = 'test-case';
                testCaseDiv.innerHTML = `
                    <div class="form-group">
                        <label>Input</label>
                        <input type="text" class="test-input input-field" value='${JSON.stringify(testCase.input)}'>
                    </div>
                    <div class="form-group">
                        <label>Expected Output</label>
                        <input type="text" class="test-output input-field" value='${JSON.stringify(testCase.expected)}'>
                    </div>
                    <button type="button" onclick="this.parentElement.remove()" class="delete-btn">ลบ</button>
                `;
                testCasesList.appendChild(testCaseDiv);
            });
        }

        // เก็บ ID ของโจทย์ไว้สำหรับการอัพเดต
        document.getElementById('problemForm').setAttribute('data-problem-id', problemId);

        // เปลี่ยนข้อความปุ่มบันทึก
        const submitBtn = document.querySelector('#problemForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'อัพเดทโจทย์';
        }

        // แสดง modal
        document.getElementById('problemModal').style.display = 'flex';

    } catch (error) {
        console.error('Error editing problem:', error);
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูลโจทย์');
    }
}
// Save Problem
async function saveProblem() {
    try {
        const user = auth.currentUser;
        const form = document.getElementById('problemForm');
        const problemId = form.getAttribute('data-problem-id');
        const isEditing = !!problemId;

        const problemData = {
            title: document.getElementById('problemTitle').value,
            description: document.getElementById('problemDescription').value,
            templateCode: document.getElementById('templateCode').value,
            teacherId: user.uid,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (!isEditing) {
            problemData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        }

        // Get test cases
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
            // อัพเดทโจทย์เดิม
            await db.collection('problems').doc(problemId).update(problemData);
            alert('อัพเดทโจทย์สำเร็จ');
        } else {
            // สร้างโจทย์ใหม่
            await db.collection('problems').add(problemData);
            alert('บันทึกโจทย์สำเร็จ');
        }

        closeModal();
        loadProblems();
    } catch (error) {
        console.error('Error saving problem:', error);
        alert('เกิดข้อผิดพลาดในการบันทึกโจทย์');
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
window.addTestCase = addTestCase;
window.closeModal = closeModal;
window.saveProblem = saveProblem;
window.deleteProblem = deleteProblem;
window.editProblem = editProblem;
window.viewClass = viewClass;
window.deleteClass = deleteClass;