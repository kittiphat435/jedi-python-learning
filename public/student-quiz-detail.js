

// ===============================
// Robust Text Normalization (For Thai & Mobile Inputs)
// ===============================
function normalizeText(text) {
    if (text === null || text === undefined) return '';
    return text.toString()
        .normalize('NFC')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function compareText(actual, expected) {
    return normalizeText(actual) === normalizeText(expected);
}

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

let currentQuiz = null;

async function loadQuiz(quizId, userId) {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const isViewMode = urlParams.get('mode') === 'view';
        console.log("Loading quiz...", quizId); // ตรวจสอบการเรียกฟังก์ชัน
        const quizDoc = await db.collection('problems').doc(quizId).get();
        console.log("Quiz data:", quizDoc.data()); // ตรวจสอบข้อมูลที่ได้

        if (!quizDoc.exists) {
            throw new Error('ไม่พบแบบทดสอบ');
        }

        currentQuiz = {
            id: quizDoc.id,
            ...quizDoc.data(),
            createdAt: quizDoc.data().createdAt?.toDate() || null,
            updatedAt: quizDoc.data().updatedAt?.toDate() || null
        };

        console.log("Current Quiz:", currentQuiz); // ตรวจสอบข้อมูลที่เก็บ
        updateQuizDisplay(isViewMode);
        await loadLastSubmission(quizId, userId);
        return true;
    } catch (error) {
        console.error('Error loading quiz:', error);
        alert(error.message);
        window.location.href = 'student-dashboard.html';
        throw error;
    }
}
function getDifficultyText(difficulty) {
    return {
        'easy': 'ง่าย',
        'medium': 'ปานกลาง',
        'hard': 'ยาก'
    }[difficulty] || 'ปานกลาง';
}


// Update Quiz Display
function updateQuizDisplay(isViewMode = false) {
    if (!currentQuiz) {
        console.log('No quiz data');
        return;
    }
    console.log('Current quiz data:', currentQuiz);

    // Update title and difficulty badge
    const titleElement = document.getElementById('quizTitle');
    if (titleElement) {
        titleElement.textContent = currentQuiz.title;
        const difficultyBadge = document.createElement('span');
        difficultyBadge.className = `difficulty-badge ${currentQuiz.difficulty}`;
        difficultyBadge.textContent = getDifficultyText(currentQuiz.difficulty);
        titleElement.appendChild(difficultyBadge);
    }

    // Show content/passage
    const contentElement = document.getElementById('quizContent');
    if (contentElement) {
        let content = '';
        // ตรวจสอบและใช้ content หรือ passage ที่มี
        if (currentQuiz.content) {
            content = currentQuiz.content;
        } else if (currentQuiz.passage) {
            content = currentQuiz.passage;
        }

        console.log('Content:', content); // เพิ่ม log เพื่อตรวจสอบ

        // แสดงรูปภาพประกอบถ้ามี (แบบขยายได้)
        if (currentQuiz.image) {
            content = `
                <div id="problemImagePreview" class="problem-image">
                    <button type="button" class="image-toggle-btn" onclick="toggleImageSize()">ย่อภาพ</button>
                    <img src="${currentQuiz.image}" alt="ภาพประกอบโจทย์" onclick="toggleImageSize()" onerror="this.parentElement.style.display='none'">
                </div>
                ${content}
            `;
        }
        if (currentQuiz.attachments) {
        content += renderAttachmentsHTML(currentQuiz.attachments);
        }

        contentElement.innerHTML = content || 'ไม่พบเนื้อหา';
    }

    // Display questions
    const questionsList = document.getElementById('questionsList');
    if (questionsList && currentQuiz.questions) {
        console.log('Questions:', currentQuiz.questions); // เพิ่ม log เพื่อตรวจสอบ
        questionsList.innerHTML = currentQuiz.questions.map((question, index) => {
            if (!question) {
                console.log(`Invalid question at index ${index}`);
                return '';
            }

            return `
                <div class="question-item">
                    <div class="question-header">
                        <span class="question-number">ข้อ ${index + 1}</span>
                        <span class="question-score">(${question.score || 1} คะแนน)</span>
                    </div>
                    <div class="question-text">${question.question || ''}</div>
                    ${question.image ? `
                        <div class="question-image" style="margin-top: 12px; margin-bottom: 15px; text-align: center;">
                            <img src="${question.image}" alt="รูปภาพประกอบข้อ ${index + 1}" style="max-width: 100%; max-height: 350px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                        </div>
                    ` : ''}
                    <textarea 
                        class="answer-input"
                        data-question="${index}"
                        placeholder="พิมพ์คำตอบของคุณที่นี่"
                        ${question.maxLength ? `maxlength="${question.maxLength}"` : ''}
                    ></textarea>
                    ${question.hint ? `
                        <div class="hint">
                            <i class="hint-icon">💡</i> ${question.hint}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }
    // ซ่อน/แสดงปุ่มส่งคำตอบตาม mode
    const submitSection = document.querySelector('.submit-section');
    if (submitSection) {
        submitSection.style.display = isViewMode ? 'none' : 'block';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const quizId = urlParams.get('id');
    console.log("Quiz ID:", quizId); // ตรวจสอบ ID

    if (quizId) {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                console.log("User:", user.uid); // ตรวจสอบ user
                try {
                    await loadQuiz(quizId, user.uid);
                } catch (error) {
                    console.error('Error:', error);
                }
            } else {
                window.location.href = 'index.html';
            }
        });
    }
});

function setupCharacterCounters() {
    document.querySelectorAll('.answer-input[maxlength]').forEach(textarea => {
        const counter = textarea.nextElementSibling;
        if (counter && counter.classList.contains('char-count')) {
            textarea.addEventListener('input', () => {
                counter.textContent = `${textarea.value.length}/${textarea.maxLength}`;
            });
        }
    });
}

function isDisabled(status) {
    return status === 'completed' || status === 'graded';
}
// Load Last Submission
async function loadLastSubmission(quizId, userId) {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const isViewMode = urlParams.get('mode') === 'view';

        const snapshot = await db.collection('submissions')
            .where('problemId', '==', quizId)
            .where('studentId', '==', userId)
            .orderBy('submittedAt', 'desc')
            .limit(1)
            .get();

        if (!snapshot.empty) {
            const submission = snapshot.docs[0].data();

            // ใส่คำตอบที่เคยตอบไว้
            submission.answers.forEach((answer, index) => {
                const isExamCompleted = currentQuiz?.assignmentType === 'exam' && submission.status === 'completed';
                const textarea = document.querySelector(`textarea[data-question="${index}"]`);
                if (textarea) {
                    if (isExamCompleted) {
                        textarea.value = "ข้อสอบถูกส่งแล้ว ไม่สามารถดูคำตอบย้อนหลังได้";
                        textarea.readOnly = true;
                        textarea.classList.add('view-mode');
                    } else {
                        textarea.value = answer;
                        if (isViewMode) {
                            textarea.readOnly = true;
                            textarea.classList.add('view-mode');
                        }
                    }
                } else {
                    if (isExamCompleted) {
                        const radios = document.querySelectorAll(`input[name="question-${index}"]`);
                        radios.forEach(r => r.disabled = true);
                    } else if (answer) {
                        const radio = document.querySelector(`input[name="question-${index}"][value="${answer}"]`);
                        if (radio) radio.checked = true;
                        if (isViewMode) {
                            const radios = document.querySelectorAll(`input[name="question-${index}"]`);
                            radios.forEach(r => r.disabled = true);
                        }
                    }
                }
            });

            if (currentQuiz?.assignmentType === 'exam' && submission.status === 'completed') {
                const btn = document.querySelector('.submit-btn');
                if (btn) btn.style.display = 'none';
            }

            updateStatusBadge(submission.status);
            if (submission.status === 'completed') {
                showScoreBadge(submission.score || 0, submission.maxScore);
            }
        }
    } catch (error) {
        console.error('Error loading last submission:', error);
    }
}
// Submit Quiz
async function submitQuiz() {
    const isClosed = new URLSearchParams(window.location.search).get('closed') === 'true';
    if (isClosed) {
        alert('ปิดรับคำตอบแล้ว ไม่สามารถส่งงานได้');
        return;
    }
    if (!currentQuiz || !currentQuiz.questions) {
        alert('กรุณาโหลดแบบทดสอบใหม่');
        return;
    }

    // ดึง classId จาก URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const classId = urlParams.get('classId');

    if (!classId) {
        alert('ไม่พบรหัสห้องเรียน');
        return;
    }

    const loadingOverlay = document.getElementById('loadingOverlay');

    try {
        loadingOverlay.style.display = 'flex';
        const answers = [];

        // เก็บคำตอบ
        currentQuiz.questions.forEach((question, index) => {
            if (question.type === 'multiple_choice') {
                const selectedRadio = document.querySelector(`input[name="question-${index}"]:checked`);
                answers.push(selectedRadio ? selectedRadio.value : '');
            } else {
                const textarea = document.querySelector(`textarea[data-question="${index}"]`);
                answers.push(textarea ? textarea.value.trim() : '');
            }
        });

        // ตรวจคำตอบและคำนวณคะแนน
        const results = currentQuiz.questions.map((question, index) => {
            const userAnswer = answers[index];
            const result = {
                question: question.question,
                userAnswer,
                correctAnswer: question.correctAnswer,
                isCorrect: compareText(userAnswer, question.correctAnswer),
                score: compareText(userAnswer, question.correctAnswer) ? (question.score || 1) : 0
            };
            return result;
        });

        const totalScore = results.reduce((sum, result) => sum + result.score, 0);
        const maxScore = currentQuiz.questions.reduce((sum, q) => sum + (q.score || 1), 0);

        const allCorrect = results.every(r => r.isCorrect);
        const anyCorrect = results.some(r => r.isCorrect);

        // บันทึกข้อมูลพร้อม classId
        await db.collection('submissions').add({
            problemId: currentQuiz.id,
            studentId: auth.currentUser.uid,
            classId: classId,  // ใช้ classId ที่ดึงมาจาก URL
            answers,
            results,
            score: totalScore,
            maxScore,
            type: 'comprehension',
            status: allCorrect ? 'completed' : anyCorrect ? 'inProgress' : 'pending',
            submittedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showResults(results, totalScore, maxScore);
        updateStatusBadge(totalScore === maxScore ? 'completed' : 'pending');

        if (allCorrect && currentQuiz?.assignmentType === 'exam') {
            alert('ระบบได้ทำการส่งข้อสอบของคุณเรียบร้อยแล้ว!');
        }

        if (allCorrect) {
            setTimeout(() => {
            if (classId === 'admin') {
                window.location.href = 'student-problem-admin.html';
            } else {
                window.location.href = `student-class-detail.html?id=${classId}&refresh=true`;
            }
            }, 2000);
        }

    } catch (error) {
        console.error('Error details:', error);
        alert('เกิดข้อผิดพลาดในการส่งคำตอบ');
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

function closeModal() {
    const modal = document.getElementById('resultModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Show Results
function showResults(results, totalScore, maxScore) {
    const modal = document.getElementById('resultModal');
    const resultsDiv = document.getElementById('quizResults');

    resultsDiv.innerHTML = `
        <div class="result-summary">
            <h3>คะแนนรวม: ${totalScore}/${maxScore}</h3>
            <p>${totalScore === maxScore ? '🎉 ยินดีด้วย! คุณทำได้คะแนนเต็ม' : '😊 พยายามต่อไป! คุณจะไม่ได้คะแนนข้อนี้ ถ้าตอบไม่ถูกทุกข้อ'}</p>
        </div>
        ${results.map((result, index) => `
            <div class="result-item">
                <div class="question-text">${index + 1}. ${result.question}</div>
                <div class="user-answer">คำตอบของคุณ: ${result.userAnswer}</div>
                <div class="${result.isCorrect ? 'correct-answer' : 'wrong-answer'}">
                    ${result.isCorrect ? '✅ ถูกต้อง' : '❌ ไม่ถูกต้อง ลองอีกครั้งนะครับ'}
                </div>
            </div>
        `).join('')}
    `;

    modal.style.display = 'flex';
}

// Update Status Badge
function updateStatusBadge(status) {
    const badge = document.getElementById('statusBadge');
    if (badge) {
        badge.className = `status-badge status-${status}`;
        badge.textContent = status === 'completed' ? 'ผ่านแล้ว' : 'ยังไม่ผ่าน';
    }
}
function showScoreBadge(score, maxScore) {
    const scoreElement = document.createElement('div');
    scoreElement.className = 'score-badge';
    scoreElement.textContent = `คะแนน: ${score}/${maxScore}`;
    document.querySelector('.header-right').appendChild(scoreElement);
}
// เพิ่มฟังก์ชันไว้ที่ด้านบนของไฟล์
function goBack() {
    const urlParams = new URLSearchParams(window.location.search);
    const classId = urlParams.get('classId');
    if (classId) {
        if (classId === 'admin') {
            window.location.href = 'student-problem-admin.html';
        } else {
            window.location.href = `student-class-detail.html?id=${classId}`;
        }
    } else {
        window.location.href = 'student-dashboard.html';
    }
}
// ฟังก์ชันสร้างปุ่มลิงก์แนบ (ไม่กินที่)
function renderAttachmentsHTML(attachments) {
    if (!attachments || !Array.isArray(attachments) || attachments.length === 0) return '';

    let html = '<div style="margin-top: 15px; padding-top: 10px; border-top: 1px dashed #ddd;">';
    html += '<div style="font-size: 0.9em; font-weight: bold; color: #666; margin-bottom: 8px;">📎 สื่อประกอบการเรียนรู้:</div>';
    html += '<div style="display: flex; flex-wrap: wrap; gap: 8px;">';

    attachments.forEach(att => {
        let icon = '🔗';
        let color = '#007bff'; // สีฟ้า (Web)
        let bgColor = '#f0f7ff';

        if (att.type === 'youtube') { 
            icon = '▶️'; color = '#dc3545'; bgColor = '#fff5f5'; // สีแดง
        } else if (att.type === 'pdf') { 
            icon = '📄'; color = '#fd7e14'; bgColor = '#fff9f2'; // สีส้ม
        } else if (att.type === 'image') { 
            icon = '🖼️'; color = '#28a745'; bgColor = '#f0fff4'; // สีเขียว
        }

        html += `
            <a href="javascript:void(0);" onclick="openMediaModal('${att.url}')" 
               style="text-decoration: none; color: ${color}; background: ${bgColor}; 
                      border: 1px solid ${color}40; padding: 5px 12px; border-radius: 20px; 
                      font-size: 0.85em; display: inline-flex; align-items: center; gap: 5px; 
                      transition: all 0.2s;"
               onmouseover="this.style.background='${color}'; this.style.color='white';"
               onmouseout="this.style.background='${bgColor}'; this.style.color='${color}';">
               <span>${icon}</span>
               <span>${att.title || 'เปิดลิงก์'}</span>
            </a>
        `;
    });

    html += '</div></div>';
    return html;
}

// Export function ไว้ใช้ใน HTML
window.goBack = goBack;
window.closeModal = closeModal;

// Global Media Modal Function
window.openMediaModal = function(url) {
    if (!url) return;
    
    let modal = document.getElementById('globalMediaModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'globalMediaModal';
        // เปลี่ยนเป็นโปร่งใส ไม่บังส่วนที่เหลือ
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 9999; display: flex; justify-content: flex-start; align-items: flex-start; padding: 20px;';
        
        const contentBox = document.createElement('div');
        contentBox.id = 'globalMediaContentBox';
        // เพิ่ม pointer-events: auto เพื่อให้กดได้เฉพาะตัวหน้าต่าง
        contentBox.style.cssText = 'position: relative; width: 400px; height: 500px; background: #fff; border-radius: 12px; padding: 10px; display: flex; flex-direction: column; box-shadow: 0 10px 30px rgba(0,0,0,0.3); pointer-events: auto; border: 2px solid #1a73e8; resize: both; overflow: auto;';
        
        const header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; cursor: move; background: #f8f9fa; padding: 5px 10px; border-radius: 6px;';
        header.innerHTML = '<span style="font-weight: bold; color: #1a73e8; font-size: 14px;">🖼️ รูปภาพประกอบ</span>';
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✖';
        closeBtn.style.cssText = 'background: #dc3545; color: white; border: none; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-weight: bold; font-size: 12px; display: flex; align-items: center; justify-content: center;';
        closeBtn.onclick = () => {
            modal.style.display = 'none';
            document.getElementById('globalMediaContainer').innerHTML = '';
        };

        const mediaContainer = document.createElement('div');
        mediaContainer.id = 'globalMediaContainer';
        mediaContainer.style.cssText = 'flex-grow: 1; width: 100%; height: 100%; overflow: auto; display: flex; justify-content: center; align-items: center; background: #f8f9fa; border-radius: 4px;';
        
        header.appendChild(closeBtn);
        contentBox.appendChild(header);
        contentBox.appendChild(mediaContainer);
        modal.appendChild(contentBox);
        document.body.appendChild(modal);

        // ทำให้ลากได้ (Drag feature)
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;

        header.addEventListener("mousedown", dragStart);
        document.addEventListener("mousemove", drag);
        document.addEventListener("mouseup", dragEnd);

        function dragStart(e) {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            if (e.target === header || header.contains(e.target)) {
                isDragging = true;
            }
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                xOffset = currentX;
                yOffset = currentY;
                setTranslate(currentX, currentY, contentBox);
            }
        }

        function setTranslate(xPos, yPos, el) {
            el.style.transform = "translate3d(" + xPos + "px, " + yPos + "px, 0)";
        }

        function dragEnd() {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
        }
    }
    
    const container = document.getElementById('globalMediaContainer');
    const contentBox = document.getElementById('globalMediaContentBox');
    container.innerHTML = '<p>กำลังโหลด...</p>';
    modal.style.display = 'flex';
    
    const lowerUrl = url.toLowerCase();
    let embedHtml = '';
    const isImage = lowerUrl.match(/\.(jpeg|jpg|gif|png|webp|jfif)/i) != null || (lowerUrl.includes('alt=media') && !lowerUrl.includes('.pdf'));

    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
        let videoId = '';
        if (lowerUrl.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1].split('?')[0];
        } else if (lowerUrl.includes('v=')) {
            videoId = url.split('v=')[1].split('&')[0];
        }
        embedHtml = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
    } else if (isImage) {
        embedHtml = `<img src="${url}" style="max-width: 100%; max-height: 100%; object-fit: contain; margin: auto; display: block;">`;
    } else {
        embedHtml = `<iframe width="100%" height="100%" src="${url}" frameborder="0" allowfullscreen></iframe>`;
    }
    
    container.innerHTML = embedHtml;
};

// ฟังก์ชันย่อ/ขยายภาพประกอบ
function toggleImageSize() {
    const preview = document.getElementById('problemImagePreview');
    if (preview) {
        const isCollapsed = preview.classList.toggle('collapsed');
        const btn = preview.querySelector('.image-toggle-btn');
        if (btn) {
            btn.textContent = isCollapsed ? 'ขยายภาพ' : 'ย่อภาพ';
        }
    }
}