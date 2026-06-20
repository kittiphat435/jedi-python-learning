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

let currentProblemId = null;
let currentClassId = null;
let currentProblem = null;
let selectedColor = '#fff275'; // Default yellow
let studentSubmission = null;
let boardUnsubscribe = null;

// User caching to prevent repeated reads
const userCache = new Map();

document.addEventListener('DOMContentLoaded', () => {
    // Setup color picker
    setupColorPicker();
    
    // Setup character count
    const textarea = document.getElementById('noteContent');
    const charCountSpan = document.getElementById('currentCharCount');
    textarea.addEventListener('input', () => {
        charCountSpan.textContent = textarea.value.length;
    });

    auth.onAuthStateChanged((user) => {
        if (user) {
            const urlParams = new URLSearchParams(window.location.search);
            currentProblemId = urlParams.get('id');
            currentClassId = urlParams.get('classId');

            if (!currentProblemId || !currentClassId) {
                alert('ไม่พบรหัสกิจกรรมหรือห้องเรียน');
                window.location.href = 'student-dashboard.html';
                return;
            }

            loadProblemDetails();
            loadStudentSubmission();
            subscribeToBoard();

            const isViewMode = urlParams.get('mode') === 'view';
            if (isViewMode) {
                // ซ่อนฟอร์มสรุปเพื่อแสดงผลกระดานกว้างเต็มหน้าจอ
                const editorSection = document.querySelector('.editor-section');
                if (editorSection) editorSection.style.display = 'none';
                const workspaceLayout = document.querySelector('.workspace-layout');
                if (workspaceLayout) workspaceLayout.style.gridTemplateColumns = '1fr';
            }
        } else {
            window.location.href = 'index.html';
        }
    });
});

function goBack() {
    if (currentClassId) {
        window.location.href = `student-class-detail.html?id=${currentClassId}`;
    } else {
        window.location.href = 'student-dashboard.html';
    }
}

async function loadProblemDetails() {
    try {
        const problemDoc = await db.collection('problems').doc(currentProblemId).get();
        if (!problemDoc.exists) {
            alert('ไม่พบข้อมูลกิจกรรมนี้');
            goBack();
            return;
        }

        currentProblem = problemDoc.data();
        document.getElementById('problemTitle').textContent = currentProblem.title || 'กิจกรรมสรุปผลการเรียน';
        document.getElementById('problemDescription').innerHTML = currentProblem.description ? currentProblem.description.replace(/\n/g, '<br>') : 'ไม่มีคำชี้แจง';
        
        const maxScore = currentProblem.maxScore || 10;
        document.getElementById('maxScoreDisplay').textContent = `คะแนนเต็ม: ${maxScore} คะแนน`;
        document.getElementById('myMaxScoreDisplay').textContent = maxScore;
    } catch (error) {
        console.error('Error loading problem details:', error);
        alert('เกิดข้อผิดพลาดในการโหลดรายละเอียดกิจกรรม');
    }
}

async function loadStudentSubmission() {
    try {
        // Query latest submission of this student
        const snapshot = await db.collection('submissions')
            .where('problemId', '==', currentProblemId)
            .where('studentId', '==', auth.currentUser.uid)
            .where('classId', '==', currentClassId)
            .orderBy('submittedAt', 'desc')
            .limit(1)
            .get();

        if (!snapshot.empty) {
            studentSubmission = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
            populateEditor(studentSubmission);
        }
    } catch (error) {
        console.error('Error loading student submission:', error);
    }
}

function populateEditor(submission) {
    const note = submission.note || {};
    document.getElementById('noteContent').value = note.content || '';
    document.getElementById('currentCharCount').textContent = (note.content || '').length;

    // Set active color
    if (note.color) {
        selectedColor = note.color;
        const colorButtons = document.querySelectorAll('.color-btn');
        colorButtons.forEach(btn => {
            if (btn.getAttribute('data-color') === selectedColor) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // Update submit button text
    document.getElementById('submitBtn').innerHTML = '<i class="fas fa-edit"></i> อัพเดทโพสต์อิท';

    // Show grade feedback if evaluated
    if (submission.score !== undefined && submission.score !== null && submission.gradedAt) {
        document.getElementById('gradeCard').style.display = 'block';
        document.getElementById('myScoreDisplay').textContent = submission.score;
        document.getElementById('teacherFeedback').innerHTML = submission.feedback ? 
            `<strong>ความคิดเห็นจากครู:</strong><p>${submission.feedback.replace(/\n/g, '<br>')}</p>` : 
            '<em>ได้รับการประเมินแล้ว (ไม่มีความคิดเห็นเพิ่มเติม)</em>';
    } else {
        document.getElementById('gradeCard').style.display = 'none';
    }
}

function setupColorPicker() {
    const picker = document.getElementById('colorPicker');
    picker.addEventListener('click', (e) => {
        const btn = e.target.closest('.color-btn');
        if (!btn) return;

        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedColor = btn.getAttribute('data-color');
    });
}

async function handleFormSubmit(event) {
    event.preventDefault();

    const content = document.getElementById('noteContent').value.trim();

    if (!content) {
        alert('กรุณากรอกข้อมูลสรุปความรู้');
        return;
    }

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังบันทึก...';

    try {
        const submissionData = {
            problemId: currentProblemId,
            classId: currentClassId,
            studentId: auth.currentUser.uid,
            studentName: auth.currentUser.displayName || 'ไม่ระบุชื่อ',
            studentPhoto: auth.currentUser.photoURL || '',
            note: {
                title: auth.currentUser.displayName || 'สรุปความรู้',
                content: content,
                color: selectedColor
            },
            status: 'completed',
            type: 'summary',
            // Preserve score if updating submission
            score: (studentSubmission && studentSubmission.score !== undefined) ? studentSubmission.score : 0,
            maxScore: currentProblem?.maxScore || 10,
            submittedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // If teacher feedback exists, preserve it as well
        if (studentSubmission && studentSubmission.feedback) {
            submissionData.feedback = studentSubmission.feedback;
            submissionData.gradedAt = studentSubmission.gradedAt;
            submissionData.teacherId = studentSubmission.teacherId;
        }

        // Add a new submission document (following platform pattern of append-only)
        await db.collection('submissions').add(submissionData);

        alert('บันทึกคำสรุปของคุณลงบนกระดานเรียบร้อยแล้ว!');
        
        // Reload student submission to update the form state
        await loadStudentSubmission();

    } catch (error) {
        console.error('Error submitting summary:', error);
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
        submitBtn.disabled = false;
    }
}

function subscribeToBoard() {
    if (boardUnsubscribe) boardUnsubscribe();

    const defaultAvatar = 'images/default-avatar.png'; // Platform default avatar fallback

    boardUnsubscribe = db.collection('submissions')
        .where('classId', '==', currentClassId)
        .where('problemId', '==', currentProblemId)
        .where('status', '==', 'completed')
        .onSnapshot(async (snapshot) => {
            const boardContainer = document.getElementById('summaryBoard');
            if (snapshot.empty) {
                boardContainer.innerHTML = `
                    <div class="empty-board">
                        <i class="fas fa-sticky-note fa-3x"></i>
                        <p>กระดานยังว่างอยู่ ร่วมเป็นคนแรกที่แปะโพสต์อิทสรุปบทเรียนสิ!</p>
                    </div>
                `;
                return;
            }

            // Group by studentId and keep only the latest submission
            const latestSubmissions = new Map();
            snapshot.docs.forEach(doc => {
                const data = { id: doc.id, ...doc.data() };
                const existing = latestSubmissions.get(data.studentId);
                
                const currentSubmittedAt = data.submittedAt && typeof data.submittedAt.toDate === 'function' ? data.submittedAt.toDate() : new Date(0);
                const existingSubmittedAt = existing && existing.submittedAt && typeof existing.submittedAt.toDate === 'function' ? existing.submittedAt.toDate() : new Date(0);

                if (!existing || currentSubmittedAt > existingSubmittedAt) {
                    latestSubmissions.set(data.studentId, data);
                }
            });

            // Convert map to array and sort by submission date descending (newest first)
            const sortedCards = Array.from(latestSubmissions.values()).sort((a, b) => {
                const dateA = a.submittedAt && typeof a.submittedAt.toDate === 'function' ? a.submittedAt.toDate() : new Date(0);
                const dateB = b.submittedAt && typeof b.submittedAt.toDate === 'function' ? b.submittedAt.toDate() : new Date(0);
                return dateB - dateA; // Newest first
            });

            boardContainer.innerHTML = '';

            for (const card of sortedCards) {
                const note = card.note || {};
                const isOwnCard = card.studentId === auth.currentUser.uid;
                
                // Get user photo and name (fallback to cached or stored data)
                let photoURL = card.studentPhoto || defaultAvatar;
                let displayName = card.studentName || 'นักเรียน';

                const cardEl = document.createElement('div');
                cardEl.className = `post-it-card ${isOwnCard ? 'own-card' : ''}`;
                cardEl.style.backgroundColor = note.color || '#fff275';
                
                // Construct score badge HTML
                let scoreBadge = '';
                if (card.score !== undefined && card.score !== null && card.gradedAt) {
                    scoreBadge = `<div class="card-score-badge"><i class="fas fa-star"></i> ${card.score}/${card.maxScore || 10}</div>`;
                }

                cardEl.innerHTML = `
                    ${scoreBadge}
                    <div class="card-pin">📌</div>
                    <div class="card-author">
                        <img src="${photoURL}" alt="${displayName}" class="author-avatar" onerror="this.src='${defaultAvatar}'">
                        <span class="author-name">${displayName} ${isOwnCard ? '(ฉัน)' : ''}</span>
                    </div>
                    <h4 class="card-title">${escapeHTML(note.title || 'ไม่มีหัวข้อ')}</h4>
                    <p class="card-content">${escapeHTML(note.content || '').replace(/\n/g, '<br>')}</p>
                    <div class="card-footer">
                        <span><i class="far fa-clock"></i> ${formatTime(card.submittedAt)}</span>
                    </div>
                `;

                boardContainer.appendChild(cardEl);
            }
        }, (error) => {
            console.error('Error listening to board updates:', error);
        });
}

function escapeHTML(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatTime(timestamp) {
    if (!timestamp) return 'กำลังบันทึก...';
    try {
        const date = timestamp.toDate();
        return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
    } catch (e) {
        return '';
    }
}
