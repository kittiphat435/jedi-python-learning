// Configuration
const config = {
    API_URL: 'https://xtgzdpztzdbavnbmjk2f25vq7u0nsfrx.lambda-url.us-east-1.on.aws/',

};

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

        // แสดงรูปภาพประกอบถ้ามี (แบบย่อ/ขยายได้)
        if (currentProblem.image) {
            descriptionHTML = `
                <div id="problemImagePreview" class="problem-image collapsed">
                    <button type="button" class="image-toggle-btn" onclick="toggleImageSize()">ขยายภาพ</button>
                    <img src="${currentProblem.image}" alt="ภาพประกอบโจทย์" onclick="toggleImageSize()" onerror="handleImageError(this)">
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

// เพิ่มฟังก์ชันช่วยจัดการ error ของรูปภาพ
function handleImageError(img) {
    const container = img.parentElement;
    container.style.display = 'none';
    console.error('Failed to load problem image');
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
                
                // ถ้าโจทย์ถูกส่งและตรวจเสร็จแล้ว ล็อกไม่ให้แก้ไขและ Copy โค้ด
                if (lastSubmission.status === 'completed') {
                    const codeEditor = document.getElementById('codeEditor');
                    const codeHighlight = document.querySelector('.code-highlight');
                    const codeEditorContainer = document.querySelector('.code-editor-container');
                    const submitBtn = document.querySelector('.submit-btn');
                    const runBtn = document.querySelector('.run-btn');
                    
                    if (codeEditorContainer) {
                        codeEditorContainer.classList.add('readonly-mode');
                        codeEditorContainer.addEventListener('contextmenu', e => e.preventDefault());
                        codeEditorContainer.addEventListener('copy', e => {
                            e.preventDefault();
                            alert('ไม่สามารถคัดลอกโค้ดที่ส่งแล้วได้');
                        });
                        codeEditorContainer.addEventListener('keydown', e => {
                            if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C' || e.key === 'x' || e.key === 'X')) {
                                e.preventDefault();
                                alert('ไม่สามารถคัดลอกโค้ดที่ส่งแล้วได้');
                            }
                        });
                    }

                    if (codeEditor) {
                        codeEditor.readOnly = true;
                        codeEditor.classList.add('readonly-mode');
                        codeEditor.placeholder = "โจทย์ข้อนี้ส่งแล้ว ไม่สามารถแก้ไขหรือคัดลอกโค้ดได้";
                        
                        // ปิดการคลิกขวาและการคัดลอก
                        codeEditor.addEventListener('contextmenu', e => e.preventDefault());
                        codeEditor.addEventListener('copy', e => {
                            e.preventDefault();
                        });
                        codeEditor.addEventListener('cut', e => e.preventDefault());
                        codeEditor.addEventListener('keydown', e => {
                            if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C' || e.key === 'x' || e.key === 'X')) {
                                e.preventDefault();
                            }
                        });
                    }
                    
                    if (codeHighlight) {
                        codeHighlight.classList.add('readonly-mode');
                        // ปิดการเลือกข้อความและการคัดลอกใน highlight div ด้วย
                        codeHighlight.addEventListener('contextmenu', e => e.preventDefault());
                        codeHighlight.addEventListener('copy', e => e.preventDefault());
                        codeHighlight.addEventListener('keydown', e => {
                            if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C' || e.key === 'x' || e.key === 'X')) {
                                e.preventDefault();
                            }
                        });
                    }
                    
                    if (submitBtn) submitBtn.style.display = 'none';
                    if (runBtn) runBtn.style.display = 'none';
                }
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
                                <span class="input-name">${displayPrompt(input.name)}</span>
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

function stripPythonCommentsForAnalysis(code) {
    return code.split('\n').map((line) => {
        const trimmedLeft = line.trimStart();
        if (trimmedLeft.startsWith('#')) return '';

        let inSingle = false;
        let inDouble = false;
        let escaped = false;

        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (escaped) {
                escaped = false;
                continue;
            }
            if (ch === '\\') {
                escaped = true;
                continue;
            }

            if (!inDouble && ch === "'") {
                inSingle = !inSingle;
                continue;
            }
            if (!inSingle && ch === '"') {
                inDouble = !inDouble;
                continue;
            }

            if (!inSingle && !inDouble && ch === '#') {
                return line.slice(0, i);
            }
        }

        return line;
    }).join('\n');
}


async function runCode() {
    const testResults = document.getElementById('testResults');
    const loadingOverlay = document.getElementById('loadingOverlay');

    try {
        const code = document.getElementById('codeEditor').value;
        if (!code.trim()) throw new Error('โค้ดว่างเปล่า');

        // ตรวจสอบการใช้ input() ทั้งแบบมีและไม่มี prompt
        const analysisCode = stripPythonCommentsForAnalysis(code);
        const inputMatches = Array.from(analysisCode.matchAll(/input\((.*?)\)/g));
        const inputCount = inputMatches.length;
        const inputs = [];
        let currentInputIndex = 0;

        if (inputCount > 0) {
            let initialOutput = '';
            try {
                // เข้ารหัสโค้ดเป็น Base64 เพื่อส่งไปรันผ่าน exec() ป้องกันปัญหา syntax
                const btoaUtf8 = (str) => btoa(unescape(encodeURIComponent(str)));
                const base64Code = btoaUtf8(code);
                const wrapperCode = `import base64\nuser_code = base64.b64decode(b"${base64Code}").decode('utf-8')\ntry:\n    exec(user_code, {})\nexcept EOFError:\n    pass`;
                
                const initialResponse = await fetch(config.API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: wrapperCode, input: '' })
                });
                const initialData = await initialResponse.json();
                
                if (initialData.output) {
                    initialOutput = initialData.output.replace(/\r\n/g, '\n');
                }
            } catch (e) {
                console.log("Error fetching initial output", e);
            }

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
            
            // ฟังก์ชันช่วยแสดงผลลัพธ์ใหม่ทั้งหมด
            const renderOutput = (rawOutput, currentInputs) => {
                let formattedOutput = rawOutput;
                let promptCounts = {};
                currentInputs.forEach((val, idx) => {
                    if (idx < inputMatches.length) {
                        const pMatch = inputMatches[idx][1].match(/["'](.*?)["']/) || [];
                        const pText = pMatch[1] || '';
                        if (pText) {
                            promptCounts[pText] = (promptCounts[pText] || 0) + 1;
                            let occurrence = 0;
                            // แทรกค่าที่กรอกลงไปหลัง Prompt ตัวที่ N
                            formattedOutput = formattedOutput.replace(new RegExp(`(${escapeRegExp(pText)})`, 'g'), (match) => {
                                occurrence++;
                                if (occurrence === promptCounts[pText]) {
                                    return `${match}${val}\n`;
                                }
                                return match;
                            });
                        }
                    }
                });

                // ลบข้อความของ Prompt ตัวถัดไป (ตัวที่กำลังรอรับค่า) ออกจาก formattedOutput
                // เพื่อไม่ให้มันไปซ้ำซ้อนกับ `<div class="input-prompt">` ที่เราแสดงไว้แล้วใน UI
                if (currentInputs.length < inputMatches.length) {
                    const nextPromptMatch = inputMatches[currentInputs.length][1].match(/["'](.*?)["']/) || [];
                    const nextPromptText = nextPromptMatch[1] || '';
                    if (nextPromptText) {
                        // ลบ Prompt ล่าสุดที่อยู่ท้ายสุดของข้อความออก
                        const endPromptRegex = new RegExp(`${escapeRegExp(nextPromptText)}\\s*$`);
                        formattedOutput = formattedOutput.replace(endPromptRegex, '');
                    }
                }

                consoleOutput.innerHTML = formattedOutput ? `<div class="output-line">${formattedOutput.replace(/\n/g, '<br>')}</div>` : '';
            };
            
            renderOutput(initialOutput, inputs);

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

                    document.querySelector('.input-area').style.display = 'none';
                    loadingOverlay.style.display = 'flex';
                    try {
                        const btoaUtf8 = (str) => btoa(unescape(encodeURIComponent(str)));
                        const base64Code = btoaUtf8(code);
                        const wrapperCode = `import base64\nuser_code = base64.b64decode(b"${base64Code}").decode('utf-8')\ntry:\n    exec(user_code, {})\nexcept EOFError:\n    pass`;
                        
                        const response = await fetch(config.API_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                code: wrapperCode,
                                input: inputs.join('\n') + '\n'
                            })
                        });

                        const data = await response.json();
                        let rawOutput = data.output ? data.output.replace(/\r\n/g, '\n') : '';
                        
                        renderOutput(rawOutput, inputs);

                        if (currentInputIndex < inputCount) {
                            // อัพเดท prompt สำหรับ input ถัดไป
                            const nextPrompt = getPromptText(inputMatches[currentInputIndex][1]);
                            inputPrompt.textContent = nextPrompt || '';
                            inputField.value = '';
                            document.querySelector('.input-area').style.display = 'flex';
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
            const btoaUtf8 = (str) => btoa(unescape(encodeURIComponent(str)));
            const base64Code = btoaUtf8(code);
            const wrapperCode = `import base64\nuser_code = base64.b64decode(b"${base64Code}").decode('utf-8')\ntry:\n    exec(user_code, {})\nexcept EOFError:\n    pass`;

            const response = await fetch(config.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code: wrapperCode })
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

// ฟังก์ชันช่วยแสดง Prompt 
function displayPrompt(promptText) {
    if (!promptText) return '';
    // ถ้า promptText ลงท้ายด้วย colon อยู่แล้ว ไม่ต้องเพิ่ม colon อีก
    if (promptText.trim().endsWith(':')) {
        return promptText;
    }
    return promptText + ':';
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
        const analysisCode = stripPythonCommentsForAnalysis(code);
        
        const results = await Promise.all(currentProblem.testCases.map(async (testCase) => {
            try {
                // --- ปรับปรุงการดึง Input ให้รองรับทั้ง 2 รูปแบบ ---
                let inputs = [];
                if (testCase.inputs && testCase.inputs.length > 0) {
                    // รูปแบบใหม่: เป็น Array ของ Object {name, value}
                    inputs = testCase.inputs.map(item => {
                        if (typeof item === 'object' && item !== null) {
                            return item.value !== undefined ? item.value.toString() : '';
                        }
                        return item.toString();
                    });
                } else if (testCase.input) {
                    // รูปแบบเก่า: เป็น String ก้อนเดียวคั่นด้วย \n
                    let inputStr = testCase.input.replace(/^["']|["']$/g, '');
                    inputs = inputStr.split(/\r?\n|\\n/);
                }
                
                console.log('--- Debug Input Preparation ---');
                console.log('testCase.inputs (Array):', testCase.inputs);
                console.log('testCase.input (String):', testCase.input);
                console.log('Final inputs array to be used:', inputs);
                console.log('Joined input string for API:', inputs.join('\n') + '\n');

                // ... (Input Format Check remains same) ...
                let hasInputFormatError = false;
                let inputFormatErrors = [];
                
                if (testCase.inputs && testCase.inputs.length > 0) {
                    const inputMatches = Array.from(analysisCode.matchAll(/input\((.*?)\)/g));
                    if (testCase.inputs.length !== inputMatches.length) {
                        inputFormatErrors.push(`จำนวนการรับค่าไม่ถูกต้อง (ต้องการ ${testCase.inputs.length} ค่า)`);
                        hasInputFormatError = true;
                    }
                    testCase.inputs.forEach((expectedInput, index) => {
                        if (index < inputMatches.length) {
                            const inputCode = inputMatches[index][1];
                            const promptMatch = inputCode.match(/["'](.*?)["']/) || [];
                            const promptText = promptMatch[1] || '';
                            if (!promptText.includes(expectedInput.name)) {
                                inputFormatErrors.push(`ข้อความรับค่าที่ ${index + 1} ควรมี "${expectedInput.name}"`);
                                hasInputFormatError = true;
                            }
                        }
                    });
                }

                // รันโค้ดและเช็ค output
                const btoaUtf8 = (str) => btoa(unescape(encodeURIComponent(str)));
                const base64Code = btoaUtf8(code);
                // ใช้ dict เปล่าครอบ exec เพื่อแยก scope แต่ละ test case และแก้ปัญหา name not defined
                const wrapperCode = `import base64\nuser_code = base64.b64decode(b"${base64Code}").decode('utf-8')\ntry:\n    exec(user_code, {})\nexcept EOFError:\n    pass`;

                const response = await fetch(config.API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code: wrapperCode,
                        input: inputs.join('\n') + '\n'
                    })
                });

                const data = await response.json();
                console.log('--- Debug Test Case API Response ---');
                console.log('Raw data from API:', data);

                let actualOutputRaw = (data.output || '').replace(/\r\n/g, '\n');
                const isError = data.status === 'error';
                
                // เก็บค่า original ไว้ก่อน trim
                const actualOutputOriginal = actualOutputRaw;
                actualOutputRaw = actualOutputRaw.trim();
                
                // --- ปรับปรุงการแสดงผล Actual Output ให้สวยงาม ---
                if (!isError && testCase.inputs && testCase.inputs.length > 0) {
                    const inputMatches = Array.from(analysisCode.matchAll(/input\((.*?)\)/g));
                    let promptCounts = {};
                    inputMatches.forEach((match, idx) => {
                        const promptMatch = match[1].match(/["'](.*?)["']/) || [];
                        const promptText = promptMatch[1] || '';
                        if (promptText) {
                            promptCounts[promptText] = (promptCounts[promptText] || 0) + 1;
                            let occurrence = 0;
                            const inputItem = testCase.inputs[idx];
                            let val = '';
                            if (typeof inputItem === 'object' && inputItem !== null) {
                                val = inputItem.value !== undefined ? inputItem.value.toString() : '';
                            } else {
                                val = inputItem !== undefined ? inputItem.toString() : '';
                            }
                            if (!val && testCase.input) {
                                const splitInputs = testCase.input.replace(/^["']|["']$/g, '').split(/\r?\n|\\n/);
                                val = splitInputs[idx] || '';
                            }
                            actualOutputRaw = actualOutputRaw.replace(new RegExp(`(${escapeRegExp(promptText)})`, 'g'), (m) => {
                                occurrence++;
                                if (occurrence === promptCounts[promptText]) return `${m}${val}\n`;
                                return m;
                            });
                        }
                    });
                }

                const expectedOutput = testCase.expected.replace(/\r\n/g, '\n').trim();
                const expectedLines = expectedOutput.split('\n');
                const n = expectedLines.length;
                
                let actualOutput = actualOutputRaw;
                const lines = actualOutputRaw.split('\n');
                let slicedActual = actualOutputRaw;

                // ไม่ต้อง slice ถ้าเป็น Error
                if (!isError && lines.length >= n) {
                    const lastNLines = lines.slice(-n);
                    const firstExpected = expectedLines[0];
                    const firstActual = lastNLines[0];
                    
                    if (firstActual !== firstExpected && firstActual.endsWith(firstExpected)) {
                        const precedingChar = firstActual.charAt(firstActual.length - firstExpected.length - 1);
                        if ([' ', ':', '>', '-'].includes(precedingChar)) {
                            lastNLines[0] = firstExpected;
                        } else if (n === 1 && firstActual.includes(':')) {
                            // ป้องกันการ slice error message โดยเช็คว่าไม่ได้อยู่ในโหมด error
                            lastNLines[0] = firstActual.split(':').slice(-1)[0].trimStart();
                        }
                    } else if (n === 1 && firstActual.includes(':') && firstActual !== firstExpected) {
                        lastNLines[0] = firstActual.split(':').slice(-1)[0].trimStart();
                    }
                    slicedActual = lastNLines.join('\n').trim();
                }

                // ตรวจสอบความถูกต้อง
                let outputCorrect = !isError && (compareText(slicedActual, expectedOutput) || compareText(actualOutputRaw, expectedOutput));

                if (!outputCorrect && !isError) {
                    console.log('--- DEBUG: Output Comparison Failed ---');
                    console.log('Expected:', debugString(expectedOutput));
                    console.log('Actual (Sliced):', debugString(slicedActual));
                    console.log('Actual (Raw):', debugString(actualOutputRaw));
                }

                // จัดการค่าที่จะแสดงใน UI
                if (isError) {
                    actualOutput = actualOutputRaw || 'Error occurred';
                } else if (!outputCorrect) {
                    actualOutput = slicedActual || actualOutputRaw || '';
                } else {
                    actualOutput = slicedActual;
                }

                // --- Lenient Match: อนุโลมเรื่องช่องว่าง แต่ "บังคับ" เรื่องการขึ้นบรรทัดใหม่ ---
                if (!outputCorrect) {
                    const normExpected = expectedOutput.split('\n').map(l => l.replace(/\s+/g, '')).join('\n');
                    const normSlicedActual = slicedActual.split('\n').map(l => l.replace(/\s+/g, '')).join('\n');
                    const normActualRaw = actualOutputRaw.split('\n').map(l => l.replace(/\s+/g, '')).join('\n');
                    
                    let adjustedExpected = normExpected;
                    // ... (adjustedExpected logic remains) ...
                    if (testCase.inputs && testCase.inputs.length > 0) {
                        const inputMatches = Array.from(analysisCode.matchAll(/input\((.*?)\)/g));
                        let promptCounts = {};
                        inputMatches.forEach((match, idx) => {
                            const pMatch = match[1].match(/["'](.*?)["']/) || [];
                            const pText = pMatch[1] ? pMatch[1].replace(/\s+/g, '') : '';
                            if (pText) {
                                promptCounts[pText] = (promptCounts[pText] || 0) + 1;
                                let occurrence = 0;
                                let val = '';
                                if (testCase.inputs && testCase.inputs[idx]) {
                                    val = testCase.inputs[idx].value !== undefined 
                                        ? testCase.inputs[idx].value.toString().replace(/\s+/g, '') 
                                        : testCase.inputs[idx].toString().replace(/\s+/g, '');
                                } else if (testCase.input) {
                                    const splitInputs = testCase.input.replace(/^["']|["']$/g, '').split(/\r?\n|\\n/);
                                    val = splitInputs[idx] ? splitInputs[idx].replace(/\s+/g, '') : '';
                                }
                                adjustedExpected = adjustedExpected.replace(new RegExp(`(${escapeRegExp(pText)})(?!${escapeRegExp(val)})`, 'g'), (m) => {
                                    occurrence++;
                                    if (occurrence === promptCounts[pText]) return `${m}${val}`;
                                    return m;
                                });
                            }
                        });
                    }

                    if (normSlicedActual === normExpected || normSlicedActual === adjustedExpected || normActualRaw.endsWith(normExpected)) {
                        outputCorrect = true;
                    }
                }

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
            showYarnReward();
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

// ฟังก์ชันช่วย Escape Regex เพื่อป้องกัน error หากใน prompt มีตัวอักษรพิเศษ
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ฟังก์ชันช่วยแสดงตัวอักษรพิเศษ (Hidden Characters) เพื่อการ Debug
function debugString(str) {
    if (!str) return 'empty';
    return str.split('').map(c => {
        const code = c.charCodeAt(0);
        // แสดงโค้ดสำหรับตัวอักษรที่มองไม่เห็น หรือตัวอักษรพิเศษ
        if (code < 32 || (code > 126 && code < 160) || code === 160 || code > 255) {
            return `[U+${code.toString(16).toUpperCase().padStart(4, '0')}]`;
        }
        return c;
    }).join('');
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
                
                <p><strong>Expected Output:</strong></p>
                <pre class="test-output-pre">${result.expected}</pre>
                
                <p><strong>ผลลัพธ์ที่ได้:</strong></p>
                <pre class="test-output-pre">${result.actual}</pre>
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
        const highlight = document.querySelector('.code-highlight');
        if (highlight) {
            highlight.scrollTop = codeEditor.scrollTop;
            highlight.scrollLeft = codeEditor.scrollLeft;
        }
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

function showYarnReward() {
    const now = Date.now();
    const cooldownMs = 3000;
    if (window.__yarnRewardLastShownAt && (now - window.__yarnRewardLastShownAt) < cooldownMs) {
        return;
    }
    window.__yarnRewardLastShownAt = now;

    const existing = document.getElementById('yarnRewardOverlay');
    if (existing) existing.remove();

    const rewardImageUrl = 'https://firebasestorage.googleapis.com/v0/b/python-learning-platform-596e1.firebasestorage.app/o/Screenshot%202026-05-24%20230034.jpg?alt=media&token=9f05adac-4a03-4829-b819-d36ad10f305e';

    const overlay = document.createElement('div');
    overlay.id = 'yarnRewardOverlay';
    overlay.className = 'reward-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'ผ่านแล้ว');

    overlay.innerHTML = `
        <div class="reward-card">
            <img class="reward-image" src="${rewardImageUrl}" alt="ด้าย">
        </div>
    `;

    const remove = () => {
        if (!overlay.isConnected) return;
        overlay.classList.add('reward-overlay-hide');
        setTimeout(() => overlay.remove(), 240);
    };

    overlay.addEventListener('click', remove);
    document.body.appendChild(overlay);
    setTimeout(remove, 2200);
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
        if (this.hasAttribute('readonly') || this.readOnly) return;

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
        if (this.hasAttribute('readonly') || this.readOnly) return;

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
        if (classId === 'admin') {
            window.location.href = 'student-problem-admin.html';
        } else {
            window.location.href = `student-class-detail.html?id=${classId}`;
        }

    } catch (error) {
        console.error('Error submitting to teacher:', error);
        alert(error.message);
    }
}
// ฟังก์ชันสร้างปุ่มลิงก์สวยๆ (ไม่กินที่)
function renderAttachmentsHTML(attachments) {
    if (!attachments || attachments.length === 0) return '';

    let html = '<div style="margin: 10px 0; padding: 10px; background: #fff; border: 1px solid #ddd; border-radius: 8px;">';
    html += '<strong style="font-size:0.9em; color:#555;">🔗 เอกสารและสื่อประกอบการเรียน:</strong> ';
    html += '<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:5px;">';

    attachments.forEach(att => {
        let icon = '🔗';
        let color = '#007bff';
        if (att.type === 'youtube') { icon = '▶️'; color = '#dc3545'; }
        if (att.type === 'pdf') { icon = '📄'; color = '#fd7e14'; }
        if (att.type === 'image') { icon = '🖼️'; color = '#28a745'; }

        html += `
            <a href="javascript:void(0);" onclick="openMediaModal('${att.url}')" 
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

// Global Media Modal Function
window.openMediaModal = function(url) {
    if (!url) return;
    
    let modal = document.getElementById('globalMediaModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'globalMediaModal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 9999; display: flex; justify-content: center; align-items: center;';
        
        const contentBox = document.createElement('div');
        contentBox.id = 'globalMediaContentBox';
        contentBox.style.cssText = 'position: relative; width: 90%; height: 90%; background: #fff; border-radius: 8px; padding: 10px; display: flex; flex-direction: column; transition: all 0.3s ease;';
        
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
    const contentBox = document.getElementById('globalMediaContentBox');
    container.innerHTML = '<p>กำลังโหลดสื่อ...</p>';
    modal.style.display = 'flex';
    
    const lowerUrl = url.toLowerCase();
    let embedHtml = '';
    const isImage = lowerUrl.match(/\.(jpeg|jpg|gif|png|webp|jfif)/i) != null || (lowerUrl.includes('alt=media') && !lowerUrl.includes('.pdf'));

    // ปรับขนาดหน้าต่างตามประเภทสื่อ
    if (isImage) {
        contentBox.style.width = 'auto';
        contentBox.style.height = 'auto';
        contentBox.style.maxWidth = '90%';
        contentBox.style.maxHeight = '90%';
    } else {
        contentBox.style.width = '90%';
        contentBox.style.height = '90%';
        contentBox.style.maxWidth = '90%';
        contentBox.style.maxHeight = '90%';
    }
    
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
    } else if (isImage) {
        embedHtml = `<img src="${url}" style="max-width: 100%; max-height: 80vh; object-fit: contain; margin: auto; display: block; border-radius: 4px;">`;
    } else {
        embedHtml = `<iframe width="100%" height="100%" src="${url}" frameborder="0" allowfullscreen></iframe>`;
    }
    
    container.innerHTML = embedHtml;
};
