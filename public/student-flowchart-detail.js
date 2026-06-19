// Firebase Configuration
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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

let flowchartEditor;

// เพิ่มตัวแปรสำหรับเช็คการเปลี่ยนแปลง
window.hasUnsavedChanges = false;

// แจ้งเตือนเมื่อนักเรียนพยายามปิดหรือรีเฟรชหน้าเว็บขณะมีข้อมูลยังไม่เซฟ
window.addEventListener('beforeunload', (e) => {
    const urlParams = new URLSearchParams(window.location.search);
    const isViewMode = urlParams.get('mode') === 'view';
    
    // สร้างหน้าจอสีแดงแจ้งเตือนเพื่อเอาไว้ถ่ายรูป (กรณีโดนบังคับรีเฟรชจาก Live Server)
    if (!isViewMode && window.flowchartEditor) {
        const debugOverlay = document.createElement('div');
        debugOverlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(255,0,0,0.9); color:white; font-size:30px; font-weight:bold; z-index:999999; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; padding:20px;';
        debugOverlay.innerHTML = `
            <i class="fas fa-exclamation-triangle" style="font-size: 80px; margin-bottom: 20px;"></i>
            <div>หน้าจอกำลังถูกรีเฟรช หรือมีการปิดแท็บ!</div>
            <div style="font-size: 20px; margin-top: 10px;">(ถ่ายรูปหน้านี้ไว้เพื่อตรวจสอบ)</div>
            <div style="font-size: 16px; margin-top: 20px; font-family: monospace;">Time: ${new Date().toLocaleTimeString()}</div>
        `;
        document.body.appendChild(debugOverlay);
    }

    // แจ้งเตือนเฉพาะโหมดทำข้อสอบ และมีการวาดอะไรบางอย่างไปแล้ว
    if (!isViewMode && window.flowchartEditor) {
        const data = window.flowchartEditor.getData();
        if (data.symbols && data.symbols.length > 0 && window.hasUnsavedChanges !== false) {
            e.preventDefault();
            e.returnValue = ''; // มาตรฐานสำหรับ Browser ส่วนใหญ่จะโชว์ Alert เริ่มต้นของเบราว์เซอร์
        }
    }
});

// เมื่อโหลดหน้าเสร็จ
document.addEventListener('DOMContentLoaded', async () => {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const urlParams = new URLSearchParams(window.location.search);
            const problemId = urlParams.get('id');
            const classId = urlParams.get('classId');

            if (problemId && classId) {
                try {
                    // สร้างและ initialize FlowchartEditor ก่อน
                    initFlowchartEditor();

                    // รอให้ FlowchartEditor พร้อมใช้งาน
                    setTimeout(async () => {
                        // โหลดข้อมูลโจทย์
                        await loadProblem(problemId);

                        // โหลด submission
                        await loadExistingSubmission(problemId, classId, user.uid);
                    }, 100);

                } catch (error) {
                    console.error('Error initializing problem:', error);
                    alert('เกิดข้อผิดพลาดในการโหลดโจทย์');
                if (classId === 'admin') {
                    window.location.href = 'student-problem-admin.html';
                } else {
                    window.location.href = `student-class-detail.html?id=${classId}`;
                }
                }
            } else {
                alert('ไม่พบข้อมูลโจทย์');
                window.location.href = 'index.html';
            }
        } else {
            window.location.href = 'index.html';
        }
    });
});

// โหลดข้อมูลโจทย์
async function loadProblem(problemId) {
    try {
        const doc = await db.collection('problems').doc(problemId).get();
        if (!doc.exists) {
            throw new Error('ไม่พบโจทย์');
        }

        const problemData = doc.data();
        const studentProblemData = {
            title: problemData.title,
            description: problemData.description,
            variables: problemData.variables,
            type: problemData.type,
            difficulty: problemData.difficulty,
            maxScore: problemData.maxScore || 10,
            attachments: problemData.attachments,
            image: problemData.image
        };

        // แสดงข้อมูลพื้นฐานของโจทย์
        document.getElementById('problemTitle').textContent = studentProblemData.title;
        const descElement = document.getElementById('problemDescription');
        let descHTML = studentProblemData.description || '';

        // แสดงรูปภาพประกอบถ้ามี (แบบย่อ/ขยายได้)
        if (studentProblemData.image) {
            descHTML = `
                <div id="problemImagePreview" class="problem-image collapsed">
                    <button type="button" class="image-toggle-btn" onclick="toggleImageSize()">ขยายภาพ</button>
                    <img src="${studentProblemData.image}" alt="ภาพประกอบโจทย์" onclick="toggleImageSize()" onerror="this.parentElement.style.display='none'">
                </div>
                ${descHTML}
            `;
        }

        // ถ้ามีไฟล์แนบ ให้ต่อท้าย
        if (studentProblemData.attachments) {
            descHTML += renderAttachmentsHTML(studentProblemData.attachments);
        }

        descElement.innerHTML = descHTML; // เปลี่ยนจาก textContent เป็น innerHTML
        // แสดงคะแนนเต็ม
        const headerSection = document.querySelector('.problem-content');
        const scoreDiv = document.createElement('div');
        scoreDiv.className = 'max-score';
        scoreDiv.innerHTML = `<strong>คะแนนเต็ม: ${studentProblemData.maxScore} คะแนน</strong>`;
        headerSection.insertBefore(scoreDiv, headerSection.firstChild);

        // แสดงตัวแปร (ถ้ามี)
        const variablesList = document.getElementById('variables-list');
        if (studentProblemData.variables?.length > 0) {
            variablesList.innerHTML = studentProblemData.variables.map(variable => `
                <div class="variable-item">
                    <strong>${variable.name}</strong>
                    <p>${variable.description}</p>
                </div>
            `).join('');
        } else {
            variablesList.innerHTML = '<p>ไม่มีตัวแปรที่ต้องใช้</p>';
        }

        if (window.flowchartEditor) {
            window.flowchartEditor.clearCanvas();
        }

        return studentProblemData;
    } catch (error) {
        console.error('Error loading problem:', error);
        throw new Error('เกิดข้อผิดพลาดในการโหลดโจทย์');
    }
}


// โหลด submission ที่มีอยู่
async function loadExistingSubmission(problemId, classId, userId) {
    try {
        if (!window.flowchartEditor) return;

        const urlParams = new URLSearchParams(window.location.search);
        const isViewMode = urlParams.get('mode') === 'view';

        const snapshot = await db.collection('submissions')
            .where('problemId', '==', problemId)
            .where('classId', '==', classId)
            .where('studentId', '==', userId)
            .orderBy('submittedAt', 'desc')
            .limit(1)
            .get();

        if (!snapshot.empty && isViewMode) {
            const submission = snapshot.docs[0].data();

            if (problemData?.assignmentType === 'exam') {
                const canvas = document.getElementById('flowchartCanvas');
                if (canvas) {
                    canvas.innerHTML = '<div style="padding: 20px; text-align: center; color: #666; font-size: 1.2em;">ข้อสอบถูกส่งแล้ว ไม่สามารถดู Flowchart ย้อนหลังได้</div>';
                }
            } else {
                // จัดการ bendPoints ให้ถูกต้อง
                if (submission.flowchartData?.connections) {
                    submission.flowchartData.connections = submission.flowchartData.connections.map(conn => {
                        const bendPoints = conn.bendPoints || [];
                        return {
                            ...conn,
                            bendPoints: bendPoints.map(point => ({
                                x: point.x,
                                y: point.y
                            }))
                        };
                    });
                }

                // โหลดข้อมูลเข้า flowchart editor
                flowchartEditor.loadData(submission.flowchartData);
            }

            // ทำให้ไม่สามารถแก้ไขได้ในโหมด view เท่านั้น
            if (isViewMode) {
                const svg = document.querySelector('#flowchartCanvas svg');
                if (svg) svg.style.pointerEvents = 'none';

                // ปิดการใช้งานปุ่มตรวจคำตอบและล้าง canvas แทนการซ่อน
                ['checkAnswerBtn', 'clearCanvasBtn'].forEach(id => {
                    const btn = document.getElementById(id);
                    if (btn) {
                        btn.disabled = true;
                        btn.style.opacity = '0.5';
                        btn.style.cursor = 'not-allowed';
                    }
                });
            }
        }

        // เพิ่ม: ทำให้ปุ่มส่งคำตอบ disabled เป็นค่าเริ่มต้น
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn && !isViewMode) {
            submitBtn.disabled = true;
            submitBtn.classList.add('disabled');
        }

        // --- เพิ่มระบบกู้คืนข้อมูล Auto Save (ถ้ามี) ---
        if (!isViewMode && snapshot.empty) {
            const autoSaveKey = `flowchart_autosave_${problemId}_${userId}`;
            const savedData = localStorage.getItem(autoSaveKey);
            if (savedData) {
                try {
                    const parsedData = JSON.parse(savedData);
                    if (parsedData.symbols && parsedData.symbols.length > 0) {
                        if (confirm('พบข้อมูลที่คุณวาดค้างไว้ก่อนหน้านี้ ต้องการกู้คืนหรือไม่?')) {
                            flowchartEditor.loadData(parsedData);
                        } else {
                            localStorage.removeItem(autoSaveKey);
                        }
                    }
                } catch (e) {
                    console.error("Error parsing autosave data", e);
                }
            }
            
            // เริ่มการทำ Auto Save ทุกๆ 3 วินาที
            setInterval(() => {
                if (window.flowchartEditor) {
                    const currentData = window.flowchartEditor.getData();
                    if (currentData.symbols && currentData.symbols.length > 0) {
                        localStorage.setItem(autoSaveKey, JSON.stringify(currentData));
                    }
                }
            }, 3000);
        }
        // ------------------------------------------

    } catch (error) {
        console.error('Error loading submission:', error);
    }
}

async function saveProblem() {
    try {
        const user = auth.currentUser;
        const form = document.getElementById('problemForm');
        if (!form) throw new Error('ไม่พบฟอร์ม');

        const problemId = form.getAttribute('data-problem-id');
        const isEditing = !!problemId;
        const problemType = document.getElementById('problemType').value;

        let problemData = {
            title: document.getElementById('problemTitle')?.value?.trim() || '',
            type: problemType,
            difficulty: document.getElementById('problemDifficulty')?.value || 'medium',
            image: document.getElementById('problemImage')?.value?.trim() || '',
            teacherId: user.uid,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (!problemData.title) throw new Error('กรุณาใส่ชื่อโจทย์');

        const variables = [];
        document.querySelectorAll('.variable-item').forEach(item => {
            const name = item.querySelector('.var-name')?.value?.trim();
            const description = item.querySelector('.var-description')?.value?.trim();
            if (name && description) {
                variables.push({ name, description });
            }
        });
        problemData.variables = variables;

        if (problemType === 'flowchart') {
            problemData.description = document.getElementById('flowchartDescription')?.value?.trim() || '';
            if (!problemData.description) throw new Error('กรุณาใส่คำอธิบายโจทย์');

            // เพิ่มการรับค่าและบันทึก maxScore
            const maxScore = document.getElementById('flowchartMaxScore')?.value;
            problemData.maxScore = maxScore ? parseInt(maxScore) : 10;

            if (isEditing) {
                const currentFlowchartData = window.flowchartEditor.getData();
                const cleanSymbols = currentFlowchartData.symbols.map(symbol => {
                    const symbolElement = document.getElementById(symbol.id);
                    const textElement = symbolElement?.querySelector('text');
                    const currentText = textElement?.textContent;
                    const finalText = (currentText && currentText !== 'ดับเบิลคลิกเพื่อแก้ไข')
                        ? currentText
                        : symbol.text || '';

                    return {
                        id: symbol.id,
                        type: symbol.type,
                        x: symbol.x || 0,
                        y: symbol.y || 0,
                        text: finalText
                    };
                });

                const cleanConnections = currentFlowchartData?.connections?.map(conn => {
                    return {
                        id: conn.id,
                        sourceSymbol: conn.sourceSymbol,
                        targetSymbol: conn.targetSymbol,
                        sourcePoint: conn.sourcePoint,
                        targetPoint: conn.targetPoint,
                        text: conn.text || '',
                        bendPoints: conn.bendPoints || []
                    };
                }) || [];

                const flowchartToSave = {
                    symbols: cleanSymbols,
                    connections: cleanConnections
                };

                const updateData = {
                    ...problemData,
                    flowchartData: flowchartToSave
                };

                Object.keys(updateData).forEach(key => {
                    if (updateData[key] === undefined || updateData[key] === null) {
                        delete updateData[key];
                    }
                });

                await db.collection('problems').doc(problemId).update(updateData);
            } else {
                const flowchartData = window.flowchartEditor.getData();
                if (!flowchartData.symbols.length) {
                    throw new Error('กรุณาสร้าง Flowchart อย่างน้อย 1 รูปแบบ');
                }
                problemData.flowchartData = flowchartData;
                problemData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('problems').add(problemData);
            }
        } else if (problemType === 'python') {
            // ... โค้ดสำหรับโจทย์ประเภท python
        } else if (problemType === 'comprehension') {
            // ... โค้ดสำหรับโจทย์ประเภท comprehension
        } else if (problemType === 'matching') {
            // ... โค้ดสำหรับโจทย์ประเภท matching
        }

        alert(isEditing ? 'อัพเดทโจทย์สำเร็จ' : 'บันทึกโจทย์สำเร็จ');
        closeModal();
        loadProblems();

    } catch (error) {
        console.error('Error saving problem:', error);
        alert(`เกิดข้อผิดพลาด: ${error.message}`);
    }
}
// ย้าย showSubmissionResult ออกมาเป็นฟังก์ชันแยก
function showSubmissionResult(submission) {
    let resultDiv = document.getElementById('submissionResult');
    if (!resultDiv) {
        resultDiv = document.createElement('div');
        resultDiv.id = 'submissionResult';
        resultDiv.className = 'submission-result';
        const container = document.querySelector('.problem-container');
        if (container) {
            container.appendChild(resultDiv);
        }
    }

    resultDiv.innerHTML = `
        <div class="result-header">
            <div>ผลการส่งงานล่าสุด</div>
            <div class="submission-time">
                ส่งเมื่อ: ${submission.submittedAt?.toDate().toLocaleString('th-TH')}
            </div>
        </div>
        <div class="score-display">
            คะแนนที่ได้: ${submission.score}/10 คะแนน
            ${submission.passed ?
            '<span class="passed-badge">✅ ผ่าน</span>' :
            '<span class="failed-badge">❌ ไม่ผ่าน</span>'}
        </div>
        <!-- ส่วนแสดงผลอื่นๆ ที่เหลือเหมือนเดิม -->
    `;
}


// สร้าง FlowchartEditor
function initFlowchartEditor() {
    flowchartEditor = new FlowchartEditor('flowchartCanvas');
    // เพิ่มการตั้งค่าเพิ่มเติมถ้าจำเป็น
}


// เพิ่มฟังก์ชันแสดงผลการตรวจ
function showSubmissionResult(submission) {
    // สร้างหรือหา div สำหรับแสดงผล
    let resultDiv = document.getElementById('submissionResult');
    if (!resultDiv) {
        resultDiv = document.createElement('div');
        resultDiv.id = 'submissionResult';
        resultDiv.className = 'submission-result';
        document.querySelector('.problem-container').appendChild(resultDiv);
    }

    // แสดงผลการตรวจและคะแนน
    resultDiv.innerHTML = `
        <div class="result-header">ผลการส่งงานล่าสุด</div>
        <div class="score-display">
            คะแนนที่ได้: ${submission.score}/100 คะแนน
            ${submission.passed ?
            '<span class="passed-badge">✅ ผ่าน</span>' :
            '<span class="failed-badge">❌ ไม่ผ่าน</span>'}
        </div>
        <div class="score-details">
            <div>Symbols (40%): ${submission.details?.symbols?.score || 0}% 
                ${submission.details?.symbols?.passed ? '✅' : '❌'}
            </div>
            <div>Flow (60%): ${submission.details?.flow?.score || 0}% 
                ${submission.details?.flow?.passed ? '✅' : '❌'}
            </div>
        </div>
        <div class="submission-time">
            ส่งเมื่อ: ${submission.submittedAt?.toDate().toLocaleString('th-TH')}
        </div>
        <div class="action-hint">
            คุณสามารถแก้ไขและส่งใหม่ได้
        </div>
    `;
}



// ส่งคำตอบ
async function submitAnswer() {
    if (!flowchartEditor) return;

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const problemId = urlParams.get('id');
        const classId = urlParams.get('classId');

        const flowchartData = flowchartEditor.getData();
        if (!flowchartData?.symbols?.length) {
            alert('กรุณาสร้าง Flowchart ก่อนส่งคำตอบ');
            return;
        }

        // ดึงข้อมูลโจทย์เพื่อเอา maxScore
        const problemDoc = await db.collection('problems').doc(problemId).get();
        const problemData = problemDoc.data();
        const maxScore = problemData.maxScore || 10;

        if (!problemData?.flowchartData) {
            alert('ไม่พบข้อมูลเฉลย');
            return;
        }

        // สร้าง Map สำหรับจัดลำดับ Symbols จากบนลงล่าง เพื่อใช้ในการแสดงลำดับในข้อความแจ้งเตือน
        const sortedStudentSymbols = [...flowchartData.symbols].sort((a, b) => a.y - b.y);
        const symbolOrderMap = new Map();
        sortedStudentSymbols.forEach((sym, index) => {
            symbolOrderMap.set(sym.id, index + 1);
        });

        // ทำการตรวจคำตอบสดอีกครั้งก่อนส่ง
        const details = {
            symbolCount: checkSymbolCount(flowchartData, problemData.flowchartData, symbolOrderMap),
            arrowsAndText: checkArrowsAndText(flowchartData, problemData.flowchartData, symbolOrderMap),
            symbolText: checkSymbolText(flowchartData, problemData.flowchartData, symbolOrderMap),
            flowDirection: checkFlowDirection(flowchartData, problemData.flowchartData, symbolOrderMap)
        };

        const passed = details.symbolCount.passed && 
                       details.arrowsAndText.passed && 
                       details.symbolText.passed && 
                       details.flowDirection.passed;

        if (!passed) {
            alert('กรุณาตรวจคำตอบและแก้ไขให้ถูกต้องทั้งหมดก่อนส่งคำตอบ');
            return;
        }

        // จัดการ bendPoints และทำความสะอาดข้อความก่อนบันทึก
        flowchartData.connections = flowchartData.connections.map(conn => {
            const connectionGroup = document.querySelector(`#${conn.id}`);
            const bendPoints = [];
            if (connectionGroup) {
                connectionGroup.querySelectorAll('.bend-point, .arrow-bend-point').forEach(point => {
                    bendPoints.push({
                        x: parseFloat(point.getAttribute('cx')),
                        y: parseFloat(point.getAttribute('cy'))
                    });
                });
            }

            // ทำความสะอาดข้อความบนเส้นลูกศร
            let cleanText = conn.text || '';
            const tempText = cleanText.replace(/\s+/g, '').toLowerCase();
            if (tempText === 'พิมพ์valua' || tempText === 'พิมพ์value' || tempText === 'คลิกเพื่อแก้ไข' || tempText === 'ดับเบิลคลิกเพื่อพิมพ์') {
                cleanText = '';
            }

            return {
                ...conn,
                text: cleanText,
                bendPoints
            };
        });

        // ทำความสะอาดข้อความใน symbols ก่อนบันทึก
        flowchartData.symbols = flowchartData.symbols.map(symbol => {
            let cleanText = symbol.text || '';
            const tempText = cleanText.replace(/\s+/g, '').toLowerCase();
            if (tempText === 'คลิกเพื่อแก้ไข') {
                cleanText = '';
            }
            return {
                ...symbol,
                text: cleanText
            };
        });

        // บันทึก submission
        await db.collection('submissions').add({
            problemId,
            classId,
            studentId: auth.currentUser.uid,
            flowchartData,
            score: maxScore, // ให้คะแนนเต็มเมื่อผ่านการตรวจ
            maxScore: maxScore,
            details: details,
            passed: true,
            status: 'completed', // เปลี่ยนสถานะเป็น completed
            submittedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // ล้างข้อมูล Auto Save เมื่อส่งงานสำเร็จ
        const autoSaveKey = `flowchart_autosave_${problemId}_${auth.currentUser.uid}`;
        localStorage.removeItem(autoSaveKey);
        window.hasUnsavedChanges = false; // ปิดการแจ้งเตือนตอนออก

        if (problemData?.assignmentType === 'exam') {
            alert('ระบบได้ทำการส่งข้อสอบของคุณเรียบร้อยแล้ว!');
        } else {
            alert('ส่งคำตอบสำเร็จ');
        }
        if (classId === 'admin') {
            window.location.href = 'student-problem-admin.html';
        } else {
            window.location.href = `student-class-detail.html?id=${classId}&refresh=true`;
        }
    } catch (error) {
        console.error('Error submitting:', error);
        console.log('Error details:', error);
        alert('เกิดข้อผิดพลาดในการส่งคำตอบ: ' + error.message);
    }
}
// สร้างระบบป้องกันการกดปุ่มรัวๆ (Debounce/Throttle) และเพิ่มการเก็บ Log
let isClearingCanvas = false;

async function clearCanvas() {
    // ป้องกันการทำงานซ้ำซ้อนถ้ากำลังล้างจออยู่
    if (isClearingCanvas) return;

    if (!flowchartEditor) {
        console.error("FlowchartEditor not initialized");
        return;
    }

    if (confirm('คุณแน่ใจหรือไม่ที่จะล้าง Flowchart?')) {
        isClearingCanvas = true;
        
        try {
            console.warn(`[User Action] Clear Canvas triggered by user: ${auth.currentUser?.uid} at ${new Date().toISOString()}`);
            
            // ล้าง state ทั้งหมด
            flowchartEditor.clearCanvas();

            // ล้าง elements ทั้งหมดใน SVG ยกเว้น defs
            const svg = document.querySelector('#flowchartCanvas svg');
            if (svg) {
                const defs = svg.querySelector('defs');
                svg.innerHTML = '';
                if (defs) {
                    svg.appendChild(defs);
                }
            }

            // รีเซ็ต state
            flowchartEditor.state = {
                symbols: [],
                connections: [],
                isConnecting: false,
                sourceSymbol: null,
                sourcePoint: null,
                tempLine: null,
                currentTool: null,
                isDragging: false,
                selectedElement: null
            };

            // ลบข้อมูล Auto Save ออก
            const urlParams = new URLSearchParams(window.location.search);
            const problemId = urlParams.get('id');
            if (problemId && auth.currentUser) {
                const autoSaveKey = `flowchart_autosave_${problemId}_${auth.currentUser.uid}`;
                localStorage.removeItem(autoSaveKey);
                console.log(`[AutoSave] Cleared autosave data for problem: ${problemId}`);
            }
            
            // รีเซ็ตสถานะแจ้งเตือน
            window.hasUnsavedChanges = false;

            console.log('Canvas cleared successfully');
        } catch (error) {
            console.error('Error clearing canvas:', error);
        } finally {
            // คืนค่าให้กดใหม่ได้หลังผ่านไป 1 วินาที
            setTimeout(() => {
                isClearingCanvas = false;
            }, 1000);
        }
    }
}
// ใน student-flowchart-detail.js

async function checkAnswer() {
    if (!flowchartEditor) return;

    try {
        const studentFlowchart = flowchartEditor.getData();
        console.log('--- DEBUG: Start checkAnswer ---');
        console.log('Student Flowchart:', studentFlowchart);
        
        if (!studentFlowchart?.symbols?.length) {
            alert('กรุณาสร้าง Flowchart ก่อนตรวจคำตอบ');
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const problemId = urlParams.get('id');
        const classId = urlParams.get('classId');

        const problemDoc = await db.collection('problems').doc(problemId).get();
        const problemData = problemDoc.data();
        console.log('Solution Data:', problemData?.flowchartData);

        if (!problemData?.flowchartData) {
            alert('ไม่พบข้อมูลเฉลย');
            return;
        }

        // สร้าง Map สำหรับจัดลำดับ Symbols จากบนลงล่าง
        const sortedStudentSymbols = [...studentFlowchart.symbols].sort((a, b) => a.y - b.y);
        const symbolOrderMap = new Map();
        sortedStudentSymbols.forEach((sym, index) => {
            symbolOrderMap.set(sym.id, index + 1);
        });

        // ตรวจสอบทั้ง 4 ขั้นตอน พร้อมแนบ symbolOrderMap ไปด้วย
        const details = {
            symbolCount: checkSymbolCount(studentFlowchart, problemData.flowchartData, symbolOrderMap),
            arrowsAndText: checkArrowsAndText(studentFlowchart, problemData.flowchartData, symbolOrderMap),
            symbolText: checkSymbolText(studentFlowchart, problemData.flowchartData, symbolOrderMap),
            flowDirection: checkFlowDirection(studentFlowchart, problemData.flowchartData, symbolOrderMap)
        };

        // คำนวณว่าผ่านหรือไม่
        const passed = details.symbolCount.passed && 
                       details.arrowsAndText.passed && 
                       details.symbolText.passed && 
                       details.flowDirection.passed;

        const result = {
            passed: passed,
            details: details,
            maxScore: problemData.maxScore || 10
        };

        // แสดงผลการตรวจ
        showDetailedResult(result);

        // Enable/Disable ปุ่มส่งคำตอบตามผลการตรวจ
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            if (passed && problemData?.assignmentType === 'exam') {
                submitBtn.style.display = 'none';
                submitAnswer();
            } else {
                submitBtn.disabled = !passed;
                submitBtn.classList.toggle('disabled', !passed);
            }
        }

    } catch (error) {
        console.error('Error:', error);
        alert('เกิดข้อผิดพลาดในการตรวจคำตอบ');
    }
}

function checkSymbolCount(studentFlowchart, solutionFlowchart, symbolOrderMap) {
    // เช็คจำนวนรวม
    if (studentFlowchart.symbols.length !== solutionFlowchart.symbols.length) {
        return {
            passed: false,
            message: `จำนวนสัญลักษณ์ไม่ถูกต้อง (ของคุณมี ${studentFlowchart.symbols.length} อัน / เฉลยมี ${solutionFlowchart.symbols.length} อัน)`
        };
    }

    // สร้าง map เก็บจำนวน symbols แต่ละประเภทของเฉลย
    const solutionTypeCounts = {};
    solutionFlowchart.symbols.forEach(symbol => {
        solutionTypeCounts[symbol.type] = (solutionTypeCounts[symbol.type] || 0) + 1;
    });

    // สร้าง map เก็บจำนวน symbols แต่ละประเภทของนักเรียน
    const studentTypeCounts = {};
    studentFlowchart.symbols.forEach(symbol => {
        studentTypeCounts[symbol.type] = (studentTypeCounts[symbol.type] || 0) + 1;
    });

    // เช็คแต่ละประเภท
    for (const type in solutionTypeCounts) {
        if (studentTypeCounts[type] !== solutionTypeCounts[type]) {
            return {
                passed: false,
                message: `จำนวนสัญลักษณ์ประเภท ${getSymbolTypeName(type)} ไม่ถูกต้อง`
            };
        }
    }

    return {
        passed: true,
        message: 'จำนวนสัญลักษณ์ถูกต้อง'
    };
}

function getSymbolTypeName(type) {
    const typeNames = {
        'start-end': 'จุดเริ่มต้น/จุดสิ้นสุด',
        'process': 'Process',
        'decision': 'Decision',
        'input-output': 'Input/Output',
        'manual-input': 'Manual Input',
        'display': 'Display',
        'document': 'Document',
        'data-storage': 'Data Storage',
        'connector': 'Connector'
    };
    return typeNames[type] || type;
}

function checkArrowsAndText(studentFlowchart, solutionFlowchart, symbolOrderMap) {
    // เช็คจำนวน connections
    if (studentFlowchart.connections.length !== solutionFlowchart.connections.length) {
        return {
            passed: false,
            message: `จำนวนเส้นเชื่อมลูกศรไม่ถูกต้อง (ของคุณมี ${studentFlowchart.connections.length} เส้น / เฉลยมี ${solutionFlowchart.connections.length} เส้น)`
        };
    }

    const getCleanText = (text) => {
        if (!text) return '';
        const clean = text.replace(/\s+/g, '').toLowerCase();
        if (clean === 'พิมพ์valua' || clean === 'พิมพ์value' || clean === 'ดับเบิลคลิกเพื่อพิมพ์') {
            return '';
        }
        return clean;
    };

    console.log('--- DEBUG: checkArrowsAndText ---');
    // เช็คข้อความบน connections
    for (let i = 0; i < studentFlowchart.connections.length; i++) {
        const studentConn = studentFlowchart.connections[i];
        const studentText = getCleanText(studentConn.text);
        const sourceOrder = symbolOrderMap.get(studentConn.sourceSymbol) || '?';
        console.log(`Arrow from Symbol #${sourceOrder}:`, {
            rawText: studentConn.text,
            cleanText: studentText
        });

        let foundMatch = false;
        
        // ค้นหา connection ที่ตรงกันในเฉลย
        for (let j = 0; j < solutionFlowchart.connections.length; j++) {
            const solutionText = getCleanText(solutionFlowchart.connections[j].text);
            if (compareText(studentText, solutionText)) {
                foundMatch = true;
                break;
            }
        }
        
        if (!foundMatch) {
            console.log(`  => FAILED: No match found for arrow text "${studentText}"`);
            return {
                passed: false,
                message: `ข้อความบนเส้นเชื่อมลูกศรที่ออกจากสัญลักษณ์ลำดับที่ ${sourceOrder} ไม่ถูกต้อง`
            };
        }
    }
    console.log('  => PASSED: All arrow texts matched');
    return { passed: true, message: 'ข้อความบนเส้นเชื่อมถูกต้อง' };
}

function checkSymbolText(studentFlowchart, solutionFlowchart, symbolOrderMap) {
    const getCleanText = (text) => {
        if (!text) return '';
        const clean = text.replace(/\s+/g, '').toLowerCase();
        if (clean === 'คลิกเพื่อแก้ไข') {
            return '';
        }
        return clean;
    };

    console.log('--- DEBUG: checkSymbolText ---');
    // เช็คข้อความใน symbols
    for (let i = 0; i < studentFlowchart.symbols.length; i++) {
        const studentSym = studentFlowchart.symbols[i];
        const studentText = getCleanText(studentSym.text);
        const order = symbolOrderMap.get(studentSym.id) || '?';
        console.log(`Symbol #${order} (${studentSym.type}):`, {
            rawText: studentSym.text,
            cleanText: studentText
        });

        let foundMatch = false;
        
        for (let j = 0; j < solutionFlowchart.symbols.length; j++) {
            const solutionSym = solutionFlowchart.symbols[j];
            const solutionText = getCleanText(solutionSym.text);
            if (studentText === solutionText && studentSym.type === solutionSym.type) {
                foundMatch = true;
                break;
            }
        }
        
        if (!foundMatch) {
            console.log(`  => FAILED: No match found for "${studentText}" in solution`);
            return {
                passed: false,
                message: `ข้อความในสัญลักษณ์ลำดับที่ ${order} (${getSymbolTypeName(studentSym.type)}) ไม่ถูกต้อง`
            };
        }
    }
    console.log('  => PASSED: All symbol texts matched');
    return { passed: true, message: 'ข้อความในสัญลักษณ์ถูกต้อง' };
}

function checkFlowDirection(studentFlowchart, solutionFlowchart, symbolOrderMap) {
    // เช็คทิศทางการเชื่อมต่อ
    for (let i = 0; i < studentFlowchart.connections.length; i++) {
        const studentConn = studentFlowchart.connections[i];
        let foundMatch = false;
        
        for (let j = 0; j < solutionFlowchart.connections.length; j++) {
            const solutionConn = solutionFlowchart.connections[j];
            
            // เช็คว่าเชื่อมต่อระหว่าง symbols ประเภทเดียวกันและทิศทางเดียวกัน
            if (getSymbolType(studentConn.sourceSymbol, studentFlowchart) === 
                getSymbolType(solutionConn.sourceSymbol, solutionFlowchart) &&
                getSymbolType(studentConn.targetSymbol, studentFlowchart) === 
                getSymbolType(solutionConn.targetSymbol, solutionFlowchart)) {
                foundMatch = true;
                break;
            }
        }
        
        if (!foundMatch) {
            const sourceOrder = symbolOrderMap.get(studentConn.sourceSymbol) || '?';
            const targetOrder = symbolOrderMap.get(studentConn.targetSymbol) || '?';
            return {
                passed: false,
                message: `ทิศทางการเชื่อมต่อลูกศรระหว่างสัญลักษณ์ลำดับที่ ${sourceOrder} ไปยังลำดับที่ ${targetOrder} ไม่ถูกต้อง`
            };
        }
    }
    return { passed: true, message: 'ทิศทางการเชื่อมต่อลูกศรถูกต้อง' };
}

// Helper function
function getSymbolType(symbolId, flowchart) {
    const symbol = flowchart.symbols.find(s => s.id === symbolId);
    return symbol ? symbol.type : null;
}


function showDetailedResult(result) {
    const modal = document.createElement('div');
    modal.className = 'result-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;

    // แสดงผลการตรวจแบบ 4 ขั้นตอน
    const symbolCountResult = result.details.symbolCount;
    const content = `
        <div style="background: white; padding: 20px; border-radius: 8px; min-width: 400px; max-width: 600px;">
            <h2 style="margin-bottom: 20px;">ผลการตรวจ Flowchart</h2>
            
            <div style="margin-bottom: 15px;">
                <h4>ผลการตรวจสอบ:</h4>
                <div style="margin-left: 10px;">
                    <div style="margin: 8px 0;">
                        1. จำนวนและประเภทสัญลักษณ์: ${result.details.symbolCount.passed ? '✅' : '❌'}
                        ${!result.details.symbolCount.passed ? `<br><span style="color: #dc3545; margin-left: 20px;">(${result.details.symbolCount.message})</span>` : ''}
                    </div>
                    <div style="margin: 8px 0;">
                        2. ข้อความในสัญลักษณ์: ${result.details.symbolText.passed ? '✅' : '❌'}
                        ${!result.details.symbolText.passed ? `<br><span style="color: #dc3545; margin-left: 20px;">(${result.details.symbolText.message})</span>` : ''}
                    </div>
                    <div style="margin: 8px 0;">
                        3. ทิศทางการเชื่อมต่อ: ${result.details.flowDirection.passed ? '✅' : '❌'}
                        ${!result.details.flowDirection.passed ? `<br><span style="color: #dc3545; margin-left: 20px;">(${result.details.flowDirection.message})</span>` : ''}
                    </div>
                    <div style="margin: 8px 0;">
                        4. ข้อความบนเส้นเชื่อม: ${result.details.arrowsAndText.passed ? '✅' : '❌'}
                        ${!result.details.arrowsAndText.passed ? `<br><span style="color: #dc3545; margin-left: 20px;">(${result.details.arrowsAndText.message})</span>` : ''}
                    </div>
                </div>
            </div>

            ${!result.passed ? `
                <div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 4px;">
                    <h4 style="color: #856404; margin-bottom: 10px;">คำแนะนำ:</h4>
                    <p style="color: #856404;">กรุณาแก้ไขส่วนที่มีเครื่องหมาย ❌ ให้ถูกต้อง</p>
                </div>
            ` : ''}

            <button onclick="this.closest('.result-modal').remove()" 
                    style="margin-top: 20px; padding: 8px 16px; background: #007bff; 
                           color: white; border: none; border-radius: 4px; cursor: pointer;">
                ปิด
            </button>
        </div>
    `;

    modal.innerHTML = content;
    document.body.appendChild(modal);
}

function checkSymbols(studentSymbols, solutionSymbols) {
    // ตรวจสอบจำนวน symbols
    if (studentSymbols.length !== solutionSymbols.length) {
        return {
            score: 0,
            feedback: 'จำนวน symbols ไม่ตรงกับเฉลย'
        };
    }

    let score = 0;
    let feedback = [];

    studentSymbols.forEach((studentSymbol) => {
        // หา symbol ที่ตรงกันในเฉลย
        const matchingSymbol = solutionSymbols.find(solution => {
            // เช็คประเภทของ symbol
            if (solution.type !== studentSymbol.type) return false;

            // เช็คข้อความใน symbol (ใช้ fuzzy matching)
            const textSimilarity = compareSimilarity(
                studentSymbol.text.toLowerCase(),
                solution.text.toLowerCase()
            );
            return textSimilarity >= 0.8; // ความคล้าย 80% ขึ้นไปถือว่าผ่าน
        });

        if (matchingSymbol) {
            score += 1;
        } else {
            feedback.push(`Symbol "${studentSymbol.text}" ไม่ตรงกับเฉลย`);
        }
    });

    return {
        score: (score / solutionSymbols.length) * 100,
        feedback
    };
}
function checkConnections(studentConnections, solutionConnections) {
    console.log('Checking connections:', {
        student: studentConnections,
        solution: solutionConnections
    });

    // ถ้าไม่มี connections ทั้งสองฝั่ง ถือว่าถูกต้อง
    if (!studentConnections?.length && !solutionConnections?.length) {
        return {
            score: 100,
            passed: true,
            feedback: []
        };
    }

    // ถ้าฝั่งใดฝั่งหนึ่งไม่มี connections
    if (!studentConnections?.length || !solutionConnections?.length) {
        return {
            score: 0,
            passed: false,
            feedback: ['จำนวนการเชื่อมต่อไม่ถูกต้อง']
        };
    }

    // ตรวจสอบแต่ละ connection
    let score = 0;

    solutionConnections.forEach(solutionConn => {
        // หา connection ที่ตรงกัน
        const matchingConn = studentConnections.find(studentConn => {
            // เช็คจุดเชื่อมต่อ source และ target
            const pointsMatch =
                studentConn.sourcePoint === solutionConn.sourcePoint &&
                studentConn.targetPoint === solutionConn.targetPoint;

            // เช็คข้อความบนเส้น
            const textMatch = compareSimilarity(
                studentConn.text || '',
                solutionConn.text || ''
            ) >= 0.8;

            return pointsMatch && textMatch;
        });

        if (matchingConn) {
            score += 100;
        }
    });

    // คำนวณคะแนนรวม
    const finalScore = Math.round(score / solutionConnections.length);

    // สร้าง feedback
    const feedback = [];
    if (studentConnections.length !== solutionConnections.length) {
        feedback.push(`จำนวนการเชื่อมต่อไม่ตรงกับเฉลย (${studentConnections.length}/${solutionConnections.length})`);
    }
    if (finalScore < 50) {
        feedback.push('การเชื่อมต่อส่วนใหญ่ไม่ถูกต้อง');
    } else if (finalScore < 80) {
        feedback.push('การเชื่อมต่อถูกต้องบางส่วน');
    }

    console.log('Connection check result:', {
        score: finalScore,
        feedback
    });

    return {
        score: finalScore,
        passed: finalScore >= 80,
        feedback
    };
}
// อัพเดตการเรียกใช้งานในปุ่มหรือ event listener
document.getElementById('checkAnswerBtn')?.addEventListener('click', () => {
    checkAnswer().catch(error => {
        console.error('Error in checkAnswer:', error);
        alert('เกิดข้อผิดพลาดในการตรวจคำตอบ');
    });
});

function compareSimilarity(str1, str2) {
    // แปลงเป็น string และทำความสะอาดข้อความ
    str1 = (str1 || '').toString().trim().toLowerCase();
    str2 = (str2 || '').toString().trim().toLowerCase();

    str1 = str1.replace(/\s+/g, '');
    str2 = str2.replace(/\s+/g, '');
    
    // เคลียร์ค่า placeholder
    if (str1 === 'พิมพ์valua' || str1 === 'พิมพ์value' || str1 === 'คลิกเพื่อแก้ไข' || str1 === 'ดับเบิลคลิกเพื่อพิมพ์') str1 = '';
    if (str2 === 'พิมพ์valua' || str2 === 'พิมพ์value' || str2 === 'คลิกเพื่อแก้ไข' || str2 === 'ดับเบิลคลิกเพื่อพิมพ์') str2 = '';

    // เช็คกรณีพื้นฐาน
    if (str1 === str2) return 1;
    if (!str1 || !str2) return 0;

    // แปลงตัวเลขเป็นข้อความที่เหมือนกัน
    // เช่น "9" กับ "nine" ควรถือว่าเหมือนกัน
    const numbers = {
        '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
        '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine'
    };

    if (numbers[str1] === str2 || numbers[str2] === str1) return 1;

    // ถ้าเป็นตัวเลขทั้งคู่และเท่ากัน ให้ถือว่าเหมือนกัน
    if (!isNaN(str1) && !isNaN(str2) && parseFloat(str1) === parseFloat(str2)) return 1;

    // คำนวณ Levenshtein distance
    const m = str1.length;
    const n = str2.length;

    // ถ้าความยาวต่างกันมากเกินไป ให้ถือว่าไม่เหมือนกัน
    if (Math.abs(m - n) > Math.min(m, n)) return 0;

    const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(
                    dp[i - 1][j],     // deletion
                    dp[i][j - 1],     // insertion
                    dp[i - 1][j - 1]  // substitution
                );
            }
        }
    }

    // คำนวณความคล้ายคลึง
    const maxLength = Math.max(m, n);
    const similarity = 1 - (dp[m][n] / maxLength);

    // ปรับค่าความคล้ายคลึงให้เข้มงวดขึ้น
    // ถ้าความคล้ายคลึงต่ำกว่า 0.5 ให้ถือว่าไม่เหมือนกันเลย
    return similarity < 0.5 ? 0 : similarity;
}

// ฟังก์ชันคำนวณ Levenshtein distance
function levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(
                    dp[i - 1][j],     // deletion
                    dp[i][j - 1],     // insertion
                    dp[i - 1][j - 1]  // substitution
                );
            }
        }
    }
    return dp[m][n];
}

function checkFlowchartAnswer(studentFlowchart, solutionFlowchart) {
    console.log('Checking flowcharts:', {
        student: studentFlowchart,
        solution: solutionFlowchart
    });

    // ตรวจสอบ symbols และสร้าง mapping
    const symbolMapping = {};
    const symbolsResult = {
        score: 0,
        feedback: [],
        passed: false
    };

    // ตรวจสอบจำนวนและประเภทของ symbols
    if (studentFlowchart.symbols.length === solutionFlowchart.symbols.length) {
        let correctSymbols = 0;
        studentFlowchart.symbols.forEach(studentSymbol => {
            const matchingSymbol = solutionFlowchart.symbols.find(solutionSymbol =>
                solutionSymbol.type === studentSymbol.type &&
                compareSimilarity(studentSymbol.text.toLowerCase(), solutionSymbol.text.toLowerCase()) >= 0.8
            );
            if (matchingSymbol) {
                correctSymbols++;
                symbolMapping[studentSymbol.id] = matchingSymbol.id;
            }
        });
        symbolsResult.score = (correctSymbols / solutionFlowchart.symbols.length) * 100;
        symbolsResult.passed = symbolsResult.score >= 80;
    }

    // ตรวจสอบ connections แบบยืดหยุ่น
    const connectionsResult = {
        score: 0,
        feedback: [],
        passed: false
    };

    let correctConnections = 0;
    studentFlowchart.connections.forEach(studentConn => {
        const mappedSourceId = symbolMapping[studentConn.sourceSymbol];
        const mappedTargetId = symbolMapping[studentConn.targetSymbol];

        // หา connection ที่ตรงกันในเฉลย โดยไม่สนใจจุดเชื่อมต่อ
        const matchingConn = solutionFlowchart.connections.find(solutionConn => {
            // เช็คการเชื่อมต่อแบบปกติ
            const normalMatch =
                (solutionConn.sourceSymbol === mappedSourceId &&
                    solutionConn.targetSymbol === mappedTargetId);

            // เช็คการเชื่อมต่อแบบสลับทิศทาง (ถ้าสามารถสลับได้)
            const canBeReversed = !['start-end', 'decision'].includes(
                studentFlowchart.symbols.find(s => s.id === studentConn.sourceSymbol)?.type
            );

            const reversedMatch = canBeReversed &&
                (solutionConn.sourceSymbol === mappedTargetId &&
                    solutionConn.targetSymbol === mappedSourceId);

            // เช็คข้อความบนเส้น (ถ้ามี)
            const textMatch = !solutionConn.text || !studentConn.text ||
                compareSimilarity(studentConn.text.toLowerCase(), solutionConn.text.toLowerCase()) >= 0.8;

            return (normalMatch || reversedMatch) && textMatch;
        });

        if (matchingConn) {
            correctConnections++;
        }
    });

    if (studentFlowchart.connections.length > 0) {
        connectionsResult.score = (correctConnections / studentFlowchart.connections.length) * 100;
        connectionsResult.passed = connectionsResult.score >= 80;
    }

    // คำนวณคะแนนรวม
    const totalScore = Math.round(
        (symbolsResult.score * 0.5) +
        (connectionsResult.score * 0.5)
    );

    // สร้างคำอธิบายผลการตรวจ
    const feedback = [];
    if (!symbolsResult.passed) {
        feedback.push('จำนวนหรือประเภทของ symbols ไม่ตรงกับเฉลย');
    }
    if (!connectionsResult.passed) {
        feedback.push('การเชื่อมต่อระหว่าง symbols ไม่ตรงกับเฉลย');
    }

    return {
        score: totalScore,
        details: {
            symbols: symbolsResult,
            connections: connectionsResult
        },
        feedback: feedback
    };
}

function checkFlow(studentFlowchart, solutionFlowchart) {
    if (!studentFlowchart?.symbols || !solutionFlowchart?.symbols) {
        return {
            score: 0,
            feedback: 'ไม่พบข้อมูล flowchart',
            passed: false
        };
    }

    // ตรวจ symbols
    if (studentFlowchart.symbols.length !== solutionFlowchart.symbols.length) {
        return {
            score: 0,
            feedback: 'จำนวน symbols ไม่ตรงกับเฉลย',
            passed: false
        };
    }

    let symbolScore = 0;
    let connectionScore = 0;
    let feedback = [];

    // ตรวจ symbol type และ text
    for (let i = 0; i < studentFlowchart.symbols.length; i++) {
        const studentSymbol = studentFlowchart.symbols[i];
        const solutionSymbol = solutionFlowchart.symbols[i];

        if (studentSymbol.type === solutionSymbol.type &&
            studentSymbol.text === solutionSymbol.text) {
            symbolScore += 100;
        }
    }
    symbolScore = Math.round(symbolScore / studentFlowchart.symbols.length);

    // ตรวจ connections
    const studentConns = studentFlowchart.connections || [];
    const solutionConns = solutionFlowchart.connections || [];

    if (studentConns.length !== solutionConns.length) {
        feedback.push(`จำนวนการเชื่อมต่อไม่ถูกต้อง (${studentConns.length}/${solutionConns.length})`);
    }

    // หาคู่ connection ที่ตรงกัน
    let matchedConnections = 0;
    studentConns.forEach(studentConn => {
        const matchFound = solutionConns.some(solutionConn => {
            // ต้องตรง: text, source point, target point
            const textMatch = studentConn.text === solutionConn.text;
            const sourceMatch = findMatchingSymbol(studentConn.sourceSymbol, solutionConn.sourceSymbol,
                studentFlowchart.symbols, solutionFlowchart.symbols);
            const targetMatch = findMatchingSymbol(studentConn.targetSymbol, solutionConn.targetSymbol,
                studentFlowchart.symbols, solutionFlowchart.symbols);

            return textMatch && sourceMatch && targetMatch;
        });

        if (matchFound) {
            matchedConnections++;
        }
    });

    connectionScore = studentConns.length > 0 ?
        Math.round((matchedConnections / studentConns.length) * 100) : 0;

    const totalScore = Math.round((symbolScore * 0.4) + (connectionScore * 0.6));
    const passed = totalScore >= 80;

    return {
        score: totalScore,
        feedback: passed ? 'ลำดับการทำงานถูกต้อง' : 'ลำดับการทำงานไม่ถูกต้อง\n' + feedback.join('\n'),
        passed: passed
    };
}

// ฟังก์ชันช่วยหา symbol ที่ตรงกัน
function findMatchingSymbol(studentId, solutionId, studentSymbols, solutionSymbols) {
    const studentSymbol = studentSymbols.find(s => s.id === studentId);
    const solutionSymbol = solutionSymbols.find(s => s.id === solutionId);

    if (!studentSymbol || !solutionSymbol) return false;

    return studentSymbol.type === solutionSymbol.type &&
        studentSymbol.text === solutionSymbol.text;
}


function showResult(result) {
    const modal = document.createElement('div');
    modal.className = 'result-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    const content = `
        <div style="background: white; padding: 20px; border-radius: 8px; min-width: 300px;">
            <h2>ผลการตรวจ</h2>
            <div><strong>คะแนน: ${result.score}/100</strong></div>
            <div style="margin-top: 15px;">
                <div>Symbols: ${result.details.symbols.passed ? '✅ ผ่าน' : '❌ ไม่ผ่าน'}</div>
                <div>Connections: ${result.details.connections.passed ? '✅ ผ่าน' : '❌ ไม่ผ่าน'}</div>
                ${result.feedback.length > 0 ?
            `<div style="margin-top: 10px;">
                        <div style="color: #666;">คำแนะนำ:</div>
                        ${result.feedback.map(f =>
                `<div style="color: #dc3545; margin-top: 5px;">• ${f}</div>`
            ).join('')}
                    </div>` : ''
        }
            </div>
            <button onclick="this.closest('.result-modal').remove()" 
                    style="margin-top: 15px; padding: 8px 16px; border-radius: 4px; 
                           background: #007bff; color: white; border: none; cursor: pointer;">
                ปิด
            </button>
        </div>
    `;

    modal.innerHTML = content;
    document.body.appendChild(modal);
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
// Export functions
window.clearCanvas = clearCanvas;
window.checkAnswer = checkAnswer;
window.submitAnswer = submitAnswer;

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