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
let targetStudentId = null;
let totalClassmates = 0;
let studentMap = new Map();
let boardUnsubscribe = null;

document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged((user) => {
        if (user) {
            const urlParams = new URLSearchParams(window.location.search);
            currentProblemId = urlParams.get('id');
            currentClassId = urlParams.get('classId');
            targetStudentId = urlParams.get('studentId'); // Highlight student if passed

            if (!currentProblemId || !currentClassId) {
                alert('ไม่พบรหัสกิจกรรมหรือห้องเรียน');
                window.location.href = 'teacher-dashboard.html';
                return;
            }

            initializeApp();
        } else {
            window.location.href = 'index.html';
        }
    });
});

function goBack() {
    if (currentClassId) {
        window.location.href = `class-detail.html?id=${currentClassId}`;
    } else {
        window.location.href = 'teacher-dashboard.html';
    }
}

async function initializeApp() {
    try {
        await loadProblemDetails();
        await loadClassEnrollments();
        subscribeToSubmissions();
    } catch (error) {
        console.error('Initialization error:', error);
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูลห้องเรียน');
    }
}

async function loadProblemDetails() {
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
    document.getElementById('modalMaxScore').textContent = maxScore;
    document.getElementById('gradeScore').max = maxScore;
}

async function loadClassEnrollments() {
    // Get all students enrolled in this class
    const enrollmentsSnapshot = await db.collection('class_enrollments')
        .where('classId', '==', currentClassId)
        .get();

    totalClassmates = enrollmentsSnapshot.size;
    studentMap.clear();

    const fetchUserPromises = enrollmentsSnapshot.docs.map(async (doc) => {
        const studentId = doc.data().studentId;
        const studentDoc = await db.collection('users').doc(studentId).get();
        if (studentDoc.exists) {
            studentMap.set(studentId, studentDoc.data());
        }
    });

    await Promise.all(fetchUserPromises);
}

function subscribeToSubmissions() {
    if (boardUnsubscribe) boardUnsubscribe();

    const defaultAvatar = 'images/default-avatar.png';

    boardUnsubscribe = db.collection('submissions')
        .where('classId', '==', currentClassId)
        .where('problemId', '==', currentProblemId)
        .where('status', '==', 'completed')
        .onSnapshot((snapshot) => {
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

            // Calculate metrics
            const submissionsArray = Array.from(latestSubmissions.values());
            const submittedCount = submissionsArray.length;
            
            const gradedCount = submissionsArray.filter(sub => sub.gradedAt !== undefined && sub.gradedAt !== null).length;
            const pendingCount = submittedCount - gradedCount;

            // Update UI Stats
            document.getElementById('statSubmitted').textContent = `${submittedCount}/${totalClassmates}`;
            document.getElementById('statGraded').textContent = gradedCount;
            document.getElementById('statPendingGrade').textContent = pendingCount;

            // Render Board
            const boardContainer = document.getElementById('summaryBoard');
            if (submittedCount === 0) {
                boardContainer.innerHTML = `
                    <div class="empty-board">
                        <i class="fas fa-sticky-note fa-3x"></i>
                        <p>ยังไม่มีนักเรียนแปะโพสต์อิทสรุปบทเรียนในกิจกรรมนี้</p>
                    </div>
                `;
                return;
            }

            // Sort cards by submission date (newest first)
            const sortedCards = submissionsArray.sort((a, b) => {
                const dateA = a.submittedAt && typeof a.submittedAt.toDate === 'function' ? a.submittedAt.toDate() : new Date(0);
                const dateB = b.submittedAt && typeof b.submittedAt.toDate === 'function' ? b.submittedAt.toDate() : new Date(0);
                return dateB - dateA;
            });

            boardContainer.innerHTML = '';

            if (currentProblem && currentProblem.isGroupWork) {
                boardContainer.className = 'summary-board group-columns-container';
                const maxGroups = currentProblem.maxGroups || 5;
                const columns = {};
                
                for (let i = 1; i <= maxGroups; i++) {
                    const col = document.createElement('div');
                    col.className = 'group-column';
                    
                    // Create group header with scoring UI
                    const groupScore = sortedCards.find(c => c.groupId == i && c.score !== undefined)?.score || '';
                    const groupFeedback = sortedCards.find(c => c.groupId == i && c.feedback !== undefined)?.feedback || '';
                    
                    col.innerHTML = `
                        <div class="group-column-header">กลุ่มที่ ${i}</div>
                        <div class="group-scoring-card">
                            <label style="font-size: 0.9em; font-weight: bold; color: #475569;">ให้คะแนนกลุ่มนี้:</label>
                            <input type="number" id="groupScore_${i}" class="input-field" value="${groupScore}" min="0" max="${currentProblem.maxScore || 10}" placeholder="คะแนน">
                            <textarea id="groupFeedback_${i}" class="input-field" placeholder="ข้อเสนอแนะเพิ่มเติม..." rows="2" style="font-size: 0.9em;">${groupFeedback}</textarea>
                            <button class="primary-btn" onclick="saveGroupScore(${i})" id="btnSaveGroup_${i}" style="font-size: 0.9em; padding: 6px 12px;">บันทึกคะแนนกลุ่ม ${i}</button>
                        </div>
                    `;
                    columns[i] = col;
                    boardContainer.appendChild(col);
                }
                
                sortedCards.forEach(card => {
                    const groupId = card.groupId || 1;
                    if (columns[groupId]) {
                        columns[groupId].appendChild(createCardElement(card, defaultAvatar));
                    }
                });
            } else {
                boardContainer.className = 'summary-board';
                sortedCards.forEach(card => {
                    boardContainer.appendChild(createCardElement(card, defaultAvatar));
                });
            }

            // Smooth scroll to target student if specified
            if (targetStudentId) {
                setTimeout(() => {
                    const highlighted = document.querySelector('.highlight-card');
                    if (highlighted) {
                        highlighted.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    targetStudentId = null;
                }, 400);
            }

        }, (error) => {
            console.error('Error loading submissions:', error);
        });
}

function createCardElement(card, defaultAvatar) {
    const note = card.note || {};
    const studentProfile = studentMap.get(card.studentId) || {};
    const displayName = studentProfile.displayName || card.studentName || 'นักเรียน';
    const photoURL = studentProfile.photoURL || card.studentPhoto || defaultAvatar;

    const cardEl = document.createElement('div');
    cardEl.className = 'post-it-card';
    if (card.studentId === targetStudentId) {
        cardEl.className += ' highlight-card';
    }
    cardEl.style.backgroundColor = note.color || '#fff275';
    
    if (!currentProblem.isGroupWork) {
        cardEl.addEventListener('click', () => {
            openGradingModal(
                card.id, 
                card.studentId, 
                displayName, 
                note.title || 'ไม่มีหัวข้อ', 
                note.content || '', 
                note.color || '#fff275',
                card.score,
                card.feedback
            );
        });
    } else {
        cardEl.style.cursor = 'default';
    }

    let gradeBadge = '';
    if (card.gradedAt) {
        gradeBadge = `<div class="card-score-badge graded"><i class="fas fa-check-circle"></i> ตรวจแล้ว (${card.score}/${card.maxScore || 10})</div>`;
    } else {
        gradeBadge = `<div class="card-score-badge pending"><i class="fas fa-hourglass-start"></i> รอตรวจ</div>`;
    }

    cardEl.innerHTML = `
        ${gradeBadge}
        <div class="card-pin">📌</div>
        <div class="card-author">
            <img src="${photoURL}" alt="${displayName}" class="author-avatar" onerror="this.src='${defaultAvatar}'">
            <span class="author-name">${displayName}</span>
        </div>
        <h4 class="card-title">${escapeHTML(note.title || 'ไม่มีหัวข้อ')}</h4>
        <p class="card-content">${escapeHTML(note.content || '').replace(/\n/g, '<br>')}</p>
        <div class="card-footer">
            <span><i class="far fa-clock"></i> ${formatTime(card.submittedAt)}</span>
        </div>
    `;
    
    return cardEl;
}

async function saveGroupScore(groupId) {
    const scoreVal = parseFloat(document.getElementById(`groupScore_${groupId}`).value);
    const feedback = document.getElementById(`groupFeedback_${groupId}`).value.trim();
    const maxScore = currentProblem?.maxScore || 10;

    if (isNaN(scoreVal) || scoreVal < 0 || scoreVal > maxScore) {
        alert(`กรุณากรอกคะแนนที่ถูกต้องระหว่าง 0 ถึง ${maxScore}`);
        return;
    }

    const saveBtn = document.getElementById(`btnSaveGroup_${groupId}`);
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> บันทึก...';

    try {
        const batch = db.batch();
        const submissionsRef = db.collection('submissions');
        const snapshot = await submissionsRef
            .where('classId', '==', currentClassId)
            .where('problemId', '==', currentProblemId)
            .where('groupId', '==', groupId)
            .get();

        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, {
                score: scoreVal,
                feedback: feedback,
                teacherId: auth.currentUser.uid,
                gradedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });

        await batch.commit();
        alert(`บันทึกคะแนนกลุ่มที่ ${groupId} เรียบร้อยแล้ว!`);
    } catch (error) {
        console.error('Error saving group grade:', error);
        alert('เกิดข้อผิดพลาดในการบันทึกคะแนน กรุณาลองใหม่อีกครั้ง');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `บันทึกคะแนนกลุ่ม ${groupId}`;
    }
}

function openGradingModal(submissionId, studentId, studentName, title, content, color, score, feedback) {
    document.getElementById('gradingSubmissionId').value = submissionId;
    document.getElementById('gradingStudentId').value = studentId;
    
    // Set score input: default to existing score, or empty
    document.getElementById('gradeScore').value = (score !== undefined && score !== null) ? score : '';
    document.getElementById('gradeFeedback').value = feedback || '';

    // Create sticky-note preview inside modal
    const previewContainer = document.getElementById('gradingPostItPreview');
    previewContainer.innerHTML = `
        <div class="post-it-card preview-mode" style="background-color: ${color}; transform: rotate(0deg); width: 100%; min-height: 180px;">
            <div class="card-pin" style="top: -8px;">📌</div>
            <div class="card-author" style="margin-bottom: 8px;">
                <span class="author-name" style="font-size: 14px;">ของนักเรียน: <strong>${studentName}</strong></span>
            </div>
            <h4 class="card-title" style="font-size: 16px; margin-bottom: 6px;">${escapeHTML(title)}</h4>
            <p class="card-content" style="font-size: 13.5px; line-height: 1.4; max-height: 150px; overflow-y: auto;">${escapeHTML(content).replace(/\n/g, '<br>')}</p>
        </div>
    `;

    document.getElementById('gradingModal').style.display = 'block';
}

function closeGradingModal() {
    document.getElementById('gradingModal').style.display = 'none';
}

async function handleGradeSubmit(event) {
    event.preventDefault();

    const submissionId = document.getElementById('gradingSubmissionId').value;
    const scoreVal = parseFloat(document.getElementById('gradeScore').value);
    const feedback = document.getElementById('gradeFeedback').value.trim();
    const maxScore = currentProblem?.maxScore || 10;

    if (isNaN(scoreVal) || scoreVal < 0 || scoreVal > maxScore) {
        alert(`กรุณากรอกคะแนนที่ถูกต้องระหว่าง 0 ถึง ${maxScore}`);
        return;
    }

    const saveBtn = document.getElementById('saveGradeBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังบันทึก...';

    try {
        await db.collection('submissions').doc(submissionId).update({
            score: scoreVal,
            feedback: feedback,
            teacherId: auth.currentUser.uid,
            gradedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        closeGradingModal();
        alert('บันทึกผลการประเมินคะแนนเรียบร้อยแล้ว!');
    } catch (error) {
        console.error('Error saving grade:', error);
        alert('เกิดข้อผิดพลาดในการบันทึกคะแนน กรุณาลองใหม่อีกครั้ง');
    } finally {
        saveBtn.disabled = false;
    }
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
        return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) + ' ' + 
               date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
    } catch (e) {
        return '';
    }
}
