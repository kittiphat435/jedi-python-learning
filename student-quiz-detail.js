

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

let currentQuiz = null;

async function loadQuiz(quizId, userId) {
    try {
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
        updateQuizDisplay();
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
function updateQuizDisplay() {
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

        // ถ้ามีรูปภาพ
        if (currentQuiz.image) {
            content = `
                <div class="quiz-image">
                    <img src="${currentQuiz.image}" alt="รูปภาพประกอบ">
                </div>
                ${content}
            `;
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
        console.log('Loading submission...', { quizId, userId });
        
        const snapshot = await db.collection('submissions')
            .where('problemId', '==', quizId)
            .where('studentId', '==', userId)
            .orderBy('submittedAt', 'desc')
            .limit(1)
            .get();

        if (!snapshot.empty) {
            console.log('Found submission');
            const submission = snapshot.docs[0].data();
            console.log('Submission data:', submission);

            submission.answers.forEach((answer, index) => {
                if (currentQuiz.questions[index].type === 'multiple_choice') {
                    const radio = document.querySelector(`input[name="question-${index}"][value="${answer}"]`);
                    if (radio) radio.checked = true;
                } else {
                    const textarea = document.querySelector(`textarea[data-question="${index}"]`);
                    if (textarea) textarea.value = answer;
                }
            });

            updateStatusBadge(submission.status);
            if (submission.status === 'completed') {
                showScoreBadge(submission.score || 0, submission.maxScore);
            }
        } else {
            console.log('No submissions found');
        }
    } catch (error) {
        console.error('Error loading last submission:', error);
        console.error('Error details:', error);
    }
}
// Submit Quiz
async function submitQuiz() {
    if (!currentQuiz || !currentQuiz.questions) {
        alert('กรุณาโหลดแบบทดสอบใหม่');
        return;
    }

    const loadingOverlay = document.getElementById('loadingOverlay');
    console.log('Starting submit quiz...'); // เพิ่ม log

    try {
        loadingOverlay.style.display = 'flex';
        const answers = [];

        currentQuiz.questions.forEach((question, index) => {
            if (question.type === 'multiple_choice') {
                const selectedRadio = document.querySelector(`input[name="question-${index}"]:checked`);
                answers.push(selectedRadio ? selectedRadio.value : '');
            } else {
                const textarea = document.querySelector(`textarea[data-question="${index}"]`);
                answers.push(textarea ? textarea.value.trim() : '');
            }
        });

        console.log('Collected answers:', answers); // เพิ่ม log

        const results = currentQuiz.questions.map((question, index) => {
            const userAnswer = answers[index];
            const result = {
                question: question.question,
                userAnswer,
                correctAnswer: question.correctAnswer,
                isCorrect: userAnswer.toLowerCase() === question.correctAnswer.toLowerCase(),
                score: userAnswer.toLowerCase() === question.correctAnswer.toLowerCase() ? (question.score || 1) : 0
            };
            console.log(`Question ${index + 1} result:`, result); // เพิ่ม log
            return result;
        });

        const totalScore = results.reduce((sum, result) => sum + result.score, 0);
        const maxScore = currentQuiz.questions.reduce((sum, q) => sum + (q.score || 1), 0);
        
        console.log(`Score: ${totalScore}/${maxScore}`); // เพิ่ม log

        await db.collection('submissions').add({
            problemId: currentQuiz.id,
            studentId: auth.currentUser.uid,
            answers,
            results,
            score: totalScore,
            maxScore,
            status: totalScore === maxScore ? 'completed' : 'pending',
            submittedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showResults(results, totalScore, maxScore);
        updateStatusBadge(totalScore === maxScore ? 'completed' : 'pending');

    } catch (error) {
        console.error('Error details:', error); // เพิ่มรายละเอียด error
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
            <p>${totalScore === maxScore ? '🎉 ยินดีด้วย! คุณทำได้คะแนนเต็ม' : '😊 พยายามต่อไป!'}</p>
        </div>
        ${results.map((result, index) => `
            <div class="result-item">
                <div class="question-text">${index + 1}. ${result.question}</div>
                <div class="user-answer">คำตอบของคุณ: ${result.userAnswer}</div>
                <div class="${result.isCorrect ? 'correct-answer' : 'wrong-answer'}">
                    ${result.isCorrect
            ? '✅ ถูกต้อง'
            : `❌ ไม่ถูกต้อง<br>คำตอบที่ถูก: ${result.correctAnswer}`
        }
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

window.closeModal = closeModal;