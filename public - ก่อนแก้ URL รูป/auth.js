// auth.js

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signInWithPopup, GoogleAuthProvider } 
from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc } 
from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDWiPuk0WP9z5_mjDe1FkqeVZ-vcYClyLs",
    authDomain: "python-learning-platform-596e1.firebaseapp.com",
    projectId: "python-learning-platform-596e1",
    storageBucket: "python-learning-platform-596e1.firebasestorage.app",
    messagingSenderId: "5262153531",
    appId: "1:5262153531:web:55f6246093e1780003491e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// ฟังก์ชันสำหรับ Google Sign-in
export async function signInWithGoogle() {
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        console.log("Login successful:", user.email);

        // เช็คว่าผู้ใช้มีข้อมูลใน Firestore หรือยัง
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
            // ถ้าเป็นผู้ใช้ใหม่ ให้เลือก role
            showRoleSelection(user.uid, user.email);
        } else {
            // ถ้ามีข้อมูลแล้ว
            const userData = userDoc.data();
            alert(`ยินดีต้อนรับกลับ! คุณคือ ${userData.role}`);
            // TODO: Redirect to appropriate dashboard
        }
    } catch (error) {
        console.error("Login error:", error);
        alert('เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ' + error.message);
    }
}

// ฟังก์ชันแสดงการเลือก role
function showRoleSelection(userId, email) {
    const roleHtml = `
        <div class="auth-form">
            <h2>เลือกประเภทผู้ใช้</h2>
            <p>อีเมล: ${email}</p>
            <select id="userRole" class="role-select">
                <option value="teacher">ครู</option>
                <option value="student">นักเรียน</option>
            </select>
            <button onclick="window.auth.submitRole('${userId}')">ยืนยัน</button>
        </div>
    `;
    document.querySelector('.container').innerHTML = roleHtml;
}

// ฟังก์ชันบันทึก role
// auth.js
// auth.js
export async function submitRole(userId) {
    try {
        const role = document.getElementById('userRole').value;
        
        // บันทึกข้อมูลลง Firestore
        await setDoc(doc(db, 'users', userId), {
            role: role,
            createdAt: new Date().toISOString(),
            displayName: '' // เพิ่มฟิลด์ displayName
        });

        if (role === 'teacher') {
            window.location.href = 'teacher-dashboard.html';
        } else {
            window.location.href = 'student-dashboard.html';
        }
    } catch (error) {
        console.error("Submit role error:", error);
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message);
    }
}

// Export functions
export const authFunctions = {
    signInWithGoogle,
    submitRole
};