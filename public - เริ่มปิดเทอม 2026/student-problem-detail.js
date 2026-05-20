// Configuration
const config = {
    API_URL: 'https://xtgzdpztzdbavnbmjk2f25vq7u0nsfrx.lambda-url.us-east-1.on.aws/',

};

const firebaseConfig = {
    apiKey: "AIzaSyDWiPuk0WP9z5_mjDe1FkqeVZ-vcYClyLs",
    authDomain: "python-learning-platform-596e1.firebaseapp.com",
    projectId: "python-learning-platform-596e1",
    storageBucket: "python-learning-platform-596e1.firebasestorage.app",
    messagingSenderId: "5262153531",
    appId: "1:5262153531:web:55f6246093e1780003491e"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentProblem = null;

// Problem Loading and Display
async function loadProblem(problemId, userId) {
    try {
        const problemDoc = await db.collection('problems').doc(problemId).get();
        if (!problemDoc.exists) {
            throw new Error('ไม่พบโจทย์');
        }

        currentProblem = {
            id: problemDoc.id,
            ...problemDoc.data(),
            createdAt: problemDoc.data().createdAt?.toDate() || null,
            updatedAt: problemDoc.data().updatedAt?.toDate() || null
        };

        // คำนวณคะแนนเต็ม
        let maxScore = 0;
        if (currentProblem.testCases) {
            maxScore = currentProblem.testCases.reduce((sum, test) => sum + (test.score || 1), 0);
        }

        // อัพเดทเนื้อหาโจทย์
        document.getElementById('problemTitle').textContent = currentProblem.title;
        document.getElementById('problemDescription').innerHTML = `
            <div class="max-score"><strong>คะแนนเต็ม: ${maxScore} คะแนน</strong></div>
            ${currentProblem.description}
        `;

        updateProblemDisplay();
        setDefaultCode();
        await loadLastSubmission(problemId, userId);

        return true;
    } catch (error) {
        console.error('Error loading problem:', error);
        throw error;
    }
}
function updateProblemDisplay() {
    // แก้ไขส่วนแสดงผลให้ไม่มีบรรทัดว่างเกิน
    const titleElement = document.getElementById('problemTitle');
    if (titleElement) {
        titleElement.style.marginTop = '0';
        titleElement.textContent = currentProblem.title || 'ไม่มีชื่อโจทย์';
        const difficultyBadge = document.createElement('span');
        difficultyBadge.className = `difficulty-badge ${currentProblem.difficulty || 'medium'}`;
        difficultyBadge.textContent = getDifficultyText(currentProblem.difficulty);
        titleElement.appendChild(difficultyBadge);
    }

    const descriptionElement = document.getElementById('problemDescription');
    if (descriptionElement) {
        descriptionElement.style.marginTop = '8px';
        descriptionElement.style.marginBottom = '8px';
        let descriptionHTML = currentProblem.description || 'ไม่มีคำอธิบาย';

        // (ของเดิม) เพิ่มรูปภาพถ้ามี
        if (currentProblem.image) {
            descriptionHTML = `
                <div class="problem-image">
                    <img src="${currentProblem.image}" 
                         alt="รูปภาพประกอบโจทย์"
                         onerror="this.parentElement.style.display='none'">
                </div>
                ${descriptionHTML}
            `;
        }

        // ✅✅✅ [แทรกตรงนี้] แสดงไฟล์แนบ (URL/YouTube/PDF) ✅✅✅
        if (currentProblem.attachments) {
            descriptionHTML += renderAttachmentsHTML(currentProblem.attachments);
        }
        // ✅✅✅ จบส่วนที่แทรก ✅✅✅

        descriptionElement.innerHTML = descriptionHTML;
    }

    const exampleTestCases = document.getElementById('exampleTestCases');
    if (exampleTestCases && currentProblem.testCases?.length > 0) {
        exampleTestCases.style.marginTop = '8px';
        displayTestCases(currentProblem.testCases);
    }

    const hintsElement = document.getElementById('hints');
    if (hintsElement && currentProblem.hints) {
        hintsElement.style.marginTop = '8px';
        hintsElement.innerHTML = currentProblem.hints;
    }
}

// เพิ่มฟังก์ชันช่วยจัดการ error ของรูปภาพ
function handleImageError(img) {
    const container = img.parentElement;
    container.className += ' error';
    container.innerHTML = 'ไม่สามารถโหลดรูปภาพได้';
}

async function loadLastSubmission(problemId, userId) {
    try {
        const snapshot = await db.collection('submissions')
            .where('problemId', '==', problemId)
            .where('studentId', '==', userId)
            .get();

        if (!snapshot.empty) {
            let lastSubmission = null;
            let lastTime = 0;

            snapshot.forEach(doc => {
                const data = doc.data();
                const submissionTime = data.submittedAt?.toMillis() || 0;
                if (submissionTime > lastTime) {
                    lastSubmission = data;
                    lastTime = submissionTime;
                }
            });

            if (lastSubmission) {
                document.getElementById('codeEditor').value = lastSubmission.code || '';
                updateCodeHighlight();
                updateStatusBadge(lastSubmission.status);
            } else {
                setDefaultCode();
            }
        } else {
            setDefaultCode();
        }
    } catch (error) {
        console.error('Error loading last submission:', error);
        setDefaultCode();
    }
}

function setDefaultCode() {
    const codeEditor = document.getElementById('codeEditor');
    const templateCode = currentProblem?.templateCode || '# เขียนโค้ดของคุณที่นี่';

    if (codeEditor) {
        codeEditor.value = templateCode;
        updateCodeHighlight(); // เรียกอัพเดท syntax highlighting
        updateLineNumbers();   // เรียกอัพเดทเลขบรรทัด
    }
    updateStatusBadge('pending');
}

// Test Cases Display and Execution
function displayTestCases(testCases) {
    const container = document.getElementById('exampleTestCases');
    container.innerHTML = testCases.map((testCase, index) => `
        <div class="test-case-example">
            <h3>📝 ตัวอย่างที่ ${index + 1}</h3>
            <div class="test-case-content">
                ${testCase.inputs && testCase.inputs.length > 0 ? `
                    <div class="test-input">
                        <strong>🔹 Input</strong>
                        ${testCase.inputs.map(input => `
                            <div class="input-line">
                                <span class="input-name">${input.name}:</span>
                                <pre>${input.value}</pre>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                <div class="test-output">
                    <strong>🔸 Expected Output</strong>
                    <pre>${testCase.expected}</pre>
                </div>
            </div>
        </div>
    `).join('');
}


async function runCode() {
    const testResults = document.getElementById('testResults');
    const loadingOverlay = document.getElementById('loadingOverlay');

    try {
        const code = document.getElementById('codeEditor').value;
        if (!code.trim()) throw new Error('โค้ดว่างเปล่า');

        // ตรวจสอบการใช้ input() ทั้งแบบมีและไม่มี prompt
        const inputMatches = Array.from(code.matchAll(/input\((.*?)\)/g));
        const inputCount = inputMatches.length;
        const inputs = [];
        let currentInputIndex = 0;

        if (inputCount > 0) {
            // สร้าง Python Console UI
            testResults.innerHTML = `
                <div class="python-console">
                    <div class="console-output"></div>
                    <div class="input-area">
                        <div class="input-prompt">${getPromptText(inputMatches[0][1])}</div>
                        <input type="text" id="userInput" class="console-input" autofocus />
                    </div>
                </div>
            `;

            const consoleOutput = testResults.querySelector('.console-output');
            const inputField = document.getElementById('userInput');
            const inputPrompt = testResults.querySelector('.input-prompt');

            // เพิ่ม focus ทันทีที่สร้าง input
            inputField.focus();

            // เพิ่ม event listener สำหรับการคลิกที่ console ให้ focus กลับไปที่ input
            document.querySelector('.python-console').addEventListener('click', () => {
                if (inputField.style.display !== 'none') {
                    inputField.focus();
                }
            });

            // จัดการ Enter key
            inputField.addEventListener('keypress', async (e) => {
                if (e.key === 'Enter') {
                    const inputValue = inputField.value;
                    if (!inputValue) return;

                    inputs.push(inputValue);
                    currentInputIndex++;

                    // แสดงค่าที่กรอกพร้อม prompt ถ้ามี
                    const currentPrompt = getPromptText(inputMatches[currentInputIndex - 1][1]);
                    if (currentPrompt) {
                        consoleOutput.innerHTML += `<div class="input-line">${currentPrompt}${inputValue}</div>`;
                    } else {
                        consoleOutput.innerHTML += `<div class="input-line">${inputValue}</div>`;
                    }

                    loadingOverlay.style.display = 'flex';
                    try {
                        if (currentInputIndex >= inputCount) {
                            // ส่งโค้ดและ input ไปประมวลผล
                            const response = await fetch(config.API_URL, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    code: code,
                                    input: inputs.join('\n') + '\n'
                                })
                            });

                            const data = await response.json();
                            if (data.output && data.output.trim()) {
                                const lines = data.output.trim().split('\n');
                                // เอาเฉพาะบรรทัดสุดท้ายที่เป็นผลลัพธ์จริง
                                const finalOutput = lines[lines.length - 1];
                                // ตัด prompt text ออกถ้ามี
                                const cleanOutput = finalOutput.includes(':') ?
                                    finalOutput.split(':').slice(-1)[0].trim() :
                                    finalOutput;
                                consoleOutput.innerHTML += `<div class="output-line">${cleanOutput}</div>`;
                            }
                            document.querySelector('.input-area').style.display = 'none';
                        } else {
                            // อัพเดท prompt สำหรับ input ถัดไป
                            const nextPrompt = getPromptText(inputMatches[currentInputIndex][1]);
                            inputPrompt.textContent = nextPrompt || '';
                            // เคลียร์และ focus input field
                            inputField.value = '';
                            setTimeout(() => inputField.focus(), 0);
                        }
                    } catch (error) {
                        consoleOutput.innerHTML += `<div class="error-line">${error.message}</div>`;
                    } finally {
                        loadingOverlay.style.display = 'none';
                    }
                }
            });
        } else {
            // กรณีไม่มี input() - รันโค้ดเลย
            loadingOverlay.style.display = 'flex';
            const response = await fetch(config.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code: code })
            });

            const data = await response.json();
            // แสดงผลลัพธ์
            testResults.innerHTML = `
                <div class="python-console">
                    <div class="console-output">
                        <div class="output-line">${data.output.trim()}</div>
                    </div>
                </div>
            `;
            loadingOverlay.style.display = 'none';
        }
    } catch (error) {
        testResults.innerHTML = `<div class="error-line">${error.message}</div>`;
        loadingOverlay.style.display = 'none';
    }
}

// ฟังก์ชันช่วยดึง prompt text จาก input()
function getPromptText(input) {
    if (!input) return '';
    const matches = input.match(/"([^"]*)"/) || input.match(/'([^']*)'/) || [];
    return matches[1] || '';
}



function updateCodeHighlight() {
    const codeEditor = document.getElementById('codeEditor');
    const highlightElement = document.querySelector('.code-highlight code');

    console.log('Updating highlight...');
    console.log('Editor value:', codeEditor?.value);
    console.log('Highlight element:', highlightElement);

    if (codeEditor && highlightElement) {
        highlightElement.textContent = codeEditor.value;
        console.log('Before Prism highlight');
        Prism.highlightElement(highlightElement);
        console.log('After Prism highlight');
    }
}
async function testCode() {
    if (!currentProblem?.testCases) {
        alert('ไม่พบ Test Cases สำหรับโจทย์นี้');
        return;
    }

    const loadingOverlay = document.getElementById('loadingOverlay');
    const testResults = document.getElementById('testResults');

    try {
        loadingOverlay.style.display = 'flex';
        const code = document.getElementById('codeEditor').value;
        
        const results = await Promise.all(currentProblem.testCases.map(async (testCase) => {
            try {
                let inputStr = testCase.input;
                inputStr = inputStr.replace(/^["']|["']$/g, '');
                const inputs = inputStr.split('\\n');

                // เช็ค Input Format เฉพาะเมื่อโจทย์มี inputs
                let hasInputFormatError = false;
                let inputFormatErrors = [];
                
                if (testCase.inputs && testCase.inputs.length > 0) {
                    // ดึงข้อความ input() จากโค้ดนักเรียน
                    const inputMatches = Array.from(code.matchAll(/input\((.*?)\)/g));
                    
                    // เช็คจำนวน input ว่าตรงกับ testCase หรือไม่
                    if (testCase.inputs.length !== inputMatches.length) {
                        inputFormatErrors.push(`จำนวนการรับค่าไม่ถูกต้อง (ต้องการ ${testCase.inputs.length} ค่า)`);
                        hasInputFormatError = true;
                    }

                    // เช็คข้อความ prompt ของแต่ละ input
                    testCase.inputs.forEach((expectedInput, index) => {
                        if (index < inputMatches.length) {
                            const inputCode = inputMatches[index][1];
                            const promptMatch = inputCode.match(/["'](.*?)["']/) || [];
                            const promptText = promptMatch[1] || '';
                            
                            if (!promptText.includes(expectedInput.name)) {
                                inputFormatErrors.push(
                                    `ข้อความรับค่าที่ ${index + 1} ควรมี "${expectedInput.name}"`
                                );
                                hasInputFormatError = true;
                            }
                        }
                    });
                }

                // รันโค้ดและเช็ค output
                const response = await fetch(config.API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code: code,
                        input: inputs.join('\n') + '\n'
                    })
                });

                const data = await response.json();
                let actualOutput = data.output.trim();
                const lines = actualOutput.split('\n');
                const lastLine = lines[lines.length - 1];
                actualOutput = lastLine.includes(':') ?
                    lastLine.split(':').slice(-1)[0].trim() :
                    lastLine.trim();

                const expectedOutput = testCase.expected.trim();
                const outputCorrect = actualOutput === expectedOutput;

                // ถ้าไม่มี input ให้เช็คแค่ output
                const passed = testCase.inputs && testCase.inputs.length > 0 ? 
                    (outputCorrect && !hasInputFormatError) : 
                    outputCorrect;

                return {
                    passed: passed,
                    input: inputs.join(' และ '),
                    expected: expectedOutput,
                    actual: actualOutput,
                    inputFormatErrors: inputFormatErrors,
                    hasInputFormatError: hasInputFormatError,
                    outputCorrect: outputCorrect,
                    hasInputs: testCase.inputs && testCase.inputs.length > 0 // เพิ่มข้อมูลว่ามี input หรือไม่
                };

            } catch (error) {
                return {
                    passed: false,
                    input: testCase.input,
                    expected: testCase.expected,
                    error: error.message
                };
            }
        }));

        displayTestResults(results);

        const allPassed = results.every(r => r.passed);
        if (allPassed) {
            updateStatusBadge('completed');
        }

    } catch (error) {
        testResults.innerHTML = `
            <div class="error-message">
                <p>🚫 Error: ${error.message}</p>
            </div>
        `;
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

// อัพเดทฟังก์ชันแสดงผลให้เห็น debug info
function displayTestResults(results) {
    const container = document.getElementById('testResults');
    const passedCount = results.filter(r => r.passed).length;
    const allPassed = passedCount === results.length;

    let html = `
        <div class="test-summary ${allPassed ? 'success' : 'failure'}">
            <h3>ผลการทดสอบ: ผ่าน ${passedCount} จาก ${results.length} test cases ${allPassed ? '✅' : '❌'}</h3>
        </div>`;

    html += results.map((result, index) => `
        <div class="test-case-result">
            <h4>Test Case ${index + 1}: ${result.passed ? 'ผ่าน ✓' : 'ไม่ผ่าน ✗'}</h4>
            <div class="test-details">
                ${result.input ? `<p><strong>Input:</strong> ${result.input}</p>` : ''}
                
                ${result.hasInputs && result.hasInputFormatError ? `
                    <div class="input-format-errors">
                        <p><strong>ข้อผิดพลาดการรับค่า:</strong></p>
                        <ul>
                            ${result.inputFormatErrors.map(err => `<li>${err}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                <p><strong>Expected Output:</strong> ${result.expected}</p>
                <p><strong>ผลลัพธ์ที่ได้:</strong> ${result.actual}</p>
                ${!result.outputCorrect ? '<p class="error">❌ ผลลัพธ์ไม่ถูกต้อง</p>' : ''}
            </div>
        </div>
    `).join('');

    if (allPassed) {
        html += `
            <div class="submit-section">
                <button onclick="submitToTeacher()" class="primary-btn">
                    ส่งงานให้ครูตรวจ
                </button>
            </div>
        `;
    }

    container.innerHTML = html;
}

function updateLineNumbers() {
    const codeEditor = document.getElementById('codeEditor');
    const lineNumbers = document.getElementById('lineNumbers');
    if (codeEditor && lineNumbers) {
        const lines = codeEditor.value.split('\n');
        lineNumbers.textContent = Array.from(
            { length: lines.length },
            (_, i) => i + 1
        ).join('\n');
        updateCodeHighlight(); // เพิ่มการเรียก highlight
    }
}

// Event Listeners
// ในส่วน Event Listeners เดิม (ประมาณบรรทัดที่ 400-450 ในไฟล์ของคุณ)
document.addEventListener('DOMContentLoaded', () => {
    const codeEditor = document.getElementById('codeEditor');
    const lineNumbers = document.getElementById('lineNumbers');
    const themeToggle = document.getElementById('themeToggle');

    // Theme Management (คงเดิม)
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });

    // เพิ่มเรียกใช้ enhanceCodeEditor ที่นี่
    enhanceCodeEditor();

    // Code Editor Management (คงเดิม)
    codeEditor.addEventListener('input', updateLineNumbers);
    codeEditor.addEventListener('keyup', updateLineNumbers);
    codeEditor.addEventListener('scroll', () => {
        lineNumbers.scrollTop = codeEditor.scrollTop;
        document.querySelector('.code-highlight').scrollTop = codeEditor.scrollTop;
    });

    // Firebase Auth (คงเดิม)
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const problemId = urlParams.get('id');

        if (problemId) {
            await loadProblem(problemId, user.uid);
        }
    });

    updateLineNumbers();
});

document.addEventListener('DOMContentLoaded', () => {
    const codeEditor = document.getElementById('codeEditor');
    if (codeEditor) {
        codeEditor.addEventListener('input', updateCodeHighlight);
        codeEditor.addEventListener('keyup', updateCodeHighlight);
    }
});
// Utility Functions
function getDifficultyText(difficulty) {
    return {
        'easy': 'ง่าย',
        'medium': 'ปานกลาง',
        'hard': 'ยาก'
    }[difficulty] || 'ปานกลาง';
}

function updateStatusBadge(status) {
    const badge = document.getElementById('statusBadge');
    if (badge) {
        badge.className = `status-badge status-${status}`;
        badge.textContent = status === 'completed' ? 'สำเร็จ' : 'ยังไม่ผ่าน';
    }
}

function resetCode() {
    if (confirm('คุณแน่ใจหรือไม่ที่จะรีเซ็ตโค้ด?')) {
        const codeEditor = document.getElementById('codeEditor');
        codeEditor.value = currentProblem?.templateCode || '# เขียนโค้ดของคุณที่นี่';
        document.getElementById('testResults').innerHTML = '';
        
        // เรียกทั้งสองฟังก์ชันทันทีหลังจากเปลี่ยนค่า
        updateCodeHighlight();
        updateLineNumbers();
    }
}

// เพิ่มฟังก์ชันใหม่นี้ต่อท้ายไฟล์ หลังฟังก์ชัน updateStatusBadge
function enhanceCodeEditor() {
    const codeEditor = document.getElementById('codeEditor');

    const PYTHON_KEYWORDS = [
        'if',
        'elif',
        'else:',
        'for',
        'while',
        'def',
        'class',
        'try:',
        'except',
        'finally:',
        'with'
    ];

    codeEditor.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();

            const cursor = this.selectionStart;
            const value = this.value;
            const currentLine = value.substring(0, cursor).split('\n').pop();

            const currentIndentMatch = currentLine.match(/^\s*/);
            let indentation = currentIndentMatch ? currentIndentMatch[0] : '';

            const shouldIndent = PYTHON_KEYWORDS.some(keyword =>
                currentLine.trim().endsWith(':') ||
                currentLine.trim().startsWith(keyword)
            );

            if (currentLine.trim() === '' && indentation.length > 0) {
                indentation = indentation.slice(0, -4);
            }
            else if (shouldIndent) {
                indentation += '    ';
            }

            const before = value.substring(0, cursor);
            const after = value.substring(cursor);
            const newValue = before + '\n' + indentation + after;

            this.value = newValue;
            const newCursor = cursor + 1 + indentation.length;
            this.selectionStart = this.selectionEnd = newCursor;

            updateCodeHighlight();
            updateLineNumbers();
        }
        else if (e.key === 'Tab') {
            e.preventDefault();

            const cursor = this.selectionStart;
            const value = this.value;

            const before = value.substring(0, cursor);
            const after = value.substring(cursor);
            const newValue = before + '    ' + after;

            this.value = newValue;
            this.selectionStart = this.selectionEnd = cursor + 4;

            updateCodeHighlight();
            updateLineNumbers();
        }
        else if (e.key === 'Backspace') {
            const cursor = this.selectionStart;
            const value = this.value;
            const beforeCursor = value.substring(0, cursor);

            if (beforeCursor.endsWith('    ')) {
                e.preventDefault();

                const newValue = beforeCursor.substring(0, beforeCursor.length - 4) + value.substring(cursor);
                this.value = newValue;
                this.selectionStart = this.selectionEnd = cursor - 4;

                updateCodeHighlight();
                updateLineNumbers();
            }
        }
    });

    // Auto-closing brackets และ quotes
    codeEditor.addEventListener('keypress', function (e) {
        const pairs = {
            '(': ')',
            '[': ']',
            '{': '}',
            '"': '"',
            "'": "'"
        };

        if (pairs[e.key]) {
            e.preventDefault();

            const cursor = this.selectionStart;
            const value = this.value;
            const before = value.substring(0, cursor);
            const after = value.substring(cursor);

            this.value = before + e.key + pairs[e.key] + after;
            this.selectionStart = this.selectionEnd = cursor + 1;

            updateCodeHighlight();
        }
    });
}
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
        ${totalScore === maxScore ? `
            <div class="submit-section" style="margin-top: 20px; text-align: center;">
                <button onclick="submitToTeacher()" class="submit-btn">
                    ส่งงานให้ครูตรวจ
                </button>
            </div>
        ` : ''}
    `;

    modal.style.display = 'flex';
}

async function submitToTeacher() {
    try {
        // ดึง URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const problemId = urlParams.get('id');
        let classId = urlParams.get('classId');

        // ดึง class ID จากหลายแหล่ง
        if (!classId) {
            if (document.referrer) {
                const referrerUrl = new URL(document.referrer);
                const referrerParams = new URLSearchParams(referrerUrl.search);
                classId = referrerParams.get('id');
            }

            if (!classId && currentProblem?.classId) {
                classId = currentProblem.classId;
            }
        }

        if (!classId) {
            throw new Error('ไม่พบรหัสห้องเรียน กรุณาลองเข้าผ่านหน้าห้องเรียนอีกครั้ง');
        }

        // คำนวณคะแนนจาก test cases
        let totalScore = 0;
        let maxScore = 0;

        if (currentProblem?.testCases) {
            // คำนวณคะแนนจากแต่ละ test case
            currentProblem.testCases.forEach(testCase => {
                // ถ้าไม่ระบุคะแนน ใช้ค่า default = 1
                const caseScore = testCase.score || 1;
                maxScore += caseScore;
                totalScore += caseScore; // ได้คะแนนเต็มเพราะผ่านทุก test case แล้ว
            });
        }

        console.log('คะแนนที่จะบันทึก:', { totalScore, maxScore });

        // บันทึกข้อมูลพร้อมคะแนน
        const submissionData = {
            problemId: problemId,
            studentId: auth.currentUser.uid,
            classId: classId,
            code: document.getElementById('codeEditor').value,
            status: 'completed',
            score: totalScore,
            maxScore: maxScore,
            submittedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // บันทึก submission
        await db.collection('submissions').add(submissionData);

        console.log('บันทึก submission สำเร็จ:', submissionData);

        alert('ส่งงานสำเร็จ');
        window.location.href = `student-class-detail.html?id=${classId}`;

    } catch (error) {
        console.error('Error submitting to teacher:', error);
        alert(error.message);
    }
}
// ฟังก์ชันสร้างปุ่มลิงก์สวยๆ (ไม่กินที่)
function renderAttachmentsHTML(attachments) {
    if (!attachments || attachments.length === 0) return '';

    let html = '<div style="margin: 10px 0; padding: 10px; background: #fff; border: 1px solid #ddd; border-radius: 8px;">';
    html += '<strong style="font-size:0.9em; color:#555;">🔗 เอกสารและสื่อประกอบ:</strong> ';
    html += '<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:5px;">';

    attachments.forEach(att => {
        let icon = '🔗';
        let color = '#007bff';
        if (att.type === 'youtube') { icon = '▶️'; color = '#dc3545'; }
        if (att.type === 'pdf') { icon = '📄'; color = '#fd7e14'; }
        if (att.type === 'image') { icon = '🖼️'; color = '#28a745'; }

        html += `
            <a href="${att.url}" target="_blank" 
               style="text-decoration:none; color:#333; font-size:0.85em; display:flex; align-items:center; gap:5px; padding:4px 10px; border:1px solid #ccc; border-radius:20px; transition:all 0.2s;"
               onmouseover="this.style.borderColor='${color}'; this.style.color='${color}'"
               onmouseout="this.style.borderColor='#ccc'; this.style.color='#333'">
               <span>${icon}</span> ${att.title || 'เปิดลิงก์'}
            </a>
        `;
    });

    html += '</div></div>';
    return html;
}
// Export necessary functions (คงเดิม)
window.runCode = runCode;
window.testCode = testCode;
window.resetCode = resetCode;
window.submitToTeacher = submitToTeacher;