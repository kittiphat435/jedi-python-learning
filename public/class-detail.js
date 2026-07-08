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
auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log('User is logged in:', user.email);
        
        // Auto-patch email if missing
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            const userData = userDoc.exists ? userDoc.data() : null;
            if (userData && !userData.email && user.email) {
                await db.collection('users').doc(user.uid).update({
                    email: user.email,
                    photoURL: user.photoURL || null
                });
            }
        } catch (e) {
            console.error('Error auto-patching user:', e);
        }
        
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
                            <p class="teacher-email">${getDisplayEmail(teacherData) || '-'}</p>
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

// ฟังก์ชันช่วยดึงและเรียงลำดับโจทย์ของห้องเรียน
async function getSortedClassProblems(classId) {
    const snapshot = await db.collection('class_problems')
        .where('classId', '==', classId)
        .get();

    const problemPromises = snapshot.docs.map(async (doc) => {
        try {
            const relationData = doc.data();
            const problemDoc = await db.collection('problems').doc(relationData.problemId).get();
            if (!problemDoc.exists) return null;
            
            return {
                relationId: doc.id,
                problemId: relationData.problemId,
                orderIndex: relationData.orderIndex || 0,
                addedAt: relationData.addedAt,
                ...problemDoc.data()
            };
        } catch (error) {
            return null;
        }
    });

    let problems = (await Promise.all(problemPromises)).filter(p => p !== null);
    
    // เรียงลำดับตาม orderIndex และ addedAt
    problems.sort((a, b) => {
        if (a.orderIndex !== b.orderIndex) {
            return a.orderIndex - b.orderIndex;
        }
        const timeA = a.addedAt ? a.addedAt.seconds : 0;
        const timeB = b.addedAt ? b.addedAt.seconds : 0;
        return timeA - timeB;
    });

    return problems;
}
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

        const submissionCount = await db.collection('submissions')
            .where('classId', '==', classId)
            .get()
            .then(snap => snap.size);

        const studentCountEl = document.getElementById('studentCount');
        const problemCountEl = document.getElementById('problemCount');
        const submissionCountEl = document.getElementById('submissionCount');

        if (studentCountEl) studentCountEl.textContent = studentCount;
        if (problemCountEl) problemCountEl.textContent = problemCount;
        if (submissionCountEl) submissionCountEl.textContent = submissionCount;
    } catch (error) {
        console.error("Error loading stats:", error);
    }
}
// แสดง modal สร้างโจทย์
function showCreateProblemModal(problemData = null) {
    const modal = document.getElementById('createProblemModal');
    const form = document.getElementById('createProblemForm');

    if (!modal || !form) return;

    // รีเซ็ตฟอร์มให้สะอาด
    form.reset();
    form.removeAttribute('data-problem-id');
    
    // เคลียร์ค่าตัวแปร global ที่เกี่ยวข้องกับโจทย์ก่อนหน้า
    if (typeof window.savedWidgets !== 'undefined') {
        window.savedWidgets = [];
    }
    if (typeof savedWidgets !== 'undefined') {
        savedWidgets = [];
    }

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
const PROBLEMS_PER_PAGE = 20;
let currentProblemsView = [];
let currentProblemPage = 1;
let isProblemSearchActive = false;

function getDisplayEmail(user) {
    const email = user?.email || user?.userEmail || user?.studentEmail || user?.mail || '';
    return typeof email === 'string' ? email : '';
}

// โหลดรายการโจทย์
async function loadProblems(classId) {
    const problemList = document.getElementById('problemList');
    try {
        // 1. ดึงข้อมูลความสัมพันธ์มาก่อน
        const snapshot = await db.collection('class_problems')
            .where('classId', '==', classId)
            .get();

        if (snapshot.empty) {
            problemList.innerHTML = '<p>ยังไม่มีโจทย์ในห้องเรียน</p>';
            allProblems = [];
            currentProblemsView = [];
            renderProblemPagination();
            return;
        }

        // 2. ดึงรายละเอียดโจทย์ และผูกข้อมูล Relation ID (class_problems doc id) และ orderIndex
        const problemPromises = snapshot.docs.map(async (doc) => {
            try {
                const relationData = doc.data();
                const problemDoc = await db.collection('problems')
                    .doc(relationData.problemId)
                    .get();

                if (!problemDoc.exists) {
                    // ถ้าโจทย์ต้นทางหายไป อาจจะลบความสัมพันธ์ทิ้ง (Optional)
                    return null;
                }

                return { 
                    id: problemDoc.id,              // ID ของตัวโจทย์ (สำหรับดูรายละเอียด)
                    relationId: doc.id,             // ID ของความสัมพันธ์ (สำหรับอัพเดต orderIndex)
                    orderIndex: relationData.orderIndex || 0, // ค่าลำดับ
                    addedAt: relationData.addedAt,  // เผื่อใช้ sort fallback
                    isClosed: relationData.isClosed || false,
                    ...problemDoc.data() 
                };
            } catch (error) {
                console.error("Error loading problem:", error);
                return null;
            }
        });

        let problems = (await Promise.all(problemPromises))
            .filter(problem => problem !== null);

        // 3. เรียงลำดับตาม orderIndex
        // ถ้า orderIndex เท่ากัน (เช่นโจทย์เก่า) ให้เรียงตามเวลาที่เพิ่ม
        problems.sort((a, b) => {
            if (a.orderIndex !== b.orderIndex) {
                return a.orderIndex - b.orderIndex;
            }
            // Fallback for legacy data without orderIndex
            const timeA = a.addedAt ? a.addedAt.seconds : 0;
            const timeB = b.addedAt ? b.addedAt.seconds : 0;
            return timeA - timeB;
        });

        allProblems = problems;
        isProblemSearchActive = false;
        displayProblems(problems);
        
    } catch (error) {
        console.error("Error loading problems:", error);
        problemList.innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดโจทย์</p>';
    }
}

function displayProblems(problems) {
    currentProblemsView = Array.isArray(problems) ? problems : [];
    currentProblemPage = 1;
    renderProblemsPage();
}

function renderProblemsPage() {
    const problemList = document.getElementById('problemList');
    if (!problemList) return;

    const total = currentProblemsView.length;
    const totalPages = Math.max(1, Math.ceil(total / PROBLEMS_PER_PAGE));
    if (currentProblemPage > totalPages) currentProblemPage = totalPages;
    if (currentProblemPage < 1) currentProblemPage = 1;

    const startIndex = (currentProblemPage - 1) * PROBLEMS_PER_PAGE;
    const pageProblems = currentProblemsView.slice(startIndex, startIndex + PROBLEMS_PER_PAGE);

    problemList.innerHTML = '';

    if (pageProblems.length === 0) {
        problemList.innerHTML = '<p>ไม่พบโจทย์</p>';
        renderProblemPagination();
        return;
    }

    const allowReorder = !isProblemSearchActive && currentProblemsView === allProblems;

    pageProblems.forEach((problem, pageIndex) => {
        const div = document.createElement('div');
        div.className = 'problem-card';
        div.dataset.relationId = problem.relationId;
        div.dataset.index = String(startIndex + pageIndex);

        let problemTypeIcon = '';
        let problemTypeText = '';
        switch (problem.type) {
            case 'python': problemTypeIcon = '💻'; problemTypeText = 'โจทย์เขียนโปรแกรม'; break;
            case 'flowchart': problemTypeIcon = '📊'; problemTypeText = 'โจทย์ผังงาน'; break;
            case 'matching': problemTypeIcon = '🔄'; problemTypeText = 'โจทย์จับคู่'; break;
            case 'comprehension': problemTypeIcon = '📝'; problemTypeText = 'คำถามความเข้าใจ'; break;
            case 'gui': problemTypeIcon = '🪟'; problemTypeText = 'โจทย์ GUI'; break;
            case 'summary': problemTypeIcon = '📋'; problemTypeText = 'สรุปผลการเรียน'; break;
            default: problemTypeIcon = '📄'; problemTypeText = 'ไม่ระบุประเภท';
        }

        const dragHandleHtml = allowReorder
            ? `<div class="drag-handle" style="cursor: move; padding-right: 15px; display: flex; align-items: center; color: #888;">
                   <i class="fas fa-grip-vertical"></i> ☰
               </div>`
            : '';

        let displayTitle = problem.title || 'ไม่มีชื่อโจทย์';
        if (problem.type === 'summary' && problem.isGroupWork && !displayTitle.endsWith('(ระบบกลุ่ม)')) {
            displayTitle += ' (ระบบกลุ่ม)';
        } else if (problem.type === 'comprehension' && !displayTitle.endsWith('(ข้อสอบ)')) {
            displayTitle += ' (ข้อสอบ)';
        }

        div.innerHTML = `
            ${dragHandleHtml}
            <div class="problem-info" style="flex-grow: 1;">
                <div class="problem-header">
                    <span class="problem-type">${problemTypeIcon} ${problemTypeText}</span>
                </div>
                <h3>${displayTitle}</h3>
                <p>${problem.description || 'ไม่มีคำอธิบาย'}</p>
            </div>
            <div class="problem-actions" style="display: flex; align-items: center; gap: 10px;">
                <label class="switch" style="position: relative; display: inline-block; width: 40px; height: 20px; margin-bottom: 0;">
                    <input type="checkbox" onchange="toggleProblemStatus('${problem.relationId}', this.checked)" ${problem.isClosed ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
                    <span class="slider round" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${problem.isClosed ? '#e74c3c' : '#2ecc71'}; transition: .4s; border-radius: 20px;">
                        <span style="position: absolute; content: ''; height: 16px; width: 16px; left: ${problem.isClosed ? '22px' : '2px'}; bottom: 2px; background-color: white; transition: .4s; border-radius: 50%;"></span>
                    </span>
                </label>
                <span style="font-size: 0.9em; margin-right: 10px; color: ${problem.isClosed ? '#e74c3c' : '#2ecc71'}; font-weight: bold;">
                    ${problem.isClosed ? 'ปิดรับคำตอบ' : 'เปิดรับคำตอบ'}
                </span>
                <button onclick="viewProblem('${problem.id}')" class="primary-btn">ดูโจทย์</button>
                <button onclick="deleteProblem('${problem.id}')" class="delete-btn">ลบ</button>
            </div>
        `;

        if (allowReorder) {
            div.setAttribute('draggable', 'true');
            addDragEvents(div);
        } else {
            div.setAttribute('draggable', 'false');
        }

        problemList.appendChild(div);
    });

    problemList.scrollTop = 0;
    renderProblemPagination();
}

window.toggleProblemStatus = async function(relationId, isClosed) {
    try {
        await db.collection('class_problems').doc(relationId).update({
            isClosed: isClosed
        });
        const prob = allProblems.find(p => p.relationId === relationId);
        if (prob) prob.isClosed = isClosed;
        renderProblemsPage();
    } catch (error) {
        console.error("Error toggling problem status:", error);
        alert("เกิดข้อผิดพลาดในการเปลี่ยนสถานะโจทย์");
    }
}

function renderProblemPagination() {
    const paginationEl = document.getElementById('problemPagination');
    if (!paginationEl) return;

    const total = currentProblemsView.length;
    const totalPages = Math.max(1, Math.ceil(total / PROBLEMS_PER_PAGE));
    if (currentProblemPage > totalPages) currentProblemPage = totalPages;
    if (currentProblemPage < 1) currentProblemPage = 1;

    if (total === 0) {
        paginationEl.innerHTML = '';
        return;
    }

    const prevDisabled = currentProblemPage <= 1;
    const nextDisabled = currentProblemPage >= totalPages;

    paginationEl.innerHTML = `
        <button type="button" ${prevDisabled ? 'disabled' : ''} id="problemPrevPageBtn">ก่อนหน้า</button>
        <span class="page-info">หน้า ${currentProblemPage}/${totalPages} (ทั้งหมด ${total} โจทย์)</span>
        <button type="button" ${nextDisabled ? 'disabled' : ''} id="problemNextPageBtn">ถัดไป</button>
    `;

    const prevBtn = document.getElementById('problemPrevPageBtn');
    const nextBtn = document.getElementById('problemNextPageBtn');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentProblemPage > 1) {
                currentProblemPage -= 1;
                renderProblemsPage();
            }
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentProblemPage < totalPages) {
                currentProblemPage += 1;
                renderProblemsPage();
            }
        });
    }
}

// [class-detail.js]

// ฟังก์ชันจัดการ Drag & Drop Events
function addDragEvents(item) {
    item.addEventListener('dragstart', (e) => {
        e.dataTransfer.effectAllowed = 'move';
        item.classList.add('dragging');
    });

    item.addEventListener('dragend', async (e) => {
        item.classList.remove('dragging');
        // เมื่อปล่อยเมาส์ ให้บันทึกลำดับใหม่ทันที
        await saveProblemOrder();
    });

    item.addEventListener('dragover', (e) => {
        e.preventDefault();
        const container = document.getElementById('problemList');
        const afterElement = getDragAfterElement(container, e.clientY);
        const draggable = document.querySelector('.dragging');
        
        if (afterElement == null) {
            container.appendChild(draggable);
        } else {
            container.insertBefore(draggable, afterElement);
        }
    });
}

// ฟังก์ชันช่วยหาตำแหน่งที่จะวาง Element
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.problem-card:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ฟังก์ชันบันทึกลำดับลง Firestore
async function saveProblemOrder() {
    if (isProblemSearchActive || currentProblemsView !== allProblems) return;

    const problemList = document.getElementById('problemList');
    const cards = problemList.querySelectorAll('.problem-card');
    
    // สร้าง Batch เพื่ออัพเดตหลาย document พร้อมกัน (ประหยัด request)
    const batch = db.batch();
    let hasChanges = false;

    const startIndex = (currentProblemPage - 1) * PROBLEMS_PER_PAGE;
    const pageRelationIds = Array.from(cards)
        .map(card => card.dataset.relationId)
        .filter(Boolean);

    const oldSlice = allProblems.slice(startIndex, startIndex + pageRelationIds.length);
    const sliceMap = new Map(oldSlice.map(p => [p.relationId, p]));
    const newSlice = pageRelationIds.map(id => sliceMap.get(id)).filter(Boolean);

    if (newSlice.length === oldSlice.length && newSlice.length > 0) {
        allProblems.splice(startIndex, newSlice.length, ...newSlice);
    }

    allProblems.forEach((problem, index) => {
        const relationId = problem.relationId;
        if (!relationId) return;
        const ref = db.collection('class_problems').doc(relationId);
        batch.update(ref, { orderIndex: index + 1 });
        hasChanges = true;
    });

    if (hasChanges) {
        try {
            await batch.commit();
            console.log('บันทึกลำดับโจทย์เรียบร้อยแล้ว');
        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการบันทึกลำดับ:', error);
            alert('ไม่สามารถบันทึกลำดับได้');
        }
    }
}
// ฟังก์ชันสำหรับ render symbols
function renderSymbols(symbols) {
    if (!symbols) return '';

    return symbols.map(symbol => {
        // ตรวจสอบและกำหนดค่าพิกัดเริ่มต้น
        const x = symbol.x || 0;
        const y = symbol.y || 0;

        let shape = '';

        switch (symbol.type) {
            case 'start':
            case 'end':
                shape = `<ellipse rx="50" ry="30" fill="white" stroke="black" stroke-width="2"/>`;
                break;
            case 'process':
                shape = `<rect x="-50" y="-30" width="100" height="60" fill="white" stroke="black" stroke-width="2"/>`;
                break;
            case 'decision':
                shape = `<polygon points="0,-30 50,0 0,30 -50,0" fill="white" stroke="black" stroke-width="2"/>`;
                break;
            case 'input':
                shape = `<path d="M-50,-30 L50,-30 L30,30 L-70,30 Z" fill="white" stroke="black" stroke-width="2"/>`;
                break;
            case 'output':
                shape = `<path d="M-50,-30 L70,-30 L50,30 L-70,30 Z" fill="white" stroke="black" stroke-width="2"/>`;
                break;
        }

        return `
            <g transform="translate(${x},${y})" id="${symbol.id || ''}">
                ${shape}
                <text text-anchor="middle" dominant-baseline="middle" font-size="14px">${symbol.text || ''}</text>
            </g>
        `;
    }).join('');
}

// ฟังก์ชันสำหรับ render connections
function renderConnections(connections) {
    if (!connections) return '';

    return connections.map(conn => {
        // หา symbol ต้นทางและปลายทาง
        const sourceSymbol = document.getElementById(conn.sourceSymbol);
        const targetSymbol = document.getElementById(conn.targetSymbol);

        if (!sourceSymbol || !targetSymbol) {
            console.log('Symbol not found:', { source: conn.sourceSymbol, target: conn.targetSymbol });
            return '';
        }

        // คำนวณจุดเชื่อมต่อ
        let startX, startY, endX, endY;
        const sourceRect = sourceSymbol.getBoundingClientRect();
        const targetRect = targetSymbol.getBoundingClientRect();

        // คำนวณพิกัดตามตำแหน่ง sourcePoint
        switch (conn.sourcePoint) {
            case 'top':
                startX = parseInt(sourceSymbol.getAttribute('transform').split('translate(')[1]) || 0;
                startY = parseInt(sourceSymbol.getAttribute('transform').split(',')[1]) || 0;
                startY -= 30; // ขยับขึ้นด้านบน
                break;
            case 'bottom':
                startX = parseInt(sourceSymbol.getAttribute('transform').split('translate(')[1]) || 0;
                startY = parseInt(sourceSymbol.getAttribute('transform').split(',')[1]) || 0;
                startY += 30; // ขยับลงด้านล่าง
                break;
            // เพิ่ม case อื่นๆ ตามต้องการ
        }

        // คำนวณพิกัดตามตำแหน่ง targetPoint
        switch (conn.targetPoint) {
            case 'top':
                endX = parseInt(targetSymbol.getAttribute('transform').split('translate(')[1]) || 0;
                endY = parseInt(targetSymbol.getAttribute('transform').split(',')[1]) || 0;
                endY -= 30; // ขยับขึ้นด้านบน
                break;
            case 'bottom':
                endX = parseInt(targetSymbol.getAttribute('transform').split('translate(')[1]) || 0;
                endY = parseInt(targetSymbol.getAttribute('transform').split(',')[1]) || 0;
                endY += 30; // ขยับลงด้านล่าง
                break;
            // เพิ่ม case อื่นๆ ตามต้องการ
        }

        // ตรวจสอบค่าพิกัดก่อนสร้าง path
        if (isNaN(startX) || isNaN(startY) || isNaN(endX) || isNaN(endY)) {
            console.log('Invalid coordinates:', { startX, startY, endX, endY });
            return '';
        }

        // สร้างเส้นเชื่อม
        const path = `
            <path 
                d="M ${startX},${startY} L ${endX},${endY}"
                stroke="black" 
                stroke-width="2" 
                fill="none" 
                marker-end="url(#arrowhead)"
            />
        `;

        // เพิ่มข้อความบนเส้น
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2 - 10;
        const text = conn.text ? `
            <text 
                x="${midX}"
                y="${midY}"
                text-anchor="middle"
                font-size="14px"
            >${conn.text}</text>
        ` : '';

        return path + text;
    }).join('');
}

// เพิ่ม Debug log เพื่อตรวจสอบข้อมูล
function debugFlowchartData(flowchartData) {
    console.log('Flowchart Data:', {
        symbols: flowchartData.symbols,
        connections: flowchartData.connections
    });
}
async function viewProblem(problemId, targetStudentId = null) {
    try {
        const classId = new URLSearchParams(window.location.search).get('id');

        // โหลดข้อมูลทั้งหมดพร้อมกัน
        const [problemDoc, submissionsSnapshot, enrollments] = await Promise.all([
            db.collection('problems').doc(problemId).get(),
            db.collection('submissions')
                .where('problemId', '==', problemId)
                .where('classId', '==', classId)
                .get(),
            db.collection('class_enrollments')
                .where('classId', '==', classId)
                .get()
        ]);

        if (!problemDoc.exists) {
            alert('ไม่พบโจทย์');
            return;
        }

        const problemData = problemDoc.data();
        console.log('Problem Data:', problemData);

        if (problemData.type === 'summary') {
            const studentIdParam = targetStudentId ? `&studentId=${targetStudentId}` : '';
            window.location.href = `teacher-summary-detail.html?id=${problemId}&classId=${classId}${studentIdParam}`;
            return;
        }

        // จัดการข้อมูลการส่งงาน - เก็บเฉพาะการส่งล่าสุดของแต่ละคน
        const studentSubmissions = new Map();
        submissionsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const existing = studentSubmissions.get(data.studentId);
            if (!existing || data.submittedAt.toDate() > existing.submittedAt.toDate()) {
                studentSubmissions.set(data.studentId, data);
            }
        });

        // ลบ modal เก่า
        const existingModal = document.getElementById('problemDetailsModal');
        if (existingModal) existingModal.remove();

        let submissionsHTML = '';
        
        // สร้าง HTML สำหรับแต่ละนักเรียน
        for (const enrollment of enrollments.docs) {
            const studentId = enrollment.data().studentId;
            if (targetStudentId && studentId !== targetStudentId) continue;
            
            const studentDoc = await db.collection('users').doc(studentId).get();
            const studentData = studentDoc.data();
            const submission = studentSubmissions.get(studentId);

            let submissionContent = '';
            if (submission) {
                switch(problemData.type) {
                    case 'python':
                        submissionContent = `
                            <div class="code-preview">
                                <h4>โค้ดที่ส่ง:</h4>
                                <pre><code>${submission.code || 'ไม่มีโค้ด'}</code></pre>
                            </div>
                        `;
                        break;

                    case 'flowchart':
                        submissionContent = `
                            <div class="flowchart-submission">
                                <div class="score-display">คะแนน: ${submission.score || 0}/${submission.maxScore || 0}</div>
                                ${submission.flowchartData ? `
                                    <div class="flowchart-preview" id="student-flowchart-${studentId}">
                                    </div>
                                ` : 'ไม่พบข้อมูล Flowchart'}
                            </div>
                        `;
                        break;

                    case 'matching':
                        const answers = submission.answers || {};
                        const pairs = problemData.pairs || [];
                        submissionContent = `
                            <div class="matching-submission">
                                <div class="score-display">คะแนน: ${submission.score || 0}/${submission.maxScore || pairs.length}</div>
                                <div class="matching-answers">
                                    ${pairs.map((pair, idx) => {
                                        const studentAnswer = answers[idx] || answers[String(idx)] || 'ไม่ได้ตอบ';
                                        const isCorrect = studentAnswer === pair.answer;
                                        return `
                                            <div class="match-item">
                                                <div class="match-question">
                                                    <strong>คำถามข้อที่ ${idx + 1}:</strong> ${pair.question}
                                                </div>
                                                <div class="match-answers">
                                                    <div class="student-answer">คำตอบของนักเรียน: ${studentAnswer}</div>
                                                    <div class="correct-answer">เฉลย: ${pair.answer}</div>
                                                </div>
                                                <div class="match-result ${isCorrect ? 'correct' : 'incorrect'}">
                                                    ${isCorrect ? '✅ ถูกต้อง' : '❌ ไม่ถูกต้อง'}
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        `;
                        break;

                    case 'comprehension':
                        submissionContent = `
                            <div class="comprehension-submission">
                                <div class="score-display">คะแนน: ${submission.score || 0}/${submission.maxScore || 0}</div>
                                <div class="answers-list">
                                    ${(submission.answers || []).map((answer, idx) => {
                                        const question = problemData.questions[idx];
                                        return `
                                            <div class="answer-item">
                                                <div class="question-text">
                                                    <strong>คำถามข้อที่ ${idx + 1}:</strong> ${question?.question || ''}
                                                </div>
                                                <div class="answer-content">
                                                    <div>คำตอบของนักเรียน: ${answer}</div>
                                                    <div>เฉลย: ${question?.correctAnswer || ''}</div>
                                                </div>
                                                ${submission.results?.[idx]?.isCorrect ?
                                                    '<span class="correct">✅ ถูกต้อง</span>' :
                                                    '<span class="incorrect">❌ ไม่ถูกต้อง</span>'
                                                }
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        `;
                        break;
                    case 'gui':
                        submissionContent = `
                            <div class="gui-submission">
                                <div class="score-display">คะแนน: ${submission.score || 0}/${submission.maxScore || 0}</div>
                                <div class="gui-preview">
                                    <h4>โค้ด Python (GUI) ที่ส่ง:</h4>
                                    <pre><code>${submission.code || 'ไม่มีโค้ด'}</code></pre>
                                </div>
                            </div>
                        `;
                        break;
                    case 'summary':
                        const note = submission.note || {};
                        submissionContent = `
                            <div class="summary-submission">
                                <div class="score-display">คะแนน: ${submission.score || 0}/${submission.maxScore || problemData.maxScore || 10}</div>
                                <div style="background-color: ${note.color || '#fff2a3'}; border-radius: 8px; padding: 15px; border: 1px solid #e2e8f0; color: #333; margin-top: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); font-family: 'Outfit', sans-serif;">
                                    <h4 style="margin: 0 0 10px 0; border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 5px; font-weight: bold;">📌 ${note.title || 'ไม่มีหัวข้อ'}</h4>
                                    <p style="margin: 0; white-space: pre-wrap; font-size: 1.1em; line-height: 1.5;">${note.content || 'ไม่มีเนื้อหา'}</p>
                                </div>
                            </div>
                        `;
                        break;
                }
            }

            submissionsHTML += `
                <div class="submission-item">
                    <div class="student-info">
                        <img src="${studentData.photoURL || defaultAvatar}" 
                             alt="Student" 
                             class="student-avatar"
                             onerror="this.src='${defaultAvatar}'">
                        <div class="student-details">
                            <div class="student-name">${studentData.displayName || 'ไม่ระบุชื่อ'}</div>
                            <div class="student-email">${getDisplayEmail(studentData) || '-'}</div>
                        </div>
                    </div>
                    ${submission ? `
                        <span class="submission-status status-submitted">ส่งแล้ว</span>
                        <button class="expand-btn ${targetStudentId ? 'expanded' : ''}" onclick="toggleSubmission(this)">${targetStudentId ? 'ซ่อนคำตอบ' : 'ดูคำตอบ'}</button>
                        <div class="submission-expand" style="display: ${targetStudentId ? 'block' : 'none'};">
                            <div class="submission-date">
                                ส่งเมื่อ: ${submission.submittedAt.toDate().toLocaleString('th-TH')}
                            </div>
                            ${submissionContent}
                        </div>
                    ` : `
                        <span class="submission-status status-pending">ยังไม่ส่ง</span>
                    `}
                </div>
            `;
        }

        // สร้าง Modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'problemDetailsModal';
        modal.style.display = 'block';

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${problemData.title}</h2>
                    <button class="close-btn" onclick="closeProblemDetailsModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="problem-content">
                        <div class="problem-description">
                            <h3>คำอธิบายโจทย์</h3>
                            <p>${(problemData.description || '').replace(/\\n/g, '<br>').replace(/\n/g, '<br>')}</p>
                        </div>

                        ${(() => {
                            switch(problemData.type) {
                                case 'python':
                                    return `
                                        ${problemData.templateCode ? `
                                            <div class="template-code-section">
                                                <h3>โค้ดเริ่มต้น</h3>
                                                <pre><code>${problemData.templateCode}</code></pre>
                                            </div>
                                        ` : ''}
                                        ${problemData.testCases?.length ? `
                                            <div class="test-cases-section">
                                                <h3>Test Cases</h3>
                                                <div class="test-cases-list">
                                                    ${problemData.testCases.map((test, idx) => `
                                                        <div class="test-case">
                                                            <h4>Test Case #${idx + 1}</h4>
                                                            <div>Input: ${JSON.stringify(test.input)}</div>
                                                            <div>Expected: ${JSON.stringify(test.expected)}</div>
                                                        </div>
                                                    `).join('')}
                                                </div>
                                            </div>
                                        ` : ''}
                                    `;

                                case 'flowchart':
                                    return `
                                        <div class="variables-section">
                                            ${problemData.variables?.length ? `
                                                <h3>ตัวแปรที่ใช้</h3>
                                                <div class="variables-list">
                                                    ${problemData.variables.map(v => `
                                                        <div class="variable-item">
                                                            <strong>${v.name}:</strong> ${v.description}
                                                        </div>
                                                    `).join('')}
                                                </div>
                                            ` : ''}
                                        </div>
                                        <div class="flowchart-section">
                                            <h3>เฉลย Flowchart</h3>
                                            <div id="teacher-flowchart" class="flowchart-solution" style="width:100%; height:400px; border:1px solid #ccc; margin-top:10px;"></div>
                                        </div>
                                    `;

                                case 'matching':
                                    return `
                                        <div class="matching-pairs">
                                            <h3>คำถาม-คำตอบ</h3>
                                            ${(problemData.pairs || []).map((pair, idx) => `
                                                <div class="pair-item">
                                                    <div class="pair-number">ข้อที่ ${idx + 1} (${pair.score || 1} คะแนน)</div>
                                                    <div class="pair-content">
                                                        <div class="pair-question"><strong>คำถาม:</strong> ${pair.question}</div>
                                                        <div class="pair-answer"><strong>คำตอบ:</strong> ${pair.answer}</div>
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                    `;

                                case 'comprehension':
                                    return `
                                        <div class="comprehension-content">
                                            <h3>เนื้อหา</h3>
                                            <div class="content-text">${problemData.content || ''}</div>
                                            <h3>คำถาม</h3>
                                            ${(problemData.questions || []).map((q, idx) => `
                                                <div class="question-item">
                                                    <h4>คำถามข้อที่ ${idx + 1}</h4>
                                                    <div class="question-text">${q.question}</div>
                                                    ${q.image ? `<div style="margin-top:8px; margin-bottom:8px;"><img src="${q.image}" style="max-height:120px; border-radius:6px; border:1px solid #eee; display:block;"></div>` : ''}
                                                    <div class="correct-answer">เฉลย: ${q.correctAnswer}</div>
                                                </div>
                                            `).join('')}
                                        </div>
                                    `;
                                case 'gui':
                                    return `
                                        <div class="gui-content">
                                            <h3>รายละเอียด GUI</h3>
                                            ${problemData.templateCode ? `
                                                <div class="gui-template-section">
                                                    <h4>โค้ด Tkinter เริ่มต้น</h4>
                                                    <pre><code>${problemData.templateCode}</code></pre>
                                                </div>
                                            ` : ''}
                                            ${problemData.solutionCode ? `
                                                <div class="gui-solution-section">
                                                    <h4>เฉลยโค้ด (สำหรับครู)</h4>
                                                    <pre><code>${problemData.solutionCode}</code></pre>
                                                </div>
                                            ` : ''}
                                                
                                            ${problemData.widgets && problemData.widgets.length ? `
                                                <div class="widgets-section">
                                                    <h4>Widget ที่ต้องการ</h4>
                                                    <ul class="widgets-list">
                                                        ${problemData.widgets.map((widget, idx) => `
                                                            <li class="widget-item">
                                                                <div class="widget-header">
                                                                    <span class="widget-number">${idx + 1}</span>
                                                                    <strong>${widget.type}</strong> (${widget.score} คะแนน)
                                                                </div>
                                                                <div class="widget-details">
                                                                    <div><strong>ชื่อตัวแปร:</strong> ${widget.name}</div>
                                                                    ${widget.text ? `<div><strong>ข้อความ:</strong> ${widget.text}</div>` : ''}
                                                                    ${widget.props ? `<div><strong>Properties:</strong> ${widget.props}</div>` : ''}
                                                                    ${widget.event ? `<div><strong>Event:</strong> ${widget.event}</div>` : ''}
                                                                    ${widget.description ? `<div><strong>รายละเอียด:</strong> ${widget.description}</div>` : ''}
                                                                    ${widget.validation ? `<div><strong>เงื่อนไขเพิ่มเติม:</strong> ${widget.validation}</div>` : ''}
                                                                </div>
                                                            </li>
                                                        `).join('')}
                                                    </ul>
                                                </div>
                                            ` : ''}
                                                
                                            ${problemData.functions && problemData.functions.length ? `
                                                <div class="functions-section">
                                                    <h4>ฟังก์ชันที่ต้องการ</h4>
                                                    <ul class="functions-list">
                                                        ${problemData.functions.map((func, idx) => `
                                                            <li class="function-item">
                                                                <div class="function-header">
                                                                    <span class="function-number">${idx + 1}</span>
                                                                    <strong>def ${func.name}()</strong>
                                                                </div>
                                                                <div class="function-details">
                                                                    <div><strong>รายละเอียด:</strong> ${func.description}</div>
                                                                    <div><strong>ผลลัพธ์ที่คาดหวัง:</strong> ${func.expected}</div>
                                                                    ${func.example ? `
                                                                        <div class="function-example">
                                                                            <strong>ตัวอย่างโค้ด:</strong>
                                                                            <pre><code>${func.example}</code></pre>
                                                                        </div>
                                                                    ` : ''}
                                                                </div>
                                                            </li>
                                                        `).join('')}
                                                    </ul>
                                                </div>
                                            ` : ''}
                                                
                                            ${problemData.guiImage ? `
                                                <div class="gui-image-section">
                                                    <h4>ภาพตัวอย่าง</h4>
                                                    <img src="${problemData.guiImage}" alt="ภาพตัวอย่าง GUI" class="gui-example-image">
                                                </div>
                                            ` : ''}
                                        </div>
                                    `;

                                case 'summary':
                                    return `
                                        <div class="summary-section" style="padding: 15px; background-color: #ebf5fb; border-left: 5px solid #3498db; border-radius: 4px; margin-bottom: 20px; font-family: 'Outfit', sans-serif;">
                                            <p style="color: #2980b9; font-weight: bold; margin: 0 0 5px 0; font-size: 1.1em;">📝 กิจกรรมกระดานสรุปความรู้ (สไตล์ Padlet)</p>
                                            <p style="margin: 0; color: #555;">กิจกรรมนี้จะแสดงสรุปของนักเรียนทั้งห้องเรียนบนกระดานเดียวกัน โดยมีคะแนนเต็มสูงสุด ${problemData.maxScore || 10} คะแนน</p>
                                        </div>
                                    `;

                                default:
                                    return '<p>ไม่พบข้อมูลโจทย์</p>';
                            }
                        })()}
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

        // Handle flowchart rendering after modal is added to DOM
        if (problemData.type === 'flowchart') {
            console.log('Teacher solution:', problemData.flowchartData);
            console.log('Latest student submissions:', Array.from(studentSubmissions.values()));

            // Render teacher's solution flowchart
            if (problemData.flowchartData) {
                const teacherContainer = document.getElementById('teacher-flowchart');
                if (teacherContainer) {
                    teacherContainer.innerHTML = ''; // Clear previous content
                    const teacherEditor = new FlowchartEditor('teacher-flowchart');
                    teacherEditor.loadReadOnlyData(problemData.flowchartData);
                }
            }

            // Render only latest student flowcharts
            studentSubmissions.forEach((submission, studentId) => {
                if (submission.flowchartData) {
                    const container = document.getElementById(`student-flowchart-${studentId}`);
                    if (container) {
                        container.innerHTML = ''; // Clear previous content
                        const studentEditor = new FlowchartEditor(`student-flowchart-${studentId}`);
                        studentEditor.loadReadOnlyData(submission.flowchartData);
                    }
                }
            });
        }

    } catch (error) {
        console.error('Error viewing problem:', error);
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    }
}
function createFlowchartSVG(containerId, flowchartData) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('viewBox', '0 0 1000 600');

    // เพิ่ม marker definition สำหรับหัวลูกศร
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML = `
        <marker id="arrowhead-${containerId}" markerWidth="10" markerHeight="7" 
            refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#000"/>
        </marker>
    `;
    svg.appendChild(defs);

    // วาด symbols
    flowchartData.symbols.forEach(symbol => {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute('transform', `translate(${symbol.x},${symbol.y})`);

        let shape;
        switch (symbol.type) {
            case 'start':
            case 'end':
                shape = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
                shape.setAttribute('rx', '50');
                shape.setAttribute('ry', '30');
                break;
            case 'process':
                shape = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                shape.setAttribute('width', '100');
                shape.setAttribute('height', '60');
                shape.setAttribute('x', '-50');
                shape.setAttribute('y', '-30');
                break;
            case 'decision':
                shape = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                shape.setAttribute('points', '0,-30 50,0 0,30 -50,0');
                break;
            case 'input':
                shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
                shape.setAttribute('d', 'M-50,-30 L50,-30 L30,30 L-70,30 Z');
                break;
            case 'output':
                shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
                shape.setAttribute('d', 'M-50,-30 L70,-30 L50,30 L-70,30 Z');
                break;
        }

        if (shape) {
            shape.setAttribute('fill', 'white');
            shape.setAttribute('stroke', 'black');
            shape.setAttribute('stroke-width', '2');
            g.appendChild(shape);
        }

        // เพิ่มข้อความ
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.textContent = symbol.text || '';
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('font-size', '14px');
        g.appendChild(text);

        svg.appendChild(g);
    });

    // วาด connections
    if (flowchartData.connections) {
        flowchartData.connections.forEach(conn => {
            if (conn.sourcePoint && conn.targetPoint) {
                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.setAttribute('d', `M ${conn.sourcePoint.x},${conn.sourcePoint.y} L ${conn.targetPoint.x},${conn.targetPoint.y}`);
                path.setAttribute('stroke', 'black');
                path.setAttribute('stroke-width', '2');
                path.setAttribute('fill', 'none');
                path.setAttribute('marker-end', `url(#arrowhead-${containerId})`);
                svg.appendChild(path);

                // เพิ่มข้อความบนเส้นเชื่อม (ถ้ามี)
                if (conn.text) {
                    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    const midX = (conn.sourcePoint.x + conn.targetPoint.x) / 2;
                    const midY = (conn.sourcePoint.y + conn.targetPoint.y) / 2;
                    text.setAttribute('x', midX.toString());
                    text.setAttribute('y', (midY - 10).toString());
                    text.setAttribute('text-anchor', 'middle');
                    text.setAttribute('font-size', '14px');
                    text.textContent = conn.text;
                    svg.appendChild(text);
                }
            }
        });
    }

    // เคลียร์ container และเพิ่ม SVG
    container.innerHTML = '';
    container.appendChild(svg);
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
        isProblemSearchActive = false;
        displayProblems(allProblems);
        return;
    }
    isProblemSearchActive = true;
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
                        <p class="student-email">${getDisplayEmail(student) || '-'}</p>
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
        console.log('Starting viewProgress for student:', studentId, 'class:', classId);

        // สร้าง Modal และแสดง loading
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'progressModal';
        modal.style.display = 'block';
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

        // ดึงข้อมูลโจทย์ทั้งหมดในห้องเรียนแบบเรียงลำดับ
        const sortedProblems = await getSortedClassProblems(classId);
        console.log('Found sorted class problems:', sortedProblems.length);

        // ดึง submissions ทั้งหมดของนักเรียน
        const submissionsSnapshot = await db.collection('submissions')
            .where('studentId', '==', studentId)
            .where('classId', '==', classId)
            .get();
        console.log('Found student submissions:', submissionsSnapshot.size);

        // จัดกลุ่ม submissions ตามโจทย์ (เก็บแค่อันล่าสุด)
        const latestSubmissions = new Map();
        submissionsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const existing = latestSubmissions.get(data.problemId);
            
            // ป้องกันกรณี submittedAt ไม่มีอยู่หรือไม่ใช่ Timestamp object
            const currentSubmittedAt = data.submittedAt && typeof data.submittedAt.toDate === 'function' ? data.submittedAt.toDate() : new Date(0);
            const existingSubmittedAt = existing && existing.submittedAt && typeof existing.submittedAt.toDate === 'function' ? existing.submittedAt.toDate() : new Date(0);
            
            if (!existing || currentSubmittedAt > existingSubmittedAt) {
                latestSubmissions.set(data.problemId, data);
            }
        });

        // ดึงข้อมูลโจทย์และคำนวณ maxScore
        const problemDetails = new Map();
        for (const data of sortedProblems) {
            let maxScore = 0;

            if (data.type === 'python' && data.testCases) {
                maxScore = data.testCases.reduce((sum, test) => sum + (test.score || 1), 0);
            } else if (data.type === 'comprehension' && data.questions) {
                maxScore = data.questions.reduce((sum, q) => sum + (q.score || 1), 0);
            } else if (data.type === 'matching' && data.pairs) {
                maxScore = data.pairs.reduce((sum, pair) => sum + (pair.score || 1), 0);
            } else if (data.type === 'flowchart') {
                maxScore = data.maxScore || 10; // ใช้ maxScore จาก problemData ก่อน ถ้าไม่มีจึงใช้ค่า default 10
                console.log('Problem data for flowchart:', {
                    problemId: data.problemId,
                    type: data.type,
                    maxScore: data.maxScore,
                    finalMaxScore: maxScore
                });
            } else if (data.type === 'gui' || data.type === 'quiz' || data.type === 'comprehension') {
                maxScore = data.maxScore || 0;
                if ((data.type === 'quiz' || data.type === 'comprehension') && !maxScore && data.questions) {
                    maxScore = data.questions.reduce((sum, q) => sum + (q.score || 1), 0);
                }
            }

            console.log(`Problem ${data.problemId}:`, {
                type: data.type,
                maxScore: maxScore
            });

            problemDetails.set(data.problemId, {
                ...data,
                maxScore
            });
        }

        // คำนวณคะแนนรวมและจำนวนโจทย์ที่ทำสำเร็จ
        let completedCount = 0;
        let totalScore = 0;
        let totalMaxScore = 0;

        problemDetails.forEach((problem, problemId) => {
            const submission = latestSubmissions.get(problemId);
            
            // ใช้ maxScore จาก submission ถ้ามี (เผื่อกรณีครูแก้โจทย์ทีหลัง)
            const actualMaxScore = (submission && submission.maxScore) ? submission.maxScore : problem.maxScore;
            problem.displayMaxScore = actualMaxScore;
            
            totalMaxScore += actualMaxScore;
        
            // ตรวจสอบ submission ของแต่ละโจทย์
            if (submission && submission.score && submission.status === 'completed') {
                // นับคะแนนเฉพาะ status completed เท่านั้น
                completedCount++;
                totalScore += submission.score;
                console.log(`Adding score for ${problemId}:`, {
                    score: submission.score,
                    status: submission.status
                });
            }
        });

        console.log('Processing submissions...', {
            completedCount,
            totalScore,
            totalMaxScore
        });

        const totalProblems = problemDetails.size;
        const progressPercentage = totalProblems > 0 ? Math.round((completedCount / totalProblems) * 100) : 0;
        const scorePercentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

        console.log('Final calculations:', {
            totalProblems,
            completedCount,
            totalScore,
            totalMaxScore,
            progressPercentage,
            scorePercentage
        });

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
                    <p>${getDisplayEmail(studentData) || '-'}</p>
                </div>
            </div>

            <div class="progress-summary">
                <div class="progress-stat">
                    <div class="stat-value">${completedCount}</div>
                    <div class="stat-label">ทำสำเร็จ</div>
                </div>
                <div class="progress-stat">
                    <div class="stat-value">${totalProblems}</div>
                    <div class="stat-label">โจทย์ทั้งหมด</div>
                </div>
                <div class="progress-stat">
                    <div class="stat-value">${progressPercentage}%</div>
                    <div class="stat-label">ความคืบหน้า</div>
                </div>
                <div class="progress-stat">
                    <div class="stat-value">${totalScore}/${totalMaxScore}</div>
                    <div class="stat-label">คะแนน (${scorePercentage}%)</div>
                </div>
            </div>

            <!-- แสดงรายละเอียดของแต่ละโจทย์ -->
            <div class="problem-details">
                <h3>รายละเอียดแต่ละโจทย์</h3>
                <div class="problems-list">
                    ${Array.from(problemDetails.entries()).map(([problemId, problem]) => {
                        const submission = latestSubmissions.get(problemId);
                        const score = submission?.status === 'completed' ? submission.score : 0;
                        let statusText = 'ยังไม่ส่ง';
                        let viewLink = '';
                        
                        // ถ้าสถานะเป็น draft ให้ถือว่ายังไม่ส่ง
                        if (submission && submission.status !== 'draft') {
                            switch(submission.status) {
                                case 'completed':
                                    statusText = 'ส่งแล้ว';
                                    break;
                                case 'inProgress':
                                    statusText = 'กำลังตรวจ';
                                    break;
                                default:
                                    statusText = 'รอตรวจ';
                            }
                            
                            if (problem.type) {
                                viewLink = `
                                    <button onclick="viewProblem('${problemId}', '${studentId}')" 
                                       class="view-answer-btn" 
                                       style="margin-left: 10px; font-size: 0.9em; color: #3498db; text-decoration: none; background: none; border: none; cursor: pointer; padding: 0;">
                                       <i class="fas fa-search"></i> ดูคำตอบ
                                    </button>
                                `;
                            }
                        }
                        return `
                            <div class="problem-item">
                                <div class="problem-title"${statusText === 'ยังไม่ส่ง' ? ' style="color: #e67e22;"' : ''}>${problem.title}</div>
                                <div class="problem-info">
                                    <span class="problem-type">${problem.type}</span>
                                    <span class="problem-score ${submission?.status === 'completed' ? 'completed' : ''}">
                                        ${score}/${problem.displayMaxScore || problem.maxScore}
                                        (${statusText})
                                        ${viewLink}
                                    </span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
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
                        <p class="student-email">${getDisplayEmail(student) || '-'}</p>
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

// ฟังก์ชันดาวน์โหลดคะแนนนักเรียนเป็นไฟล์ CSV
async function exportScoresCSV() {
    const urlParams = new URLSearchParams(window.location.search);
    const classId = urlParams.get('id');
    if (!classId) return;

    try {
        const btn = document.querySelector('button[onclick="exportScoresCSV()"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังเตรียมไฟล์...';
        btn.disabled = true;

        // 1. ดึงข้อมูลนักเรียนทั้งหมดในคลาส
        const enrollmentsSnapshot = await db.collection('class_enrollments')
            .where('classId', '==', classId)
            .get();
        
        if (enrollmentsSnapshot.empty) {
            alert('ยังไม่มีนักเรียนในห้องเรียนนี้');
            btn.innerHTML = originalText;
            btn.disabled = false;
            return;
        }

        const studentPromises = enrollmentsSnapshot.docs.map(async (doc) => {
            const studentId = doc.data().studentId;
            const studentDoc = await db.collection('users').doc(studentId).get();
            return {
                id: studentId,
                name: studentDoc.exists ? (studentDoc.data().displayName || 'ไม่ระบุชื่อ') : 'ไม่ระบุชื่อ',
                email: studentDoc.exists ? studentDoc.data().email : ''
            };
        });
        const students = await Promise.all(studentPromises);

        // 2. ดึงข้อมูลโจทย์ทั้งหมดในคลาสแบบเรียงลำดับ
        const sortedProblems = await getSortedClassProblems(classId);

        const problems = sortedProblems.map(data => {
            return {
                id: data.problemId,
                title: data.title || 'Unknown Problem',
            };
        });

        // 3. ดึงข้อมูล submissions ทั้งหมดของคลาสนี้
        const submissionsSnapshot = await db.collection('submissions')
            .where('classId', '==', classId)
            .get();

        // Map: studentId -> { problemId -> score }
        const studentScores = new Map();
        students.forEach(s => studentScores.set(s.id, new Map()));

        // เก็บ submission ล่าสุดของแต่ละคนในแต่ละโจทย์
        const latestSubmissions = new Map(); // key: studentId_problemId
        
        submissionsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const key = `${data.studentId}_${data.problemId}`;
            const existing = latestSubmissions.get(key);
            
            const currentSubmittedAt = data.submittedAt && typeof data.submittedAt.toDate === 'function' ? data.submittedAt.toDate() : new Date(0);
            const existingSubmittedAt = existing && existing.submittedAt && typeof existing.submittedAt.toDate === 'function' ? existing.submittedAt.toDate() : new Date(0);
            
            if (!existing || currentSubmittedAt > existingSubmittedAt) {
                latestSubmissions.set(key, data);
            }
        });

        // ใส่คะแนนลงใน studentScores
        latestSubmissions.forEach((data, key) => {
            const studentId = data.studentId;
            const problemId = data.problemId;
            if (studentScores.has(studentId) && data.status === 'completed') {
                studentScores.get(studentId).set(problemId, data.score || 0);
            }
        });

        // 4. สร้าง CSV
        // Header row
        let csvContent = '\uFEFF'; // BOM for Excel UTF-8
        csvContent += 'ชื่อ-นามสกุล,อีเมล,คะแนนรวม';
        problems.forEach(p => {
            // Escape double quotes and commas in titles
            const safeTitle = p.title.replace(/"/g, '""');
            csvContent += `,"${safeTitle}"`;
        });
        csvContent += '\n';

        // Data rows
        students.forEach(student => {
            let row = `"${student.name.replace(/"/g, '""')}","${getDisplayEmail(student)}",`;
            
            let totalScore = 0;
            let problemScoresCsv = '';
            
            problems.forEach(p => {
                const scoreMap = studentScores.get(student.id);
                const score = scoreMap.has(p.id) ? scoreMap.get(p.id) : 0;
                totalScore += score;
                problemScoresCsv += `,${score}`;
            });
            
            row += `${totalScore}${problemScoresCsv}\n`;
            csvContent += row;
        });

        // 5. ดาวน์โหลดไฟล์
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        
        // ดึงชื่อห้องเพื่อตั้งชื่อไฟล์
        let className = "Class_Scores";
        const classDoc = await db.collection('classes').doc(classId).get();
        if(classDoc.exists) {
            className = classDoc.data().name.replace(/[^a-z0-9ก-๙]/gi, '_');
        }
        
        link.setAttribute("download", `${className}_Scores.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        btn.innerHTML = originalText;
        btn.disabled = false;

    } catch (error) {
        console.error("Error exporting CSV:", error);
        alert("เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์ CSV");
        const btn = document.querySelector('button[onclick="exportScoresCSV()"]');
        if(btn) {
            btn.innerHTML = '<i class="fas fa-file-csv"></i> ดาวน์โหลดคะแนนนักเรียน (CSV)';
            btn.disabled = false;
        }
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

        // เก็บข้อมูล availableProblems ไว้สำหรับ filter
        window.allAvailableProblems = availableProblems;

        // อัพเดต UI
        renderProblemBankList(availableProblems);

        // ตั้งค่า Event Listeners สำหรับค้นหาและกรอง
        setupProblemBankFilters();

    } catch (error) {
        console.error("Error loading problem bank:", error);
        problemBankList.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #dc3545;">
                เกิดข้อผิดพลาดในการโหลดข้อมูล: ${error.message}
                <br><button onclick="loadProblemBank()" class="secondary-btn" style="margin-top: 10px;">ลองใหม่</button>
            </div>`;
    }
}

// ฟังก์ชันแยกสำหรับการแสดงผลรายการคลังโจทย์
function renderProblemBankList(problems) {
    const problemBankList = document.getElementById('problemBankList');
    if (!problemBankList) return;

    if (problems.length === 0) {
        problemBankList.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <p>ไม่พบโจทย์ที่สามารถเพิ่มได้</p>
                <p style="font-size: 14px; color: #666;">ทุกโจทย์ถูกเพิ่มในห้องเรียนแล้ว หรือไม่มีโจทย์ที่ตรงกับเงื่อนไขการค้นหา</p>
            </div>`;
        return;
    }

    // กำหนด Icon ตามประเภท
    const typeMapping = {
        'python': { icon: '💻', text: 'Python' },
        'gui': { icon: '🖥️', text: 'GUI' },
        'flowchart': { icon: '🔄', text: 'Flowchart' },
        'comprehension': { icon: '📖', text: 'อ่านโค้ด' },
        'matching': { icon: '🔗', text: 'จับคู่' },
        'quiz': { icon: '📝', text: 'ปรนัย' }
    };

    problemBankList.innerHTML = '';
    problems.forEach(problem => {
        const typeInfo = typeMapping[problem.type] || { icon: '📄', text: 'ทั่วไป' };
        const div = document.createElement('div');
        div.className = 'problem-bank-item';
        
        let displayTitle = problem.title || 'ไม่มีชื่อโจทย์';
        if (problem.type === 'summary' && problem.isGroupWork && !displayTitle.endsWith('(ระบบกลุ่ม)')) {
            displayTitle += ' (ระบบกลุ่ม)';
        } else if (problem.type === 'comprehension' && !displayTitle.endsWith('(ข้อสอบ)')) {
            displayTitle += ' (ข้อสอบ)';
        }
        
        div.innerHTML = `
            <div class="problem-info">
                <h3><span title="${typeInfo.text}">${typeInfo.icon}</span> ${displayTitle}</h3>
                <p>${problem.description ? problem.description.substring(0, 100) + (problem.description.length > 100 ? '...' : '') : ''}</p>
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
}

// ตั้งค่า Event Listeners สำหรับการค้นหาและกรอง
function setupProblemBankFilters() {
    const searchInput = document.getElementById('searchProblemBank');
    const filterSelect = document.getElementById('filterProblemBankType');

    // นำ event listener เดิมออกเพื่อป้องกันการซ้ำซ้อน
    const newSearchInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearchInput, searchInput);
    
    const newFilterSelect = filterSelect.cloneNode(true);
    filterSelect.parentNode.replaceChild(newFilterSelect, filterSelect);

    const handleFilter = () => {
        if (!window.allAvailableProblems) return;
        
        const searchTerm = newSearchInput.value.toLowerCase();
        const selectedType = newFilterSelect.value;

        const filteredProblems = window.allAvailableProblems.filter(problem => {
            const matchSearch = problem.title.toLowerCase().includes(searchTerm) || 
                              (problem.description && problem.description.toLowerCase().includes(searchTerm));
            const matchType = selectedType === "" || problem.type === selectedType;
            return matchSearch && matchType;
        });

        renderProblemBankList(filteredProblems);
    };

    newSearchInput.addEventListener('input', handleFilter);
    newFilterSelect.addEventListener('change', handleFilter);
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

        // --- ส่วนที่แก้ไข: หา orderIndex ล่าสุดเพื่อนำมาต่อท้าย ---
        const statsSnapshot = await db.collection('class_problems')
            .where('classId', '==', classId)
            .get();
        
        const nextOrderIndex = statsSnapshot.size; // ใช้จำนวนโจทย์ที่มีอยู่เป็น index ตัวถัดไป
        // -----------------------------------------------------

        // เพิ่มโจทย์เข้าห้องเรียน พร้อม orderIndex
        await db.collection('class_problems').add({
            problemId: problemId,
            classId: classId,
            orderIndex: nextOrderIndex, // บันทึกลำดับ
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
window.exportScoresCSV = exportScoresCSV;
