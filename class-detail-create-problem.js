// เพิ่ม Event Listener สำหรับปุ่มสร้างโจทย์ใหม่
document.getElementById('createProblemBtn').addEventListener('click', () => {
    document.getElementById('createProblemModal').style.display = 'block';
});

// ฟังก์ชันปิด Modal
function closeCreateProblemModal() {
    document.getElementById('createProblemModal').style.display = 'none';
    document.getElementById('createProblemForm').reset();
}

// ฟังก์ชันเพิ่ม Test Case
function addTestCase() {
    const testCaseHTML = `
        <div class="test-case">
            <div class="form-group">
                <label>Input</label>
                <input type="text" class="test-input" placeholder='{"x": 1, "y": 2}'>
            </div>
            <div class="form-group">
                <label>Expected Output</label>
                <input type="text" class="test-output" placeholder="3">
            </div>
            <button type="button" onclick="removeTestCase(this)" class="delete-btn">ลบ</button>
        </div>
    `;
    document.getElementById('testCasesList').insertAdjacentHTML('beforeend', testCaseHTML);
}

// ฟังก์ชันลบ Test Case
function removeTestCase(button) {
    button.parentElement.remove();
}

// จัดการการส่งฟอร์ม
document.getElementById('createProblemForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
        // รวบรวมข้อมูลจากฟอร์ม
        const title = document.getElementById('problemTitle').value;
        const description = document.getElementById('problemDescription').value;
        const templateCode = document.getElementById('templateCode').value;

        // รวบรวม test cases
        const testCases = [];
        document.querySelectorAll('.test-case').forEach(testCase => {
            try {
                const input = JSON.parse(testCase.querySelector('.test-input').value);
                const output = JSON.parse(testCase.querySelector('.test-output').value);
                testCases.push({ input, expected: output });
            } catch (error) {
                console.error('Invalid test case format:', error);
            }
        });

        // สร้างโจทย์ใน Firestore
        const user = firebase.auth().currentUser;
        const problemData = {
            title,
            description,
            templateCode,
            testCases,
            teacherId: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            classNames: [] // เริ่มต้นด้วย array ว่าง
        };

        // บันทึกโจทย์
        const docRef = await db.collection('problems').add(problemData);
        
        // เพิ่มโจทย์เข้าห้องเรียนปัจจุบัน
        const classId = new URLSearchParams(window.location.search).get('id');
        await db.collection('class_problems').add({
            problemId: docRef.id,
            classId: classId,
            addedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // อัพเดท classNames ในโจทย์
        const classDoc = await db.collection('classes').doc(classId).get();
        await docRef.update({
            classNames: firebase.firestore.FieldValue.arrayUnion(classDoc.data().name)
        });

        alert('บันทึกโจทย์สำเร็จ');
        closeCreateProblemModal();
        loadProblems(classId); // รีโหลดรายการโจทย์

    } catch (error) {
        console.error('Error creating problem:', error);
        alert('เกิดข้อผิดพลาดในการบันทึกโจทย์');
    }
});