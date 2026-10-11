let currentProblem = null;
let order = [];            // order[position] = originalIndex ของบรรทัดที่อยู่ในตำแหน่งนั้น
let userIndents = [];      // userIndents[position] = ระดับย่อหน้าของการ์ดที่อยู่ในตำแหน่งนั้น (0, 1, 2...)
let isViewMode = false;
let isSubmitted = false;
let dragSourcePosition = null;

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

async function loadSubmissionData(problemId, classId) {
    try {
        const submissionsSnapshot = await db.collection('submissions')
            .where('problemId', '==', problemId)
            .where('studentId', '==', auth.currentUser.uid)
            .where('classId', '==', classId)
            .get();

        if (!submissionsSnapshot.empty) {
            let submissions = submissionsSnapshot.docs.map(doc => doc.data());
            submissions.sort((a, b) => {
                const timeA = (a.timestamp || a.submittedAt)?.toDate?.()?.getTime?.() || (a.submittedAt?.toMillis?.() || 0);
                const timeB = (b.timestamp || b.submittedAt)?.toDate?.()?.getTime?.() || (b.submittedAt?.toMillis?.() || 0);
                return timeB - timeA;
            });
            return submissions[0];
        }
        return null;
    } catch (error) {
        console.error('Error loading submission:', error);
        return null;
    }
}

async function loadProblem() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const problemId = urlParams.get('id');
        const classId = urlParams.get('classId');

        const doc = await db.collection('problems').doc(problemId).get();
        if (!doc.exists) throw new Error('ไม่พบโจทย์');

        currentProblem = { id: doc.id, ...doc.data() };

        document.getElementById('problemTitle').textContent = currentProblem.title || '';
        const descElement = document.getElementById('problemDescription');
        let descText = currentProblem.description || '';
        let descHTML = descText.replace(/\\n/g, '<br>').replace(/\n/g, '<br>');

        // แสดงรูปภาพประกอบถ้ามี (แบบย่อ/ขยายได้)
        if (currentProblem.image) {
            descHTML = `
                <div id="problemImagePreview" class="problem-image collapsed">
                    <button type="button" class="image-toggle-btn" onclick="toggleImageSize()">ขยายภาพ</button>
                    <img src="${currentProblem.image}" alt="ภาพประกอบโจทย์" onclick="toggleImageSize()" onerror="this.parentElement.style.display='none'">
                </div>
                ${descHTML}
            `;
        }

        if (currentProblem.attachments) {
            descHTML += renderAttachmentsHTML(currentProblem.attachments);
        }

        descElement.innerHTML = descHTML;

        const lines = Array.isArray(currentProblem.lines) ? currentProblem.lines : [];
        if (lines.length < 2) {
            document.getElementById('codeOrderList').innerHTML =
                '<p style="color:#dc3545;">โจทย์นี้ยังไม่มีข้อมูลบรรทัดโค้ดเพียงพอ กรุณาแจ้งครูผู้สอน</p>';
            document.querySelector('.button-group').style.display = 'none';
            return;
        }

        if (isViewMode) {
            const submission = await loadSubmissionData(problemId, classId);
            if (submission && Array.isArray(submission.order)) {
                order = submission.order.slice();
                userIndents = Array.isArray(submission.userIndents)
                    ? submission.userIndents.slice()
                    : new Array(order.length).fill(0);
                isSubmitted = true;
                renderCodeOrderList();
                if (Array.isArray(submission.results)) {
                    showInlineResult(submission.results);
                }
            } else {
                order = lines.map((_, i) => i);
                userIndents = new Array(lines.length).fill(0);
                renderCodeOrderList();
            }

            const resetBtn = document.querySelector('.reset-btn');
            const submitBtn = document.querySelector('.submit-btn');
            const hint = document.querySelector('.code-order-hint');
            if (resetBtn) resetBtn.style.display = 'none';
            if (submitBtn) submitBtn.textContent = '';
            if (submitBtn) { submitBtn.innerHTML = '<i class="fas fa-arrow-left"></i> กลับไปหน้าห้องเรียน'; submitBtn.onclick = goBack; }
            if (hint) hint.style.display = 'none';
        } else {
            order = getShuffledOrder(lines.length);
            userIndents = new Array(lines.length).fill(0);
            renderCodeOrderList();
        }

    } catch (error) {
        console.error('Error in loadProblem:', error);
        alert('เกิดข้อผิดพลาดในการโหลดโจทย์');
    }
}

// ============ สุ่มลำดับเริ่มต้น ============
function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function getShuffledOrder(n) {
    const identity = Array.from({ length: n }, (_, i) => i);
    if (n <= 1) return identity;
    let shuffled = shuffleArray(identity);
    let attempts = 0;
    // กันกรณีสุ่มแล้วได้ลำดับถูกต้องพอดี (โจทย์ควรเริ่มแบบสลับแล้วเสมอ)
    while (shuffled.every((v, i) => v === i) && attempts < 10) {
        shuffled = shuffleArray(identity);
        attempts++;
    }
    return shuffled;
}

// ============ วาดรายการบัตรบรรทัดโค้ด ============
function renderCodeOrderList() {
    const listEl = document.getElementById('codeOrderList');
    if (!listEl || !currentProblem) return;

    const interactive = !isViewMode && !isSubmitted;
    listEl.innerHTML = '';

    order.forEach((originalIndex, position) => {
        const indent = userIndents[position] || 0;
        const card = document.createElement('div');
        card.className = 'code-order-card';
        card.dataset.position = position;
        card.draggable = interactive;

        card.innerHTML = `
            <span class="drag-handle"><i class="fas fa-grip-lines"></i></span>
            <span class="position-badge">${position + 1}</span>
            <div class="code-order-indent-btns">
                <button type="button" class="indent-btn outdent-btn" onclick="changeIndent(${position}, -1)" ${(!interactive || indent <= 0) ? 'disabled' : ''} title="ลดการย่อหน้า (เลื่อนซ้าย)">
                    <i class="fas fa-outdent"></i>
                </button>
                <span class="indent-level-badge" title="ระดับย่อหน้า">${indent}</span>
                <button type="button" class="indent-btn indent-more-btn" onclick="changeIndent(${position}, 1)" ${(!interactive || indent >= 5) ? 'disabled' : ''} title="เพิ่มการย่อหน้า (เลื่อนขวา)">
                    <i class="fas fa-indent"></i>
                </button>
            </div>
            <div class="code-order-img-container" style="padding-left: ${indent * 28}px;">
                ${indent > 0 ? `<div class="indent-guides">${'<span class="indent-guide-line"></span>'.repeat(indent)}</div>` : ''}
                <img src="${currentProblem.lines[originalIndex]}" alt="บรรทัดที่ ${position + 1}" onload="trimLeadingWhitespaceFromCard(this)" crossorigin="anonymous">
            </div>
            <div class="order-move-buttons">
                <button type="button" onclick="moveCodeOrderLine(${position}, -1)" ${(!interactive || position === 0) ? 'disabled' : ''} title="เลื่อนขึ้น">
                    <i class="fas fa-chevron-up"></i>
                </button>
                <button type="button" onclick="moveCodeOrderLine(${position}, 1)" ${(!interactive || position === order.length - 1) ? 'disabled' : ''} title="เลื่อนลง">
                    <i class="fas fa-chevron-down"></i>
                </button>
            </div>
        `;

        if (interactive) {
            card.addEventListener('dragstart', handleDragStart);
            card.addEventListener('dragover', handleDragOver);
            card.addEventListener('dragleave', handleDragLeave);
            card.addEventListener('drop', handleDrop);
            card.addEventListener('dragend', handleDragEnd);
        }

        listEl.appendChild(card);
    });
}

function changeIndent(position, delta) {
    if (isViewMode || isSubmitted) return;
    if (position < 0 || position >= userIndents.length) return;
    const cur = userIndents[position] || 0;
    const next = Math.max(0, Math.min(5, cur + delta));
    if (cur !== next) {
        userIndents[position] = next;
        renderCodeOrderList();
    }
}
window.changeIndent = changeIndent;

// ============ Drag & Drop (เดสก์ท็อป) ============
function handleDragStart(e) {
    dragSourcePosition = parseInt(e.currentTarget.dataset.position);
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', String(dragSourcePosition)); } catch (err) { /* ignore */ }
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const targetPosition = parseInt(e.currentTarget.dataset.position);
    if (dragSourcePosition === null || isNaN(targetPosition) || dragSourcePosition === targetPosition) return;

    const [moved] = order.splice(dragSourcePosition, 1);
    order.splice(targetPosition, 0, moved);

    const [movedIndent] = userIndents.splice(dragSourcePosition, 1);
    userIndents.splice(targetPosition, 0, movedIndent || 0);

    dragSourcePosition = null;
    renderCodeOrderList();
}

function handleDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    document.querySelectorAll('.code-order-card').forEach(c => c.classList.remove('drag-over'));
    dragSourcePosition = null;
}

// ============ ปุ่มขึ้น/ลง (สำรองสำหรับมือถือ/แท็บเล็ต) ============
function moveCodeOrderLine(position, delta) {
    if (isViewMode || isSubmitted) return;
    const newPos = position + delta;
    if (newPos < 0 || newPos >= order.length) return;
    const tmp = order[position];
    order[position] = order[newPos];
    order[newPos] = tmp;

    const tmpIndent = userIndents[position] || 0;
    userIndents[position] = userIndents[newPos] || 0;
    userIndents[newPos] = tmpIndent;

    renderCodeOrderList();
}

function resetCodeOrder() {
    if (isViewMode || isSubmitted) return;
    if (!confirm('คุณแน่ใจหรือไม่ที่จะสลับลำดับใหม่ทั้งหมด?')) return;
    order = getShuffledOrder(currentProblem.lines.length);
    userIndents = new Array(currentProblem.lines.length).fill(0);
    renderCodeOrderList();
}

// ============ ตรวจและส่งคำตอบ ============
async function submitAnswer() {
    if (isSubmitted) return;

    const isClosed = new URLSearchParams(window.location.search).get('closed') === 'true';
    if (isClosed) {
        alert('ปิดรับคำตอบแล้ว ไม่สามารถส่งงานได้');
        return;
    }

    try {
        const lines = currentProblem.lines || [];
        const total = lines.length;
        const maxScore = parseInt(currentProblem.maxScore) || total;
        const scorePerLine = maxScore / total;
        const hasIndentCriteria = Array.isArray(currentProblem.indents) && currentProblem.indents.length === total;

        let correctCount = 0;
        const results = order.map((originalIndex, position) => {
            const orderCorrect = originalIndex === position;
            const targetIndent = hasIndentCriteria ? (currentProblem.indents[originalIndex] || 0) : 0;
            const userIndent = userIndents[position] || 0;
            const indentCorrect = !hasIndentCriteria || (userIndent === targetIndent);
            const isCorrect = orderCorrect && indentCorrect;
            if (isCorrect) correctCount++;
            return {
                position,
                originalIndex,
                orderCorrect,
                indentCorrect,
                userIndent,
                targetIndent: hasIndentCriteria ? targetIndent : null,
                isCorrect
            };
        });

        const score = Math.round(scorePerLine * correctCount * 100) / 100;

        const classId = new URLSearchParams(window.location.search).get('classId');

        const submissionData = {
            problemId: currentProblem.id,
            studentId: auth.currentUser.uid,
            classId: classId,
            order: order,
            userIndents: userIndents,
            results: results,
            score: score,
            maxScore: maxScore,
            status: correctCount === total ? 'completed' : 'pending',
            submittedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('submissions').add(submissionData);

        // อัพเดตคะแนนรวมของห้องเรียน
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

        isSubmitted = true;
        renderCodeOrderList();
        showInlineResult(results);
        showResultModal(score, maxScore, correctCount, total);

    } catch (error) {
        console.error('Error submitting answer:', error);
        alert('เกิดข้อผิดพลาดในการส่งคำตอบ: ' + error.message);
    }
}

// ทำเครื่องหมายถูก/ผิดรายบัตรหลังส่งคำตอบ หรือตอนดูผลย้อนหลัง
function showInlineResult(results) {
    if (!Array.isArray(results)) return;
    const cards = document.querySelectorAll('.code-order-card');
    results.forEach(r => {
        const card = cards[r.position];
        if (!card) return;
        const mark = document.createElement('span');
        mark.className = 'result-mark';

        if (r.isCorrect) {
            card.classList.add('result-correct');
            mark.innerHTML = '<span title="ถูกต้องทั้งลำดับและย่อหน้า">✅</span>';
        } else if (r.orderCorrect && !r.indentCorrect) {
            card.classList.add('result-indent-wrong');
            mark.innerHTML = `<span class="indent-wrong-badge" title="ลำดับถูกต้อง แต่ย่อหน้าผิด (คุณใส่ ${r.userIndent} ระดับ)">⚠️ ย่อหน้าผิด</span>`;
        } else {
            card.classList.add('result-incorrect');
            mark.innerHTML = '<span title="ลำดับไม่ถูกต้อง">❌</span>';
        }
        card.appendChild(mark);
    });
}

function showResultModal(score, maxScore, correctCount, total) {
    const isPerfectScore = score === maxScore;

    const resultHTML = `
        <h3>ผลการตรวจ</h3>
        <div class="summary-box ${isPerfectScore ? 'perfect-score' : ''}">
            <h4>${isPerfectScore ? '🎉 ยินดีด้วย! คุณเรียงลำดับและย่อหน้าถูกต้องทั้งหมด' : '📝 ผลการเรียงลำดับคำสั่ง'}</h4>
            <p>ถูกต้อง ${correctCount} จาก ${total} บรรทัด</p>
            <p>คะแนนที่ได้: ${score}/${maxScore} (${maxScore > 0 ? Math.round(score / maxScore * 100) : 0}%)</p>
            <p style="font-size:0.9em; color:#666;">ดูเครื่องหมาย ✅ / ❌ / ⚠️ ที่บัตรแต่ละใบด้านบนเพื่อดูว่าตำแหน่งหรือย่อหน้าใดผิด</p>
        </div>
    `;

    const modal = document.createElement('div');
    modal.className = 'results-modal';
    modal.innerHTML = `
        <div class="results-content">
            ${resultHTML}
            <div class="results-actions">
                <button onclick="goBack()" class="primary-btn">
                    ${isPerfectScore ? '🎉 กลับไปหน้าห้องเรียน' : 'กลับไปหน้าห้องเรียน'}
                </button>
                ${!isPerfectScore ? '<button onclick="this.closest(\'.results-modal\').remove()" class="secondary-btn">ปิด (ดูรายบัตรด้านบน)</button>' : ''}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
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

// ฟังก์ชันสร้างปุ่มลิงก์แนบ (ไม่กินที่)
function renderAttachmentsHTML(attachments) {
    if (!attachments || !Array.isArray(attachments) || attachments.length === 0) return '';

    let html = '<div style="margin-top: 15px; padding-top: 10px; border-top: 1px dashed #ddd;">';
    html += '<div style="font-size: 0.9em; font-weight: bold; color: #666; margin-bottom: 8px;">📎 สื่อประกอบการเรียนรู้:</div>';
    html += '<div style="display: flex; flex-wrap: wrap; gap: 8px;">';

    attachments.forEach(att => {
        let icon = '🔗';
        let color = '#007bff';
        let bgColor = '#f0f7ff';

        if (att.type === 'youtube') {
            icon = '▶️'; color = '#dc3545'; bgColor = '#fff5f5';
        } else if (att.type === 'pdf') {
            icon = '📄'; color = '#fd7e14'; bgColor = '#fff9f2';
        } else if (att.type === 'image') {
            icon = '🖼️'; color = '#28a745'; bgColor = '#f0fff4';
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
window.resetCodeOrder = resetCodeOrder;
window.submitAnswer = submitAnswer;
window.moveCodeOrderLine = moveCodeOrderLine;
window.goBack = goBack;

// Global Media Modal Function (เหมือนหน้าโจทย์อื่นๆ)
window.openMediaModal = function (url) {
    if (!url) return;

    let modal = document.getElementById('globalMediaModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'globalMediaModal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 9999; display: flex; justify-content: flex-start; align-items: flex-start; padding: 20px;';

        const contentBox = document.createElement('div');
        contentBox.id = 'globalMediaContentBox';
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

        let isDragging = false;
        let currentX, currentY, initialX, initialY, xOffset = 0, yOffset = 0;

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
    modal.style.display = 'flex';
    container.innerHTML = '<p>กำลังโหลด...</p>';

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
window.toggleImageSize = toggleImageSize;

// ตัดช่องว่างย่อหน้าด้านหน้าของรูปภาพบรรทัดโค้ดออกอัตโนมัติ (ช่วยปรับสำหรับโจทย์เก่าที่ถูกบันทึกติดช่องว่างไว้)
function trimLeadingWhitespaceFromCard(img) {
    if (!img || img.dataset.trimmed) return;
    try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (!w || !h || w < 30 || h < 10) return;

        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        const bgR = data[0], bgG = data[1], bgB = data[2];
        const bgBr = (bgR + bgG + bgB) / 3;
        const isDark = bgBr < 128;

        const isInk = (r, g, b, a) => {
            if (a < 50) return false;
            const br = (r + g + b) / 3;
            return isDark ? (br - bgBr >= 30) : (bgBr - br >= 30);
        };

        const colThresh = Math.max(2, Math.round(h * 0.12));
        let firstInkX = w;
        for (let x = 0; x < w; x++) {
            let count = 0;
            for (let y = 0; y < h; y++) {
                const idx = (y * w + x) * 4;
                if (isInk(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) {
                    count++;
                }
            }
            if (count >= colThresh) {
                let ahead = 0;
                for (let dx = 1; dx <= 6 && x + dx < w; dx++) {
                    let cAhead = 0;
                    for (let y = 0; y < h; y++) {
                        const idx2 = (y * w + (x + dx)) * 4;
                        if (isInk(data[idx2], data[idx2 + 1], data[idx2 + 2], data[idx2 + 3])) cAhead++;
                    }
                    if (cAhead >= colThresh) ahead++;
                }
                if (ahead >= 1) {
                    firstInkX = x;
                    break;
                }
            }
        }

        // หากตรวจพบช่องว่างด้านหน้ามากกว่า 16px (ประมาณ 2-4 spaces ขึ้นไป) ให้ crop ชิดซ้ายทันที
        if (firstInkX > 16 && firstInkX < w) {
            const cropX = Math.max(0, firstInkX - 4);
            const cropW = w - cropX;
            const trimCanvas = document.createElement('canvas');
            trimCanvas.width = cropW;
            trimCanvas.height = h;
            const tctx = trimCanvas.getContext('2d');
            tctx.drawImage(c, cropX, 0, cropW, h, 0, 0, cropW, h);
            img.dataset.trimmed = '1';
            img.src = trimCanvas.toDataURL('image/png');
        }
    } catch (e) {
        // กรณีรูปมาจากต่างโดเมนแล้วเบราว์เซอร์บล็อก getImageData ด้วยนโยบาย CORS จะข้ามไปใช้รูปเดิมตามปกติ
    }
}
window.trimLeadingWhitespaceFromCard = trimLeadingWhitespaceFromCard;

