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

const __docCache = new Map();
const __docInflight = new Map();
async function getDocCached(collectionName, docId, ttlMs = 60000) {
    const key = `${collectionName}/${docId}`;
    const now = Date.now();
    const cached = __docCache.get(key);
    if (cached && (now - cached.fetchedAt) < ttlMs) {
        return cached.value;
    }
    const inflight = __docInflight.get(key);
    if (inflight) {
        return inflight;
    }
    const p = db.collection(collectionName).doc(docId).get().then((snap) => {
        const value = { id: snap.id, exists: snap.exists, data: snap.data() };
        __docCache.set(key, { value, fetchedAt: Date.now() });
        __docInflight.delete(key);
        return value;
    }).catch((err) => {
        __docInflight.delete(key);
        throw err;
    });
    __docInflight.set(key, p);
    return p;
}
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
    setupEditNameListeners();

    // ปุ่มเข้าร่วมห้องเรียน
    const joinClassBtn = document.getElementById('joinClassBtn');
    if (joinClassBtn) {
        joinClassBtn.addEventListener('click', joinClass);
    }

});
// เพิ่มตัวแปร defaultAvatar ที่ด้านบนของไฟล์



// แก้ไขใน loadUserInfo
async function loadUserInfo(user, userRole) {
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        const userInfo = document.querySelector('.user-info');

        // ปรับปรุงการแสดงผลข้อมูลสำหรับครู
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

// ฟังก์ชันอัพเดทข้อมูลผู้ใช้
async function updateUserProfile(role) {
    try {
        const user = auth.currentUser;

        // เตรียมข้อมูลพื้นฐาน
        const userData = {
            displayName: document.getElementById('editName').value.trim(),
            school: document.getElementById('editSchool').value.trim(),
        };

        // ตรวจสอบข้อมูลพื้นฐาน
        if (!userData.displayName || !userData.school) {
            alert('กรุณากรอกข้อมูลให้ครบทุกช่อง');
            return;
        }

        if (role === 'teacher') {
            userData.subject = document.getElementById('editSubject').value.trim();
            if (!userData.subject) {
                alert('กรุณากรอกวิชาที่สอน');
                return;
            }

            // Get multiple selected values for teaching levels
            const teachingLevelSelect = document.getElementById('editTeachingLevel');
            userData.teachingLevel = Array.from(teachingLevelSelect.selectedOptions).map(option => option.value);
            if (userData.teachingLevel.length === 0) {
                alert('กรุณาเลือกระดับชั้นที่สอนอย่างน้อย 1 ระดับ');
                return;
            }
        } else {
            userData.grade = document.getElementById('editGrade').value;
            userData.age = parseInt(document.getElementById('editAge').value);

            if (!userData.grade || !userData.age) {
                alert('กรุณากรอกข้อมูลให้ครบทุกช่อง');
                return;
            }
        }

        // บันทึกข้อมูล
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
        // Remove form event listener to prevent memory leaks
        const form = modal.querySelector('#editProfileForm');
        if (form) {
            const formSubmitHandler = form.onsubmit;
            if (formSubmitHandler) {
                form.removeEventListener('submit', formSubmitHandler);
            }
        }
        modal.remove();
    }
}

// Make the function available globally
window.closeEditProfileModal = closeEditProfileModal;

// แก้ไข auth state observer ถ้ามี
auth.onAuthStateChanged(async (user) => {
    if (user) {
        try {
            await loadUserInfo(user);
            await checkStudentRole(user.uid);  // เพิ่มบรรทัดนี้
        } catch (error) {
            console.error('Error:', error);
        }
    } else {
        window.location.href = 'index.html';
    }
});


// เพิ่มฟังก์ชันจัดการการแก้ไขชื่อ
function showEditNameForm() {
    document.getElementById('displayName').style.display = 'none';
    document.getElementById('editNameForm').style.display = 'block';
}

function cancelEditName() {
    document.getElementById('displayName').style.display = 'block';
    document.getElementById('editNameForm').style.display = 'none';
}


async function checkStudentRole(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists && userDoc.data().role === 'student') {
            await Promise.all([
                loadEnrolledClasses(userId),
                loadStats(userId)
            ]);
        } else {
            alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error("Error checking role:", error);
    }
}

async function joinClass() {
    const classCode = document.getElementById('classCode').value.trim().toUpperCase();
    if (!classCode) {
        alert('กรุณาใส่รหัสห้องเรียน');
        return;
    }

    try {
        // ค้นหาห้องเรียนจากรหัส
        const classSnapshot = await db.collection('classes')
            .where('code', '==', classCode)
            .get();

        if (classSnapshot.empty) {
            alert('ไม่พบห้องเรียน');
            return;
        }

        const classDoc = classSnapshot.docs[0];
        const userId = auth.currentUser.uid;

        // เช็คว่าเข้าร่วมแล้วหรือยัง
        const enrollmentSnapshot = await db.collection('class_enrollments')
            .where('classId', '==', classDoc.id)
            .where('studentId', '==', userId)
            .get();

        if (!enrollmentSnapshot.empty) {
            alert('คุณเข้าร่วมห้องเรียนนี้แล้ว');
            return;
        }

        // เพิ่มการลงทะเบียน
        await db.collection('class_enrollments').add({
            classId: classDoc.id,
            studentId: userId,
            joinedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert('เข้าร่วมห้องเรียนสำเร็จ');
        document.getElementById('classCode').value = '';
        loadEnrolledClasses(userId);
        loadStats(userId);

    } catch (error) {
        console.error("Error joining class:", error);
        alert('เกิดข้อผิดพลาดในการเข้าร่วมห้องเรียน');
    }
}

async function loadEnrolledClasses(userId) {
    const classList = document.getElementById('classList');
    if (!classList) return;

    try {
        classList.innerHTML = '<p>กำลังโหลดข้อมูล...</p>';

        const enrollments = await db.collection('class_enrollments')
            .where('studentId', '==', userId)
            .get();

        if (enrollments.empty) {
            classList.innerHTML = '<p>ยังไม่ได้เข้าร่วมห้องเรียนใด</p>';
            return;
        }

        const classPromises = enrollments.docs.map(async (enrollment) => {
            const classId = enrollment.data().classId;
            if (!classId) return null;
            const classDoc = await getDocCached('classes', classId, 60000);
            if (!classDoc.exists) return null;
            return { id: classDoc.id, ...classDoc.data };
        });

        const classes = (await Promise.all(classPromises)).filter(Boolean);
        classList.innerHTML = '';

        classes.forEach(classData => {
            const div = document.createElement('div');
            div.className = 'class-card';
            div.innerHTML = `
                <div class="class-info">
                    <h3>${classData.name}</h3>
                    <p>รหัสห้องเรียน: ${classData.code}</p>
                </div>
                <div class="class-actions">
                    <button onclick="viewClass('${classData.id}')" class="secondary-btn">
                        เข้าห้องเรียน
                    </button>
                    <button onclick="leaveClass('${classData.id}')" class="delete-btn">
                        ออกจากห้องเรียน
                    </button>
                </div>
            `;
            classList.appendChild(div);
        });

    } catch (error) {
        console.error("Error loading classes:", error);
        classList.innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    }
}

async function loadRecentProblems(userId) {
    const recentProblems = document.getElementById('recentProblems');
    if (!recentProblems) return;

    try {
        recentProblems.innerHTML = '<p>กำลังโหลดข้อมูล...</p>';

        // ดึงการส่งงาน 5 อันล่าสุด
        const submissions = await db.collection('submissions')
            .where('studentId', '==', userId)
            .orderBy('submittedAt', 'desc')
            .limit(5)
            .get();

        if (submissions.empty) {
            recentProblems.innerHTML = '<p>ยังไม่มีการส่งงาน</p>';
            return;
        }

        const problemPromises = submissions.docs.map(async (submission) => {
            const problemId = submission.data().problemId;
            if (!problemId) return null;
            const problemDoc = await getDocCached('problems', problemId, 60000);
            if (!problemDoc.exists) return null;
            return {
                id: problemDoc.id,
                ...problemDoc.data,
                status: submission.data().status,
                submittedAt: submission.data().submittedAt
            };
        });

        const problems = (await Promise.all(problemPromises)).filter(Boolean);
        recentProblems.innerHTML = '';

        problems.forEach(problem => {
            const div = document.createElement('div');
            div.className = 'problem-card';
            div.innerHTML = `
                <div class="problem-info">
                    <h3>${problem.title}</h3>
                    <p>${problem.description}</p>
                    <span class="status-badge ${problem.status === 'completed' ? 'status-completed' : 'status-pending'}">
                        ${problem.status === 'completed' ? 'สำเร็จ' : 'กำลังทำ'}
                    </span>
                    <div class="submission-date">
                        ส่งเมื่อ: ${problem.submittedAt.toDate().toLocaleString()}
                    </div>
                </div>
                <button onclick="viewProblem('${problem.id}')" class="secondary-btn">
                    ดูโจทย์
                </button>
            `;
            recentProblems.appendChild(div);
        });

    } catch (error) {
        console.error("Error loading recent problems:", error);
        recentProblems.innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    }
}

async function loadStats(userId) {
    try {
        // จำนวนห้องเรียนที่เข้าร่วม
        const classCount = await db.collection('class_enrollments')
            .where('studentId', '==', userId)
            .get()
            .then(snap => snap.size);

        // ดึงห้องเรียนที่นักเรียนลงทะเบียน
        const enrolledClasses = await db.collection('class_enrollments')
            .where('studentId', '==', userId)
            .get();

        // รวบรวม classIds ที่นักเรียนลงทะเบียน
        const classIds = enrolledClasses.docs.map(doc => doc.data().classId);

        // นับจำนวนโจทย์ทั้งหมด
        let totalProblems = 0;
        if (classIds.length > 0) {
            const classProblemsSnapshot = await db.collection('class_problems')
                .where('classId', 'in', classIds)
                .get();

            const uniqueProblemIds = new Set();
            classProblemsSnapshot.forEach(doc => {
                uniqueProblemIds.add(doc.data().problemId);
            });
            totalProblems = uniqueProblemIds.size;
        }

        // ดึงทุก submissions ของนักเรียน
        const submissionsSnapshot = await db.collection('submissions')
            .where('studentId', '==', userId)
            .get();

        // เก็บ submission ล่าสุดของแต่ละโจทย์
        const latestSubmissions = new Map();
        submissionsSnapshot.forEach(doc => {
            const data = doc.data();
            const existing = latestSubmissions.get(data.problemId);

            if (!existing ||
                (data.submittedAt &&
                    (!existing.submittedAt ||
                        data.submittedAt.toDate() > existing.submittedAt.toDate()))) {
                latestSubmissions.set(data.problemId, {
                    status: data.status,
                    submittedAt: data.submittedAt
                });
            }
        });

        // นับจำนวนโจทย์ที่ทำสำเร็จจาก submission ล่าสุด
        let completedProblems = 0;
        latestSubmissions.forEach(submission => {
            if (submission.status === 'completed') {
                completedProblems++;
            }
        });

        // อัพเดตหน้าเว็บ
        document.getElementById('classCount').textContent = classCount;
        document.getElementById('problemCount').textContent = totalProblems;
        document.getElementById('solvedCount').textContent = completedProblems;

        // Debug logs
        console.log('Stats:', {
            classCount,
            totalProblems,
            completedProblems,
            classIds,
            latestSubmissionsCount: latestSubmissions.size,
            submissionsDetails: Array.from(latestSubmissions.entries())
        });

    } catch (error) {
        console.error("Error loading stats:", error);
        document.getElementById('classCount').textContent = '0';
        document.getElementById('problemCount').textContent = '0';
        document.getElementById('solvedCount').textContent = '0';
    }
}

function setupEditNameListeners() {
    const editNameBtn = document.getElementById('editNameBtn');
    const editNameForm = document.getElementById('editNameForm');
    const saveNameBtn = document.getElementById('saveNameBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');

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

        document.getElementById('displayName').textContent = newName;
        document.getElementById('displayName').style.display = 'block';
        document.getElementById('editNameForm').style.display = 'none';

        // อัพเดท displayName ใน Firebase Auth ด้วย
        await user.updateProfile({
            displayName: newName
        });

        alert('อัพเดทชื่อสำเร็จ');
    } catch (error) {
        console.error('Error updating name:', error);
        alert('เกิดข้อผิดพลาดในการอัพเดทชื่อ');
    }
}
async function leaveClass(classId) {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะออกจากห้องเรียนนี้?')) {
        return;
    }

    try {
        const userId = auth.currentUser.uid;
        const enrollmentSnapshot = await db.collection('class_enrollments')
            .where('classId', '==', classId)
            .where('studentId', '==', userId)
            .get();

        // ลบการลงทะเบียน
        const deletePromises = enrollmentSnapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(deletePromises);

        alert('ออกจากห้องเรียนสำเร็จ');
        loadEnrolledClasses(userId);
        loadStats(userId);
    } catch (error) {
        console.error("Error leaving class:", error);
        alert('เกิดข้อผิดพลาดในการออกจากห้องเรียน');
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

function viewClass(classId) {
    window.location.href = `student-class-detail.html?id=${classId}`;
}

function viewProblem(problemId) {
    window.location.href = `student-problem-detail.html?id=${problemId}`;
}

// Export functions
window.viewClass = viewClass;
window.viewProblem = viewProblem;
window.leaveClass = leaveClass;
window.logout = logout;  // ต้องมีบรรทัดนี้
window.showEditNameForm = showEditNameForm;
window.cancelEditName = cancelEditName;
window.updateDisplayName = updateDisplayName;
