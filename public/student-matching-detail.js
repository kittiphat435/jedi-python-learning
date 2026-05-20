let currentProblem = null;
let matches = new Map();
let selectedItem = null;
let lineStart = null;
let isDrawing = false;
let isViewMode = false;



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

document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged((user) => {
        if (user) {
            const urlParams = new URLSearchParams(window.location.search);
            isViewMode = urlParams.get('mode') === 'view';
            loadProblem();
        } else {
            window.location.href = 'index.html';
        }
    });
});

const canvas = document.getElementById('matchingCanvas');
const ctx = canvas.getContext('2d');

async function loadSubmissionData(problemId, classId) {
    try {
        console.log('Loading submission for:', { problemId, classId }); // Debug log

        const submissionsSnapshot = await db.collection('submissions')
            .where('problemId', '==', problemId)
            .where('studentId', '==', auth.currentUser.uid)
            .where('classId', '==', classId)
            .orderBy('submittedAt', 'desc')
            .limit(1)
            .get();

        console.log('Submissions found:', !submissionsSnapshot.empty); // Debug log

        if (!submissionsSnapshot.empty) {
            const submission = submissionsSnapshot.docs[0].data();
            console.log('Loaded submission:', submission); // Debug log
            return submission;
        }
        return null;
    } catch (error) {
        console.error('Error loading submission:', error);
        return null;
    }
}

async function loadProblem() {
    try {
        document.getElementById('questionsContainer').innerHTML = '';
        document.getElementById('answersContainer').innerHTML = '';

        const urlParams = new URLSearchParams(window.location.search);
        const problemId = urlParams.get('id');
        const classId = urlParams.get('classId');

        console.log('Loading problem:', { problemId, classId, isViewMode }); // Debug log

        // Load problem data
        const doc = await db.collection('problems').doc(problemId).get();
        if (!doc.exists) throw new Error('ไม่พบโจทย์');

        currentProblem = { id: doc.id, ...doc.data() };
        console.log('Current problem:', currentProblem); // Debug log

        // Load submission in view mode
        if (isViewMode) {
            const submission = await loadSubmissionData(problemId, classId);
            if (submission && submission.answers) {
                matches.clear();
                Object.entries(submission.answers).forEach(([questionIndex, answer]) => {
                    matches.set(questionIndex, answer);
                });
                console.log('Loaded matches:', Array.from(matches.entries())); // Debug log
            }
        }

        // Display problem info
        document.getElementById('problemTitle').textContent = currentProblem.title || '';
        const descElement = document.getElementById('problemDescription');
        let descHTML = currentProblem.description || '';
        
        // ถ้ามีรูปภาพหรือสื่อ ให้แสดงปุ่ม
        if (currentProblem.image) {
            descHTML = `
                <div class="problem-media" style="margin-bottom: 15px;">
                    <button type="button" class="primary-btn" onclick="openMediaModal('${currentProblem.image}')" style="background-color: #17a2b8; border: none; padding: 8px 16px; border-radius: 4px; color: white; cursor: pointer; font-size: 14px; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="fas fa-external-link-alt"></i> 📄 คลิกเพื่อดูสื่อประกอบการเรียน
                    </button>
                </div>
                ${descHTML}
            `;
        }

        if (currentProblem.attachments) {
            descHTML += renderAttachmentsHTML(currentProblem.attachments);
        }
        
        descElement.innerHTML = descHTML; // ใช้ innerHTML แทน textContent

        // Setup questions and answers
        await setupQuestionAnswerElements();

        // Setup canvas and draw lines
        await setupCanvas();

        // Handle view mode UI
        if (isViewMode) {
            document.querySelectorAll('button').forEach(button => {
                if (button.onclick && button.onclick.toString().includes('goBack')) {
                    button.textContent = 'กลับไปหน้าห้องเรียน';
                } else {
                    button.style.display = 'none';
                }
            });

            // Ensure lines are drawn after everything is set up
            setTimeout(() => {
                console.log('Drawing lines after setup...'); // Debug log
                drawAllLines();
            }, 500);
        }

    } catch (error) {
        console.error('Error in loadProblem:', error);
        alert('เกิดข้อผิดพลาดในการโหลดโจทย์');
    }
}

async function setupQuestionAnswerElements() {
    const questionsContainer = document.getElementById('questionsContainer');
    const answersContainer = document.getElementById('answersContainer');

    // Setup questions
    currentProblem.pairs.forEach((pair, index) => {
        const div = document.createElement('div');
        div.className = 'matching-item question';
        div.dataset.index = index;
        div.textContent = pair.question;
        questionsContainer.appendChild(div);

        if (!isViewMode) {
            div.addEventListener('mousedown', startLine);
            div.addEventListener('mouseup', endLine);
        }
    });

    // Setup answers (don't shuffle in view mode)
    const answers = isViewMode ?
        currentProblem.pairs.map(p => p.answer) :
        [...currentProblem.pairs.map(p => p.answer)].sort(() => Math.random() - 0.5);

    answers.forEach(answer => {
        const div = document.createElement('div');
        div.className = 'matching-item answer';
        div.dataset.answer = answer;
        div.textContent = answer;
        answersContainer.appendChild(div);

        if (!isViewMode) {
            div.addEventListener('mousedown', startLine);
            div.addEventListener('mouseup', endLine);
        }
    });
}

async function setupCanvas() {
    const resizeCanvas = () => {
        const container = canvas.parentElement;
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;

        if (isViewMode) {
            console.log('Resizing canvas and redrawing lines...'); // Debug log
            setTimeout(drawAllLines, 100);
        }
    };

    window.addEventListener('resize', resizeCanvas);
    await resizeCanvas();

    if (!isViewMode) {
        canvas.addEventListener('mousemove', (e) => {
            if (isDrawing) {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                drawTempLine(x, y);
            }
        });
    }
}

function startLine(e) {
    if (isViewMode) return;
    const element = e.target;
    lineStart = getElementCenter(element);
    isDrawing = true;
    selectedItem = element;
}

function endLine(e) {
    if (isViewMode || !isDrawing) return;
    isDrawing = false;

    const targetElement = e.target;
    if (selectedItem.classList.contains('question') && targetElement.classList.contains('answer')) {
        matches.set(selectedItem.dataset.index, targetElement.dataset.answer);
    } else if (selectedItem.classList.contains('answer') && targetElement.classList.contains('question')) {
        matches.set(targetElement.dataset.index, selectedItem.dataset.answer);
    }

    drawAllLines();
}


function drawTempLine(currentX, currentY) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawAllLines();

    ctx.beginPath();
    if (selectedItem.classList.contains('question')) {
        ctx.moveTo(lineStart.x, lineStart.y);
        ctx.lineTo(currentX, currentY);
    } else {
        ctx.moveTo(currentX, currentY);
        ctx.lineTo(lineStart.x, lineStart.y);
    }
    ctx.strokeStyle = '#1a73e8';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawAllLines() {
    if (!canvas || !ctx) {
        console.error('Canvas or context not available');
        return;
    }

    console.log('Drawing all lines...', Array.from(matches.entries())); // Debug log
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    matches.forEach((answer, questionIndex) => {
        const questionEl = document.querySelector(`.question[data-index="${questionIndex}"]`);
        const answerEl = document.querySelector(`.answer[data-answer="${answer}"]`);

        if (questionEl && answerEl) {
            const start = getElementCenter(questionEl);
            const end = getElementCenter(answerEl);

            console.log('Drawing line:', {
                questionIndex,
                answer,
                start,
                end
            }); // Debug log

            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.strokeStyle = '#1a73e8';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            console.error('Elements not found:', {
                questionIndex,
                answer,
                questionEl: !!questionEl,
                answerEl: !!answerEl
            }); // Debug log
        }
    });
}

function getElementCenter(element) {
    const rect = element.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const isQuestion = element.classList.contains('question');

    return {
        x: isQuestion ?
            rect.right - canvasRect.left :
            rect.left - canvasRect.left,
        y: rect.top - canvasRect.top + (rect.height / 2)
    };
}

async function submitAnswer() {
    try {
        // ตรวจสอบว่าจับคู่ครบหรือไม่
        if (matches.size !== currentProblem.pairs.length) {
            alert(`กรุณาจับคู่ให้ครบทุกข้อ\nจับคู่แล้ว: ${matches.size} ข้อ\nทั้งหมด: ${currentProblem.pairs.length} ข้อ`);
            return;
        }

        // เตรียมข้อมูลสำหรับตรวจคำตอบ
        let score = 0;
        const results = [];
        const maxScore = currentProblem.pairs.reduce((sum, pair) => sum + (pair.score || 1), 0);
        const answersMap = {};
        let correctCount = 0;

        // ตรวจคำตอบและเก็บผลลัพธ์
        matches.forEach((answer, questionIndex) => {
            const currentPair = currentProblem.pairs[questionIndex];
            const isCorrect = currentPair.answer === answer;
            
            // ใส่ parseInt ป้องกันค่าคะแนนที่เป็น string (เช่น "1")
            const pairScore = isCorrect ? (parseInt(currentPair.score) || 1) : 0;

            if (isCorrect) correctCount++;
            score += pairScore;

            answersMap[questionIndex] = answer;
            results.push({
                questionIndex: parseInt(questionIndex),
                studentAnswer: answer,
                isCorrect: isCorrect,
                score: pairScore,
                maxScore: parseInt(currentPair.score) || 1 // แก้ตรงนี้ด้วย
            });
        });

        const classId = new URLSearchParams(window.location.search).get('classId');

        // บันทึกข้อมูลใน Firestore
        const submissionData = {
            problemId: currentProblem.id,
            studentId: auth.currentUser.uid,
            classId: classId,
            answers: answersMap,
            results: results,
            score: score,
            maxScore: maxScore,
            status: score === maxScore ? 'completed' : 'pending',
            submittedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('submissions').add(submissionData);

        // อัพเดตคะแนนรวม
        const enrollmentQuery = await db.collection('class_enrollments')
            .where('classId', '==', classId)
            .where('studentId', '==', auth.currentUser.uid)
            .get();

        if (!enrollmentQuery.empty) {
            const enrollmentDoc = enrollmentQuery.docs[0];
            const currentData = enrollmentDoc.data();
            await enrollmentDoc.ref.update({
                totalScore: (currentData.totalScore || 0) + score,
                totalMaxScore: (currentData.totalMaxScore || 0) + maxScore
            });
        }

        // สร้าง modal แสดงผล
        let resultHTML = '<h3>ผลการตรวจ</h3>';

        // แสดงสรุปผลการทำข้อสอบ
        const isPerfectScore = score === maxScore;
        resultHTML += `
            <div class="summary-box ${isPerfectScore ? 'perfect-score' : ''}">
                <h4>${isPerfectScore ? '🎉 ยินดีด้วย! คุณทำได้คะแนนเต็ม' : '📝 ผลการทำแบบทดสอบ'}</h4>
                <p>ทำถูก ${correctCount} ข้อ จากทั้งหมด ${currentProblem.pairs.length} ข้อ</p>
                <p>คะแนนที่ได้: ${score}/${maxScore} (${Math.round(score / maxScore * 100)}%)</p>
            </div>
        `;

        // แสดงรายละเอียดแต่ละข้อ
        resultHTML += '<div class="results-container">';
        currentProblem.pairs.forEach((pair, index) => {
            const result = results[index];
            resultHTML += `
                <div class="result-item ${result.isCorrect ? 'correct' : 'incorrect'}">
                    <div class="result-header">ข้อที่ ${index + 1} ${result.isCorrect ? '✅' : '❌'}</div>
                    <div class="result-details">
                        <p>คำถาม: ${pair.question}</p>
                        <p>คำตอบของคุณ: ${result.studentAnswer}</p>
                        ${!result.isCorrect ? `
                            <p class="error-message">❌ ทำผิด - ไม่ได้คะแนนในข้อนี้</p>
                        ` : `
                            <p class="success-message">✅ ทำถูก - ได้ ${result.score} คะแนน</p>
                        `}
                    </div>
                </div>
            `;
        });
        resultHTML += '</div>';

        const modal = document.createElement('div');
        modal.className = 'results-modal';
        modal.innerHTML = `
            <div class="results-content">
                ${resultHTML}
                <div class="results-actions">
                    <button onclick="goBack()" class="primary-btn">
                        ${isPerfectScore ? '🎉 กลับไปหน้าห้องเรียน' : 'กลับไปหน้าห้องเรียน'}
                    </button>
                    ${!isPerfectScore ?
                '<button onclick="this.parentElement.parentElement.parentElement.remove()" class="secondary-btn">ลองทำใหม่</button>'
                : ''
            }
                </div>
            </div>
        `;
        document.body.appendChild(modal);

    } catch (error) {
        console.error('Error submitting answer:', error);
        alert('เกิดข้อผิดพลาดในการส่งคำตอบ: ' + error.message);
    }
}

function goBack() {
    const urlParams = new URLSearchParams(window.location.search);
    const classId = urlParams.get('classId');
    if (classId === 'admin') {
        window.location.href = 'student-problem-admin.html';
    } else {
        window.location.href = `student-class-detail.html?id=${classId}`;
    }
}
function resetMatching() {
    // ถามยืนยันก่อนรีเซ็ต
    if (!confirm('คุณแน่ใจหรือไม่ที่จะรีเซ็ตคำตอบทั้งหมด?')) {
        return;
    }

    // ล้างการจับคู่ทั้งหมด
    matches.clear();

    // ล้าง selected state ของทุก item
    document.querySelectorAll('.matching-item').forEach(item => {
        item.classList.remove('selected');
    });

    // รีเซ็ตตัวแปรที่เกี่ยวข้อง
    selectedItem = null;
    lineStart = null;
    isDrawing = false;

    // ล้าง canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // สับเปลี่ยนคำตอบใหม่
    const answersContainer = document.getElementById('answersContainer');
    const answers = Array.from(answersContainer.children);
    for (let i = answers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        answersContainer.appendChild(answers[j]);
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

// เพิ่ม export function
window.resetMatching = resetMatching;
window.submitAnswer = submitAnswer;
window.goBack = goBack;

// Global Media Modal Function
window.openMediaModal = function(url) {
    if (!url) return;
    
    let modal = document.getElementById('globalMediaModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'globalMediaModal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 9999; display: flex; justify-content: center; align-items: center;';
        
        const contentBox = document.createElement('div');
        contentBox.style.cssText = 'position: relative; width: 90%; height: 90%; background: #fff; border-radius: 8px; padding: 10px; display: flex; flex-direction: column;';
        
        const header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: flex-end; margin-bottom: 10px;';
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✖ ปิดหน้าต่าง';
        closeBtn.style.cssText = 'background: #dc3545; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 14px;';
        closeBtn.onclick = () => {
            modal.style.display = 'none';
            document.getElementById('globalMediaContainer').innerHTML = ''; // clear iframe to stop video
        };

        const fullscreenBtn = document.createElement('button');
        fullscreenBtn.innerHTML = '🔲 เต็มหน้าจอ';
        fullscreenBtn.style.cssText = 'background: #28a745; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 14px; margin-right: 10px;';
        fullscreenBtn.onclick = () => {
            if (document.fullscreenElement) {
                document.exitFullscreen();
                fullscreenBtn.innerHTML = '🔲 เต็มหน้าจอ';
            } else {
                contentBox.requestFullscreen().catch(err => {
                    alert(`ไม่สามารถเปิดโหมดเต็มหน้าจอได้: ${err.message}`);
                });
                fullscreenBtn.innerHTML = '✖ ออกจากเต็มหน้าจอ';
            }
        };
        
        const mediaContainer = document.createElement('div');
        mediaContainer.id = 'globalMediaContainer';
        mediaContainer.style.cssText = 'flex-grow: 1; width: 100%; height: 100%; overflow: hidden; display: flex; justify-content: center; align-items: center; background: #f8f9fa; border-radius: 4px;';
        
        header.appendChild(fullscreenBtn);
        header.appendChild(closeBtn);
        contentBox.appendChild(header);
        contentBox.appendChild(mediaContainer);
        modal.appendChild(contentBox);
        document.body.appendChild(modal);
    }
    
    const container = document.getElementById('globalMediaContainer');
    container.innerHTML = '<p>กำลังโหลดสื่อ...</p>';
    modal.style.display = 'flex';
    
    const lowerUrl = url.toLowerCase();
    let embedHtml = '';
    
    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
        let videoId = '';
        if (lowerUrl.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1].split('?')[0];
        } else if (lowerUrl.includes('v=')) {
            videoId = url.split('v=')[1].split('&')[0];
        }
        if (videoId) {
            embedHtml = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        } else {
            embedHtml = `<iframe width="100%" height="100%" src="${url}" frameborder="0" allowfullscreen></iframe>`;
        }
    } else if (lowerUrl.match(/\.(jpeg|jpg|gif|png|webp|jfif)/i) != null || (lowerUrl.includes('alt=media') && !lowerUrl.includes('.pdf'))) {
        embedHtml = `<img src="${url}" style="max-width: 100%; max-height: 100%; object-fit: contain; margin: auto; display: block;">`;
    } else {
        embedHtml = `<iframe width="100%" height="100%" src="${url}" frameborder="0" allowfullscreen></iframe>`;
    }
    
    container.innerHTML = embedHtml;
};
