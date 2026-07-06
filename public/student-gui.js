// ===============================
// Robust Text Normalization (For Thai & Mobile Inputs)
// ===============================
function normalizeText(text) {
    if (text === null || text === undefined) return '';
    return text.toString()
        .normalize('NFC') // Normalize Unicode (e.g., Thai vowel ordering)
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove hidden characters (Zero-width space, etc.)
        .replace(/\s+/g, ' ') // Collapse multiple spaces into one
        .trim();
}

function compareText(actual, expected) {
    return normalizeText(actual) === normalizeText(expected);
}

// Firebase Configuration
// ==========================================
// 🛡️ TRUSTED TYPES FIX (แก้ปัญหา bootstrap:19 blocked)
// ==========================================
if (window.trustedTypes && window.trustedTypes.createPolicy) {
    // ตรวจสอบว่ามี policy ชื่อ default หรือยัง เพื่อป้องกัน Error ซ้ำ
    if (!window.trustedTypes.defaultPolicy) {
        window.trustedTypes.createPolicy('default', {
            createHTML: (string, sink) => string,
            createScript: (string, sink) => string,
            createScriptURL: (string, sink) => string,
        });
    }
}
// ==========================================


const firebaseConfig = {
    apiKey: "AIzaSyDWiPuk0WP9z5_mjDe1FkqeVZ-vcYClyLs",
    authDomain: "python-learning-platform-596e1.firebaseapp.com",
    projectId: "python-learning-platform-596e1",
    storageBucket: "python-learning-platform-596e1.firebasestorage.app",
    messagingSenderId: "5262153531",
    appId: "1:5262153531:web:55f6246093e1780003491e"
};
let guiWidth  = 550;   // ค่าเริ่มต้นถ้าต้องการ
let guiHeight = 200;
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
const db = firebase.firestore();
const params    = new URLSearchParams(window.location.search);
const problemId = params.get('problemId');


// Backend Configuration
const config = {
    PYTHON_API: 'https://xtgzdpztzdbavnbmjk2f25vq7u0nsfrx.lambda-url.us-east-1.on.aws/',
    GUI_API: 'https://ipo4d7d76xyk2he5llc4ym22nq0yosht.lambda-url.ap-southeast-2.on.aws/'
};

// Add link to external CSS file
function loadCSS() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = 'css/student-gui.css';
    document.head.appendChild(link);
}
// ==========================================
// 🚀 PYODIDE SETUP (Copy มาจากไฟล์เก่า)
// ==========================================
let pyodideInstance = null;
let isPyodideLoading = false;

// โค้ด Python สำหรับ Mock Tkinter (หัวใจสำคัญ!)
const MOCK_TKINTER_CODE = `
import builtins
import sys

gui_elements = []
gui_config = {"title": "Tkinter App", "geometry": ""}
widget_registry = [] 

class WidgetBase:
    def __init__(self, master=None, **kwargs):
        self.id = len(gui_elements)
        self.type = self.__class__.__name__
        self.props = kwargs
        self.command_func = kwargs.get('command') 
        if callable(self.command_func):
             self.props['command'] = self.command_func.__name__
        self.layout = None
        gui_elements.append({"id": self.id, "type": self.type, "props": self.props, "layout": None})
        widget_registry.append(self)
    def pack(self, **kwargs): gui_elements[self.id]["layout"] = {"type": "pack", "args": kwargs}
    def grid(self, **kwargs): gui_elements[self.id]["layout"] = {"type": "grid", "args": kwargs}
    def place(self, **kwargs): gui_elements[self.id]["layout"] = {"type": "place", "args": kwargs}
    def config(self, **kwargs):
        self.props.update(kwargs)
        gui_elements[self.id]["props"].update(kwargs)
    def invoke(self):
        if callable(self.command_func): self.command_func()
    def get(self): return self.props.get('value', '')
    def delete(self, first, last=None): 
        if 'value' in self.props: self.props['value'] = ''
    def insert(self, index, string):
        current = self.props.get('value', '')
        self.props['value'] = current + string

class Tk(WidgetBase):
    def __init__(self):
        gui_elements.clear()
        widget_registry.clear()
        super().__init__(None)
    def title(self, text): gui_config["title"] = text
    def geometry(self, text): gui_config["geometry"] = text
    def mainloop(self): pass

class Label(WidgetBase): 
    def config(self, **kwargs):
        super().config(**kwargs)
        if 'text' in kwargs: self.props['text'] = kwargs['text']
class Button(WidgetBase): pass
class Frame(WidgetBase): pass
class Entry(WidgetBase):
    def get(self):
        if 'textvariable' in self.props: return self.props['textvariable'].get()
        return self.props.get('value', '')
    def insert(self, index, string):
        if 'textvariable' in self.props: self.props['textvariable'].set(string)
        else: self.props['value'] = string
class Checkbutton(WidgetBase): pass

class StringVar:
    def __init__(self, value=""): self.v = value
    def set(self, value): self.v = str(value)
    def get(self): return self.v
class IntVar:
    def __init__(self, value=0): self.v = value
    def set(self, value): self.v = int(value)
    def get(self): return self.v

class MockTtkModule: pass
ttk_module = MockTtkModule()
ttk_module.Button = Button
ttk_module.Label = Label
ttk_module.Entry = Entry
ttk_module.Frame = Frame
ttk_module.Checkbutton = Checkbutton

module = type(sys)("tkinter")
module.Tk = Tk
module.Label = Label
module.Button = Button
module.Entry = Entry
module.Checkbutton = Checkbutton
module.Frame = Frame
module.StringVar = StringVar
module.IntVar = IntVar
module.pack = lambda **kwargs: None 
module.ttk = ttk_module 

sys.modules["tkinter"] = module
sys.modules["tkinter.ttk"] = ttk_module
`;

// ฟังก์ชันเช็คอุปกรณ์
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
           || window.innerWidth <= 800;
}

// ฟังก์ชันอัพเดทป้ายสถานะ
function updateStatusUI(message, type) {
    // สร้าง element นี้ไว้ใน HTML ของคุณ หรือหาที่ว่างๆ แปะ
    // ถ้ายังไม่มีใน HTML มันจะไม่ error แต่มันจะไม่โชว์เฉยๆ
    const statusEl = document.getElementById('executionStatus');
    if (!statusEl) return;
    statusEl.style.display = 'inline-block';
    statusEl.textContent = message;
    if (type === 'pyodide') { statusEl.style.backgroundColor = '#7CDEBC'; statusEl.style.color = '#004d40'; } 
    else if (type === 'aws') { statusEl.style.backgroundColor = '#6EC4E8'; statusEl.style.color = '#003366'; } 
    else if (type === 'fallback') { statusEl.style.backgroundColor = '#FFE66D'; statusEl.style.color = '#664d00'; } 
    else { statusEl.style.display = 'none'; }
}

// ฟังก์ชันโหลด Pyodide
async function initPyodide() {
    if (isPyodideLoading || pyodideInstance) return;
    try {
        isPyodideLoading = true;
        updateStatusUI("⏳ Preparing Python...", "fallback");
        console.log("🚀 Loading Pyodide for GUI...");
        
        // ต้องมั่นใจว่ามีการ import script pyodide ใน index.html หรือโหลด dynamic
        if (typeof loadPyodide === 'undefined') {
             // โหลด Script ถ้ายังไม่มี
             const script = document.createElement('script');
             script.src = "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js";
             document.head.appendChild(script);
             await new Promise(r => script.onload = r);
        }

        pyodideInstance = await loadPyodide();
        await pyodideInstance.runPythonAsync(MOCK_TKINTER_CODE);
        
        updateStatusUI("✅ Ready (PC)", "pyodide");
        console.log("✅ Pyodide & Mock Tkinter Ready!");
    } catch (err) {
        console.error("❌ Failed to load Pyodide:", err);
        updateStatusUI("☁️ Ready (Cloud)", "aws");
    } finally {
        isPyodideLoading = false;
    }
}

// ฟังก์ชันช่วยกรอง Error ของ Pyodide
function formatPyodideError(err) {
    const errString = String(err);
    if (errString.includes('PythonError:')) {
        const lines = errString.split('\n');
        const relevantLines = lines.filter(line => 
            !line.includes('/lib/python') && 
            !line.includes('_pyodide/_base.py') && 
            !line.includes('PythonError:') &&
            !line.includes('<exec>')
        );
        return relevantLines.join('\n').trim();
    }
    return errString;
}

// ฟังก์ชันเช็ค Syntax แบบ Hybrid (PC ใช้ Pyodide, มือถือใช้ AWS)
async function checkSyntax_Hybrid(code) {
    // 1. ถ้าเป็นมือถือ หรือ Pyodide ยังไม่มา -> ใช้ AWS (วิธีเดิมของคุณ)
    if (isMobileDevice() || !pyodideInstance) {
        updateStatusUI("☁️ Checking on Cloud...", "aws");
        const result = await checkSyntax_AWS(code); // เรียกฟังก์ชันเดิมของคุณที่เปลี่ยนชื่อ
        updateStatusUI(isMobileDevice() ? "☁️ Ready (Cloud)" : "✅ Ready (PC)", isMobileDevice() ? "aws" : "pyodide");
        return result;
    }

    // 2. ถ้าเป็น PC -> ใช้ Pyodide (เร็วและฟรี)
    updateStatusUI("💻 Checking on PC...", "pyodide");
    try {
        // ใช้ compile() เพื่อเช็ค Syntax โดยไม่ต้องรันจริง
        pyodideInstance.runPython(`compile(${JSON.stringify(code)}, '<string>', 'exec')`);
        updateStatusUI("✅ Ready (PC)", "pyodide");
        return { status: 'success' };
    } catch (err) {
        updateStatusUI("✅ Ready (PC)", "pyodide");
        return {
            status: 'error',
            message: formatPyodideError(err)
        };
    }
}

// ฟังก์ชัน Wrapper สำหรับ AWS (ของเดิมในไฟล์คุณ คือ logic ใน checkGUICode ส่วนที่ fetch API)
// คุณต้อง Copy logic ใน checkGUICode เดิมมาใส่ที่นี่ หรือจะปรับ checkGUICode ให้เรียก Hybrid เลยก็ได้
async function checkSyntax_AWS(code) {
    // ... เอา Logic การ fetch(config.PYTHON_API...) ของเดิมมาใส่ตรงนี้ ...
    // เพื่อความรวดเร็ว ผมเขียนย่อให้ดู:
    const mockCode = `
class Tk: 
    def __init__(self): pass
    def title(self, t): pass
    def geometry(self, s): pass
    def mainloop(self): pass
# ... (mock อื่นๆ) ...
tk = type('', (), {'Tk': Tk})
import sys
sys.modules['tkinter'] = tk
`.trim();

    const processedCode = preprocessTkinterCode(code); // ใช้ฟังก์ชันเดิมที่มีในไฟล์
    
    try {
        const response = await fetch(config.PYTHON_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: processedCode, action: 'check_syntax' })
        });
        const result = await response.json();
        
        if (result.status === 'error' || result.stderr) {
            return { status: 'error', message: result.output || result.stderr };
        }
        return { status: 'success' };
    } catch (e) {
        return { status: 'error', message: e.message };
    }
}
// ==========================================

// Load CSS when document is ready
document.addEventListener('DOMContentLoaded', () => {
    // Load CSS
    loadCSS();
    
    // Setup page structure
    setupPageStructure();
    
    // Firebase Auth Check
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
    
        // Setup Ace Editor
        const codeEditor=setupEditor();
        const convertBtn = document.getElementById('convertBtn');
        if (convertBtn) {  // <--- เพิ่มบรรทัดนี้
            convertBtn.addEventListener('click', async () => {
            console.log('Preview button clicked');
            const code = codeEditor.value;
            console.log('Code to preview:', code.substring(0, 100) + '...');

            if (convertBtn.disabled) {
                console.log('Preview button is disabled');
                showError('กรุณาตรวจสอบโค้ดให้ผ่านก่อนแสดง GUI');
                return;
            }
            
            // อ่านโค้ดจาก textarea ที่เพิ่งสร้าง
            const editorCode = document.getElementById('codeEditorTextarea').value;
            document.getElementById('pythonInput').value = editorCode;

            // แสดงผลใน result-frame
            sendToSimulator(true);
            
            // เปิดใช้งานปุ่ม Test หลังจากรันโค้ดสำเร็จ
            if (testBtn) {
                testBtn.disabled = false;
            }
            // ยังคงปิดใช้งานปุ่ม testCaseBtn - ต้องตรวจคำตอบก่อน
            if (testCaseBtn) {
                testCaseBtn.disabled = true;
            }
            });
        }
        // Get problem ID and class ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const problemId = urlParams.get('id');
        const classId = urlParams.get('classId');
        const viewMode = urlParams.get('mode') === 'view';
    
        if (!problemId || !classId) {
            showError('ไม่พบรหัสโจทย์หรือรหัสห้องเรียน');
            return;
        }
    
        // Run data fetching in parallel to significantly reduce loading time
        const loadingTasks = [checkEnrollment(classId, user.uid)];
        
        if (problemId) {
            loadingTasks.push(loadGUIProblem(problemId, user.uid, classId, viewMode));
            
            // ตรวจสอบสถานะการส่งงาน
            if (!viewMode) {
                loadingTasks.push(checkSubmissionStatus(problemId, user.uid));
            }
        }
        
        await Promise.all(loadingTasks);
    
        // Event Listeners
        setupEventListeners(problemId, classId, user.uid, viewMode);
       
    });
    if (!isMobileDevice()) {
        // Defer Pyodide initialization to avoid blocking the main thread during initial UI rendering
        setTimeout(() => {
            initPyodide(); // โหลด Pyodide ถ้าเป็น PC
        }, 1000);
    } else {
        updateStatusUI("☁️ Ready (Cloud)", "aws");
    }
});

// Function to set up the page structure
function setupPageStructure() {
    // Since we're using the HTML structure that's already defined in the HTML file,
    // we don't need to recreate all elements
    
    // Just make sure error and success message containers are properly set up
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.style.display = 'none';
    }
    
    const successMessage = document.getElementById('successMessage');
    if (successMessage) {
        successMessage.style.display = 'none';
    }
    
    // Set up back button event listener and ensure it has the arrow icon
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        // Add back arrow if it doesn't exist
        if (!backBtn.innerHTML.includes('')) {
            backBtn.innerHTML = '' + backBtn.innerHTML;
        }
        
        backBtn.addEventListener('click', () => {
            const urlParams = new URLSearchParams(window.location.search);
            const classId = urlParams.get('classId');
            if (classId === 'admin') {
                window.location.href = 'student-problem-admin.html';
            } else {
                window.location.href = `student-class-detail.html?id=${classId}`;
            }
        });
    }
}

function setupEditor() {
    const codeEditorContainer = document.getElementById('codeEditor');
    if (!codeEditorContainer) {
        console.error('ไม่พบ element ที่มี id="codeEditor"');
        return;
    }

    // สร้างโครงสร้างสำหรับ custom editor
    codeEditorContainer.innerHTML = `
        <div class="code-editor-container">
            <div id="lineNumbers" class="line-numbers">1</div>
            <textarea id="codeEditorTextarea" class="code-input" spellcheck="false"></textarea>
            <pre class="code-highlight"><code class="language-python"></code></pre>
        </div>
    `;

    // อ้างอิงถึง elements
    const codeEditor = document.getElementById('codeEditorTextarea');
    const lineNumbers = document.getElementById('lineNumbers');
    const highlightContainer = document.querySelector('.code-highlight');

    if (!codeEditor || !lineNumbers) {
        console.error('ไม่พบ codeEditorTextarea หรือ lineNumbers');
        return;
    }

    // ==========================================
    // 🔧 AUTO-FIX CSS: แก้ปัญหา Scrollbar กินพื้นที่ (ใส่ให้เองเลย)
    // ==========================================
    // สร้าง style tag เพื่อดันก้นกล่อง Highlight หนี Scrollbar อัตโนมัติ
    const styleFix = document.createElement('style');
    styleFix.innerHTML = `
        .code-highlight {
            padding-bottom: 40px !important; /* ดันพื้นที่ล่างเผื่อ Scrollbar แนวนอน */
        }
        .code-input {
            padding-bottom: 10px !important;
        }
    `;
    document.head.appendChild(styleFix);

    // ==========================================
    // 🔄 SYNC SCROLL SYSTEM: ระบบซิงค์ตำแหน่งแบบเกาะติด
    // ==========================================
    const syncScroll = () => {
        if (highlightContainer && codeEditor) {
            // ซิงค์ทั้งแนวตั้งและแนวนอน
            highlightContainer.scrollTop = codeEditor.scrollTop;
            highlightContainer.scrollLeft = codeEditor.scrollLeft;
        }
        if (lineNumbers && codeEditor) {
            // ซิงค์เลขบรรทัด
            lineNumbers.scrollTop = codeEditor.scrollTop;
        }
    };

    // 1. Event หลัก: เลื่อน (Scroll)
    codeEditor.addEventListener('scroll', syncScroll);

    // 2. Event การพิมพ์และการแก้ไข
    codeEditor.addEventListener('input', () => { 
        updateLineNumbers(); 
        syncScroll(); 
    });
    codeEditor.addEventListener('keyup', () => {
        updateLineNumbers(); 
        syncScroll();
    });

    // 3. Event การคลิกและกดปุ่ม (กันตำแหน่งเพี้ยนตอนจิ้ม)
    codeEditor.addEventListener('click', syncScroll);
    codeEditor.addEventListener('mousedown', syncScroll);
    codeEditor.addEventListener('keydown', syncScroll);

    // 4. [ไม้ตาย] แค่ขยับเมาส์ผ่าน ก็สั่งจัดระเบียบทันที (แก้ปัญหาคลิกไม่โดน)
    codeEditor.addEventListener('mousemove', syncScroll);

    // 5. รองรับการย่อขยายหน้าจอ
    window.addEventListener('resize', syncScroll);

    // 6. การวางโค้ด (Paste) - ใช้เทคนิค Double RequestAnimationFrame รอ Browser วาดเสร็จ
    codeEditor.addEventListener('paste', function() {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                updateLineNumbers();
                updateCodeHighlight();
                syncScroll(); // บังคับดีดตำแหน่งให้ตรง
            });
        });
    });

    // เพิ่มฟังก์ชันพิเศษให้กับ editor (Auto-indent, brackets)
    enhanceCodeEditor();

    // ==========================================
    // 🌈 PRISM.JS LOADER (Highlighter)
    // ==========================================
    if (!window.Prism) {
        const prismCSS = document.createElement('link');
        prismCSS.rel = 'stylesheet';
        prismCSS.href = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/themes/prism-tomorrow.min.css';
        document.head.appendChild(prismCSS);

        const prismJS = document.createElement('script');
        prismJS.src = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/prism.min.js';
        prismJS.onload = () => {
            const prismPython = document.createElement('script');
            prismPython.src = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/components/prism-python.min.js';
            prismPython.onload = () => {
                console.log('Prism.js และ Python plugin โหลดเรียบร้อย');
                if (window.Prism && Prism.languages.python) {
                    Prism.languages.insertBefore('python', 'operator', {
                        'variable-assignment': {
                            pattern: /(?:^|[^\p{L}\p{N}_])[\p{L}_][\p{L}\p{N}_]*(?=\s*=\s*(?!=))|(?:^|[^\p{L}\p{N}_])[\p{L}_][\p{L}\p{N}_]*(?=\s*\.)/u, 
                            alias: 'variable' 
                        }
                    });
                }
                // รีเซ็ตสไตล์ code element
                const highlightElement = document.querySelector('.code-highlight code');
                if (highlightElement) {
                    highlightElement.style.margin = '0';
                    highlightElement.style.padding = '0';
                    highlightElement.style.lineHeight = '21px';
                    highlightElement.style.fontSize = '14px';
                }
                updateCodeHighlight();
            };
            document.head.appendChild(prismPython);
        };
        document.head.appendChild(prismJS);
    } else {
        console.log('Prism.js มีอยู่แล้ว อัปเดต highlighting');
        const highlightElement = document.querySelector('.code-highlight code');
        if (highlightElement) {
            highlightElement.style.margin = '0';
            highlightElement.style.padding = '0';
            highlightElement.style.lineHeight = '21px';
            highlightElement.style.fontSize = '14px';
        }
        updateCodeHighlight();
    }

    // Set initial content
    codeEditor.value = "# เขียนโค้ด Python ที่นี่\n\nimport tkinter as tk\n\n# สร้างหน้าต่าง GUI\nwindow = tk.Tk()\nwindow.title('My GUI Application')\n\n# เพิ่ม widgets ที่นี่\n\n# แสดงหน้าต่าง\nwindow.mainloop()";
    
    updateLineNumbers();
    updateCodeHighlight();

    // Reset Scroll
    codeEditor.scrollTop = 0;
    lineNumbers.scrollTop = 0;
    highlightContainer.scrollTop = 0;

    console.log('Code editor ตั้งค่าเรียบร้อย (Enhanced Sync Activated)');

    return codeEditor;
}

async function loadProblemConfig(problemId) {
    const snap = await db.collection('problems').doc(problemId).get();
    const data = snap.data();
    window.guiTestCases = data.testCases || [];
    window.problemTestCases = data.testCases || []; // เพิ่มบรรทัดนี้
    window.widgetDefinitions = data.widgets || [];
    renderTestCases(window.guiTestCases);
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderTestCases(testCases) {
  const defs = window.widgetDefinitions || [];
  const list = document.getElementById('guiTestCasesList');
  if (!list) return;
  list.innerHTML = '';

  testCases.forEach((tc, idx) => {
    // Inputs
    const inpText = (tc.inputs || [])
      .map(i => {
        const def = defs.find(d => d.name === i.name) || {};
        const label = def.text  || '-';
        const type  = def.type  || 'Entry';
        return `${label} [${type}] = ${i.value}`;
      })
      .join(', ');

    // Actions
    const actText = (tc.actions || [])
      .map(a => {
        const def = defs.find(d => d.name === a.widget) || {};
        const label = def.text  || '-';
        const type  = def.type  || 'Button';
        return `${label} [${type}] ▶ ${a.state}`;
      })
      .join(', ');

    // Expected Outputs
    const outTextHtml = (tc.outputs || [])
      .map(o => {
        const def = defs.find(d => d.name === o.widget) || {};
        const label = def.text  || '-';
        const type  = def.type  || 'Label';
        // ทำไฮไลต์ที่ตัวข้อความ value เป็นสีส้มอ่อน
        return `${escapeHtml(label)} [${escapeHtml(type)}] = <span style="background-color: #FFE66D; color: #333; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${escapeHtml(o.value)}</span>`;
      })
      .join('<br>');

    const score = tc.score || 1;
    const note  = tc.explanation || '-';

    const div = document.createElement('div');
    div.className = 'test-case';
    div.innerHTML = `
      <strong>Test #${idx + 1}</strong><br>
      <p><strong>Inputs:</strong> ${escapeHtml(inpText || '–')}</p>
      <p><strong>Actions:</strong> ${escapeHtml(actText || '–')}</p>
      <p><strong>Expected:</strong></p>
      <div style="background-color: #f8f9fa; padding: 10px; border-radius: 8px; border: 1px solid #dee2e6; margin: 8px 0; font-family: monospace;">${outTextHtml || '–'}</div>
      <p><strong>Score:</strong> ${escapeHtml(score)}</p>
      <p><strong>Note:</strong> ${escapeHtml(note)}</p>
    `;
    list.appendChild(div);
  });
}
  
  
// เพิ่มฟังก์ชัน updateLineNumbers และ updateCodeHighlight
function updateLineNumbers() {
    const codeEditor = document.getElementById('codeEditorTextarea');
    const lineNumbers = document.getElementById('lineNumbers');
    if (codeEditor && lineNumbers) {
        const lines = codeEditor.value.split('\n');
        lineNumbers.textContent = Array.from(
            { length: lines.length },
            (_, i) => i + 1
        ).join('\n');
        updateCodeHighlight();
    }
}

function updateCodeHighlight() {
    const codeEditor = document.getElementById('codeEditorTextarea');
    const highlightElement = document.querySelector('.code-highlight code');
    const lineNumbers = document.getElementById('lineNumbers');

    if (codeEditor && highlightElement && lineNumbers) {
        // อัปเดตเนื้อหาใน code highlight
        highlightElement.textContent = codeEditor.value;
        
        // รีเซ็ตสไตล์ที่อาจเพิ่มโดย Prism.js
        highlightElement.style.margin = '0';
        highlightElement.style.padding = '0';
        highlightElement.style.lineHeight = '21px';
        highlightElement.style.fontSize = '14px';
        
        if (window.Prism) {
            Prism.highlightElement(highlightElement);
        }

        // ซิงโครไนซ์ scroll หลังจาก highlight
        highlightElement.parentElement.scrollTop = codeEditor.scrollTop;
        lineNumbers.scrollTop = codeEditor.scrollTop;
        
        console.log('Updated code highlight, scrollTop:', codeEditor.scrollTop);
    }
}
async function testGUICode(code, problemTestCases, iframe) {
    const includeTestCases = arguments.length >= 4 && arguments[3] && arguments[3].includeTestCases === true;
    
    console.log('=== เริ่มการทดสอบโค้ด GUI ===');
    
    // Log โค้ดใน editor ก่อนตรวจ test case
    console.log('โค้ดที่ได้รับจาก editor (ก่อนตรวจ test case):', code);
    
    // เพิ่ม console.log ตรงนี้
    // const iframe = document.getElementById('result-frame'); // Removed as iframe is now a parameter
    // console.log('สถานะ iframe ก่อนทดสอบ:', iframe ? 'พบ iframe' : 'ไม่พบ iframe'); // Removed
    if (iframe && iframe.contentDocument) {
        console.log('จำนวน widget ใน iframe ก่อนทดสอบ:', 
            Array.from(iframe.contentDocument.querySelectorAll('[data-index]')).length);
    }
    
    // Log จำนวน test case
    console.log('จำนวน test case ทั้งหมด:', problemTestCases.length);
    // console.log('รายละเอียด test cases:', problemTestCases); // Comment out or remove old log

    // สร้างข้อมูล test case สำหรับ log ในรูปแบบที่ต้องการ
    const detailedTestCasesForLog = problemTestCases.map(tc => {
        return {
            actions: tc.actions.map(action => {
                const widgetDef = window.widgetDefinitions.find(w => w.name === action.widget);
                return { 
                    widget: widgetDef ? widgetDef.type : action.widget, 
                    text: widgetDef ? widgetDef.text : '', 
                    state: action.state 
                };
            }),
            inputs: tc.inputs.map(input => {
                const widgetDef = window.widgetDefinitions.find(w => w.name === input.name);
                return { 
                    widget: widgetDef ? widgetDef.type : input.name, 
                    text: widgetDef ? widgetDef.text : '', 
                    value: input.value 
                };
            }),
            outputs: tc.outputs.map(output => {
                const widgetDef = window.widgetDefinitions.find(w => w.name === output.widget);
                return { 
                    widget: widgetDef ? widgetDef.type : output.widget, 
                    text: widgetDef ? widgetDef.text : '', 
                    value: output.value 
                };
            }),
            explanation: tc.explanation
        };
    });
    console.log('รายละเอียด test cases (ปรับปรุงแล้ว):', detailedTestCasesForLog);
    
    const previewDiv = document.getElementById('guiPreview');
    previewDiv.style.display = 'block'; // เพิ่มบรรทัดนี้เพื่อแสดง div
    previewDiv.innerHTML = `<div class="loading">กำลังตรวจคำตอบ...</div>`;

    // ประมวลผลโค้ดก่อนตรวจสอบ
    code = preprocessTkinterCode(code);

    try {
        let totalScore = 0;
        let maxScore = 0;
        const widgetResults = [];
        const testResults = [];
        const orderResults = []; // เพิ่มผลลัพธ์การตรวจสอบลำดับ

        // จำลอง GUI
        const { htmlOutput, widgets: parsedWidgets, jsCode } = convertTkinterToHtml(code);
        
        // แสดง GUI ที่มีการทำงานจริง
        previewDiv.innerHTML = `
            <div class="gui-preview">
                ${htmlOutput}
            </div>
        `;

        // Create and append script tag to make JavaScript actually run
        if (jsCode) {
            // Remove existing scripts if any
            const existingScripts = previewDiv.querySelectorAll('script');
            existingScripts.forEach(s => s.remove());
            
            const scriptEl = document.createElement('script');
            scriptEl.textContent = jsCode;
            previewDiv.appendChild(scriptEl);
        }

        // ตรวจสอบ Widgets (เน้น type และ text) จาก problemData.widgets
        const requiredWidgets = problemData.widgets || [];
        maxScore += requiredWidgets.reduce((sum, w) => sum + (typeof w.score === 'number' ? w.score : 1), 0);

        // --- ส่วนที่แก้ไข: ปรับปรุงการตรวจสอบ Widget ให้แม่นยำขึ้น ---
        let orderScore = 0;
        const maxOrderScore = 5; 
        maxScore += maxOrderScore;

        const widgetMapping = new Array(requiredWidgets.length).fill(-1);
        const usedParsedIndices = new Set();

        // ขั้นตอนที่ 1: จับคู่ตัวที่ตรงทั้ง Type และ Text ตรงกันเป๊ะ และยังไม่ถูกใช้
        requiredWidgets.forEach((req, reqIdx) => {
            const rText = normalizeText(req.text);
            if (rText && rText !== 'ไม่มีข้อความ') {
                const matchIdx = parsedWidgets.findIndex((p, pIdx) => 
                    !usedParsedIndices.has(pIdx) && 
                    p.type === req.type && 
                    normalizeText(p.text) === rText
                );
                if (matchIdx !== -1) {
                    widgetMapping[reqIdx] = matchIdx;
                    usedParsedIndices.add(matchIdx);
                }
            }
        });

        // ขั้นตอนที่ 2: จับคู่ตัวที่ Type ตรงกัน สำหรับ requirement ที่ไม่ระบุ Text และยังไม่ถูกใช้
        requiredWidgets.forEach((req, reqIdx) => {
            const rText = (req.text || "").trim();
            if (widgetMapping[reqIdx] === -1 && (!rText || rText === 'ไม่มีข้อความ')) {
                const matchIdx = parsedWidgets.findIndex((p, pIdx) => 
                    !usedParsedIndices.has(pIdx) && 
                    p.type === req.type
                );
                if (matchIdx !== -1) {
                    widgetMapping[reqIdx] = matchIdx;
                    usedParsedIndices.add(matchIdx);
                }
            }
        });

        // ลบ ขั้นตอนที่ 3 (Fallback แบบไม่สน Text) ออกเพื่อให้การตรวจเข้มงวดขึ้น
        // ถ้าระบุ Text ไว้ในโจทย์ แต่นักเรียนพิมพ์ไม่ตรง จะถือว่าไม่พบทันที

        // ให้คะแนนและบันทึกผล widgetResults
        const foundWidgets = {};
        requiredWidgets.forEach((widget, idx) => {
            const found = widgetMapping[idx] !== -1;
            const score = found ? (typeof widget.score === 'number' ? widget.score : 1) : 0;
            totalScore += score;
            foundWidgets[widget.name] = found;
            
            // ดึง text จาก widgetDefinitions ถ้าใน requiredWidgets ไม่มี
            let displayText = widget.text;
            if (!displayText || displayText === 'ไม่มีข้อความ') {
                const def = (window.widgetDefinitions || []).find(d => d.name === widget.name);
                if (def && def.text) displayText = def.text;
            }

            widgetResults.push({
                type: widget.type,
                text: displayText || 'ไม่มีข้อความ',
                found,
                score
            });
        });

        // สร้างลำดับของ widget ที่พบในโค้ด (อิงตามลำดับที่ปรากฏใน parsedWidgets)
        const parsedToReqMapping = new Array(parsedWidgets.length).fill(-1);
        widgetMapping.forEach((pIdx, reqIdx) => {
            if (pIdx !== -1) parsedToReqMapping[pIdx] = reqIdx;
        });

        const widgetOrder = [];
        parsedToReqMapping.forEach(reqIdx => {
            if (reqIdx !== -1) {
                widgetOrder.push(requiredWidgets[reqIdx].name);
            }
        });
        // --- จบส่วนที่แก้ไข ---
        
        console.log('Final Widget Order Found:', widgetOrder);
        
        // เปรียบเทียบลำดับกับข้อกำหนด
        let correctOrder = true;
        const requiredOrder = requiredWidgets.map(w => w.name);
        const foundInOrder = widgetOrder.filter(name => requiredOrder.includes(name));
        
        // ตรวจสอบว่าพบ widget ครบทุกตัวหรือไม่
        const allWidgetsFound = requiredWidgets.every(widget => 
            widgetOrder.includes(widget.name)
        );

        // ตรวจสอบว่ามี widget เกินหรือไม่
        const hasExtraWidgets = parsedWidgets.length > requiredWidgets.length;
        
        if (foundInOrder.length >= 2) { // ต้องมี widget อย่างน้อย 2 ตัวจึงจะตรวจสอบลำดับได้
            for (let i = 0; i < foundInOrder.length - 1; i++) {
                const currentIndex = requiredOrder.indexOf(foundInOrder[i]);
                const nextIndex = requiredOrder.indexOf(foundInOrder[i + 1]);
                if (currentIndex > nextIndex) {
                    correctOrder = false;
                    break;
                }
            }
            
            if (correctOrder && allWidgetsFound && !hasExtraWidgets) {
                // ให้คะแนนเต็มเฉพาะเมื่อพบ widget ครบทุกตัว ลำดับถูกต้อง และไม่มีตัวเกิน
                orderScore = maxOrderScore;
                orderResults.push({
                    message: "✅ ลำดับ Widget ถูกต้องตามข้อกำหนด",
                    score: orderScore,
                    maxScore: maxOrderScore
                });
            } else if (correctOrder && allWidgetsFound && hasExtraWidgets) {
                // พบครบ ลำดับได้ แต่มีตัวเกิน
                orderScore = Math.floor(maxOrderScore / 2); // ให้คะแนนครึ่งเดียว
                orderResults.push({
                    message: `⚠️ ลำดับถูกต้องและครบถ้วน แต่มี Widget เกินมาจากที่กำหนด (พบ ${parsedWidgets.length} ตัว, กำหนด ${requiredWidgets.length} ตัว)`,
                    score: orderScore,
                    maxScore: maxOrderScore
                });
            } else if (correctOrder && !allWidgetsFound) {
                // ลำดับถูกต้องแต่ไม่ครบทุก widget
                const foundCount = foundInOrder.length;
                const totalCount = requiredWidgets.length;
                orderScore = Math.floor((foundCount / totalCount) * (maxOrderScore / 2));
                orderResults.push({
                    message: `⚠️ ลำดับ Widget ถูกต้อง แต่พบเพียง ${foundCount}/${totalCount} widget`,
                    expected: requiredOrder.join(', '),
                    found: foundInOrder.join(', '),
                    score: orderScore,
                    maxScore: maxOrderScore
                });
            } else {
                // ลำดับไม่ถูกต้อง
                orderResults.push({
                    message: "❌ ลำดับ Widget ไม่ตรงตามข้อกำหนด หรือมีการเรียงลำดับผิด",
                    expected: requiredOrder.join(', '),
                    found: foundInOrder.join(', '),
                    score: 0,
                    maxScore: maxOrderScore
                });
            }
        } else if (requiredWidgets.length === 1 && foundInOrder.length === 1) {
            // กรณีที่มี Widget เพียงตัวเดียว และหาเจอ
            if (!hasExtraWidgets) {
                orderScore = maxOrderScore;
                orderResults.push({
                    message: "✅ ลำดับ Widget ถูกต้อง (มีเพียง 1 ตัว)",
                    score: orderScore,
                    maxScore: maxOrderScore
                });
            } else {
                orderScore = Math.floor(maxOrderScore / 2);
                orderResults.push({
                    message: `⚠️ พบ Widget ที่ต้องการ แต่มี Widget อื่นเกินมา (พบ ${parsedWidgets.length} ตัว, กำหนด ${requiredWidgets.length} ตัว)`,
                    score: orderScore,
                    maxScore: maxOrderScore
                });
            }
        } else {
            orderResults.push({
                message: `⚠️ ไม่สามารถตรวจสอบลำดับได้ (พบ Widget เพียง ${foundInOrder.length}/${requiredWidgets.length} ตัว)`,
                expected: requiredOrder.join(', '),
                found: foundInOrder.join(', '),
                score: 0,
                maxScore: maxOrderScore
            });
        }
        
        totalScore += orderScore;

        const baseScore = totalScore;
        const baseMaxScore = maxScore;

        const testCaseMaxScore = Array.isArray(problemTestCases)
            ? problemTestCases.reduce((sum, tc) => sum + (tc.score || 1), 0)
            : 0;

        let testCaseScore = 0;

        if (includeTestCases) {
            maxScore += testCaseMaxScore;

            const failedTestCases = [];

            for (let i = 0; i < problemTestCases.length; i++) {
                const testCase = problemTestCases[i];
                
                const liveResult = await testSpecificTestCaseInternal(htmlOutput, testCase, i + 1);
                
                const passed = liveResult.passed;
                const score = liveResult.score; 
                
                totalScore += score;
                testCaseScore += score;

                console.log(`Test Case ${i + 1}: ${passed ? 'PASSED' : 'FAILED'} (ได้ ${score}/${testCase.score||1} คะแนน)`);

                const simulatedOutputs = testCase.outputs.map((o, idx) => ({
                    widget: o.widget,
                    type: 'Unknown',
                    text: o.text || '',
                    value: passed ? o.value : (liveResult.details[idx] || 'Mismatch'), 
                    error: passed ? null : 'Check Failed'
                }));

                testResults.push({
                    index: i + 1,
                    passed: passed,
                    message: passed ? `Test Case ${i + 1}: ✅ ผ่าน` : `Test Case ${i + 1}: ❌ ไม่ผ่าน`,
                    inputs: testCase.inputs,
                    actions: testCase.actions,
                    expected: testCase.outputs,
                    actual: simulatedOutputs,
                    explanation: testCase.explanation || '',
                    score: score,
                    maxScore: liveResult.maxScore || (testCase.score || 1)
                });
                
                if (!passed) {
                    failedTestCases.push({
                       index: i + 1,
                       details: liveResult.details 
                    });
                }
            }

            console.log(`ผลการทดสอบ: ผ่าน ${testResults.filter(r => r.passed).length}/${testResults.length} test cases`);
            if (failedTestCases.length > 0) {
                console.log('Test case ที่ไม่ผ่าน:', failedTestCases);
            } else {
                console.log('ทุก test case ผ่านการทดสอบ');
            }
        }

        // แสดงผลการตรวจ
        previewDiv.innerHTML = `
            <div class="test-results">
                <h3>ผลการตรวจสอบ</h3>
                
                <h4>ผลการตรวจ Widgets (${widgetResults.filter(w => w.found).length}/${widgetResults.length})</h4>
                ${widgetResults.map(w => `
                    <div class="${w.found ? 'test-passed' : 'test-failed'}">
                        <p>${w.type}: <span style="background-color: #007bff; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${w.text}</span> - ${w.found ? '✅ พบ' : '❌ ไม่พบ'}</p>
                        <p>คะแนน: ${w.score}</p>
                    </div>
                `).join('')}
                
                <h4>ผลการตรวจลำดับ Widgets</h4>
                ${orderResults.map(r => `
                    <div class="${r.score > 0 ? 'test-passed' : 'test-failed'}">
                        <p>${r.message}</p>
                        ${r.expected ? `<p><strong>ลำดับที่คาดหวัง:</strong> ${r.expected}</p>` : ''}
                        ${r.found ? `<p><strong>ลำดับที่พบ:</strong> ${r.found}</p>` : ''}
                        <p><strong>คะแนน:</strong> ${r.score}/${r.maxScore}</p>
                    </div>
                `).join('')}
                
                <!-- ปิดการแสดงผลการตรวจ Test Cases -->
                <!--
                <h4>ผลการตรวจ Test Cases (${testResults.filter(r => r.passed).length}/${testResults.length})</h4>
                ${testResults.map(r => `
                    <div class="${r.passed ? 'test-passed' : 'test-failed'}">
                        <h5>${r.message}</h5>
                        
                        <div class="test-case-details">
                            <div class="test-inputs">
                                <strong>📥 Inputs:</strong>
                                <ul>
                                    ${r.inputs.map(input => {
                                        const widgetDef = window.widgetDefinitions.find(w => w.name === input.name);
                                        return `<li>${input.name} (${widgetDef ? widgetDef.type : 'Unknown'}) "${widgetDef ? widgetDef.text : ''}" = "${input.value}"</li>`;
                                    }).join('')}
                                </ul>
                            </div>
                            
                            <div class="test-actions">
                                <strong>🎬 Actions:</strong>
                                <ul>
                                    ${r.actions.map(action => {
                                        const widgetDef = window.widgetDefinitions.find(w => w.name === action.widget);
                                        return `<li>${action.widget} (${widgetDef ? widgetDef.type : 'Unknown'}) "${widgetDef ? widgetDef.text : ''}" → ${action.state}</li>`;
                                    }).join('')}
                                </ul>
                            </div>
                            
                            <div class="test-outputs">
                                <strong>🎯 Expected vs 📤 Actual:</strong>
                                <ul>
                                    ${r.expected.map((expected, idx) => {
                                        const actual = r.actual[idx];
                                        const widgetDef = window.widgetDefinitions.find(w => w.name === expected.widget);
                                        const match = actual && normalizeText(actual.value) === normalizeText(expected.value);
                                        return `
                                            <li class="${match ? 'output-match' : 'output-mismatch'}">
                                                ${expected.widget} (${widgetDef ? widgetDef.type : 'Unknown'}) "${widgetDef ? widgetDef.text : ''}":<br>
                                                Expected: "${expected.value}"<br>
                                                Actual: "${actual ? actual.value : 'N/A'}" ${actual && actual.error ? `(Error: ${actual.error})` : ''}
                                                ${match ? '✅' : '❌'}
                                            </li>
                                        `;
                                    }).join('')}
                                </ul>
                            </div>
                        </div>
                        
                        ${r.explanation ? `<p><strong>💡 คำอธิบาย:</strong> ${r.explanation}</p>` : ''}
                        <p><strong>📊 คะแนน:</strong> ${r.score}/${r.maxScore || 1}</p>
                    </div>
                `).join('')}
                -->
                
                <div class="total-score">
                    <h4>📊 คะแนนรวม: ${totalScore}/${maxScore}</h4>
                </div>
            </div>
        `;

        showSuccess(`ตรวจคำตอบเสร็จสิ้น: ${totalScore}/${maxScore} คะแนน`);
        const passedBase = baseMaxScore > 0 ? baseScore === baseMaxScore : true;
        const passedAll = maxScore > 0 ? totalScore === maxScore : true;
        const passed = includeTestCases ? passedAll : passedBase;
        return { totalScore, maxScore, passed, baseScore, baseMaxScore, testCaseScore, testCaseMaxScore };

    } catch (error) {
        console.error('Error testing GUI code:', error);
        showError('เกิดข้อผิดพลาดในการตรวจคำตอบ: ' + error.message);
        previewDiv.innerHTML = `
            <div class="validation-error">
                ❌ เกิดข้อผิดพลาด: ${error.message}
                <pre class="code-preview code-error">${code}</pre>
            </div>
        `;
        return { totalScore: 0, maxScore: 0, passed: false };
    }
}

// ฟังก์ชันช่วยแปลงโค้ด Python เป็น JavaScript
function convertPythonToJs(pythonCode) {
    let jsCode = pythonCode
        // แปลง global
        .replace(/global\s+[\p{L}\p{N}_]+(?:\s*,\s*[\p{L}\p{N}_]+)*/gu, '')
        // แปลง return หลายค่า (tuples) เป็น array
        .replace(/return\s+([\p{L}\p{N}_0-9\.\(\)\+\-\*\/\s]+(?:\s*,\s*[\p{L}\p{N}_0-9\.\(\)\+\-\*\/\s]+)+)/gu, 'return [$1]')
        // แปลง tuple unpacking ใน assignment
        .replace(/^(\s*)([\p{L}\p{N}_0-9\s]+(?:\s*,\s*[\p{L}\p{N}_0-9\s]+)+)\s*=\s*/gmu, '$1[$2] = ')
        // แปลงการเรียกใช้ .get()
        .replace(/([\p{L}\p{N}_]+)\.get\(\)/gu, 'document.querySelector(\'[data-var="$1"]\').value')
        // แปลงการเรียกใช้ .set(value)
        .replace(/([\p{L}\p{N}_]+)\.set\s*\(\s*(['"]?[^)]+['"]?)\s*\)/gu, (match, varName, value) => {
            return `(function(){ const els = document.querySelectorAll('[data-var="${varName}"]'); els.forEach(el => { if (el.tagName === 'INPUT') el.value = ${value}; else el.textContent = ${value}; }); })()`;
        })
        // แปลงการเรียกใช้ .config(text=...) แบบ f-string
        .replace(/([\p{L}\p{N}_]+)\.config\s*\(\s*text\s*=\s*f['"]([^'"]+)['"]\s*\)/gu, (match, varName, textTemplate) => {
            // แปลง f-string เป็น JavaScript template literal
            const jsTemplate = textTemplate.replace(/{([^}]+)}/g, '${$1}');
            return `(console.log("DEBUG-BRANCH: Executing branch setting " + "${varName}" + " to \`" + \`${jsTemplate}\` + "\` (Current A5=" + (typeof window.A5 !== 'undefined' ? window.A5 : (typeof A5 !== 'undefined' ? A5 : 'undef')) + ")"), document.querySelector('[data-var="${varName}"]').textContent = \`${jsTemplate}\`)`;
        })
        // แปลงการเรียกใช้ .config(text=...) แบบไม่ใช่ f-string
        .replace(/([\p{L}\p{N}_]+)\.config\s*\(\s*text\s*=\s*['"]([^'"]+)['"]\s*\)/gu, 
            '(console.log("DEBUG-BRANCH: Executing branch setting $1 to \'$2\' (Current A5=" + (typeof window.A5 !== \'undefined\' ? window.A5 : (typeof A5 !== \'undefined\' ? A5 : \'undef\')) + ")"), document.querySelector(\'[data-var="$1"]\').textContent = "$2")')
        // แปลงการเรียกใช้ int()
        .replace(/\bint\s*\(/g, 'parseInt(')
        // แปลงการเรียกใช้ float()
        .replace(/\bfloat\s*\(/g, 'parseFloat(')
        // แปลงการเรียกใช้ str()
        .replace(/\bstr\s*\(/g, 'String(')
        // แปลง boolean operators
        .replace(/\band\b/g, '&&')
        .replace(/\bor\b/g, '||')
        .replace(/\bnot\b/g, '!')
        // แปลง booleans
        .replace(/\bTrue\b/g, 'true')
        .replace(/\bFalse\b/g, 'false')
        // แปลง elif
        .replace(/\belif\b/g, 'else if')
        // ลบ colon ท้ายบรรทัดสำหรับบล็อก if/else/for/while
        .replace(/:\s*$/gm, '');

    // Debug: Add logging to return statements
    jsCode = jsCode.replace(/return\s+(.+)/g, (match, p1) => {
        if (p1.trim() === '' || p1.includes('[')) return match; // Skip tuples which were already converted
        return `const _ret = ${p1}; console.log("Return value: ", _ret); return _ret;`;
    });

    return jsCode;
}

// ฟังก์ชันช่วยจำลองการรัน Test Case (ปรับปรุงใหม่)
function simulateTestCase(code, inputs, testCase, parsedWidgets, requiredWidgets) {
    console.log('=== เริ่มจำลอง Test Case ===');
    console.log('Test Case:', testCase);
    
    // สร้าง virtual DOM จาก Generated HTML
    const parser = new DOMParser();
    const { htmlOutput, jsCode } = convertTkinterToHtml(code);
    const doc = parser.parseFromString(htmlOutput, 'text/html');
    
    console.log('Generated HTML:', htmlOutput);
    
    // เก็บผลลัพธ์
    const outputs = [];
    
    try {
        // ขั้นตอนที่ 1: ใส่ค่า inputs ลงใน entry positions ตาม text และ widget
        console.log('--- ขั้นตอนที่ 1: ใส่ค่า inputs ---');
        (testCase.inputs || []).forEach((input, index) => {
            console.log(`Input ${index + 1}:`, input);
            
            // หา widget definition จาก name
            const widgetDef = window.widgetDefinitions.find(w => w.name === input.name);
            if (!widgetDef) {
                console.warn(`ไม่พบ widget definition สำหรับ ${input.name}`);
                return;
            }
            
            console.log(`Widget Definition:`, widgetDef);
            
            // หา widget ใน parsedWidgets ที่ตรงกับ type และ text
            console.log('Looking for widget:', widgetDef.type, 'with text:', widgetDef.text);
            console.log('Available parsedWidgets:', parsedWidgets.map(w => ({type: w.type, text: w.text})));

            const matchingWidgetIndex = parsedWidgets.findIndex(widget => {
                const typeMatch = widget.type === widgetDef.type;
                const textMatch = !widgetDef.text || widget.text === widgetDef.text;
                
                // เพิ่ม debug information
                console.log(`🔍 Debugging widget matching:`);
                console.log(`  Widget from parsedWidgets: type="${widget.type}", text="${widget.text}"`);
                console.log(`  Widget definition: type="${widgetDef.type}", text="${widgetDef.text}"`);
                console.log(`  Type match: ${typeMatch}`);
                console.log(`  Text match: ${textMatch}`);
                console.log(`  Text comparison: "${widget.text}" === "${widgetDef.text}" = ${widget.text === widgetDef.text}`);
                
                return typeMatch && textMatch;
            });
            
            if (matchingWidgetIndex === -1) {
                console.warn(`❌ ไม่พบ widget ที่ตรงกันใน parsedWidgets สำหรับ ${widgetDef.type} "${widgetDef.text}"`);
                console.log(`📋 Available parsedWidgets:`);
                parsedWidgets.forEach((w, i) => {
                    console.log(`  [${i}] type: "${w.type}", text: "${w.text}"`);
                });
                return;
            }
            
            console.log(`พบ widget ที่ตรงกันที่ index ${matchingWidgetIndex}`);
            
            // หา element ใน DOM และใส่ค่า
            const element = doc.querySelector(`[data-index="${matchingWidgetIndex}"]`);
            if (element) {
                if (element.tagName === 'INPUT' && element.type === 'text') {
                    element.value = input.value;
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    console.log(`✅ ใส่ค่า "${input.value}" ลงใน ${widgetDef.type} "${widgetDef.text}"`);
                } else {
                    console.warn(`Element ไม่ใช่ input text: ${element.tagName}`);
                }
            } else {
                console.warn(`ไม่พบ element สำหรับ widget index ${matchingWidgetIndex}`);
            }
        });
        
        // ขั้นตอนที่ 2: ดำเนินการ actions (เช่น การคลิกปุ่ม)
        console.log('--- ขั้นตอนที่ 2: ดำเนินการ actions ---');
        (testCase.actions || []).forEach((action, index) => {
            console.log(`Action ${index + 1}:`, action);
            
            // หา widget definition จาก widget name
            const widgetDef = window.widgetDefinitions.find(w => w.name === action.widget);
            if (!widgetDef) {
                console.warn(`ไม่พบ widget definition สำหรับ ${action.widget}`);
                return;
            }
            
            console.log(`Widget Definition:`, widgetDef);
            
            // หา widget ใน parsedWidgets ที่ตรงกับ type และ text
            console.log('Looking for widget:', widgetDef.type, 'with text:', widgetDef.text);
            console.log('Available parsedWidgets:', parsedWidgets.map(w => ({type: w.type, text: w.text})));

            const matchingWidgetIndex = parsedWidgets.findIndex(widget => {
                const typeMatch = widget.type === widgetDef.type;
                const textMatch = !widgetDef.text || widget.text === widgetDef.text;
                
                // เพิ่ม debug information
                console.log(`🔍 Debugging widget matching:`);
                console.log(`  Widget from parsedWidgets: type="${widget.type}", text="${widget.text}"`);
                console.log(`  Widget definition: type="${widgetDef.type}", text="${widgetDef.text}"`);
                console.log(`  Type match: ${typeMatch}`);
                console.log(`  Text match: ${textMatch}`);
                console.log(`  Text comparison: "${widget.text}" === "${widgetDef.text}" = ${widget.text === widgetDef.text}`);
                
                return typeMatch && textMatch;
            });
            
            if (matchingWidgetIndex === -1) {
                console.warn(`❌ ไม่พบ widget ที่ตรงกันใน parsedWidgets สำหรับ ${widgetDef.type} "${widgetDef.text}"`);
                console.log(`📋 Available parsedWidgets:`);
                parsedWidgets.forEach((w, i) => {
                    console.log(`  [${i}] type: "${w.type}", text: "${w.text}"`);
                });
                return;
            }
            
            console.log(`พบ widget ที่ตรงกันที่ index ${matchingWidgetIndex}`);
            
            // หา element ใน DOM และดำเนินการ action
            const element = doc.querySelector(`[data-index="${matchingWidgetIndex}"]`);
            if (element) {
                if (widgetDef.type === 'Button' && (action.state === 'pressed' || action.state === 'click')) {
                    // จำลองการคลิกปุ่ม
                    element.click();
                    element.dispatchEvent(new Event('click', { bubbles: true }));
                    console.log(`✅ คลิกปุ่ม "${widgetDef.text}"`);
                    
                    // รัน JavaScript code ที่เกี่ยวข้อง
                    if (jsCode) {
                        try {
                            // สร้าง context สำหรับรัน JavaScript
                            // Execute JS code within the context of the parser if possible, or just eval it
                            // Note: scripts appended to DOMParser document are not executed. 
                            // We need to evaluate it in the current window context, but we must be careful with scope.
                            eval(jsCode);
                            console.log('✅ รัน JavaScript code แล้ว');
                        } catch (jsError) {
                            console.warn('เกิดข้อผิดพลาดในการรัน JavaScript:', jsError);
                        }
                    }
                } else if (widgetDef.type === 'Checkbutton') {
                    if (action.state === 'checked' || action.state === 'unchecked') {
                        element.checked = action.state === 'checked';
                        element.dispatchEvent(new Event('change', { bubbles: true }));
                        console.log(`✅ เปลี่ยนสถานะ checkbox "${widgetDef.text}" เป็น ${action.state}`);
                    }
                } else {
                    console.warn(`ไม่รองรับ action สำหรับ ${widgetDef.type} หรือ state ${action.state}`);
                }
            } else {
                console.warn(`ไม่พบ element สำหรับ widget index ${matchingWidgetIndex}`);
            }
        });
        
        // ขั้นตอนที่ 3: ดึงผลลัพธ์ (outputs) จาก widgets ตาม text และ widget
        console.log('--- ขั้นตอนที่ 3: ดึงผลลัพธ์ outputs ---');
        (testCase.outputs || []).forEach((expectedOutput, index) => {
            console.log(`Expected Output ${index + 1}:`, expectedOutput);
            
            // หา widget definition จาก widget name
            const widgetDef = window.widgetDefinitions.find(w => w.name === expectedOutput.widget);
            if (!widgetDef) {
                console.warn(`ไม่พบ widget definition สำหรับ ${expectedOutput.widget}`);
                outputs.push({
                    widget: expectedOutput.widget,
                    value: '',
                    error: 'ไม่พบ widget definition'
                });
                return;
            }
            
            console.log(`Widget Definition:`, widgetDef);
            
            // หา widget ใน parsedWidgets ที่ตรงกับ type และ text
            console.log('Looking for widget:', widgetDef.type, 'with text:', widgetDef.text);
            console.log('Available parsedWidgets:', parsedWidgets.map(w => ({type: w.type, text: w.text})));

            const matchingWidgetIndex = parsedWidgets.findIndex(widget => {
                const typeMatch = widget.type === widgetDef.type;
                const textMatch = !widgetDef.text || widget.text === widgetDef.text;
                
                // เพิ่ม debug information
                console.log(`🔍 Debugging widget matching:`);
                console.log(`  Widget from parsedWidgets: type="${widget.type}", text="${widget.text}"`);
                console.log(`  Widget definition: type="${widgetDef.type}", text="${widgetDef.text}"`);
                console.log(`  Type match: ${typeMatch}`);
                console.log(`  Text match: ${textMatch}`);
                console.log(`  Text comparison: "${widget.text}" === "${widgetDef.text}" = ${widget.text === widgetDef.text}`);
                
                return typeMatch && textMatch;
            });
            
            if (matchingWidgetIndex === -1) {
                console.warn(`ไม่พบ widget ที่ตรงกันใน parsedWidgets สำหรับ ${widgetDef.type} "${widgetDef.text}"`);
                outputs.push({
                    widget: expectedOutput.widget,
                    value: '',
                    error: 'ไม่พบ widget ที่ตรงกัน'
                });
                return;
            }
            
            console.log(`พบ widget ที่ตรงกันที่ index ${matchingWidgetIndex}`);
            
            // หา element ใน DOM และดึงค่า
            const element = doc.querySelector(`[data-index="${matchingWidgetIndex}"]`);
            if (element) {
                let actualValue = '';
                
                if (widgetDef.type === 'Label') {
                    actualValue = element.textContent || element.innerText || '';
                } else if (widgetDef.type === 'Entry') {
                    actualValue = element.value || '';
                } else if (widgetDef.type === 'Button') {
                    actualValue = element.textContent || element.innerText || '';
                } else if (widgetDef.type === 'Checkbutton') {
                    actualValue = element.checked ? 'checked' : 'unchecked';
                } else {
                    actualValue = element.value || element.textContent || element.innerText || '';
                }
                
                actualValue = actualValue.trim();
                
                outputs.push({
                    widget: expectedOutput.widget,
                    value: actualValue
                });
                
                console.log(`✅ ดึงค่าจาก ${widgetDef.type} "${widgetDef.text}": "${actualValue}"`);
            } else {
                console.warn(`ไม่พบ element สำหรับ widget index ${matchingWidgetIndex}`);
                outputs.push({
                    widget: expectedOutput.widget,
                    value: '',
                    error: 'ไม่พบ element'
                });
            }
        });
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการจำลอง test case:', error);
    }
    
    console.log('=== ผลลัพธ์การจำลอง Test Case ===');
    console.log('Outputs:', outputs);
    
    return outputs;
}


// Placeholder สำหรับฟังก์ชันจริง (ต้องปรับตามโจทย์)
function calculate_logic(input) {
    return input; // ตัวอย่างง่ายๆ
}

// เพิ่มฟังก์ชัน enhanceCodeEditor จาก student-problem-detail.js
function enhanceCodeEditor() {
    const codeEditor = document.getElementById('codeEditorTextarea');

    if (!codeEditor) {
        console.error('ไม่พบ codeEditorTextarea');
        return;
    }

    const PYTHON_KEYWORDS = [
        'if', 'elif', 'else:', 'for', 'while', 'def', 'class', 'try:', 'except', 'finally:', 'with'
    ];

    codeEditor.addEventListener('keydown', function (e) {
        if (this.hasAttribute('readonly')) return;

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
            } else if (shouldIndent) {
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
        } else if (e.key === 'Tab') {
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
        } else if (e.key === 'Backspace') {
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
        if (this.hasAttribute('readonly')) return;

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

async function checkEnrollment(classId, userId) {
    if (classId === 'admin') return true;
    try {
        const enrollmentSnapshot = await db.collection('class_enrollments')
            .where('classId', '==', classId)
            .where('studentId', '==', userId)
            .get();

        if (enrollmentSnapshot.empty) {
            alert('คุณไม่ได้ลงทะเบียนในห้องเรียนนี้');
            window.location.href = 'student-dashboard.html';
            return false;
        }
        return true;
    } catch (error) {
        console.error("Error checking enrollment:", error);
        alert('เกิดข้อผิดพลาดในการตรวจสอบการลงทะเบียน');
        return false;
    }
}





const styles = `
.code-editor {
    width: 100%;
    height: 400px;
    font-size: 14px;
    margin-bottom: 20px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.problem-image {
    text-align: center;
    margin: 20px 0;
}

.problem-image img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.content-section {
    margin-bottom: 20px;
    padding: 15px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: #f9f9f9;
}

.content-section h3 {
    margin-top: 0;
    color: #333;
    text-align: center;
    margin-bottom: 15px;
}

/* Container สำหรับวิดีโอหลายๆ อัน */
.videos-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    justify-content: center;
    margin-top: 10px;
}

.video-container {
    position: relative;
    width: 240px;
    height: 135px;
    margin: 0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    border-radius: 8px;
    overflow: hidden;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.video-container:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.video-container iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 8px;
}

.pdf-container {
    border: 1px solid #ddd;
    border-radius: 4px;
    overflow: hidden;
}

.pdf-link {
    padding: 10px;
    background: #fff;
    text-align: center;
    border-top: 1px solid #ddd;
}

.link-container {
    text-align: center;
}

.btn-link {
    display: inline-block;
    padding: 10px 20px;
    background: #007bff;
    color: white;
    text-decoration: none;
    border-radius: 4px;
    transition: background-color 0.3s;
}

.btn-link:hover {
    background: #0056b3;
    color: white;
    text-decoration: none;
}
`;

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);


// เพิ่มฟังก์ชันสำหรับแปลงโค้ด tkinter ก่อนส่งไปตรวจสอบ
function preprocessTkinterCode(code) {
    // ตรวจสอบว่ามีการ import tkinter หรือไม่
    if (code.includes('from tkinter import') || code.includes('import tkinter')) {
        // เพิ่มโค้ดจำลอง tkinter ที่รองรับ event handlers
        const mockTkinterCode = `
# Mock tkinter classes for syntax checking and event simulation
class Tk: 
    def __init__(self): 
        self._widgets = {}
    def title(self, title): pass 
    def geometry(self, size): pass 
    def mainloop(self): pass 
class Frame: 
    def __init__(self, master=None, **kwargs): pass 
    def pack(self, **kwargs): pass 
    def grid(self, **kwargs): pass 
    def place(self, **kwargs): pass 
    def config(self, **kwargs): pass
    def configure(self, **kwargs): return self.config(**kwargs)
class Label: 
    def __init__(self, master=None, **kwargs):
        self.text = kwargs.get('text', '')
    def pack(self, **kwargs): pass 
    def grid(self, **kwargs): pass 
    def place(self, **kwargs): pass 
    def config(self, **kwargs):
        if 'text' in kwargs:
            self.text = kwargs['text']
    def configure(self, **kwargs): return self.config(**kwargs)
class Button: 
    def __init__(self, master=None, **kwargs):
        self.text = kwargs.get('text', '')
        self.command = kwargs.get('command', None)
    def pack(self, **kwargs): pass 
    def grid(self, **kwargs): pass 
    def place(self, **kwargs): pass 
    def config(self, **kwargs):
        if 'command' in kwargs:
            self.command = kwargs['command']
        if 'text' in kwargs:
            self.text = kwargs['text']
    def configure(self, **kwargs): return self.config(**kwargs)
    def invoke(self):
        if self.command:
            self.command()
class Entry: 
    def __init__(self, master=None, **kwargs):
        self.textvariable = kwargs.get('textvariable', None)
    def pack(self, **kwargs): pass 
    def grid(self, **kwargs): pass 
    def place(self, **kwargs): pass 
    def get(self): 
        if self.textvariable:
            return self.textvariable.get()
        return "" 
    def config(self, **kwargs): pass
    def configure(self, **kwargs): return self.config(**kwargs)
class StringVar: 
    def __init__(self, master=None, value=None, name=None):
        self._value = value or ""
    def set(self, value): 
        self._value = value
    def get(self): 
        return self._value
class IntVar: 
    def __init__(self, master=None, value=None, name=None):
        self._value = value or 0
    def set(self, value): 
        self._value = value
    def get(self): 
        return self._value
class DoubleVar: 
    def __init__(self, master=None, value=None, name=None):
        self._value = value or 0.0
    def set(self, value): 
        self._value = value
    def get(self): 
        return self._value
class BooleanVar: 
    def __init__(self, master=None, value=None, name=None):
        self._value = value or False
    def set(self, value): 
        self._value = value
    def get(self): 
        return self._value
class Checkbutton: 
    def __init__(self, master=None, **kwargs): pass 
    def pack(self, **kwargs): pass 
    def grid(self, **kwargs): pass 
    def place(self, **kwargs): pass 
    def config(self, **kwargs): pass
    def configure(self, **kwargs): return self.config(**kwargs)
tk = type('', (), { 
    'Tk': Tk, 
    'Frame': Frame, 
    'Label': Label, 
    'Button': Button, 
    'Entry': Entry, 
    'StringVar': StringVar, 
    'IntVar': IntVar, 
    'DoubleVar': DoubleVar, 
    'BooleanVar': BooleanVar, 
    'Checkbutton': Checkbutton 
}) 
# For direct imports 
IntVar = IntVar 
StringVar = StringVar 
DoubleVar = DoubleVar 
BooleanVar = BooleanVar 
Tk = Tk 
Frame = Frame 
Label = Label 
Button = Button 
Entry = Entry 
Checkbutton = Checkbutton 
# tkinter mocked 
`;

        // แทนที่การ import tkinter ด้วยโค้ดจำลอง
        code = code.replace(/from\s+tkinter\s+import\s+\*/, mockTkinterCode);
        code = code.replace(/import\s+tkinter\s+as\s+tk/, mockTkinterCode);
        code = code.replace(/import\s+tkinter/, mockTkinterCode);
    }

    return code;
}


// Helper function สำหรับรวมโค้ดที่มีการขึ้นบรรทัดใหม่ (Multi-line statements)
function mergeMultiLineStatements(lines) {
    const logicalLines = [];
    let currentRaw = '';
    let currentLine = '';
    let openParens = 0;
    let inString = false;
    let stringChar = '';
    let startLineNum = 1; // เพิ่มตัวแปรเก็บเลขบรรทัดเริ่มต้นของ logical line

    lines.forEach((raw, index) => {
      let line = raw.trim();
      let currentLineNum = index + 1; // เลขบรรทัดจริงๆ (เริ่มจาก 1)

      if (line.startsWith('#') || line === '') return;
      let isLineContinuation = false;
      if (line.endsWith('\\')) {
        line = line.slice(0, -1).trim();
        isLineContinuation = true;
      }

      if (!currentLine) {
        currentRaw = raw; // save the first line's raw indentation
        startLineNum = currentLineNum; // บันทึกบรรทัดที่เริ่มประโยค
      }

      // Count parentheses to detect multi-line statements
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (!inString) {
          if (c === "'" || c === '"') {
            inString = true;
            stringChar = c;
          } else if (c === '(' || c === '[' || c === '{') {
            openParens++;
          } else if (c === ')' || c === ']' || c === '}') {
            openParens--;
          }
        } else {
          if (c === stringChar) {
            if (i === 0 || line[i - 1] !== '\\') {
              inString = false;
              stringChar = '';
            }
          }
        }
      }

      currentLine += (currentLine ? ' ' : '') + line;

      if (openParens <= 0 && !isLineContinuation) {
        logicalLines.push({ raw: currentRaw, line: currentLine, lineNumber: startLineNum });
        currentLine = '';
        currentRaw = '';
        openParens = 0;
        inString = false;
      }
    });

    if (currentLine) {
      logicalLines.push({ raw: currentRaw, line: currentLine, lineNumber: startLineNum });
    }
    
    return logicalLines;
}

function convertTkinterToHtml(code) {
    // ประมวลผลโค้ดก่อนแปลง
    code = preprocessTkinterCode(code);
    
    console.log("Starting convertTkinterToHtml with code:", code.substring(0, 100) + "...");
    const elements = [];
    const widgets = {};
    const variables = {};
    const parsedWidgets = []; // เปลี่ยนจาก object เป็น array
    let widgetCounter = 0;
    let rootVar = 'root'; // Default root variable name
    let rootTitle = 'Tkinter Application'; // Default title
    let hasPackOrGrid = false; // ตรวจสอบว่ามีการใช้ pack/grid/place หรือไม่
    let jsCode = ''; // เพิ่มตัวแปรสำหรับเก็บ JavaScript code

    const rawLines = code.split('\n');
    const logicalLines = mergeMultiLineStatements(rawLines);
    console.log(`Processing ${logicalLines.length} logical lines of code`);
    
    for (const { line: trimmedLine } of logicalLines) {
        if (!trimmedLine) continue;

        try {
        // Find the root variable name (handles spaces before/after parentheses)
        const tkMatch = trimmedLine.match(/^([\p{L}_][\p{L}\p{N}_]*)\s*=\s*(?:tk\.\s*)?Tk\s*\(\s*\)/u);
        if (tkMatch) {
            rootVar = tkMatch[1];
            console.log('Found root variable:', rootVar);
        }
            
            // ตรวจจับชื่อหน้าต่าง (window title)
            if (trimmedLine.match(/\.title\s*\(/)) {
                const titleMatch = trimmedLine.match(/\.title\s*\(\s*['"](.*?)['"]\s*\)/);
                if (titleMatch && titleMatch[1]) {
                    rootTitle = titleMatch[1];
                    console.log('Found window title:', rootTitle);
                }
            }

            // Handle StringVar, IntVar, DoubleVar, BooleanVar
            if (trimmedLine.match(/(?:tk\.\s*)?StringVar\s*\(/) || 
                trimmedLine.match(/(?:tk\.\s*)?IntVar\s*\(/) || 
                trimmedLine.match(/(?:tk\.\s*)?DoubleVar\s*\(/) || 
                trimmedLine.match(/(?:tk\.\s*)?BooleanVar\s*\(/)) {
                
                const varName = trimmedLine.split('=')[0].trim();
                // Fix the regex pattern to properly capture values with quotes
                const valueMatch = trimmedLine.match(/value\s*=\s*['"]([^'"]*)['"]/);
                let varType = 'StringVar';
                
                if (trimmedLine.match(/(?:tk\.\s*)?IntVar\s*\(/)) varType = 'IntVar';
                else if (trimmedLine.match(/(?:tk\.\s*)?DoubleVar\s*\(/)) varType = 'DoubleVar';
                else if (trimmedLine.match(/(?:tk\.\s*)?BooleanVar\s*\(/)) varType = 'BooleanVar';
                
                variables[varName] = { 
                    type: varType, 
                    value: valueMatch ? valueMatch[1] : (varType === 'IntVar' ? '0' : 
                                                        varType === 'DoubleVar' ? '0.0' : 
                                                        varType === 'BooleanVar' ? 'false' : '')
                };
                console.log('Added variable:', varName, variables[varName], 'Raw value match:', valueMatch ? valueMatch[1] : 'no match');
            }

            // Handle Label
            if (trimmedLine.match(/(?:tk\.\s*)?Label\s*\(/)) {
                widgetCounter++;
                const widgetKey = `widget_${widgetCounter}`;
                const varName = trimmedLine.split('=')[0].trim(); // 1. ดึงชื่อตัวแปร
                const text = trimmedLine.match(/text\s*=\s*['"]([^'"]*)['"]/)?.[1] || '';
                const textvariableMatch = trimmedLine.match(/textvariable\s*=\s*([\p{L}_][\p{L}\p{N}_]*)/u);
                const dataVar = textvariableMatch ? textvariableMatch[1] : varName;
                
                const widget = { 
                    type: 'Label', 
                    text, 
                    textvariable: textvariableMatch ? textvariableMatch[1] : null,
                    // 2. ✅ [สำคัญมาก] ต้องเติม data-var="${dataVar}" ตรงนี้ !!
                    // ถ้าไม่มีบรรทัดนี้ ปุ่มกดจะไม่รู้ว่าจะเปลี่ยนข้อความที่ Label ไหน
                    element: `<div id="${widgetKey}" class="tk-label" data-var="${dataVar}" data-index="${widgetCounter - 1}">${text}</div>`,
                    widgetKey,
                    added: false 
                };
                widgets[varName] = widget;
                parsedWidgets.push(widget);
                console.log('Added Label:', varName, widget);
            }

            // Handle Entry widget
            if (trimmedLine.match(/(?:tk\.\s*)?Entry\s*\(/)) {
                console.log('Processing Entry:', trimmedLine);
                widgetCounter++;
                const widgetKey = `widget_${widgetCounter}`;
                const varName = trimmedLine.split('=')[0].trim();
                
                // เพิ่มการตรวจสอบ textvariable
                const textvariableMatch = trimmedLine.match(/textvariable\s*=\s*([\p{L}_][\p{L}\p{N}_]*)/u); 
                let placeholderText = '';
                
                if (textvariableMatch && textvariableMatch[1]) {
                    const textvariableName = textvariableMatch[1];
                    console.log('Found textvariable:', textvariableName, 'Value:', variables[textvariableName] ? variables[textvariableName].value : 'undefined');
                    
                    if (variables[textvariableName] && variables[textvariableName].value !== undefined) {
                        placeholderText = variables[textvariableName].value;
                        console.log('Setting Entry value to:', placeholderText);
                    }
                }
                
                // ดึง text จาก comment หรือ label ที่อยู่ใกล้เคียง
                const textMatch = trimmedLine.match(/text\s*=\s*['"]([ ^'"]*)['"]/) || 
                                 trimmedLine.match(/#\s*(.+)$/) || // จาก comment
                                 ['', '']; // default
                const entryText = textMatch[1] || '';
                
                // เพิ่มการตรวจสอบ command (ถ้ามี)
                const commandMatch = trimmedLine.match(/command\s*=\s*(lambda\s*:.*?\(.*?\)|lambda\s*:.*?(?=[,)])|[\p{L}_][\p{L}\p{N}_]*)/u); 
                
                const widget = {
                    type: 'Entry',
                    text: placeholderText || entryText,
                    command: commandMatch ? (commandMatch[1].startsWith("lambda") ? (() => {
                        const lambdaFuncMatch = commandMatch[1].match(/lambda\s*:\s*([\p{L}_][\p{L}\p{N}_]*)\s*\(/u);
                        const lambdaArgsMatch = commandMatch[1].match(/lambda\s*:\s*[\p{L}_][\p{L}\p{N}_]*\s*\(\s*(.*?)\s*\)/u);
                        if (lambdaFuncMatch) {
                            let args = lambdaArgsMatch && lambdaArgsMatch[1] ? lambdaArgsMatch[1] : '';
                            return `${lambdaFuncMatch[1]}(${args})`;
                        }
                        return "lambda_func";
                    })() : commandMatch[1]) : null,
                    textvariable: textvariableMatch ? textvariableMatch[1] : null,
                    element: `<input type="text" class="tk-entry" id="${widgetKey}" value="${placeholderText}" data-var="${textvariableMatch ? textvariableMatch[1] : varName}" data-index="${widgetCounter - 1}">`,
                    widgetKey,
                    added: false
                };
                widgets[varName] = widget;
                parsedWidgets.push(widget); // เพิ่มใน parsedWidgets เป็น array
                console.log('Added Entry:', varName, widget);
            }

            // Handle Button
            if (trimmedLine.match(/(?:tk\.\s*)?Button\s*\(/)) {
                widgetCounter++;
                const widgetKey = `widget_${widgetCounter}`;
                const varName = trimmedLine.split('=')[0].trim();
                const textMatch = trimmedLine.match(/text\s*=\s*['"]([^'"]*)['"]/);
                const text = textMatch ? textMatch[1] : 'Button';
                const commandMatch = trimmedLine.match(/command\s*=\s*(lambda\s*:.*?\(.*?\)|lambda\s*:.*?(?=[,)])|[\p{L}_][\p{L}\p{N}_]*)/u);
                
                console.log('Parsing Button line:', trimmedLine);
                console.log('Button text match:', text);
                console.log('Button command match:', commandMatch ? commandMatch[1] : 'none');
                
                const widget = {
                    type: 'Button',
                    text,
                    command: commandMatch ? (commandMatch[1].startsWith("lambda") ? (() => {
                        const lambdaFuncMatch = commandMatch[1].match(/lambda\s*:\s*([\p{L}_][\p{L}\p{N}_]*)\s*\(/u);
                        const lambdaArgsMatch = commandMatch[1].match(/lambda\s*:\s*[\p{L}_][\p{L}\p{N}_]*\s*\(\s*(.*?)\s*\)/u);
                        if (lambdaFuncMatch) {
                            let args = lambdaArgsMatch && lambdaArgsMatch[1] ? lambdaArgsMatch[1] : '';
                            return `${lambdaFuncMatch[1]}(${args})`;
                        }
                        return "lambda_func";
                    })() : commandMatch[1]) : null,
                    element: `<button id="${widgetKey}" class="tk-button" data-index="${widgetCounter - 1}" data-var="${varName}">${text}</button>`,
                    widgetKey,
                    added: false
                };
                widgets[varName] = widget;
                parsedWidgets.push(widget); // เพิ่มใน parsedWidgets เป็น array
                console.log('Added Button:', varName, widget);
            }

            // Handle Checkbutton
            if (trimmedLine.match(/(?:tk\.\s*)?Checkbutton\s*\(/)) {
                widgetCounter++;
                const widgetKey = `widget_${widgetCounter}`;
                const varName = trimmedLine.split('=')[0].trim();
                
                console.log('Parsing Checkbutton line:', trimmedLine);
                
                const text = trimmedLine.match(/text\s*=\s*['"]([^'"]*)['"]/)?.[1] || '';
                const commandMatch = trimmedLine.match(/command\s*=\s*(lambda\s*:.*?\(.*?\)|lambda\s*:.*?(?=[,)])|[\p{L}_][\p{L}\p{N}_]*)/u);
                const variableMatch = trimmedLine.match(/variable\s*=\s*([\p{L}_][\p{L}\p{N}_]*)/u);
                const onvalueMatch = trimmedLine.match(/onvalue\s*=\s*([0-9]+)/);
                const offvalueMatch = trimmedLine.match(/offvalue\s*=\s*([0-9]+)/);
                
                console.log('Checkbutton text:', text);
                console.log('Checkbutton variable match:', variableMatch ? variableMatch[1] : 'none');
                console.log('Checkbutton onvalue:', onvalueMatch ? onvalueMatch[1] : '1');
                console.log('Checkbutton offvalue:', offvalueMatch ? offvalueMatch[1] : '0');
                
                const onvalue = onvalueMatch ? onvalueMatch[1] : '1';
                const offvalue = offvalueMatch ? offvalueMatch[1] : '0';
                
                const checked = variableMatch && variables[variableMatch[1]] && 
                               (variables[variableMatch[1]].value === 'true' || 
                                parseInt(variables[variableMatch[1]].value) > 0);
                
                const widget = {
                    type: 'Checkbutton',
                    text,
                    command: commandMatch ? (commandMatch[1].startsWith("lambda") ? (() => {
                        const lambdaFuncMatch = commandMatch[1].match(/lambda\s*:\s*([\p{L}_][\p{L}\p{N}_]*)\s*\(/u);
                        const lambdaArgsMatch = commandMatch[1].match(/lambda\s*:\s*[\p{L}_][\p{L}\p{N}_]*\s*\(\s*(.*?)\s*\)/u);
                        if (lambdaFuncMatch) {
                            let args = lambdaArgsMatch && lambdaArgsMatch[1] ? lambdaArgsMatch[1] : '';
                            return `${lambdaFuncMatch[1]}(${args})`;
                        }
                        return "lambda_func";
                    })() : commandMatch[1]) : null,
                    variable: variableMatch ? variableMatch[1] : null,
                    onvalue: onvalue,
                    offvalue: offvalue,
                    element: `<div class="tk-checkbox"><input type="checkbox" id="${widgetKey}" ${checked ? 'checked' : ''} data-index="${widgetCounter - 1}"><label for="${widgetKey}">${text}</label></div>`,
                    widgetKey,
                    added: false
                };
                widgets[varName] = widget;
                parsedWidgets.push(widget); // เพิ่มใน parsedWidgets เป็น array
                console.log('Added Checkbutton:', varName, widget);
            }

            // Handle pack/grid/place
            if (trimmedLine.match(/\.pack\s*\(/) || trimmedLine.match(/\.grid\s*\(/) || trimmedLine.match(/\.place\s*\(/)) {
                hasPackOrGrid = true;
                const widgetName = trimmedLine.split('.')[0].trim();
                console.log('Processing layout for widget:', widgetName);
                
                if (widgets[widgetName] && !widgets[widgetName].added) {
                    elements.push(widgets[widgetName].element);
                    widgets[widgetName].added = true;
                    console.log('Added element to display:', widgetName);
                } else if (!widgets[widgetName]) {
                    console.warn(`Widget ${widgetName} not found for layout`);
                } else {
                    console.warn(`Widget ${widgetName} already added to layout`);
                }
            }
        } catch (err) {
            console.error('Error parsing line:', trimmedLine, err);
            elements.push(`<div style="color:red;">Error: ${trimmedLine}</div>`);
        }
    }

    // ถ้าไม่มีการใช้ pack/grid/place เลย ให้แสดง widget ทั้งหมดที่สร้างไว้
    if (!hasPackOrGrid) {
        console.log('No pack/grid/place found, showing all widgets');
        for (const widgetName in widgets) {
            if (!widgets[widgetName].added) {
                elements.push(widgets[widgetName].element);
                widgets[widgetName].added = true;
                console.log('Auto-added element to display:', widgetName);
            }
        }
    }

    // ตรวจสอบว่ามี widgets ที่ไม่ได้ถูกเพิ่มหรือไม่
    for (const widgetName in widgets) {
        if (!widgets[widgetName].added) {
            console.warn(`Widget ${widgetName} was not added to the layout`);
        }
    }

    // Add CSS for better display
    const css = `
<style>
    .gui-preview {
        margin: 20px auto !important;
        max-width: 100% !important;
        background-color: #ffffff !important;
        border: none !important;
        box-shadow: none !important;
    }
    
    .tk-window {
        border: 1px solid #ccc !important;
        padding: 20px !important;
        width: 400px !important;
        max-width: 100% !important;
        margin: 0 auto !important;
        background-color: #ffffff !important;
        border-radius: 5px !important;
        font-family: Arial, sans-serif !important;
        position: relative !important;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1) !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
    }
    .tk-title-bar {
        background-color: #e0e0e0 !important;
        padding: 5px 10px !important;
        text-align: center !important;
        font-weight: bold !important;
        border-bottom: 1px solid #ccc !important;
        margin: -20px -20px 15px -20px !important;
        border-radius: 5px 5px 0 0 !important;
        position: relative !important;
        width: 100% !important; /* Ensure full width */
        box-sizing: border-box !important; /* Include padding in width calculation */
        align-self: stretch !important;
    }
    .tk-title {
        display: inline-block !important;
        margin: 0 !important;
        font-size: 14px !important;
    }
    .tk-label {
        width: 100% !important;
        text-align: center !important;
        margin: 8px 0 !important;
        color: #111827 !important;
        font-size: 14px !important;
    }
    .tk-entry {
        width: min(320px, 100%) !important;
        margin: 8px auto !important;
        display: block !important;
        padding: 10px 12px !important;
        border-radius: 10px !important;
        border: 1px solid #cbd5e1 !important;
        outline: none !important;
        box-sizing: border-box !important;
        font-size: 14px !important;
    }
    .tk-entry:focus {
        border-color: #7c3aed !important;
        box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.18) !important;
    }
    .tk-button {
        margin: 10px auto !important;
        padding: 10px 16px !important;
        border-radius: 12px !important;
        border: 1px solid rgba(124, 58, 237, 0.28) !important;
        background: linear-gradient(135deg, #7c3aed, #5b21b6) !important;
        color: #ffffff !important;
        cursor: pointer !important;
        font-weight: 700 !important;
        font-size: 14px !important;
        box-shadow: 0 10px 22px rgba(124, 58, 237, 0.22) !important;
    }
    .tk-button:hover {
        filter: brightness(1.05) !important;
    }
    /* Removed window controls CSS */
</style>
`;

    // หาฟังก์ชันทั้งหมดในโค้ด Python
     // หาปุ่มและเชื่อมโยงกับฟังก์ชัน
     const functionRegex = /(?:^|\n)def\s+([\p{L}\p{N}_]+)\s*\(([^)]*)\)\s*:\s*([\s\S]*?)(?=\n\S|$)/gu;
    let match;
    while ((match = functionRegex.exec(code)) !== null) {
        const functionName = match[1];
        const functionArgs = match[2];
        const functionBody = match[3];
        
        // แปลงฟังก์ชัน Python เป็น JavaScript
        let jsFunction = `
        function ${functionName}(${functionArgs}) {
            console.log("เรียกใช้ฟังก์ชัน ${functionName}");
            try {
                ${convertPythonToJs(functionBody)}
            } catch (error) {
                console.error("เกิดข้อผิดพลาดในฟังก์ชัน ${functionName}:", error);
                return 0; // Fallback for numeric operations
            }
        }
        // Expose globally
        window.${functionName} = ${functionName};
        `;
        
        jsCode += jsFunction;
    }
    
    // หาปุ่มและเชื่อมโยงกับฟังก์ชัน
    const buttonRegex = /([\p{L}\p{N}_]+)\s*=\s*(?:tk\.\s*)?Button\s*\((.*)\)/gu;
    const commandRegex = /([\p{L}\p{N}_]+)\.(config|configure)\s*\(\s*[^)]*?command\s*=\s*(lambda\s*:[^)]*?\(.*?\)|lambda\s*:[^)]*?(?=[,)])|[\p{L}_][\p{L}\p{N}_]*)/gu;
    const directCommandRegex = /([\p{L}\p{N}_]+)\s*=\s*(?:tk\.\s*)?Button\s*\([^)]*?command\s*=\s*(lambda\s*:[^)]*?\(.*?\)|lambda\s*:[^)]*?(?=[,)])|[\p{L}_][\p{L}\p{N}_]*)[^)]*?\)/gu;
    
    let buttonMatch;
    while ((buttonMatch = buttonRegex.exec(code)) !== null) {
        const buttonVar = buttonMatch[1];
        const textMatch = buttonMatch[2].match(/text\s*=\s*['"]([^'"]+)['"]/);
        const buttonText = textMatch ? textMatch[1] : 'Button';
        
        // หาฟังก์ชันที่เชื่อมโยงกับปุ่ม (จากการใช้ config/configure)
        let commandMatch;
        commandRegex.lastIndex = 0;
        let functionName = null;
        
        while ((commandMatch = commandRegex.exec(code)) !== null) {
            if (commandMatch[1] === buttonVar) {
                functionName = commandMatch[3].trim();
                if (functionName.startsWith("lambda")) {
                    const lambdaFuncMatch = functionName.match(/lambda\s*:\s*([\p{L}_][\p{L}\p{N}_]*)\s*\(/u);
                    const lambdaArgsMatch = functionName.match(/lambda\s*:\s*[\p{L}_][\p{L}\p{N}_]*\s*\(\s*(.*?)\s*\)/u);
                    if (lambdaFuncMatch) {
                        let args = lambdaArgsMatch && lambdaArgsMatch[1] ? lambdaArgsMatch[1] : '';
                        functionName = `${lambdaFuncMatch[1]}(${args})`;
                    }
                    else if (functionName.includes('destroy') || functionName.includes('quit')) functionName = 'lambda_func';
                    else functionName = 'lambda_func';
                }
                // Update widget command in widgets dictionary
                if (widgets[buttonVar]) {
                    widgets[buttonVar].command = functionName;
                }
                break;
            }
        }
        
        // หาฟังก์ชันที่เชื่อมโยงกับปุ่ม (จากการกำหนดตรงใน constructor)
        if (!functionName) {
            directCommandRegex.lastIndex = 0;
            while ((commandMatch = directCommandRegex.exec(code)) !== null) {
                if (commandMatch[1] === buttonVar) {
                    functionName = commandMatch[2].trim();
                    if (functionName.startsWith('lambda')) {
                        const lambdaFuncMatch = functionName.match(/lambda\s*:\s*([\p{L}_][\p{L}\p{N}_]*)\s*\(/u);
                        const lambdaArgsMatch = functionName.match(/lambda\s*:\s*[\p{L}_][\p{L}\p{N}_]*\s*\(\s*(.*?)\s*\)/u);
                        if (lambdaFuncMatch) {
                            let args = lambdaArgsMatch && lambdaArgsMatch[1] ? lambdaArgsMatch[1] : '';
                            functionName = `${lambdaFuncMatch[1]}(${args})`;
                        }
                        else if (functionName.includes('destroy') || functionName.includes('quit')) functionName = 'lambda_func';
                        else functionName = 'lambda_func';
                    }
                    // Update widget command in widgets dictionary
                    if (widgets[buttonVar]) {
                        widgets[buttonVar].command = functionName;
                    }
                    break;
                }
            }
        }
        
        if (functionName) {
            // Determine just the function name for checking typeof
            const baseFuncName = functionName.split('(')[0];
            
            // เพิ่ม event listener ให้กับปุ่ม
            jsCode += `
            // เชื่อมโยงปุ่ม ${buttonVar} กับฟังก์ชัน ${functionName}
            setTimeout(() => {
                const button = document.querySelector('button[data-var="${buttonVar}"]');
                if (button) {
                    console.log("พบปุ่ม ${buttonVar}");
                    button.addEventListener('click', function() {
                        console.log("คลิกปุ่ม ${buttonVar}");
                        if ("${functionName}" === "lambda_func") {
                            const win = document.querySelector('.tk-window');
                            if (win) {
                                win.style.display = 'none';
                                console.log("Window closed by lambda");
                            }
                        } else if (typeof ${baseFuncName} === "function") {
                            ${functionName.includes('(') ? functionName : functionName + '()'};
                        }
                    });
                } else {
                    console.warn("ไม่พบปุ่ม ${buttonVar} (อาจถูกแทนที่ด้วยผลตรวจแล้ว)");
                }
            }, 50);
            `;
        }
    }
    
    // สร้าง HTML และ script สำหรับจำลองการทำงาน
    let script = '';
    
    // ตรวจสอบว่ามี Button หรือ Checkbutton ที่มี command หรือไม่
    const interactiveWidgets = Object.values(widgets).filter(
        w => ['Button', 'Checkbutton'].includes(w.type) && w.command
    );
    
    console.log(`Found ${interactiveWidgets.length} interactive widgets with commands`);
    
    for (const widget of interactiveWidgets) {
        const funcName = widget.command;
        const widgetKey = widget.widgetKey;
        const baseFuncName = funcName.split('(')[0];
        
        console.log(`Creating event listener for ${widget.type} with ID ${widgetKey} and command ${funcName}`);
        
        script += `
            // เพิ่ม event listener สำหรับ ${widget.type} ${widget.widgetKey}
            setTimeout(() => {
                console.log('DOM loaded, looking for element with ID: ${widgetKey}');
                const element = document.getElementById('${widgetKey}');
                if (element) {
                    console.log('Found element with ID: ${widgetKey}');
                    element.addEventListener('click', function() {
                        console.log('${widget.type} ${widgetKey} clicked, executing command: ${funcName}');
                        ${funcName === 'lambda_func' ?
                            `const win = document.querySelector('.tk-window');
                             if(win) win.style.display = 'none';` :
                            `if (typeof ${baseFuncName} === 'function') { ${funcName.includes('(') ? funcName : funcName + '()' }; }`
                        }
                    });
                } else {
                    console.error('Element with ID ${widgetKey} not found');
                }
            }, 50);
        `;
    }

    const htmlOutput = `
         ${css}
    <div class="tk-window">
        <div class="tk-title-bar">
            <div class="tk-title">${rootTitle}</div>
        </div>
        ${elements.length > 0 ? elements.join('') : '<div class="tk-label">ไม่พบ widget ที่แสดงได้</div>'}
    </div>
    <script>
    ${jsCode}
    ${script}
    </script>
`;

    console.log(`Generated HTML with ${elements.length} elements and ${Object.keys(widgets).length} widgets`);
    return {
        htmlOutput,
        widgets: parsedWidgets, // คืนค่าเป็น array
        jsCode // เพิ่ม JavaScript code ในผลลัพธ์
    };
}




let problemData = {}; // ตัวแปร global เพื่อเก็บข้อมูลโจทย์ทั้งหมด (รวม widgets)
let problemTestCases = []; // ตัวแปร global เพื่อเก็บ Test Cases
let guiBaseResult = { score: 0, maxScore: 0, passed: false };
let guiTestCaseBonus = { score: 0, maxScore: 0 };

// เพิ่มฟังก์ชันคำนวณคะแนนเต็มจาก testcase ทั้งหมด
// ✅ [FIX] แก้ให้คำนวณคะแนนเต็มจากทุกส่วน (Widget + Order + Testcase)
function calculateMaxScore(includeTestCases = true) {
    let maxScore = 0;
    
    // 1. คะแนนจาก Widget (จาก problemData.widgets)
    if (problemData.widgets && Array.isArray(problemData.widgets)) {
        maxScore += problemData.widgets.reduce((sum, w) => sum + (w.score || 1), 0);
        
        // บวกคะแนน Order (ลำดับ) เพิ่มไปอีก 5 คะแนน (ตาม Logic เดิมใน testGUICode)
        // เงื่อนไข: ต้องมี widget อย่างน้อย 2 ตัวถึงจะมีคะแนนส่วนนี้
        if (problemData.widgets.length >= 2) {
            maxScore += 5; 
        }
    }

    // 2. คะแนนจาก Test Cases (จาก problemData.testCases)
    if (includeTestCases && problemData.testCases && Array.isArray(problemData.testCases)) {
        maxScore += problemData.testCases.reduce((sum, tc) => sum + (tc.score || 1), 0);
    }
    
    return maxScore > 0 ? maxScore : 0;
}

// ฟังก์ชันอัปเดตการแสดงคะแนน
function updateScoreDisplay(currentScore = 0, maxScore = null) {
    if (maxScore === null) {
        maxScore = calculateMaxScore(true);
    }
    
    const currentScoreElement = document.getElementById('currentScore');
    const maxScoreElement = document.getElementById('maxScore');
    const scorePercentageElement = document.getElementById('scorePercentage');
    const scoreContainer = document.querySelector('.score-container');
    
    if (currentScoreElement && maxScoreElement && scorePercentageElement) {
        currentScoreElement.textContent = currentScore;
        maxScoreElement.textContent = maxScore;
        
        const percentage = maxScore > 0 ? Math.round((currentScore / maxScore) * 100) : 0;
        scorePercentageElement.textContent = `${percentage}%`;
        
        // เปลี่ยนสีตามเปอร์เซ็นต์
        scoreContainer.classList.remove('perfect', 'good', 'poor');
        if (percentage >= 90) {
            scoreContainer.classList.add('perfect');
        } else if (percentage >= 70) {
            scoreContainer.classList.add('good');
        } else {
            scoreContainer.classList.add('poor');
        }
        
        // เพิ่ม animation เมื่ออัปเดต
        scoreContainer.classList.add('updated');
        setTimeout(() => {
            scoreContainer.classList.remove('updated');
        }, 500);
    }
}

async function loadGUIProblem(problemId, userId, classId, viewMode) {
    try {
        const problemDoc = await db.collection('problems').doc(problemId).get();

        if (!problemDoc.exists) {
            showError('ไม่พบโจทย์ที่ต้องการ');
            return;
        }

        problemData = problemDoc.data(); // เก็บข้อมูลโจทย์ทั้งหมดในตัวแปร global
        problemTestCases = problemData.testCases || []; // เก็บ Test Cases โดยให้เป็น array ว่างถ้าไม่มี

        // เรียกใช้ loadProblemConfig เพื่อตั้งค่า window.widgetDefinitions และ window.guiTestCases
        await loadProblemConfig(problemId);

        // ✅ [FIX] ดึงข้อมูล text จาก "เฉลย" (Solution Code) มาเติมให้ Widgets
        if (problemData.solutionCode) {
            try {
                const solResult = convertTkinterToHtml(problemData.solutionCode);
                const solWidgets = solResult.widgets || [];
                
                if (problemData.widgets && Array.isArray(problemData.widgets)) {
                    problemData.widgets = problemData.widgets.map((w, idx) => {
                        let solText = "";
                        // พยายามหา widget ในเฉลยที่ตรงกับความต้องการ
                        // รอบที่ 1: หาตาม index (ถ้าลำดับการสร้างตรงกัน)
                        if (solWidgets[idx] && solWidgets[idx].type === w.type) {
                            solText = solWidgets[idx].text;
                        } else {
                            // รอบที่ 2: หาตัวแรกที่ type ตรงกัน
                            const match = solWidgets.find(sw => sw.type === w.type && !sw._matched);
                            if (match) {
                                solText = match.text;
                                match._matched = true; // ทำเครื่องหมายว่าถูกใช้แล้ว
                            }
                        }

                        const def = (window.widgetDefinitions || []).find(d => d.name === w.name);
                        let finalText = w.text;
                        
                        // ลำดับความสำคัญของ Text: 
                        // 1. จาก requirement โดยตรง (ถ้าไม่ใช่ "ไม่มีข้อความ")
                        // 2. จาก widgetDefinitions (ที่ครูอาจจะแก้ในหน้า Admin)
                        // 3. จากการแกะโค้ดเฉลย (Solution Code)
                        if (!finalText || finalText === 'ไม่มีข้อความ') {
                            if (def && def.text && def.text !== 'ไม่มีข้อความ') {
                                finalText = def.text;
                            } else {
                                finalText = solText;
                            }
                        }
                        
                        return { ...w, text: finalText || 'ไม่มีข้อความ' };
                    });
                }
            } catch (e) {
                console.error("Error parsing solution for widgets:", e);
            }
        }

        
        // Ensure the problem is of type 'gui'
        if (problemData.type !== 'gui') {
            showError('โจทย์นี้ไม่ใช่โจทย์ GUI');
            return;
        }

        // แสดงคะแนนเต็มทันทีหลังโหลดโจทย์
        const maxScore = calculateMaxScore(true);
        const testCaseMaxScore = Array.isArray(problemData.testCases)
            ? problemData.testCases.reduce((sum, tc) => sum + (tc.score || 1), 0)
            : 0;
        guiBaseResult = { score: 0, maxScore: 0, passed: false };
        guiTestCaseBonus = { score: 0, maxScore: testCaseMaxScore };
        updateScoreDisplay(0, maxScore);

        // Display basic problem info
        document.getElementById('problemTitle').textContent = problemData.title || 'ไม่มีชื่อโจทย์';
        
        // Display problem description with additional content
        const descriptionElement = document.getElementById('problemDescription');
        if (descriptionElement) {
            let descriptionHTML = problemData.description || 'ไม่มีคำอธิบาย';
            
            // เพิ่มรูปภาพหรือสื่อถ้ามี
            if (problemData.image) {
                descriptionHTML = `
                    <div class="problem-media" style="margin-bottom: 15px;">
                        <button type="button" class="media-cta-btn" onclick="openMediaModal('${problemData.image}')">
                            <span class="media-cta-icon" aria-hidden="true">📘</span>
                            <span class="media-cta-text">สื่อประกอบการเรียน</span>
                            <span class="media-cta-hint">แตะเพื่อเปิด</span>
                        </button>
                    </div>
                    ${descriptionHTML}
                `;
            }

            if (problemData.attachments) {
            descriptionHTML += renderAttachmentsHTML(problemData.attachments);
            }
            
            // แสดง URL เนื้อหาเพิ่มเติมหลายรายการ
            if (problemData.contentUrls && problemData.contentUrls.length > 0) {
                // แยกวิดีโอออกจากเนื้อหาอื่นๆ
                const videos = problemData.contentUrls.filter(urlItem => {
                    const { url } = urlItem;
                    return url.includes('youtube.com') || url.includes('youtu.be');
                });
                
                const otherContent = problemData.contentUrls.filter(urlItem => {
                    const { url } = urlItem;
                    return !(url.includes('youtube.com') || url.includes('youtu.be'));
                });
                
                let urlsHtml = '';
                
                // แสดงวิดีโอทั้งหมดในกริด
                if (videos.length > 0) {
                    const videosHtml = videos.map(urlItem => {
                        const { title, url } = urlItem;
                        let videoId = '';
                        if (url.includes('youtube.com/watch?v=')) {
                            videoId = url.split('v=')[1].split('&')[0];
                        } else if (url.includes('youtu.be/')) {
                            videoId = url.split('youtu.be/')[1].split('?')[0];
                        }
                        
                        if (videoId) {
                            return `
                                <div class="video-container">
                                    <iframe width="240" height="135" 
                                            src="https://www.youtube.com/embed/${videoId}" 
                                            frameborder="0" 
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                            allowfullscreen
                                            title="${title || 'วิดีโอประกอบ'}">
                                    </iframe>
                                </div>
                            `;
                        }
                        return '';
                    }).filter(html => html !== '').join('');
                    
                    if (videosHtml) {
                        urlsHtml += `
                            <div class="content-section">
                                <h3>📹 วิดีโอประกอบ</h3>
                                <div class="videos-grid">
                                    ${videosHtml}
                                </div>
                            </div>
                        `;
                    }
                }
                
                // แสดงเนื้อหาอื่นๆ
                const otherContentHtml = otherContent.map(urlItem => {
                    const { title, url, type } = urlItem;
                    let contentHTML = '';
                    
                    if (url.toLowerCase().includes('.pdf') || type === 'pdf') {
                        // แสดง PDF
                        contentHTML = `
                            <div class="content-section">
                                <h3>📄 ${title || 'เอกสารประกอบ'}</h3>
                                <div class="pdf-container">
                                    <iframe src="${url}" width="100%" height="500px" frameborder="0">
                                        <p>เบราว์เซอร์ของคุณไม่สามารถแสดง PDF ได้ 
                                           <a href="javascript:void(0);" onclick="openMediaModal('${url}')">คลิกที่นี่เพื่อเปิดหน้าต่าง</a>
                                        </p>
                                    </iframe>
                                    <div class="pdf-link">
                                    <a href="javascript:void(0);" onclick="openMediaModal('${url}')" class="btn-link">🔗 เปิดหน้าต่างเพื่อดูลิงก์</a>
                                    </div>
                                </div>
                            </div>
                        `;
                    } else {
                        // แสดงลิงก์ทั่วไป
                        contentHTML = `
                            <div class="content-section">
                                <h3>🔗 ${title || 'เนื้อหาเพิ่มเติม'}</h3>
                                <div class="link-container">
                                    <a href="javascript:void(0);" onclick="openMediaModal('${url}')" class="btn-link">เปิดหน้าต่างเพื่อดูลิงก์</a>
                                </div>
                            </div>
                        `;
                    }
                    
                    return contentHTML;
                }).join('');
                
                urlsHtml += otherContentHtml;
                descriptionHTML = `${descriptionHTML}${urlsHtml}`;
            }
            // รองรับข้อมูลเก่าที่ยังใช้ contentUrl เดียว (Backward Compatibility)
            else if (problemData.contentUrl) {
                const url = problemData.contentUrl;
                let contentHTML = '';
                
                if (url.includes('youtube.com') || url.includes('youtu.be')) {
                    // แสดง YouTube video
                    let videoId = '';
                    if (url.includes('youtube.com/watch?v=')) {
                        videoId = url.split('v=')[1].split('&')[0];
                    } else if (url.includes('youtu.be/')) {
                        videoId = url.split('youtu.be/')[1].split('?')[0];
                    }
                    
                    if (videoId) {
                        contentHTML = `
                            <div class="content-section">
                                <h3>📹 วิดีโอประกอบ</h3>
                                <div class="video-container">
                                    <iframe width="240" height="135" 
                                            src="https://www.youtube.com/embed/${videoId}" 
                                            frameborder="0" 
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                            allowfullscreen>
                                    </iframe>
                                </div>
                            </div>
                        `;
                    }
                } else if (url.toLowerCase().includes('.pdf')) {
                    // แสดง PDF
                    contentHTML = `
                        <div class="content-section">
                            <h3>📄 เอกสารประกอบ</h3>
                            <div class="pdf-container">
                                <iframe src="${url}" width="100%" height="500px" frameborder="0">
                                    <p>เบราว์เซอร์ของคุณไม่สามารถแสดง PDF ได้ 
                                       <a href="javascript:void(0);" onclick="openMediaModal('${url}')">คลิกที่นี่เพื่อเปิดหน้าต่าง</a>
                                    </p>
                                </iframe>
                                <div class="pdf-link">
                                    <a href="javascript:void(0);" onclick="openMediaModal('${url}')" class="btn-link">🔗 เปิดหน้าต่างเพื่อดูลิงก์</a>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    // แสดงลิงก์ทั่วไป
                    contentHTML = `
                        <div class="content-section">
                            <h3>🔗 เนื้อหาเพิ่มเติม</h3>
                            <div class="link-container">
                                <a href="javascript:void(0);" onclick="openMediaModal('${url}')" class="btn-link">เปิดหน้าต่างเพื่อดูลิงก์</a>
                            </div>
                        </div>
                    `;
                }
                
                descriptionHTML = `${descriptionHTML}${contentHTML}`;
            }
            
            descriptionElement.innerHTML = descriptionHTML;
        }

        // Display GUI image if available
        const guiImagePreview = document.getElementById('guiImagePreview');
        if (problemData.guiImage) {
            guiImagePreview.innerHTML = `
                <button type="button" class="image-toggle-btn" onclick="toggleImageSize()">ขยายภาพ</button>
                <img src="${problemData.guiImage}" alt="ภาพประกอบ GUI" onclick="toggleImageSize()" onerror="this.parentElement.style.display='none'">
            `;
            guiImagePreview.style.display = 'block';
            // เริ่มต้นแบบย่อเพื่อให้ไม่บังโจทย์
            guiImagePreview.classList.add('collapsed');
        } else {
            guiImagePreview.style.display = 'none';
            guiImagePreview.innerHTML = '';
        }

        // Display widgets (แทน requirements) if available
        if (problemData.widgets && Array.isArray(problemData.widgets)) {
            displayWidgets(problemData.widgets); // เปลี่ยนจาก displayRequirements เป็น displayWidgets
        } else {
            document.getElementById('requirementsList').innerHTML = '<p>ไม่มี Widgets ระบุ</p>';
        }

        const codeEditor = document.getElementById('codeEditorTextarea');
        if (!codeEditor) {
            console.error('ไม่พบ codeEditorTextarea');
            return;
        }

        // Load student's last submission or template code
        const submissionsSnapshot = await db.collection('submissions')
            .where('problemId', '==', problemId)
            .where('studentId', '==', userId)
            .where('classId', '==', classId)
            .get();

        if (!submissionsSnapshot.empty) {
            let submissions = submissionsSnapshot.docs.map(doc => doc.data());
            // ✅ กรองเอาเฉพาะที่กดส่งงานแล้ว (completed) เพื่อไม่ให้โหลด Draft โค้ดเก่าที่เคยกดรันแต่ไม่ได้ส่ง
            submissions = submissions.filter(sub => sub.status === 'completed');

            if (submissions.length > 0) {
                // เรียงลำดับฝั่ง Client เพื่อเลี่ยงการใช้ Composite Index ของ Firebase
                submissions.sort((a, b) => {
                    const timeA = (a.timestamp || a.submittedAt)?.toDate()?.getTime() || 0;
                    const timeB = (b.timestamp || b.submittedAt)?.toDate()?.getTime() || 0;
                    return timeB - timeA;
                });
                const submission = submissions[0];
                const currentScore = submission.score || 0;
                updateScoreDisplay(currentScore, maxScore);
                
                if (problemData?.assignmentType === 'exam') {
                    // ข้อสอบ: ซ่อนโค้ด
                    codeEditor.value = '# ข้อสอบถูกส่งแล้ว ไม่สามารถดูรหัสต้นฉบับย้อนหลังได้เพื่อป้องกันการคัดลอก';
                    if (codeEditor) {
                        codeEditor.readOnly = true;
                        codeEditor.placeholder = "ข้อสอบถูกส่งแล้ว ไม่สามารถดูรหัสต้นฉบับย้อนหลังได้";
                    }
                } else {
                    // แบบฝึกหัด: ดูโค้ดย้อนหลังได้
                    codeEditor.value = submission.code || problemData.templateCode || '';
                }

                if (viewMode) {
                    checkGUICode(submission.code);
                }
            } else {
                updateScoreDisplay(0, maxScore);
                codeEditor.value = problemData.templateCode || `import tkinter as tk\n\nwindow = tk.Tk()\nwindow.title("My GUI Application")\nwindow.geometry("400x300")\n\n# Add your GUI components here\n\nwindow.mainloop()`;
            }
        } else {
            updateScoreDisplay(0, maxScore);
            codeEditor.value = problemData.templateCode || `import tkinter as tk\n\nwindow = tk.Tk()\nwindow.title("My GUI Application")\nwindow.geometry("400x300")\n\n# Add your GUI components here\n\nwindow.mainloop()`;
        }

        updateLineNumbers();

        if (viewMode) {
            // ใช้ฟังก์ชันป้องกันการคัดลอกที่ส่วนกลาง (ถ้ามี) หรือกำหนดตรงนี้
            const codeEditorTextarea = document.getElementById('codeEditorTextarea');
            const codeHighlight = document.querySelector('.code-highlight');
            const codeEditorContainer = document.getElementById('codeEditor');
            
            if (codeEditorContainer) {
                codeEditorContainer.classList.add('readonly-mode');
                codeEditorContainer.addEventListener('copy', e => {
                    e.preventDefault();
                });
                codeEditorContainer.addEventListener('keydown', e => {
                    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C' || e.key === 'x' || e.key === 'X')) {
                        e.preventDefault();
                    }
                });
            }

            if (codeEditorTextarea) {
                // ✅ ยกเลิก readonly เพื่อให้เบราว์เซอร์ยอมให้ scroll และ focus ได้ปกติ
                codeEditorTextarea.removeAttribute('readonly');
                codeEditorTextarea.classList.add('readonly-mode');
                codeEditorTextarea.placeholder = "โจทย์ข้อนี้ส่งแล้ว ไม่สามารถแก้ไขหรือคัดลอกโค้ดได้";
                
                codeEditorTextarea.addEventListener('contextmenu', e => e.preventDefault());
                codeEditorTextarea.addEventListener('copy', e => e.preventDefault());
                codeEditorTextarea.addEventListener('cut', e => e.preventDefault());
                
                // ✅ ปิดกั้นการพิมพ์ทุกอย่าง ยกเว้นปุ่มลูกศร (Navigation) และการเลื่อนหน้าจอ
                codeEditorTextarea.addEventListener('keydown', e => {
                    const allowedKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End'];
                    if (!allowedKeys.includes(e.key) && !(e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                    }
                    // ปิด Ctrl+C / Ctrl+X
                    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C' || e.key === 'x' || e.key === 'X')) {
                        e.preventDefault();
                    }
                });
            }
            
            if (codeHighlight) {
                codeHighlight.classList.add('readonly-mode');
                codeHighlight.addEventListener('contextmenu', e => e.preventDefault());
                codeHighlight.addEventListener('copy', e => e.preventDefault());
                codeHighlight.addEventListener('keydown', e => {
                    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C' || e.key === 'x' || e.key === 'X')) {
                        e.preventDefault();
                    }
                });
            }

            const checkBtn = document.getElementById('checkBtn');
            if (checkBtn) checkBtn.style.display = 'none';
            
            const testBtn = document.getElementById('testBtn');
            if (testBtn) testBtn.style.display = 'none';
            
            const submitBtn = document.getElementById('submitBtn');
            if (submitBtn) submitBtn.style.display = 'none';
            
            const testCaseBtn = document.getElementById('testCaseBtn');
            if (testCaseBtn) testCaseBtn.style.display = 'none';
            
            const resetBtn = document.getElementById('resetBtn');
            if (resetBtn) resetBtn.style.display = 'none';
            
            // เปิดปุ่ม Run GUI ให้ใช้งานได้ในโหมด View
            const convertBtn = document.getElementById('convertBtn');
            if (convertBtn) {
                convertBtn.style.display = 'inline-block';
                convertBtn.disabled = false;
                convertBtn.textContent = 'RUN GUI (แสดงผล)';
                convertBtn.style.backgroundColor = '#4CAF50'; // สีเขียวให้ดูน่ากด
                convertBtn.style.color = 'white';
            }
        }

    } catch (error) {
        console.error('Error loading problem:', error);
        showError('เกิดข้อผิดพลาดในการโหลดโจทย์: ' + error.message);
    }
}

// เพิ่มฟังก์ชัน displayWidgets (แทน displayRequirements)
function displayWidgets(widgets) {
    const requirementsList = document.getElementById('requirementsList');
    requirementsList.innerHTML = '';

    if (widgets.length === 0) {
        requirementsList.innerHTML = '<p>ไม่มี Widgets ระบุ</p>';
        return;
    }

    const ul = document.createElement('ul');
    // ดึงข้อมูล widget definitions หลักมาเทียบ
    const defs = window.widgetDefinitions || [];

    widgets.forEach(widget => {
        const li = document.createElement('li');
        
        // ค้นหาข้อมูลจาก definitions ก่อน เพราะมักจะมี text ที่สมบูรณ์กว่า
        const def = defs.find(d => d.name === widget.name) || {};
        
        let displayText = widget.text;
        if (!displayText || displayText === 'ไม่มีข้อความ') {
            displayText = def.text;
        }

        let widgetText = `${widget.type}: <span style="background-color: #007bff; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${displayText || 'ไม่มีข้อความ'}</span>`;
        if (widget.props) widgetText += ` - คุณสมบัติ: ${widget.props}`;
        if (widget.action) widgetText += ` - การทำงาน: ${widget.action}`;
        if (widget.score) widgetText += ` - คะแนน: ${widget.score}`;
        li.innerHTML = widgetText;
        ul.appendChild(li);
    });

    requirementsList.appendChild(ul);
}

// ฟังก์ชันย่อ/ขยายภาพประกอบ
function toggleImageSize() {
    const preview = document.getElementById('guiImagePreview');
    if (preview) {
        const isCollapsed = preview.classList.toggle('collapsed');
        const btn = preview.querySelector('.image-toggle-btn');
        if (btn) {
            btn.textContent = isCollapsed ? 'ขยายภาพ' : 'ย่อภาพ';
        }
    }
}

// Helper function to show errors
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Helper function to show success messages
function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 5000);
}


// --- 🔄 ฟังก์ชัน checkGUICode (ฉบับ Hybrid: ประหยัดเงิน AWS) ---
async function checkGUICode(code) {
    const resultFrame = document.getElementById('result-frame');
    const previewDiv = document.getElementById('guiPreview');
    
    // แสดงสถานะ Loading ใน iframe
    if (resultFrame) {
        resultFrame.srcdoc = `
            <html>
                <body style="font-family: Arial, sans-serif; padding: 20px;">
                    <div style="text-align: center;">
                        <div class="loading">กำลังตรวจสอบ Syntax...</div>
                    </div>
                </body>
            </html>
        `;
    }
    
    // แสดงสถานะ Loading ใน Preview Div (ถ้ามี)
    if (previewDiv) {
        previewDiv.innerHTML = `<div class="loading">กำลังตรวจสอบโค้ด...</div>`;
    }

    try {
        // 1. Basic Validation: ตรวจสอบพื้นฐานก่อน (ไม่ต้องเสียเวลาเรียก Pyodide/AWS)
        
        // 1.1 ตรวจสอบโค้ดว่าง
        if (!code || code.trim() === '') {
            const msg = 'โค้ดว่างเปล่า กรุณาเขียนโค้ด Python';
            showError(msg);
            if (resultFrame) resultFrame.srcdoc = getErrorHtml(msg);
            return false;
        }

        // 1.2 ตรวจสอบ import
        if (!code.includes('from tkinter import') && !code.includes('import tkinter')) {
            const msg = 'โค้ดขาด "from tkinter import *" หรือ "import tkinter as tk"';
            showError(msg);
            if (resultFrame) resultFrame.srcdoc = getErrorHtml(msg);
            return false;
        }

        // 1.3 ตรวจสอบ mainloop
        if (!code.match(/mainloop\s*\(\s*\)/)) {
            const msg = 'โค้ดขาด "root.mainloop()" เพื่อแสดง GUI';
            showError(msg);
            if (resultFrame) resultFrame.srcdoc = getErrorHtml(msg);
            return false;
        }

        // 1.4 ตรวจสอบคำสั่งหลัง mainloop (Logic เดิมของคุณ)
        const lines = code.split('\n').map(line => line.trim());
        const mainloopIndex = lines.findIndex(line => line.match(/mainloop\s*\(\s*\)/));
        const linesAfterMainloop = lines.slice(mainloopIndex + 1).filter(line => line && !line.startsWith('#'));
        const widgetKeywords = ['Label', 'Entry', 'Frame', 'Button', 'StringVar', 'pack(', 'grid(', 'place('];
        
        const hasInvalidLines = linesAfterMainloop.some(line => 
            widgetKeywords.some(keyword => line.includes(keyword))
        );
        
        if (hasInvalidLines) {
            const msg = 'พบคำสั่งหลัง "root.mainloop()" ซึ่งจะไม่ถูกประมวลผล กรุณาย้ายไปไว้ก่อน mainloop';
            showError(msg);
            if (resultFrame) resultFrame.srcdoc = getErrorHtml(msg, code);
            return false;
        }

        // 2. Hybrid Syntax Check: เรียกใช้ฟังก์ชันฉลาด (Pyodide หรือ AWS)
        // *** ต้องแน่ใจว่าคุณวางฟังก์ชัน checkSyntax_Hybrid ไว้ในไฟล์แล้ว ***
        const result = await checkSyntax_Hybrid(code);

        // 3. จัดการผลลัพธ์
        if (result.status === 'error') {
            // กรณีมี Error จาก Python/AWS
            showError(result.message);
            
            if (resultFrame) {
                resultFrame.srcdoc = getErrorHtml(`❌ พบข้อผิดพลาดในโค้ด: ${result.message}`, code);
            }
            
            if (previewDiv) {
                previewDiv.innerHTML = `
                    <div class="validation-error">
                        ❌ พบข้อผิดพลาด: ${result.message}
                    </div>
                `;
            }
            return false;
        }

        // 3.5. เพิ่มการทำ Static Analysis (หาตัวแปรที่ไม่ได้ประกาศ)
        const rawLines = code.split('\n');
        const logicalLines = mergeMultiLineStatements(rawLines);
        let nameError = null;
        let declaredVars = new Set(['tk', 'math', 'random', 'time', 'sys', 'os']);
        
        // Pass 1: Collect all declared variables first (handles late binding in functions)
        for (let i = 0; i < logicalLines.length; i++) {
            const { line } = logicalLines[i];
            let m;
            
            if (m = line.match(/^\s*([\p{L}_][\p{L}\p{N}_]*)\s*(?:,.*?)?\s*=\s*(?!==)/u)) {
                declaredVars.add(m[1]);
            }
            else if (m = line.match(/^\s*def\s+([\p{L}_][\p{L}\p{N}_]*)\s*\((.*?)\)\s*:/u)) {
                declaredVars.add(m[1]);
                const args = m[2].split(',').map(a => a.trim()).filter(a => a);
                args.forEach(a => declaredVars.add(a));
            }
            else if (m = line.match(/^\s*global\s+(.+)$/)) {
                m[1].split(',').forEach(v => declaredVars.add(v.trim()));
            }
            else if (m = line.match(/^\s*import\s+[\p{L}\p{N}_.]+\s+as\s+([\p{L}_][\p{L}\p{N}_]*)/u)) {
                declaredVars.add(m[1]);
            }
            else if (m = line.match(/^\s*import\s+([\p{L}_][\p{L}\p{N}_]*)/u)) {
                declaredVars.add(m[1]);
            }
        }
        
        // Pass 2: Check for undefined variable usage
        for (let i = 0; i < logicalLines.length; i++) {
            const { raw, line, lineNumber } = logicalLines[i];
            let m;
            
            // Check for usage like widget.grid(), widget.pack(), widget.config()
            if (m = line.match(/^\s*([\p{L}_][\p{L}\p{N}_]*)\.(?:grid|pack|place|config|configure|destroy|set|get)\b/u)) {
                const varName = m[1];
                if (!declaredVars.has(varName)) {
                    nameError = { varName, line: raw, lineNumber: lineNumber };
                    break;
                }
            }
        }

        if (nameError) {
            const errorMsg = `NameError: name '${nameError.varName}' is not defined (บรรทัดที่ ${nameError.lineNumber})`;
            showError(errorMsg);
            
            if (resultFrame) {
                resultFrame.srcdoc = getErrorHtml(`❌ พบข้อผิดพลาดในโค้ด: ${errorMsg}`, nameError.line);
            }
            
            if (previewDiv) {
                previewDiv.innerHTML = `
                    <div class="validation-error">
                        ❌ พบข้อผิดพลาด: ${errorMsg}
                    </div>
                `;
            }
            return false;
        }

        // กรณีผ่านฉลุย
        const successMsg = `✅ โค้ดถูกต้องตาม Python syntax (${!isMobileDevice() && pyodideInstance ? 'ตรวจสอบโดย PC' : 'ตรวจสอบโดย Cloud'})`;
        
        if (resultFrame) {
            resultFrame.srcdoc = `
                <html>
                    <body style="font-family: Arial, sans-serif; padding: 20px;">
                        <div class="validation-success" style="color: green; background: #e6ffe6; padding: 15px; border-radius: 5px; border: 1px solid #c3e6cb;">
                            ${successMsg}
                        </div>
                    </body>
                </html>
            `;
        }

        if (previewDiv) {
            previewDiv.innerHTML = `
                <div class="validation-success">
                    ${successMsg}
                </div>
            `;
        }
        
        return true;

    } catch (error) {
        console.error("System Error in checkGUICode:", error);
        showError('ข้อผิดพลาดระบบ: ' + error.message);
        if (resultFrame) resultFrame.srcdoc = getErrorHtml(`System Error: ${error.message}`);
        return false;
    }
}

// Helper Function สำหรับสร้าง HTML Error สวยๆ ใน iframe
function getErrorHtml(message, codeContext = '') {
    return `
        <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <div class="validation-error" style="color: #721c24; background: #f8d7da; padding: 15px; border-radius: 5px; border: 1px solid #f5c6cb;">
                    ${message}
                    ${codeContext ? `<pre style="background: #fff; padding: 10px; border-radius: 3px; overflow-x: auto; margin-top: 10px; color: #333;">${codeContext}</pre>` : ''}
                </div>
            </body>
        </html>
    `;
}

// Function to set up event listeners
// Function to set up event listeners
function setupEventListeners(problemId, classId, userId, viewMode) {
    if (viewMode) return;

    const codeEditor = document.getElementById('codeEditorTextarea');
    if (!codeEditor) {
        console.error('ไม่พบ codeEditorTextarea');
        return;
    }

    const checkBtn = document.getElementById('checkBtn');
    const testBtn = document.getElementById('testBtn');
    const convertBtn = document.getElementById('convertBtn');
    const submitBtn = document.getElementById('submitBtn');
    const testCaseBtn = document.getElementById('testCaseBtn');
    
    // ✅ 1. เพิ่มการอ้างอิงปุ่ม Reset ตรงนี้
    const resetBtn = document.getElementById('resetBtn');

    // ตั้งค่าสถานะเริ่มต้นปุ่มต่างๆ
    if (convertBtn) convertBtn.disabled = true;
    if (testBtn) testBtn.disabled = true;
    if (submitBtn) submitBtn.disabled = true;
    if (testCaseBtn) testCaseBtn.disabled = true;

    // --- Event Listeners เดิม ---
      if (checkBtn) {
          checkBtn.addEventListener('click', async () => {
              const code = codeEditor.value;
              const isValid = await checkGUICode(code);
              if (convertBtn) convertBtn.disabled = !isValid;
              // ลบการเปิดปุ่ม Submit ตรงนี้ออก เพื่อให้นักเรียนต้อง "ตรวจคำตอบ" ก่อนถึงจะส่งได้
              // if (submitBtn) submitBtn.disabled = !isValid; 

              if (testBtn) testBtn.disabled = true;
              if (testCaseBtn) testCaseBtn.disabled = true;
          });
      }

    if (testBtn) {
        testBtn.addEventListener('click', checkAnswer);
    }

    if (convertBtn) {
        convertBtn.addEventListener('click', async () => {
            console.log('Preview button clicked');
            
            // 1. ตรวจสอบสถานะปุ่ม
            if (convertBtn.disabled) {
                showError('กรุณาตรวจสอบโค้ดให้ผ่านก่อนแสดง GUI');
                return;
            }
            
            const code = codeEditor.value;

            // 2. ✅ ตรวจสอบ Syntax ก่อน (เพื่อให้แน่ใจว่าไม่ Error ตามที่คุณขอ)
            // เราเรียกใช้ checkGUICode อีกครั้งเพื่อความชัวร์ (หรือถ้ามั่นใจว่าปุ่มเปิดคือผ่านแล้ว ก็ข้ามบรรทัดนี้ได้)
            const isValid = await checkGUICode(code);
            
            if (isValid) {
                // 3. ส่งไปแสดงผล (Simulator)
                sendToSimulator(true);
                
                // 4. เปิดปุ่มตรวจคำตอบ
                if (testBtn) testBtn.disabled = false;
                
                // 5. ✅✅ บันทึกโค้ดทันที (ทุกกรณีที่ไม่ Error)
                // ปิดการ save draft ชั่วคราวเพื่อไม่ให้โค้ดเซฟตอนกดรัน
                // await saveDraftCode(code);
            } else {
                console.log("Code has errors, not saving.");
            }
        });
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            const code = codeEditor.value;

            if (submitBtn.disabled) {
                showError('กรุณาตรวจสอบโค้ดให้ผ่านก่อนส่งงาน');
                return;
            }

            const alreadySubmitted = await checkSubmissionStatus(problemId, userId);
            if (alreadySubmitted) {
                showError('คุณได้ส่งงานไปแล้ว ไม่สามารถส่งซ้ำได้');
                return;
            }

            // ✅ แก้ไข: เรียกฟังก์ชันส่งงานเลย (ไม่ต้องเรียก checkAnswer ซ้ำให้รำคาญ)
            try {
                // ปิดปุ่มกันกดซ้ำ
                submitBtn.disabled = true; 
                submitBtn.textContent = 'กำลังส่ง...';
                
                await submitGUICode(code, problemId, userId, classId);
                
            } catch (error) {
                submitBtn.disabled = false; // เปิดคืนถ้า error
                submitBtn.textContent = 'ส่งงาน';
                showError('เกิดข้อผิดพลาด: ' + error.message);
            }
        });
    }

    // ✅ 2. เพิ่ม Logic ปุ่ม Reset เข้าไปในนี้ (ทำงานชัวร์แน่นอน)
    if (resetBtn) {
        console.log("✅ Reset button detected inside setupEventListeners");
        resetBtn.addEventListener('click', function() {
            if (confirm('⚠️ คุณต้องการล้างโค้ดทั้งหมดและเริ่มใหม่ใช่หรือไม่?\n\n(โค้ดปัจจุบันจะหายไป และกลับไปเป็นค่าเริ่มต้น)')) {
                
                // เตรียม Template
                let startCode = `# เขียนโค้ด Python ที่นี่\n\nimport tkinter as tk\n\n# สร้างหน้าต่าง GUI\nwindow = tk.Tk()\nwindow.title('My GUI Application')\n\n# เพิ่ม widgets ที่นี่\n\n# แสดงหน้าต่าง\nwindow.mainloop()`;

                // ถ้าโจทย์มี Template ให้ใช้ของโจทย์ (ดึงจากตัวแปร global problemData)
                if (typeof problemData !== 'undefined' && problemData.templateCode) {
                    startCode = problemData.templateCode;
                }

                // ใส่โค้ดลง Editor
                codeEditor.value = startCode;

                // อัปเดตหน้าจอ
                if (typeof updateLineNumbers === 'function') updateLineNumbers();
                if (typeof updateCodeHighlight === 'function') updateCodeHighlight();
                
                // ล้างจอ Preview
                const resultFrame = document.getElementById('result-frame');
                if (resultFrame) resultFrame.srcdoc = '';
                
                const guiPreview = document.getElementById('guiPreview');
                if (guiPreview) guiPreview.innerHTML = '';

                // รีเซ็ตปุ่มต่างๆ
                if (convertBtn) convertBtn.disabled = true;
                if (testBtn) testBtn.disabled = true;
                if (testCaseBtn) testCaseBtn.disabled = true;
                if (submitBtn) submitBtn.disabled = true;
            }
        });
    } else {
        console.warn("⚠️ Reset button NOT found in HTML");
    }
}

async function checkAnswer() {
    console.log('=== เริ่มการตรวจสอบคำตอบ (Structure Only + Return Fix) ===');
    
    const iframe = document.getElementById('result-frame');
    const convertBtn = document.getElementById('convertBtn');
    
    // 1. ตรวจสอบความพร้อม
    if (convertBtn && convertBtn.disabled) {
        alert('กรุณาตรวจสอบโค้ดให้ผ่านก่อนตรวจคำตอบ');
        return { passed: false, totalScore: 0, maxScore: 0 }; // 🔴 ส่งค่ากลับว่าไม่ผ่าน
    }
    
    if (!iframe || !iframe.srcdoc || iframe.srcdoc.includes('กำลังประมวลผล GUI')) {
        alert('กรุณารันโค้ดก่อนตรวจคำตอบ');
        return { passed: false, totalScore: 0, maxScore: 0 }; // 🔴 ส่งค่ากลับว่าไม่ผ่าน
    }

    // ข้อมูลจากโจทย์ (Expected)
    const expectedWidgets = window.widgetDefinitions || [];
    
    // ข้อมูลจากนักเรียน (Actual) - ดึงมาเฉพาะ Type
    const allWidgets = Array.from(iframe.contentDocument.querySelectorAll('[data-index]'));
    
    // เรียงตามลำดับการสร้างจริง
    const sortedWidgets = [...allWidgets].sort((a, b) => {
        return parseInt(a.getAttribute('data-index')||0) - parseInt(b.getAttribute('data-index')||0);
    });

    // Helper: แปลงเป็นข้อมูลสำหรับเทียบ
    const getWidgetType = (w) => {
        if (w.className.includes('tk-label')) return 'Label';
        if (w.className.includes('tk-entry')) return 'Entry';
        if (w.className.includes('tk-button')) return 'Button';
        if (w.className.includes('tk-checkbox') || w.type === 'checkbox') return 'Checkbutton';
        return 'Unknown';
    };

    const actualTypes = sortedWidgets.map(w => getWidgetType(w));
    const report = [];
    let isStructurePerfect = true;

    // -------------------------------------------------------------
    // 1. เช็คสต็อก (Inventory Check)
    // -------------------------------------------------------------
    const typeCounts = {}; 
    actualTypes.forEach(t => typeCounts[t] = (typeCounts[t] || 0) + 1);

    const inventoryReport = [];
    const missingTypes = {}; 
    const uniqueExpectedTypes = [...new Set(expectedWidgets.map(w => w.type))];
    
    uniqueExpectedTypes.forEach(type => {
        const required = expectedWidgets.filter(w => w.type === type).length;
        const current = typeCounts[type] || 0;

        if (current < required) {
            missingTypes[type] = required - current;
            inventoryReport.push(`❌ ${type}: ขาด ${required - current} ตัว`);
            isStructurePerfect = false;
        } else if (current > required) {
            inventoryReport.push(`❌ ${type}: เกินมา ${current - required} ตัว`);
            isStructurePerfect = false;
        } else {
            inventoryReport.push(`✅ ${type}: ครบ`);
        }
    });

    // ตรวจสอบ Widget ชนิดอื่นที่ไม่ได้อยู่ในโจทย์แต่มีอยู่ในโค้ด
    Object.keys(typeCounts).forEach(type => {
        if (!uniqueExpectedTypes.includes(type)) {
            inventoryReport.push(`❌ ${type}: เป็น Widget ที่ไม่ต้องการ (${typeCounts[type]} ตัว)`);
            isStructurePerfect = false;
        }
    });

    // -------------------------------------------------------------
    // 2. ตรวจสอบลำดับ (Sequence Check - Two Pointer)
    // -------------------------------------------------------------
    let expIndex = 0; 
    let actIndex = 0; 

    while (expIndex < expectedWidgets.length || actIndex < actualTypes.length) {
        const def = expectedWidgets[expIndex];    
        const actualType = actualTypes[actIndex];   

        // 2.1 ของนักเรียนหมดแล้ว แต่โจทย์ยังเหลือ
        if (expIndex < expectedWidgets.length && !actualType) {
            isStructurePerfect = false;
            report.push(`ลำดับที่ ${expIndex + 1}: ❌ หายไป (คุณลืมสร้าง ${def.type})`);
            expIndex++; 
            continue;
        }

        // 2.2 โจทย์หมดแล้ว แต่นักเรียนยังมีเกินมา
        if (expIndex >= expectedWidgets.length && actualType) {
            isStructurePerfect = false;
            report.push(`ลำดับที่ ${actIndex + 1}: ❌ เกินมา (พบ ${actualType} ที่ไม่ต้องการ)`);
            actIndex++;
            continue;
        }

        // 2.3 ✅ ชนิดตรงกัน (ผ่าน!)
        if (actualType === def.type) {
            report.push(`ลำดับที่ ${expIndex + 1}: ✅ ถูกต้อง (${actualType})`);
            expIndex++;
            actIndex++;
        } 
        // 2.4 ❌ ชนิดไม่ตรงกัน
        else {
            isStructurePerfect = false;
            
            // เช็คว่าเพราะ "ของขาด" หรือเปล่า? (Shift Detection)
            if (missingTypes[def.type] > 0) {
                report.push(`ลำดับที่ ${expIndex + 1}: ❌ ขาด ${def.type} (คุณข้ามไปสร้าง ${actualType} แทน)`);
                missingTypes[def.type]--; 
                expIndex++; // ขยับแค่โจทย์ รอตรวจตัวถัดไป (นักเรียนอยู่ที่เดิม)
            } else {
                report.push(`ลำดับที่ ${expIndex + 1}: ❌ ผิดประเภท (ควรเป็น ${def.type} แต่พบ ${actualType})`);
                expIndex++;
                actIndex++;
            }
        }
    }

    const testCaseBtn = document.getElementById('testCaseBtn');
    const submitBtn = document.getElementById('submitBtn');

    // -------------------------------------------------------------
    // 3. ตัดสินผล "โครงสร้าง"
    // -------------------------------------------------------------
    if (!isStructurePerfect) {
        const finalMsg = 
            `❌ โครงสร้างไม่ถูกต้อง\n\n` +
            `--- 📊 สรุปยอดรวม ---\n` +
            `${inventoryReport.join('\n')}\n\n` +
            `--- 📍 รายละเอียด ---\n` +
            `${report.join('\n')}`;

        alert(finalMsg);
        
        if (testCaseBtn) testCaseBtn.disabled = true;
        if (submitBtn) submitBtn.disabled = true;
        
        return { passed: false, totalScore: 0, maxScore: 0 }; // 🔴 ส่งค่ากลับว่าไม่ผ่าน
    }

    // -------------------------------------------------------------
    // 4. โครงสร้างผ่าน -> เปิดทางให้ไปต่อ (Running Logic Tests)
    // -------------------------------------------------------------
    console.log("Structure OK -> Running Logic Tests...");
    
    // ✅ ปลดล็อกปุ่ม Test Case ทันทีที่โครงสร้างผ่าน
    if (testCaseBtn) {
        testCaseBtn.disabled = false;
        testCaseBtn.style.opacity = "1";
        testCaseBtn.style.cursor = "pointer";
    }

    try {
        const codeEditor = document.getElementById('codeEditorTextarea');
        
        // รันฟังก์ชันให้คะแนน (testGUICode จะ return object ผลลัพธ์กลับมา)
        const testResult = await testGUICode(codeEditor.value, window.guiTestCases, iframe, { includeTestCases: false });
        guiBaseResult = {
            score: testResult.baseScore ?? testResult.totalScore,
            maxScore: testResult.baseMaxScore ?? testResult.maxScore,
            passed: testResult.passed === true
        };
        guiTestCaseBonus = {
            score: 0,
            maxScore: typeof testResult.testCaseMaxScore === 'number'
                ? testResult.testCaseMaxScore
                : (guiTestCaseBonus?.maxScore || 0)
        };
        
        // อัปเดตตัวเลขคะแนนบนหน้าจอ
        updateScoreDisplay(guiBaseResult.score, guiBaseResult.maxScore + guiTestCaseBonus.maxScore);

        // เช็คเงื่อนไขส่งงาน
        if (guiBaseResult.passed === true) {
            // ถ้ายิ่งมี Test Case ให้บังคับกดปุ่ม Test Case ก่อนส่งงาน
            if (guiTestCaseBonus.maxScore > 0) {
                if (submitBtn) submitBtn.disabled = true;
                alert(`✅ โครงสร้างถูกต้อง และผ่านการตรวจ!\n\nคะแนนปัจจุบัน: ${guiBaseResult.score}/${guiBaseResult.maxScore + guiTestCaseBonus.maxScore}\n(กรุณากดปุ่ม "ทดสอบ TestCase เฉพาะ" เพื่อเก็บคะแนนให้ครบก่อนส่งงาน)`);
                showSuccess('โครงสร้างผ่านแล้ว! กรุณาทดสอบ TestCase ก่อนส่งงาน');
            } else {
                // ไม่มี Test Case ก็ส่งงานได้เลย
                if (problemData?.assignmentType === 'exam') {
                    // ข้อสอบ ส่ง Auto ทันทีที่ผ่าน
                    if (submitBtn) submitBtn.style.display = 'none';
                    
                    const codeEditor = document.getElementById('codeEditorTextarea');
                    const urlParams = new URLSearchParams(window.location.search);
                    const problemId = urlParams.get('id');
                    const userId = auth.currentUser ? auth.currentUser.uid : '';
                    let classId = urlParams.get('classId');
                    if (!classId && document.referrer) {
                        const refUrl = new URL(document.referrer);
                        const refParams = new URLSearchParams(refUrl.search);
                        classId = refParams.get('id');
                    }
                    if (!classId && problemData?.classId) classId = problemData.classId;
                    
                    submitGUICode(codeEditor?.value || '', problemId, userId, classId);
                } else {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.style.opacity = "1";
                        submitBtn.style.cursor = "pointer";
                    }
                    alert(`✅ โครงสร้างถูกต้อง และผ่านการตรวจ!\n\nคะแนน: ${guiBaseResult.score}/${guiBaseResult.maxScore}\nสามารถส่งงานได้เลย!`);
                    showYarnReward();
                    showSuccess('ผ่านแล้ว! กดส่งงานได้เลย');
                }
            }
        } else {
            // โครงสร้างถูก แต่คะแนนไม่เต็ม
            if (submitBtn) submitBtn.disabled = true;
            
            alert(`⚠️ โครงสร้างถูกต้อง (ปุ่ม Test Case เปิดแล้ว)\n\nแต่คะแนนยังไม่เต็ม (${guiBaseResult.score}/${guiBaseResult.maxScore + guiTestCaseBonus.maxScore})\nอาจมีข้อความผิด หรือการจัดวาง/ข้อความไม่ตรง`);
        }
        
        if (typeof saveDraftCode === 'function') {
             // ปิดการ save draft ชั่วคราวเพื่อไม่ให้โค้ดเซฟตอนกดรัน
             // saveDraftCode(codeEditor.value);
        }

        // ✅✅ จุดสำคัญที่ขาดไป: ส่งผลลัพธ์ออกไปให้ปุ่ม Submit ใช้งาน
        return testResult; 

    } catch (error) {
        console.error('Test Error:', error);
        showError('เกิดข้อผิดพลาด: ' + error.message);
        return { passed: false, totalScore: 0, maxScore: 0 }; // 🔴 กรณี Error
    }
}
// ตรวจสอบสถานะการส่งงาน (และล็อกหน้าจอถ้าส่งแล้ว)
// ตรวจสอบสถานะการส่งงาน (แก้ไขชื่อฟิลด์เป็น studentId แล้ว)
async function checkSubmissionStatus(problemId, userId) {
    try {
        const submissionsRef = db.collection('submissions')
            .where('problemId', '==', problemId)
            .where('studentId', '==', userId) // ✅ แก้เป็น studentId
            .where('type', '==', 'gui')
            .where('status', '==', 'completed');
            
        const snapshot = await submissionsRef.get();
        
        if (!snapshot.empty) {
            const submissions = snapshot.docs.map(doc => doc.data());
            // เรียงลำดับฝั่ง Client เพื่อเลี่ยง Composite Index
            submissions.sort((a, b) => {
                const timeA = (a.timestamp || a.submittedAt)?.toDate()?.getTime() || 0;
                const timeB = (b.timestamp || b.submittedAt)?.toDate()?.getTime() || 0;
                return timeB - timeA;
            });
            const lastSubmission = submissions[0];

            console.log("🔒 พบการส่งงานแล้ว -> ล็อกหน้าจอ (View Mode)");
            
            showSuccess(`ส่งงานแล้วเมื่อ: ${lastSubmission.timestamp?.toDate().toLocaleString('th-TH')}`);

            // 1. ล็อก Editor
            const codeEditor = document.getElementById('codeEditorTextarea');
            const codeHighlight = document.querySelector('.code-highlight');
            const codeEditorContainer = document.getElementById('codeEditor');
            
            if (codeEditorContainer) {
                codeEditorContainer.classList.add('readonly-mode');
                codeEditorContainer.addEventListener('copy', e => {
                    e.preventDefault();
                });
                codeEditorContainer.addEventListener('keydown', e => {
                    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C' || e.key === 'x' || e.key === 'X')) {
                        e.preventDefault();
                    }
                });
            }

            if (codeEditor) {
                if (problemData?.assignmentType === 'exam') {
                    codeEditor.value = '# ข้อสอบถูกส่งแล้ว ไม่สามารถดูรหัสต้นฉบับย้อนหลังได้เพื่อป้องกันการคัดลอก';
                }
                codeEditor.setAttribute('readonly', 'readonly');
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

            // 2. ซ่อนปุ่มต่างๆ และเปิดปุ่ม RUN GUI
            const buttonsToHide = ['checkBtn', 'testBtn', 'submitBtn', 'testCaseBtn', 'resetBtn'];
            buttonsToHide.forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.style.display = 'none';
            });
            
            const convertBtn = document.getElementById('convertBtn');
            if (convertBtn) {
                convertBtn.style.display = 'inline-block';
                convertBtn.disabled = false;
                convertBtn.textContent = 'RUN GUI (แสดงผล)';
                convertBtn.style.backgroundColor = '#4CAF50';
                convertBtn.style.color = 'white';
            }
            
            return true; // ส่งแล้ว
        }
        return false; // ยังไม่ส่ง
    } catch (error) {
        console.error('Error checking submission:', error);
        return false;
    }
}
async function submitGUICode(code, problemId, userId, classId) {
    const isClosed = new URLSearchParams(window.location.search).get('closed') === 'true';
    if (isClosed) {
        alert('ปิดรับคำตอบแล้ว ไม่สามารถส่งงานได้');
        return;
    }
    try {
        console.log("🚀 กำลังส่งงาน...");
        
        const baseScore = guiBaseResult?.score || 0;
          const baseMaxScore = guiBaseResult?.maxScore || 0;
          const bonusScore = guiTestCaseBonus?.score || 0;
          const bonusMaxScore = guiTestCaseBonus?.maxScore || 0;

          if (baseScore < baseMaxScore || (baseMaxScore === 0 && bonusMaxScore === 0)) {
              alert(`⚠️ คะแนนยังไม่ครบ (${baseScore}/${baseMaxScore + bonusMaxScore})\nกรุณาทำโจทย์ให้ครบถ้วนก่อนส่ง`);
              const submitBtn = document.getElementById('submitBtn');
              if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'ส่งงาน'; }
              return;
          }

          if (bonusMaxScore > 0 && bonusScore < bonusMaxScore) {
              const confirmSubmit = confirm(`⚠️ คุณยังได้คะแนน Test Case ไม่ครบ (คะแนนปัจจุบัน ${baseScore + bonusScore}/${baseMaxScore + bonusMaxScore})\n\nอย่าลืมกดปุ่ม "ทดสอบ TestCase เฉพาะ" ก่อนส่ง!\n\nยืนยันที่จะส่งงานด้วยคะแนนเท่านี้หรือไม่?`);
              if (!confirmSubmit) {
                  const submitBtn = document.getElementById('submitBtn');
                  if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'ส่งงาน'; }
                  return;
              }
          }

          const finalScore = baseScore + bonusScore;
          const finalMaxScore = baseMaxScore + bonusMaxScore;

        await db.collection('submissions').add({
            problemId: problemId,
            studentId: userId, // <--- ใช้ studentId เพื่อให้ตรงกับ class detail
            classId: classId,
            code: code,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            submittedAt: firebase.firestore.FieldValue.serverTimestamp(), // ✅ เพิ่ม submittedAt เข้าไปด้วยเพื่อรองรับหน้าสรุปผล
            type: 'gui',
            status: 'completed', // <--- ใช้ completed เพื่อให้ปุ่มเป็นสีเขียว
            testResult: 'passed',
            score: finalScore,
            maxScore: finalMaxScore
        });
        
        console.log('✅ บันทึกข้อมูลสำเร็จ');

        // 4. แจ้งเตือนและกลับ
        if (problemData?.assignmentType === 'exam') {
            alert('ระบบได้ทำการส่งข้อสอบของคุณเรียบร้อยแล้ว!');
        } else {
            await playScoreAnimation(finalScore, finalMaxScore);
        }
        if (classId === 'admin') {
            window.location.href = 'student-problem-admin.html';
        } else {
            window.location.href = `student-class-detail.html?id=${classId}`; 
        }
        
    } catch (error) {
        console.error('Error submitting:', error);
        alert('เกิดข้อผิดพลาด: ' + error.message);
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'ส่งงาน'; }
    }
}

// Function to display requirements
function displayRequirements(requirements) {
    const requirementsList = document.getElementById('requirementsList');
    requirementsList.innerHTML = '';

    if (requirements.length === 0) {
        requirementsList.innerHTML = '<p>ไม่มีข้อกำหนดระบุ</p>';
        return;
    }

    const ul = document.createElement('ul');
    requirements.forEach(req => {
        const li = document.createElement('li');
        let requirementText = `${req.type} (${req.name})`;
        if (req.text) requirementText += ` - ข้อความ: "${req.text}"`;
        if (req.props) requirementText += ` - คุณสมบัติ: ${req.props}`;
        if (req.event) requirementText += ` - เหตุการณ์: ${req.event}`;
        if (req.description) requirementText += ` - คำอธิบาย: ${req.description}`;
        if (req.score) requirementText += ` - คะแนน: ${req.score}`;
        li.textContent = requirementText;
        ul.appendChild(li);
    });

    requirementsList.appendChild(ul);
}

// นอกฟังก์ชันทั้งหมด

  
async function sendToSimulator(autoRun = false) {
    console.log('=== เริ่มการส่งโค้ดไปยัง Simulator ===');
    const code = document.getElementById('pythonInput')?.value
               || document.getElementById('codeEditorTextarea')?.value
               || '';
    
    console.log('โค้ดที่จะส่ง:', code.substring(0, 100) + '...');
    
    if (!code.trim()) {
      showError('กรุณาเขียนโค้ด Python');
      return;
    }
  
    // ตรวจสอบ from tkinter import * หรือ import tkinter as tk
    if (!code.includes('from tkinter import') && !code.includes('import tkinter')) {
      showError('โค้ดขาด "from tkinter import *" หรือ "import tkinter as tk"');
      if (resultFrame) {
        resultFrame.srcdoc = `
          <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
              <div class="validation-error" style="color: red; background: #ffe6e6; padding: 15px; border-radius: 5px;">
                ❌ โค้ดขาด "from tkinter import *" หรือ "import tkinter as tk"<br>กรุณาเพิ่มคำสั่งนำเข้า Tkinter ที่ต้นโค้ด
              </div>
            </body>
          </html>
        `;
      }
      return;
    }
  
    // ใช้ result-frame แทน guiPreview
    const resultFrame = document.getElementById('result-frame');
    const previewDiv  = document.getElementById('guiPreview');
  
    if (!resultFrame) {
      console.error('ไม่พบ result-frame element');
      return;
    }
  
    try {
      // แสดงข้อความ loading ใน result-frame
      resultFrame.srcdoc = `
        <html>
          <head>
            <meta charset="UTF-8">
            <title>กำลังโหลด...</title>
          </head>
          <body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
            <div>กำลังประมวลผล GUI...</div>
          </body>
        </html>
      `;
  
      // สร้าง HTML GUI ด้วย convertCode()
      convertCode();
      const htmlOutput = document.getElementById('htmlOutput').value;
      
      // เพิ่ม console.log เพื่อแสดงเนื้อหาของ htmlOutput ที่จะถูกใส่ใน iframe.srcdoc
      console.log('HTML Output ที่จะใส่ใน iframe.srcdoc:', htmlOutput.substring(0, 500) + '...');
      
      // แสดงผลใน result-frame
      resultFrame.srcdoc = htmlOutput;
      
      // เพิ่ม console.log หลังจากกำหนดค่า iframe.srcdoc
      console.log('iframe.srcdoc หลังกำหนดค่า:', resultFrame.srcdoc.substring(0, 500) + '...');
  
      // **เพิ่ม onload เพื่อปรับขนาด iframe ตามเนื้อหาในตัวมันเอง**
      resultFrame.onload = () => {
        try {
          const doc = resultFrame.contentDocument || resultFrame.contentWindow.document;
          const contentHeight = doc.documentElement.scrollHeight;
          resultFrame.style.height = contentHeight + 'px';
        } catch (e) {
          console.warn('ปรับขนาด iframe อัตโนมัติไม่สำเร็จ:', e);
        }
      };
  
      // ถ้ามี guiPreview ให้แสดงสถานะสำเร็จ
      if (previewDiv) {
        previewDiv.innerHTML = `
          <div class="validation-success">
            ✅ GUI ทำงานได้ถูกต้อง (แสดงผลใน result-frame)
          </div>
        `;
      }
  
      console.log('GUI แสดงผลใน result-frame เรียบร้อย');
  
    } catch (error) {
      console.error('Error in sendToSimulator:', error);
  
      // แสดงข้อผิดพลาดใน result-frame
      resultFrame.srcdoc = `
        <html>
          <head>
            <meta charset="UTF-8">
            <title>เกิดข้อผิดพลาด</title>
          </head>
          <body style="font-family: Arial, sans-serif; padding: 20px; color: red;">
            <h3>เกิดข้อผิดพลาด</h3>
            <p>${error.message}</p>
          </body>
        </html>
      `;
  
      if (previewDiv) {
        previewDiv.innerHTML = `
          <div class="validation-error">
            ❌ เกิดข้อผิดพลาด: ${error.message}
          </div>
        `;
      }
    }
  }
  
  
  function convertCode() {
    console.log("convertCode starting...");
    const code = document.getElementById('pythonInput')?.value
               || document.getElementById('codeEditor')?.value
               || '';
    console.log("code to convert:", code.substring(0, 50));
    const lines = code.split('\n');
  
    // 1. Metadata และตัวเก็บ widget definitions
    let title    = 'GUI';
    let guiWidth = 400, guiHeight = 300;
    const labels       = [];   // [{ name, text, fg, bg }, …]
    const entries      = {};   // { entryVar: placeholder, … }
    const checks       = {};   // { varName: { on, off, label }, … }
    const buttons      = [];   // [{ name, text }, …]
    const localMap     = {};   // { localVar: entryVar, … }
    const buttonToFunc = {};   // { buttonVarName: functionName, … }
  
    // 2. เตรียมอาร์เรย์เก็บหลาย ๆ ฟังก์ชัน
    const functions = [];  // แต่ละ element: { name: <ชื่อฟังก์ชัน>, lines: [<บรรทัดภายใน>] }
    let inFunc = false;
  
    // 3. Pre-process lines to merge multi-line statements
    const logicalLines = mergeMultiLineStatements(lines);
    console.log("logicalLines:", logicalLines);

    // --- STATIC ANALYSIS: Check for undefined variables ---
    const declaredVars = new Set(['tk', 'math', 'random', 'time', 'sys', 'os']);
    let nameError = null;

    // Pass 1: Collect all declared variables first (handles late binding in functions)
    for (let i = 0; i < logicalLines.length; i++) {
        const { line } = logicalLines[i];
        let m;
        
        if (m = line.match(/^\s*([\p{L}_][\p{L}\p{N}_]*)\s*(?:,.*?)?\s*=\s*(?!==)/u)) {
            declaredVars.add(m[1]);
        }
        else if (m = line.match(/^\s*def\s+([\p{L}_][\p{L}\p{N}_]*)\s*\((.*?)\)\s*:/u)) {
            declaredVars.add(m[1]);
            const args = m[2].split(',').map(a => a.trim()).filter(a => a);
            args.forEach(a => declaredVars.add(a));
        }
        else if (m = line.match(/^\s*global\s+(.+)$/)) {
            m[1].split(',').forEach(v => declaredVars.add(v.trim()));
        }
        else if (m = line.match(/^\s*import\s+[\p{L}\p{N}_.]+\s+as\s+([\p{L}_][\p{L}\p{N}_]*)/u)) {
            declaredVars.add(m[1]);
        }
        else if (m = line.match(/^\s*import\s+([\p{L}_][\p{L}\p{N}_]*)/u)) {
            declaredVars.add(m[1]);
        }
    }
    
    // Pass 2: Check for undefined variable usage
    for (let i = 0; i < logicalLines.length; i++) {
        const { raw, line, lineNumber } = logicalLines[i];
        let m;
        
        // Check for usage like widget.grid(), widget.pack(), widget.config()
        if (m = line.match(/^\s*([\p{L}_][\p{L}\p{N}_]*)\.(?:grid|pack|place|config|configure|destroy|set|get)\b/u)) {
            const varName = m[1];
            if (!declaredVars.has(varName)) {
                nameError = { varName, line: raw, lineNumber: lineNumber };
                break;
            }
        }
    }

    if (nameError) {
        const errorMsg = `NameError: name '${nameError.varName}' is not defined (บรรทัดที่ ${nameError.lineNumber})`;
        showError(errorMsg);
        const errorHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { background-color: #1e1e1e; color: #ff5555; font-family: Consolas, monospace; padding: 20px; margin: 0; height: 100%; box-sizing: border-box; }
        h3 { margin-top: 0; color: #ff5555; }
        .error-box { background: #2d2d2d; border-left: 4px solid #ff5555; padding: 15px; margin-top: 15px; }
        .code-line { color: #d4d4d4; background: #252526; padding: 10px; border-radius: 4px; margin-top: 10px; white-space: pre-wrap; font-family: Consolas, monospace; }
        .line-num { color: #858585; user-select: none; margin-right: 10px; }
    </style>
</head>
<body>
    <h3>❌ พบข้อผิดพลาดในการรันโค้ด</h3>
    <div class="error-box">
        <strong>${errorMsg}</strong>
        <div class="code-line"><span class="line-num">${nameError.lineNumber} |</span>${nameError.line}</div>
    </div>
</body>
</html>`;
        const htmlOutputElem = document.getElementById('htmlOutput');
        if (htmlOutputElem) {
            htmlOutputElem.value = errorHtml;
            
            // Render error to the iframe preview immediately if it exists
            const previewIframe = document.getElementById('guiPreview');
            if (previewIframe) {
                previewIframe.srcdoc = errorHtml;
            }
            
            // Render error to the simulator iframe immediately if it exists
            const resultFrame = document.getElementById('result-frame');
            if (resultFrame) {
                resultFrame.srcdoc = errorHtml;
                // Add a special flag to prevent sendToSimulator from overriding it
                window.conversionError = true;
            }
        }
        console.log('Validation Error:', nameError);
        return false; // Return false to indicate failure
    }
    
    // Clear any previous error flags
    window.conversionError = false;
    // --- END STATIC ANALYSIS ---

    // 4. Pass 1: parse definitions + capture function body
    logicalLines.forEach(({ raw, line }) => {
      // function logic
      if (inFunc) {
         if (/^\s/.test(raw)) {
           const lastFn = functions[functions.length - 1];
           lastFn.lines.push(line);
           return;
         } else {
           inFunc = false;
         }
      }

      // def <fnName>():
      let m;
      if (m = line.match(/def\s+(\w+)\s*\((.*?)\)\s*:/)) {
        const fnName = m[1];
        const fnArgs = m[2].trim();
        functions.push({ name: fnName, args: fnArgs, lines: [] });
        inFunc = true;
      }
      
      // title
      if (m = line.match(/(\w+)\.title\s*\(\s*['"](.*?)['"]\s*\)/)) {
        title = m[2];
      }
      // geometry
      else if (m = line.match(/(\w+)\.geometry\s*\(\s*['"](\d+)x(\d+)['"]\s*\)/)) {
        guiWidth  = parseInt(m[2], 10);
        guiHeight = parseInt(m[3], 10);
      }
      // StringVar(value='...')
      else if (m = line.match(/(\w+)\s*=\s*(?:tk\.\s*)?StringVar\s*\(\s*(?:value=['"](.*?)['"])?\s*\)/)) {
        entries[m[1]] = m[2] || '';
      }
      // Entry(... textvariable=<var> ...)
      else if (m = line.match(/(?:tk\.\s*)?Entry\s*\([^)]*textvariable\s*=\s*(\w+)/)) {
        if (!(m[1] in entries)) entries[m[1]] = '';
      }
      // Label(text='...', fg='...', bg='...')
      else if (m = line.match(/(\w+)\s*=\s*(?:tk\.\s*)?Label\s*\(\s*(.*?)\s*\)/)) {
        const name = m[1], opts = m[2];
        const textMatch = opts.match(/text=['"](.*?)['"]/);
        const text = textMatch ? textMatch[1] : null;
        const fg   = (opts.match(/fg=['"](.*?)['"]/)   || [])[1] || '';
        const bg   = (opts.match(/bg=['"](.*?)['"]/)   || [])[1] || '';
        const textvariable = (opts.match(/textvariable\s*=\s*(\w+)/) || [])[1] || '';
        const relief = (opts.match(/relief\s*=\s*['"](.*?)['"]/) || [])[1] || '';
        const borderwidth = (opts.match(/borderwidth\s*=\s*(\d+)/) || [])[1] || '';
        labels.push({ name, text, fg, bg, textvariable, relief, borderwidth });
      }
      // IntVar()
      else if (m = line.match(/(\w+)\s*=\s*(?:tk\.\s*)?IntVar\s*\(\s*\)/)) {
        checks[m[1]] = { on: 1, off: 0, label: '' };
      }
      // Button(text='...')
      else if (m = line.match(/(\w+)\s*=\s*(?:tk\.\s*)?Button\s*\((.*)\)/)) {
        console.log("MATCHED BUTTON:", line);
        const textMatch = m[2].match(/text\s*=\s*['"](.*?)['"]/);
        const text = textMatch ? textMatch[1] : 'Button';
        buttons.push({ name: m[1], text: text });
        console.log("Added to buttons:", buttons[buttons.length - 1]);
        
        const commandMatch = m[2].match(/command\s*=\s*(lambda\s*:.*?\(.*?\)|lambda\s*:.*?(?=[,)])|[\p{L}_][\p{L}\p{N}_]*)/u);
        if (commandMatch) {
            let cmd = commandMatch[1];
            if (cmd.startsWith('lambda')) {
                const lambdaFuncMatch = cmd.match(/lambda\s*:\s*([\p{L}_][\p{L}\p{N}_]*)\s*\(/u);
                const lambdaArgsMatch = cmd.match(/lambda\s*:\s*[\p{L}_][\p{L}\p{N}_]*\s*\(\s*(.*?)\s*\)/u);
                if (lambdaFuncMatch) {
                    cmd = lambdaFuncMatch[1];
                    if (lambdaArgsMatch && lambdaArgsMatch[1]) {
                        cmd += '(' + lambdaArgsMatch[1] + ')';
                    } else {
                        cmd += '()';
                    }
                } else if (cmd.includes('destroy') || cmd.includes('quit')) {
                    cmd = 'lambda_func()';
                } else {
                    cmd = 'lambda_func()';
                }
            } else {
                cmd += '()';
            }
            buttonToFunc[m[1]] = cmd;
        }
      }
      // ButtonVar.configure(command=<func>)
      else if (m = line.match(/(\w+)\.configure\(\s*command\s*=\s*(\w+)\s*\)/)) {
        // m[1] = "button1",   m[2] = "cal"
        buttonToFunc[m[1]] = m[2];
      }
      // Checkbutton(text='...', variable=<var>, onvalue=<n>, offvalue=<n>)
      else if (m = line.match(
        /(?:tk\.\s*)?Checkbutton\s*\([^)]*text=['"](.+?)['"][^)]*variable\s*=\s*(\w+)[^)]*onvalue\s*=\s*(\d+)[^)]*offvalue\s*=\s*(\d+)/
      )) {
        // m[1]=label text, m[2]=variable name, m[3]=onvalue, m[4]=offvalue
        checks[m[2]] = { on: +m[3], off: +m[4], label: m[1] };
      }
      // localVar = int(entryVar.get())
      else if (m = line.match(/(\w+)\s*=\s*int\(\s*(\w+)\.get\(\)\s*\)/)) {
        // m[1] = localVar, m[2] = entryVar
        localMap[m[1]] = m[2];
      }
    });
  
    // 4. Extract f-string + static configs + branchVar for each function
    const exprConfigsByName = {};  // { fnName: [{ label, prefix, expr, suffix }, ...] }
    const staticConfigsByName = {}; // { fnName: [{ varName, text }, ...] }
    const branchArrayByName = {};  // { fnName: [ { cond, varName, text }, … ] }
    const branchVarByName   = {};  // { fnName: [ 'var1', 'var2', … ] }
  
    functions.forEach(fn => {
      const exprConfigs = []; // เปลี่ยนจาก exprConfig เดียวเป็น array
      const branchVars = new Set();
      const staticConfigs = [];
      const branchArray = [];
      let currCond = null;
      let branchIndex = -1;
  
      // (A) หาชื่อตัวแปร checkbox และ f-string update + staticConfigs
      fn.lines.forEach((fl, lineIndex) => {
        // ตรวจสอบว่าบรรทัดนี้อยู่ภายใต้เงื่อนไขหรือไม่
        let isInBranch = false;
        
        // ตรวจสอบบรรทัดก่อนหน้าเพื่อดูว่าอยู่ใน if/elif/else block หรือไม่
        for (let i = lineIndex - 1; i >= 0; i--) {
          const prevLine = fn.lines[i];
          if (prevLine.match(/^\s*(if|elif|else)/)) {
            isInBranch = true;
            break;
          }
          // ถ้าเจอบรรทัดที่ไม่ indent แล้วไม่ใช่ if/elif/else แสดงว่าออกจาก block แล้ว
          if (!prevLine.match(/^\s+/) && !prevLine.match(/^\s*(if|elif|else)/)) {
            break;
          }
        }
        
        // f-string ที่มีตัวแปร: <widget>.config(text=f'prefix{expr}suffix')
        if (m = fl.match(/(\w+)\.config\(\s*text\s*=\s*f['"](.+?)['"]\)/)) {
          const labelName = m[1];
          let fStringContent = m[2];
          
          // ตรวจสอบว่ามี {} หรือไม่
          if (fStringContent.includes('{') && fStringContent.includes('}')) {
            // แปลง {expression} เป็น ${expression}
            fStringContent = fStringContent.replace(/\{([^}]+)\}/g, '${$1}');
            
            // มีตัวแปร - ประมวลผลเป็น exprConfig
            const exprMatch = fStringContent.match(/^(.*?)\$\{(.+?)\}(.*)$/);
            if (exprMatch && !isInBranch) {
              exprConfigs.push({
                label: labelName,
                prefix: exprMatch[1],
                expr: exprMatch[2],
                suffix: exprMatch[3]
              });
            }
          } else {
            // ไม่มีตัวแปร - ประมวลผลเป็น staticConfig
            if (!isInBranch) {
              staticConfigs.push({ varName: labelName, text: fStringContent });
            }
          }
        }
        // static config(text='...') 
        else if (m = fl.match(/^\s*(\w+)\.config\(\s*text\s*=\s*['"](.+?)['"]\s*\)/)) {
          if (!isInBranch) {
            let text = m[2];
            // แปลง {expression} เป็น ${expression} ถ้ามี
            text = text.replace(/\{([^}]+)\}/g, '${$1}');
            staticConfigs.push({ varName: m[1], text: text });
          }
        }
      });
  
      // เก็บ array แทนที่จะเก็บตัวเดียว
      if (exprConfigs.length > 0) {
        exprConfigsByName[fn.name] = exprConfigs;
      }
      if (staticConfigs.length > 0) {
        staticConfigsByName[fn.name] = staticConfigs;
      }
      if (branchVars.size > 0) {
        branchVarByName[fn.name] = Array.from(branchVars);
      }
  
      // (B) สร้าง branchArray: อ่านเงื่อนไข if/elif/else กับ config(text=…) และ return
      currCond = null;
      branchIndex = -1;
      fn.lines.forEach(fl => {
        let m;
        if (m = fl.match(/^\s*(if|elif)\s*\((.+?)\)\s*:/)) {
          currCond = m[2].trim();
          branchIndex++;
          branchArray[branchIndex] = { cond: currCond, actions: [], keyword: m[1] };
        }
        else if (/^\s*else\s*:/.test(fl)) {
          currCond = null;
          branchIndex++;
          branchArray[branchIndex] = { cond: null, actions: [], keyword: 'else' };
        }
        else if (m = fl.match(/^\s*(\w+)\.config\(\s*text\s*=\s*f?['"](.+?)['"]\s*\)/)) {
          if (branchIndex >= 0 && branchArray[branchIndex]) {
            let text = m[2];
            text = text.replace(/\{([^}]+)\}/g, '${$1}');
            branchArray[branchIndex].actions.push({ type: 'config', varName: m[1], text: text });
          }
        }
        else if (m = fl.match(/^\s*return\s+(.+)$/)) {
          if (branchIndex >= 0 && branchArray[branchIndex]) {
            branchArray[branchIndex].actions.push({ type: 'return', expr: m[1] });
          }
        }
      });

      if (branchArray.length > 0) {
        branchArrayByName[fn.name] = branchArray;
      }
    });
  
    // 5. Build HTML for widgets ตามลำดับที่พบในโค้ด Python
    const html = [];
    let widgetIndex = 0;

    // เก็บข้อมูล layout (grid/pack)
    const widgetLayout = {};
    let hasGrid = false;

    logicalLines.forEach(({ line }) => {
        let m;
        if (m = line.match(/\b(\w+)\.grid\s*\((.*?)\)/)) {
            const name = m[1];
            const args = m[2];
            hasGrid = true;
            widgetLayout[name] = { type: 'grid', row: 0, column: 0, columnspan: 1, rowspan: 1 };
            
            const rowMatch = args.match(/row\s*=\s*(\d+)/);
            if (rowMatch) widgetLayout[name].row = parseInt(rowMatch[1], 10);
            
            const colMatch = args.match(/column\s*=\s*(\d+)/);
            if (colMatch) widgetLayout[name].column = parseInt(colMatch[1], 10);
            
            const colSpanMatch = args.match(/columnspan\s*=\s*(\d+)/);
            if (colSpanMatch) widgetLayout[name].columnspan = parseInt(colSpanMatch[1], 10);
            
            const rowSpanMatch = args.match(/rowspan\s*=\s*(\d+)/);
            if (rowSpanMatch) widgetLayout[name].rowspan = parseInt(rowSpanMatch[1], 10);
        }
    });

    // เก็บข้อมูล widget ทั้งหมดพร้อมลำดับที่พบในโค้ด
    const allWidgets = [];

    // วนลูปผ่านแต่ละบรรทัดของโค้ด Python อีกครั้ง
    logicalLines.forEach(({ line }, lineIndex) => {
      let m;
      
      // Label(text='...', fg='...', bg='...')
      if (m = line.match(/\b(\w+)\s*=\s*(?:tk\.\s*)?Label\s*\((.*)\)/)) {
        const name = m[1];
        const labelInfo = labels.find(l => l.name === name);
        if (labelInfo) {
          allWidgets.push({
            type: 'label',
            name: name,
            lineIndex: lineIndex,
            data: labelInfo
          });
        }
      }
      // StringVar(value='...')
      else if (m = line.match(/\b(\w+)\s*=\s*(?:tk\.\s*)?StringVar\s*\((.*)\)/)) {
        const name = m[1];
        if (entries[name]) {
          allWidgets.push({
            type: 'entry',
            name: name,
            lineIndex: lineIndex,
            placeholder: entries[name]
          });
        }
      }
      // IntVar()
      else if (m = line.match(/\b(\w+)\s*=\s*(?:tk\.\s*)?IntVar\s*\((.*)\)/)) {
        const name = m[1];
        if (checks[name]) {
          allWidgets.push({
            type: 'checkbox',
            name: name,
            lineIndex: lineIndex,
            data: checks[name]
          });
        }
      }
      // Button(text='...')
      else if (m = line.match(/\b(\w+)\s*=\s*(?:tk\.\s*)?Button\s*\((.*)\)/)) {
        const name = m[1];
        const buttonInfo = buttons.find(b => b.name === name);
        if (buttonInfo) {
          allWidgets.push({
            type: 'button',
            name: name,
            lineIndex: lineIndex,
            data: buttonInfo
          });
        }
      }
    });

    // เรียงลำดับ widget ตามบรรทัดที่พบในโค้ด Python
    allWidgets.sort((a, b) => a.lineIndex - b.lineIndex);

    // สร้าง HTML ตามลำดับที่เรียงแล้ว
    allWidgets.forEach(widget => {
      let layoutStyle = '';
      const layout = widgetLayout[widget.name];
      if (layout && layout.type === 'grid') {
          const r = layout.row + 1;
          const c = layout.column + 1;
          const rs = layout.rowspan;
          const cs = layout.columnspan;
          layoutStyle = `grid-row: ${r} / span ${rs}; grid-column: ${c} / span ${cs}; `;
      }

      switch (widget.type) {
        case 'label':
          let style = layoutStyle;
          if (widget.data.fg) style += `color:${widget.data.fg};`;
          if (widget.data.bg) style += `background-color:${widget.data.bg};`;
          
          let classes = ['tk-label'];
          if (widget.data.relief) classes.push(`relief-${widget.data.relief}`);
          if (widget.data.borderwidth) style += `border-width:${widget.data.borderwidth}px;`;
          
          const initialText = widget.data.text !== null ? widget.data.text : (entries[widget.data.textvariable] !== undefined ? entries[widget.data.textvariable] : '');
          html.push(`<div id="label_${widget.name}" class="${classes.join(' ')}" data-var="${widget.name}" data-index="${widgetIndex++}" style="${style}">${initialText}</div>`);
          break;
        case 'entry':
            // ใส่ทั้ง placeholder และ value เพื่อให้เหมือน StringVar(value='...') ของจริง
            const placeholder = widget.placeholder ? ` placeholder="${widget.placeholder}" value="${widget.placeholder}"` : '';
            html.push(`<input type="text" id="entry_${widget.name}" class="tk-entry" data-var="${widget.name}" data-index="${widgetIndex++}" style="${layoutStyle}"${placeholder}/>`);
            break;
        case 'checkbox':
          html.push(`<label style="${layoutStyle}"><input type="checkbox" id="cb_${widget.name}" class="tk-checkbox" data-var="${widget.name}" data-index="${widgetIndex++}"/>${widget.data.label}</label>`);
          break;
        case 'button':
          let fn = buttonToFunc[widget.name] || widget.name + "()";
          if (!fn.includes('(')) fn += '()';
          html.push(`<button id="btn_${widget.name}" onclick="${fn}" class="tk-button" data-var="${widget.name}" data-index="${widgetIndex++}" style="${layoutStyle}">${widget.data.text}</button>`);
          break;
      }
    });

    // ถ้าไม่มี widget เลย ให้ fallback สร้างปุ่มจากชื่อฟังก์ชัน
    if (allWidgets.length === 0) {
      functions.forEach(fn => {
        html.push(`<button onclick="${fn.name}()" class="tk-button" data-index="${widgetIndex++}">${fn.name}</button>`);
      });
    }
  
    // 6. Build JavaScript for all functions
    let js = '';

    // 6.1 Initialize simple global variables from the code
    const globalVars = {};
    logicalLines.forEach(({ line: raw }) => {
      const line = raw.trim();
      let m;
      // var = number (e.g. count=0)
      if (m = line.match(/^([\p{L}_][\p{L}\p{N}_]*)\s*=\s*(-?\d+)$/u)) {
        globalVars[m[1]] = parseInt(m[2], 10);
      }
      // var = 'string' or "string"
      else if (m = line.match(/^([\p{L}_][\p{L}\p{N}_]*)\s*=\s*['"](.*?)['"]$/u)) {
        globalVars[m[1]] = `"${m[2]}"`;
      }
      // var.set(value)
      else if (m = line.match(/^([\p{L}_][\p{L}\p{N}_]*)\.set\s*\(\s*(?:str\s*\()?\s*([^)]*?)\s*\)?\s*\)$/u)) {
        if (m[2] in globalVars) {
          entries[m[1]] = globalVars[m[2]];
        } else {
          entries[m[1]] = m[2].replace(/['"]/g, '');
        }
      }
    });

    Object.keys(globalVars).forEach(k => {
      const val = globalVars[k];
      js += `let ${k} = ${val};\n`;
    });
    
    // Add lambda_func if used
    if (Object.values(buttonToFunc).some(cmd => cmd && cmd.includes('lambda_func'))) {
        js += `function lambda_func() {
            const win = document.querySelector('.window');
            if (win) {
                win.style.display = 'none';
                console.log("Window closed by lambda");
            }
        }\n\n`;
    }

    functions.forEach(fn => {
      js += `function ${fn.name}(${fn.args || ''}) {\n`;
  
      const fnLocalMap = {};
      let returnExpr = null;
      let functionBodyJs = '';

      // (0) General python code logic (assignments, basic ops)
      fn.lines.forEach(fl => {
        let m;
        const line = fl.trim();
        // remove global keyword
        if (line.startsWith('global ')) return;

        // Capture return statement
        if (m = line.match(/^return\s+(.+)$/)) {
            returnExpr = m[1];
            return;
        }
        
        // Capture A1=int(number1.get()) or A1=float(number1.get()) into fnLocalMap
        if (m = line.match(/^([\p{L}_][\p{L}\p{N}_]*)\s*=\s*(int|float)\(\s*([\p{L}_][\p{L}\p{N}_]*)\.get\(\)\s*\)$/u)) {
            fnLocalMap[m[1]] = { entryVar: m[3], type: m[2] };
            return;
        }

        // basic assignment and ops (e.g. count+=1 or expression = expression+n)
        // [UPDATE] รองรับ tuple unpacking เช่น A1, A2 = cal()
        if (m = line.match(/^([\p{L}_][\p{L}\p{N}_]*(?:\s*,\s*[\p{L}_][\p{L}\p{N}_]*)*)\s*(\+|-|\*|\/|%|\*\*|\/\/)?=\s*(.+)$/u)) {
          let lhs = m[1];
          let prefix = '';
          if (lhs.includes(',')) {
              lhs = `[${lhs}]`;
              prefix = 'let '; // Ensure declaration for unpacking
          }
          
          let expr = m[3]
            .replace(/\bint\s*\(/g, 'parseInt(')
            .replace(/\bfloat\s*\(/g, 'parseFloat(')
            .replace(/\bstr\s*\(/g, 'String(')
            .replace(/([\p{L}\p{N}_]+)\.get\(\)/gu, '(document.getElementById("entry_$1") ? document.getElementById("entry_$1").value : "")');
          // Use let if it's a basic assignment without operator and hasn't been declared (simplified approach)
          functionBodyJs += `  ${prefix}${lhs} ${m[2] ? m[2] + '=' : '='} ${expr};\n`;
        }
        
        // str(...) conversion and variable set OR variable.set(value)
        if (m = line.match(/^([\p{L}_][\p{L}\p{N}_]*)\.set\s*\(\s*(?:str\s*\()?\s*([^)]*?)\s*\)?\s*\)$/u)) {
           // Update corresponding label if it exists
           const targetLabel = labels.find(l => l.textvariable === m[1]);
           if (targetLabel) {
             let expr = m[2]
               .replace(/\bint\s*\(/g, 'parseInt(')
               .replace(/\bfloat\s*\(/g, 'parseFloat(')
               .replace(/\bstr\s*\(/g, 'String(')
               .replace(/([\p{L}\p{N}_]+)\.get\(\)/gu, '(document.getElementById("entry_$1") ? document.getElementById("entry_$1").value : "")');
             functionBodyJs += `  document.getElementById("label_${targetLabel.name}").textContent = String(${expr});\n`;
           }
        }
      });

      // (1) locals จาก entry
      Object.entries(fnLocalMap).forEach(([local, data]) => {
        const parseStr = data.type === 'int' 
            ? `parseInt(document.getElementById("entry_${data.entryVar}") ? document.getElementById("entry_${data.entryVar}").value : 0, 10)`
            : `parseFloat(document.getElementById("entry_${data.entryVar}") ? document.getElementById("entry_${data.entryVar}").value : 0)`;
        js += `  let ${local} = ${parseStr};\n`;
      });
      js += '\n';

      // เพิ่มบรรทัดที่เหลือจาก Step 0 เข้าไปที่ js หลัก
      js += functionBodyJs;
  
      // (2) ตรวจสถานะ checkbox *ทุกตัวที่นิยาม* เพื่อเตรียม var_varName
      Object.keys(checks).forEach(v => {
        js += `  const checkbox_${v}   = document.getElementById("cb_${v}");\n`;
        js += `  const isChecked_${v}  = checkbox_${v}.checked;\n`;
        js += `  const value_${v}      = isChecked_${v} ? ${checks[v].on} : ${checks[v].off};\n`;
        js += `  console.log('🔍 Debug: value_${v} =', value_${v}, 'isChecked_${v} =', isChecked_${v}, 'checkbox state:', checkbox_${v}.checked);\n\n`;
      });
  
      // (3) validation ถ้ามี Entry สองตัวขึ้นไป
      const localsArr = Object.keys(fnLocalMap);
      if (localsArr.length >= 2) {
        js += `  if (isNaN(${localsArr[0]}) || isNaN(${localsArr[1]})) {\n`;
        js += `    alert("กรุณาป้อนตัวเลขให้ถูกต้อง");\n`;
        js += `    return;\n`;
        js += `  }\n\n`;
      }
  
      // (4) จัดการ static configs ก่อน (ทุกบรรทัดที่ไม่ใช่ f-string)
      const staticConfigsForFn = [];
      
      // เพิ่ม static configs จากการประมวลผลก่อนหน้า (ถ้ามี)
      if (staticConfigsByName[fn.name]) {
        staticConfigsByName[fn.name].forEach(config => {
          staticConfigsForFn.push(config);
        });
      }

      // เพิ่ม static configs ลงใน JavaScript
        staticConfigsForFn.forEach(config => {
            js += `  document.getElementById("label_${config.varName}").textContent = \`${config.text}\`;\n`;
        });

      // (4.1) f-string updates ทั้งหมด
        if (exprConfigsByName[fn.name]) {
            const configs = exprConfigsByName[fn.name];
            configs.forEach(ec => {
                js += `  document.getElementById("label_${ec.label}")`
                   + `.textContent = \`${ec.prefix}\${${ec.expr}}${ec.suffix}\`;\n`;
            });
            js += '\n';
        }
  
      // (5) dynamic branch updates ถ้ามี branchArrayByName[fn.name]
        if (branchArrayByName[fn.name]) {
            branchArrayByName[fn.name].forEach(b => {
                const rawCond = (b.cond || '')
                    .replace(/([\p{L}\p{N}_]+)\.get\(\)/gu, '(document.getElementById("entry_$1") ? document.getElementById("entry_$1").value : "")')
                    .replace(/\band\b/g, '&&')
                    .replace(/\bor\b/g, '||')
                    .replace(/\bnot\b/g, '!')
                    .replace(/\bint\s*\(/g, 'parseInt(')
                    .replace(/\bfloat\s*\(/g, 'parseFloat(')
                    .replace(/\bstr\s*\(/g, 'String(')
                    .trim() || 'true';
                
                if (b.keyword === 'elif') {
                    js += `  else if (${rawCond}) {\n`;
                } else if (b.keyword === 'else') {
                    js += `  else {\n`;
                } else {
                    js += `  if (${rawCond}) {\n`;
                }
                
                (b.actions || []).forEach(action => {
                    if (action.type === 'config') {
                        js += `    document.getElementById("label_${action.varName}").textContent = \`${action.text}\`;\n`;
                    } else if (action.type === 'return') {
                        let expr = action.expr
                            .replace(/\bint\s*\(/g, 'parseInt(')
                            .replace(/\bfloat\s*\(/g, 'parseFloat(')
                            .replace(/\bstr\s*\(/g, 'String(')
                            .replace(/([\p{L}\p{N}_]+)\.get\(\)/gu, '(document.getElementById("entry_$1") ? document.getElementById("entry_$1").value : "")');
                        js += `    return ${expr};\n`;
                    }
                });
                js += `  }\n`;
            });
        }

      if (returnExpr) {
          let expr = returnExpr
            .replace(/\bint\s*\(/g, 'parseInt(')
            .replace(/\bfloat\s*\(/g, 'parseFloat(')
            .replace(/\bstr\s*\(/g, 'String(')
            .replace(/([\p{L}\p{N}_]+)\.get\(\)/gu, '(document.getElementById("entry_$1") ? document.getElementById("entry_$1").value : "")');
          
          // [UPDATE] ถ้ามีการ return หลายค่า (มีคอมมา) ให้ครอบด้วย [] เพื่อให้ JS unpack ได้
          if (expr.includes(',') && !expr.startsWith('[') && !expr.startsWith('(')) {
              expr = `[${expr}]`;
          }
          js += `  return ${expr};\n`;
      }
  
      // ปิดฟังก์ชัน
      js += `}\n\n`;
    });
  
    // 7. Assemble final HTML
    const w = guiWidth, h = guiHeight;
    const output = `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
      .window {
        border:2px solid #444;
        border-radius:6px;
        width:${w}px;
        height:${h}px; 
        display:flex;
        flex-direction:column;
        overflow:visible;
        box-shadow:2px 2px 6px rgba(0,0,0,0.3);
      }
      .title-bar {
        background:#eee;
        padding:6px;
        text-align:center;
        font-weight:bold;
        border-bottom:1px solid #444;
        user-select:none;
      }
      .content {
        flex:1;
        padding:8px;
        overflow:visible;
        ${hasGrid 
          ? 'display:grid; align-content: start; justify-content: center;'
          : 'display:flex; flex-direction:column; align-items: center;'}
        gap:8px;
      }
      .content > * {
        ${hasGrid ? '' : 'display:block;'}
      }
    </style>
  </head>
  <body>
    <div class="window">
      <div class="title-bar">${title}</div>
      <div class="content">
        ${html.join('\n')}
      </div>
    </div>
    <script>
    ${js}
    </script>
  </body>
  </html>`;
  
    document.getElementById('htmlOutput').value = output;
    console.log('Generated HTML:', output);
    console.log('Generated JavaScript:', js);
  }
  
  
  
  
  
  
      
      // W3Schools Simulator
      function openEditorTab(tabName) {
        const tabContents = document.getElementsByClassName("editor-content");
        for (let content of tabContents) content.classList.remove("active");
  
        const tabs = document.getElementsByClassName("editor-tab");
        for (let tab of tabs) tab.classList.remove("active");
  
        document.getElementById(tabName + "-tab").classList.add("active");
        document.querySelector(`.editor-tab[onclick="openEditorTab('${tabName}')"]`).classList.add("active");
      }
  
      function showStatus(message, isError = false) {
        const status = document.getElementById("status");
        status.textContent = message;
        status.className = isError ? "status error" : "status success";
        setTimeout(() => {
          status.textContent = "";
          status.className = "status";
        }, 3000);
      }
  
      function runCode() {
        try {
          const htmlCode = document.getElementById("html-editor").value;
          const cssCode = document.getElementById("css-editor").value;
          const jsCode = document.getElementById("js-editor").value;
  
          const fullCode = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>${cssCode}</style>
  </head>
  <body>
    ${htmlCode}
    <script>${jsCode.replace(/<\/script>/g, "<\\/script>")}<\/script>
  </body>
  </html>
          `;
  
          const resultFrame = document.getElementById("result-frame");
          resultFrame.srcdoc = fullCode;
        } catch (error) {
          console.error("เกิดข้อผิดพลาด: " + error.message);
        }
      }
  
      function clearCode() {
        if (confirm("คุณแน่ใจหรือไม่ที่จะล้างโค้ดทั้งหมด?")) {
          document.getElementById("html-editor").value =
  `<h1>สวัสดี W3Schools Simulator</h1>
  <p>นี่คือตัวอย่างเว็บเพจอย่างง่าย</p>
  <button id="myButton">คลิกที่นี่</button>
  <p id="demo"></p>`;
          document.getElementById("css-editor").value =
  `body {
    font-family: Arial, sans-serif;
    margin: 20px;
  }
  h1 {
    color: blue;
  }`;
          document.getElementById("js-editor").value =
  `document.getElementById("myButton").addEventListener("click", function () {
    document.getElementById("demo").innerHTML = "คุณได้คลิกปุ่มแล้ว!";
  });`;
          runCode();
        }
      }
  
// ฟังก์ชันใหม่สำหรับทดสอบ TestCase เฉพาะ
async function testSpecificTestCase(generatedHTML, testCase) {
    try {
        console.log('เริ่มทดสอบ TestCase เฉพาะ...');
        console.log('Generated HTML:', generatedHTML);
        console.log('Test Case:', testCase);
        
        // สร้าง iframe สำหรับทดสอบ
        const testFrame = document.createElement('iframe');
        testFrame.style.display = 'none';
        document.body.appendChild(testFrame);
        
        // โหลด HTML ลงใน iframe
        testFrame.srcdoc = generatedHTML;
        
        // รอให้ iframe โหลดเสร็จ
        await new Promise(resolve => {
            testFrame.onload = resolve;
        });
        
        // ตั้งค่า inputs
        console.log('🔧 ตั้งค่า Inputs...');
        for (const input of testCase.inputs) {
            const element = testFrame.contentDocument.querySelector(`[data-var*="${input.text}"]`);
            if (element) {
                element.value = input.value;
                console.log(`✅ ตั้งค่า ${input.widget} "${input.text}" = "${input.value}"`);
            } else {
                console.warn(`⚠️ ไม่พบ ${input.widget} "${input.text}"`);
            }
        }
        
        // ดำเนินการ actions
        console.log('🎬 ดำเนินการ Actions...');
        for (const action of testCase.actions) {
            if (action.widget === 'Button' && action.state === 'pressed') {
                // หาปุ่มที่ตรงกับข้อความ
                const button = Array.from(testFrame.contentDocument.querySelectorAll('button'))
                    .find(btn => btn.textContent.includes(action.text));
                
                if (button) {
                    console.log(`🔘 กดปุ่ม "${action.text}"`);
                    
                    // ลองเรียก cal() ก่อน
                    try {
                        if (testFrame.contentWindow.cal) {
                            testFrame.contentWindow.cal();
                            console.log('✅ เรียก cal() สำเร็จ');
                        } else {
                            button.click();
                            console.log('✅ คลิกปุ่มสำเร็จ');
                        }
                    } catch (error) {
                        console.error('❌ เกิดข้อผิดพลาดในการเรียก cal():', error);
                        button.click();
                    }
                } else {
                    console.warn(`⚠️ ไม่พบปุ่ม "${action.text}"`);
                }
            } else if (action.widget === 'Checkbutton') {
                // หา checkbox ที่ตรงกับข้อความ
                const checkbox = Array.from(testFrame.contentDocument.querySelectorAll('input[type="checkbox"]'))
                    .find(cb => {
                        const label = testFrame.contentDocument.querySelector(`label[for="${cb.id}"]`);
                        return label && label.textContent.includes(action.text);
                    });
                
                if (checkbox) {
                    checkbox.checked = action.state === 'checked';
                    console.log(`☑️ ตั้งค่า Checkbutton "${action.text}" เป็น ${action.state}`);
                } else {
                    console.warn(`⚠️ ไม่พบ Checkbutton "${action.text}"`);
                }
            }
        }
        
        // รอสักครู่ให้การประมวลผลเสร็จ
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // ตรวจสอบ outputs
        console.log('🎯 ตรวจสอบ Expected vs Actual...');
        const results = [];
        
        for (const expected of testCase.outputs) {
            // หา Label ที่ตรงกับข้อความ
            const label = Array.from(testFrame.contentDocument.querySelectorAll('*'))
                .find(el => {
                    const dataVar = el.getAttribute('data-var');
                    return dataVar && el.textContent && el.textContent.includes(expected.text);
                });
            
            if (label) {
                const actualValue = label.textContent.trim();
                const expectedValue = expected.value.trim();
                const match = actualValue === expectedValue;
                
                results.push({
                    widget: expected.widget,
                    text: expected.text,
                    expected: expectedValue,
                    actual: actualValue,
                    match: match
                });
                
                console.log(`${match ? '✅' : '❌'} ${expected.widget} "${expected.text}": Expected "${expectedValue}", Actual "${actualValue}"`);
            } else {
                results.push({
                    widget: expected.widget,
                    text: expected.text,
                    expected: expected.value,
                    actual: 'ไม่พบ',
                    match: false
                });
                
                console.warn(`⚠️ ไม่พบ ${expected.widget} "${expected.text}"`);
            }
        }
        
        // ลบ iframe
        document.body.removeChild(testFrame);
        
        // แสดงผลลัพธ์
        const passedCount = results.filter(r => r.match).length;
        const totalCount = results.length;
        const passed = passedCount === totalCount;
        
        const resultHTML = `
            <div class="test-results">
                <h3>ผลการทดสอบ TestCase เฉพาะ</h3>
                <h4>TestCase ID: 0kdmujouj ${passed ? '✅ ผ่าน' : '❌ ไม่ผ่าน'}</h4>
                
                <div class="test-case-details">
                    <div class="test-inputs">
                        <strong>📥 Inputs:</strong>
                        <ul>
                            ${testCase.inputs.map(input => 
                                `<li>${input.widget} "${input.text}" = "${input.value}"</li>`
                            ).join('')}
                        </ul>
                    </div>
                    
                    <div class="test-actions">
                        <strong>🎬 Actions:</strong>
                        <ul>
                            ${testCase.actions.map(action => 
                                `<li>${action.widget} "${action.text}" → ${action.state}</li>`
                            ).join('')}
                        </ul>
                    </div>
                    
                    <div class="test-outputs">
                        <strong>🎯 Expected vs 📤 Actual:</strong>
                        <ul>
                            ${results.map(result => `
                                <li class="${result.match ? 'output-match' : 'output-mismatch'}">
                                    ${result.widget} "${result.text}":<br>
                                    Expected: "${result.expected}"<br>
                                    Actual: "${result.actual}" ${result.match ? '✅' : '❌'}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
                
                <div class="total-score">
                    <h4>📊 คะแนน: ${passedCount}/${totalCount}</h4>
                </div>
            </div>
        `;
        
        const previewDiv = document.getElementById('guiPreview');
        previewDiv.innerHTML = resultHTML;
        
        if (passed) {
            showSuccess(`ทดสอบ TestCase เฉพาะผ่าน! คะแนน: ${passedCount}/${totalCount}`);
        } else {
            showError(`ทดสอบ TestCase เฉพาะไม่ผ่าน คะแนน: ${passedCount}/${totalCount}`);
        }
        
        return { passed, score: passedCount, maxScore: totalCount, results };
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการทดสอบ TestCase เฉพาะ:', error);
        showError('เกิดข้อผิดพลาดในการทดสอบ TestCase เฉพาะ: ' + error.message);
        return { passed: false, score: 0, maxScore: 1, results: [] };
    }
}

// เพิ่ม Event Listener สำหรับปุ่มใหม่
document.addEventListener('DOMContentLoaded', function() {
    // หาโค้ดส่วนนี้ (น่าจะอยู่ท้ายๆ ไฟล์ หรือใน setupEventListeners)
// ค้นหาโค้ดส่วนนี้ (มักจะอยู่ท้ายไฟล์ ใน document.addEventListener('DOMContentLoaded', ...))
const testCaseBtn = document.getElementById('testCaseBtn');
if (testCaseBtn) {
    testCaseBtn.addEventListener('click', async () => {
        // ตรวจสอบสถานะปุ่ม
        if (testCaseBtn.disabled) return;

        try {
            const resultFrame = document.getElementById('result-frame');
            if (!resultFrame || !resultFrame.srcdoc) {
                showError('กรุณาแสดง GUI ก่อนทดสอบ TestCase');
                return;
            }
            
            if (!window.problemTestCases || window.problemTestCases.length === 0) {
                showError('ไม่พบข้อมูล Test Cases');
                return;
            }
            
            const previewDiv = document.getElementById('guiPreview');
            previewDiv.innerHTML = '<div class="loading">กำลังทดสอบ Test Cases ทั้งหมด...</div>';
            
            let allResults = [];
            let passedCount = 0;
            let passedScore = 0;
            let totalCount = 0;
            let totalScore = 0;
            
            // วนลูปทดสอบทุกข้อ
            for (let i = 0; i < window.problemTestCases.length; i++) {
                const testCase = window.problemTestCases[i];
                console.log(`=== เริ่มทดสอบข้อที่ #${i + 1} ===`);
                const caseMaxScore = testCase.score || 1;
                totalCount += 1;
                totalScore += caseMaxScore;
                
                // Format ข้อมูล
                const formattedTestCase = {
                    inputs: (testCase.inputs || []).map(input => {
                        const widgetName = input.name || input.widget; 
                        const widgetDef = window.widgetDefinitions.find(w => w.name === widgetName) || {};
                        return {
                            name: widgetName, widget: widgetDef.type || 'Entry',
                            text: widgetDef.text || '', value: input.value
                        };
                    }),
                    actions: (testCase.actions || []).map(action => {
                        const widgetName = action.widget || action.name;
                        const widgetDef = window.widgetDefinitions.find(w => w.name === widgetName) || {};
                        return {
                            name: widgetName, widget: action.widget || widgetDef.type || 'Button',
                            text: action.text || widgetDef.text || '', state: action.state
                        };
                    }),
                    outputs: (testCase.outputs || []).map(output => {
                        const widgetName = output.widget || output.name;
                        const widgetDef = window.widgetDefinitions.find(w => w.name === widgetName) || {};
                        return {
                            name: widgetName,
                            widget: widgetName,
                            type: widgetDef.type || '',
                            text: widgetDef.text || '',
                            value: output.value
                        };
                    }),
                    explanation: testCase.explanation || ""
                };
                
                // เรียกฟังก์ชันทดสอบภายใน
                const result = await testSpecificTestCaseInternal(resultFrame.srcdoc, formattedTestCase, i + 1);
                
                // เช็คว่าผ่านหรือไม่ (เพื่อเก็บแต้ม)
                if (result && (result.passed === true || result.score > 0)) {
                    passedCount += 1;
                    passedScore += caseMaxScore;
                }
                allResults.push(result);
            }
            
            // แสดงผลตารางสรุป
            displayAllTestResults(allResults, passedCount, totalCount, passedScore, totalScore);
            
            console.log(`🏁 ผลการตรวจสอบ: ผ่าน ${passedCount} / ${totalCount} (คะแนน ${passedScore}/${totalScore})`);

            // ------------------------------------------------------------------
            // ✅ แก้ไข: เรียกฟังก์ชันอัปเดตคะแนนเสมอเพื่อให้ปุ่มส่งงานมีโอกาสเปิด
            // ------------------------------------------------------------------
            saveTestResults(passedScore, totalScore);
            console.log(`✅ อัปเดตคะแนนหน้าเว็บ: โบนัส Test case = ${passedScore}/${totalScore}`);
            
            if (passedScore === totalScore) {
                showYarnReward();
                showSuccess('ผ่าน Test Case ทั้งหมดแล้ว! กดส่งงานได้เลย');
            } else if (passedScore > 0) {
                showSuccess(`ผ่าน Test Case บางส่วน (${passedScore}/${totalScore}) กดส่งงานหรือแก้ไขเพิ่มเติมได้`);
            } else {
                showError('❌ ไม่ผ่าน Test Case เลย กรุณาแก้ไขแล้วทดสอบใหม่ (หรือกดส่งงานด้วยคะแนนปัจจุบัน)');
            }

        } catch (error) {
            console.error('Test Error:', error);
            showError('เกิดข้อผิดพลาด: ' + error.message);
        }
                    });
}
});
async function runPython() {
    // --- [ส่วนที่ต้องเพิ่ม] เริ่มต้น ---
    
    // 1. ล้างหน้าจอ GUI (ที่เป็น HTML)
    const guiContainer = document.querySelector(".gui-preview"); // หรือใช้ id ตามที่คุณตั้ง
    if (guiContainer) {
        guiContainer.innerHTML = ""; // ล้าง element เก่าทิ้งให้เกลี้ยง
    }

    // 2. ล้างค่าใน Python (Memory)
    try {
        await pyodide.runPythonAsync(`
            try:
                import tkinter
                if 'root' in globals():
                    root.destroy()
                    del root
            except:
                pass
        `);
    } catch (e) {
        // ไม่ต้องทำอะไรถ้า error แค่กันไว้
    }
    // --- [ส่วนที่ต้องเพิ่ม] จบ ---

    // 3. รันโค้ดนักเรียนต่อตามปกติ (โค้ดเดิมของคุณ)
    let code = editor.getValue();
    await pyodide.runPythonAsync(code);
}
// ฟังก์ชันสำหรับทดสอบ test case เดียว (แก้ไขใหม่ - ใช้ ID)
// ฟังก์ชันสำหรับทดสอบ test case เดียว (ฉบับแก้จุดบอด: จำ ID Widget ไว้ก่อนค่าจะเปลี่ยน)
async function testSpecificTestCaseInternal(generatedHTML, testCase, testNumber) {

    return new Promise((resolve) => {
        // สร้าง iframe แบบซ่อนเพื่อจำลองการทำงาน
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.srcdoc = generatedHTML;
        document.body.appendChild(iframe);
        
        iframe.onload = async () => {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                let passed = true;
                let details = [];
                
                console.log(`=== Started Test Case #${testNumber} ===`);

                // ==========================================
                // ✅ STEP 0: PRE-MAPPING (หัวใจสำคัญของการแก้นี้)
                // จำตัวตนของ Widget เป้าหมายไว้ "ก่อน" ที่จะทำการกดปุ่ม
                // ==========================================
                const outputMap = {}; // ใช้เก็บคู่ { index: elementID }
                
                if (testCase.outputs) {
                    testCase.outputs.forEach((output, index) => {
                        let targetElement = null;

                        // [NEW] ตรวจสอบ widget definition เพื่อเอา text มาใช้ในการหา (ถ้าไม่มีระบุมา)
                        if (!output.text && output.widget) {
                            const widgetDef = (window.widgetDefinitions || []).find(w => w.name === output.widget);
                            if (widgetDef && widgetDef.text) {
                                output.text = widgetDef.text;
                                console.log(`Step 0: พบข้อความ "${output.text}" สำหรับ widget "${output.widget}" จากนิยามโจทย์`);
                            }
                        }

                        // 1) ถ้าระบุชื่อ widget มา ให้จับจาก data-var ก่อน (แม่นสุด)
                        if (output.widget) {
                            targetElement = iframeDoc.querySelector(`[data-var="${output.widget}"]`);
                        }

                        // 2) หาจากข้อความเดิม (output.text) - ค้นหาแบบกว้างขึ้น (contains)
                        if (!targetElement && output.text) {
                            const allElements = Array.from(iframeDoc.querySelectorAll('.tk-label, .tk-button, button, input[type="button"], div, span, input[type="text"], .tk-entry'));
                            // ลองหาแบบตรงตัวก่อน (Exact Match)
                            targetElement = allElements.find(el => {
                                const elText = el.tagName === 'INPUT' ? el.value : el.textContent;
                                return elText && elText.trim() === output.text.trim();
                            });
                            // ถ้าไม่เจอ ลองหาแบบที่มีข้อความนั้นอยู่ข้างใน (Partial Match)
                            if (!targetElement) {
                                targetElement = allElements.find(el => {
                                    const elText = el.tagName === 'INPUT' ? el.value : el.textContent;
                                    return elText && elText.includes(output.text.trim());
                                });
                            }
                        }

                        // 3) หาจากค่าที่คาดหวัง (output.value) - กรณีที่ค่านี้ปรากฏตั้งแต่ต้น
                        if (!targetElement && output.value) {
                            const allElements = Array.from(iframeDoc.querySelectorAll('.tk-label, .tk-button, button, input[type="button"], div, span, input[type="text"], .tk-entry'));
                            targetElement = allElements.find(el => {
                                const elText = el.tagName === 'INPUT' ? el.value : el.textContent;
                                return elText && elText.trim() === output.value;
                            });
                        }

                        // 4) ค่อยลองจาก ID pattern ต่าง ๆ (Fallback สุดท้าย)
                        if (!targetElement) {
                            const possibleIds = [
                                `label_${output.widget}`,
                                `label_${String.fromCharCode(65 + index)}`, // label_A, label_B...
                                `output_${index + 1}`,
                                `label${index + 1}`
                            ];

                            for (const id of possibleIds) {
                                targetElement = iframeDoc.getElementById(id);
                                if (targetElement) break;
                            }
                        }

                        // 5) Fallback สุดท้าย: ถ้ายังไม่เจออะไรเลย ให้เลือกตัวตามลำดับของ type นั้นใน outputs
                        if (!targetElement) {
                            const widgetDef = (window.widgetDefinitions || []).find(w => w.name === output.widget);
                            const widgetType = widgetDef ? widgetDef.type : 'Label';
                            let selector = '.tk-label';
                            if (widgetType === 'Entry') selector = '.tk-entry, input[type="text"]';
                            else if (widgetType === 'Button') selector = '.tk-button, button, input[type="button"]';
                            else if (widgetType === 'Checkbutton') selector = '.tk-checkbox input, input[type="checkbox"]';
                            
                            // นับว่าใน outputs ก่อนหน้านี้ มี widget type เดียวกันกี่ตัว
                            let typeIndex = 0;
                            if (testCase.outputs) {
                                for (let j = 0; j < index; j++) {
                                    const prevDef = (window.widgetDefinitions || []).find(w => w.name === testCase.outputs[j].widget);
                                    if ((prevDef ? prevDef.type : 'Label') === widgetType) {
                                        typeIndex++;
                                    }
                                }
                            }
                            
                            const allElementsOfType = Array.from(iframeDoc.querySelectorAll(selector));
                            if (allElementsOfType[typeIndex]) {
                                targetElement = allElementsOfType[typeIndex];
                                console.log(`Step 0: Fallback เลือก ${widgetType} ตัวที่ ${typeIndex} สำหรับ "${output.text || 'Output'}"`);
                            }
                        }
                        
                        // ถ้าเจอตัวตนแล้ว ให้จด ID ไว้ (ถ้าไม่มี ID ให้สร้างยัดใส่เข้าไปเลย)
                        if (targetElement) {
                            if (!targetElement.id) {
                                targetElement.id = `temp_tracked_id_${Date.now()}_${index}`;
                            }
                            outputMap[index] = targetElement.id;
                            console.log(`Step 0: จดจำ Widget "${output.text}" ไว้ที่ ID: ${targetElement.id}`);
                        } else {
                            console.warn(`Step 0: หา Widget ต้นทางไม่เจอสำหรับ "${output.text}"`);
                        }
                    });
                }
                
                // ==========================================
                // STEP 1: ตั้งค่า Inputs
                // ==========================================
                if (testCase.inputs) {
                    for (let i = 0; i < testCase.inputs.length; i++) {
                        const input = testCase.inputs[i];
                        let inputElement = null;
                        
                        // หา input จาก ID pattern ต่างๆ
                        const possibleIds = [
                            `entry_number${i + 1}`, `entry_${i + 1}`, 
                            `input_${i + 1}`, `entry${i + 1}`,
                            `entry_${input.widget}` // กรณีชื่อตรงกับ widget name
                        ];
                        
                        for (const id of possibleIds) {
                            inputElement = iframeDoc.getElementById(id);
                            if (inputElement) break;
                        }
                        
                        // Fallback หา input ตัวที่ i ตามลำดับ
                        if (!inputElement) {
                            const allInputs = Array.from(iframeDoc.querySelectorAll('input[type="text"], input:not([type])'));
                            if (allInputs[i]) inputElement = allInputs[i];
                        }
                        
                        if (inputElement) {
                            inputElement.value = input.value;
                            // กระตุ้น Event เพื่อให้ JS ใน iframe รู้ตัว
                            inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                            inputElement.dispatchEvent(new Event('change', { bubbles: true }));
                            details.push(`✓ ตั้งค่า input ${i + 1} (${input.text || 'Entry'}): ${input.value}`);
                        } else {
                            details.push(`✗ ไม่พบช่อง Input สำหรับ: "${input.text}"`);
                            passed = false;
                        }
                    }
                }
                
                // ==========================================
                // STEP 2: ทำ Actions (กดปุ่ม / ติ๊กถูก)
                // ==========================================
                if (testCase.actions && testCase.actions.length > 0) {
                    for (let i = 0; i < testCase.actions.length; i++) {
                        const action = testCase.actions[i];
                        console.log(`Processing action: ${action.widget} -> ${action.state}`);

                        // กรณีเป็นปุ่ม (Button)
                        if (action.widget.includes('Button') || action.widget === 'vbcb' || action.state === 'pressed') {
                            const buttons = Array.from(iframeDoc.querySelectorAll('button, input[type="button"]'));
                            
                            // หาปุ่มที่ข้อความตรง หรือ data-var ตรง
                            let button = buttons.find(b => 
                                (b.textContent && b.textContent.includes(action.text)) || 
                                (b.getAttribute('data-var') === action.text)
                            );
                            
                            // Fallback: ถ้าหาไม่เจอ และมีปุ่มเดียว ให้กดปุ่มนั้นเลย
                            if (!button && buttons.length > 0 && testCase.actions.length === 1) {
                                button = buttons[0];
                            }

                            if (button) {
                                button.click();
                                details.push(`✓ กดปุ่ม "${action.text || 'Button'}"`);
                                
                                // **สำคัญ** รอให้ JS ทำงานและอัปเดต DOM
                                await new Promise(r => setTimeout(r, 200)); 
                            } else {
                                details.push(`✗ ไม่พบปุ่ม "${action.text}"`);
                                passed = false;
                            }
                        }
                        
                        // กรณีเป็น Checkbox
                        else if (action.widget.includes('Checkbutton') || action.widget.includes('Ck')) {
                            // หา checkbox (logic เดียวกับปุ่ม)
                            let cb = iframeDoc.querySelector(`input[type="checkbox"][data-var="${action.text}"]`);
                            if (!cb) {
                                // หาจาก label
                                const labels = Array.from(iframeDoc.querySelectorAll('label'));
                                const targetLabel = labels.find(l => l.textContent.includes(action.text));
                                if (targetLabel) {
                                    const id = targetLabel.getAttribute('for');
                                    if (id) cb = iframeDoc.getElementById(id);
                                }
                            }

                            if (cb) {
                                cb.checked = (action.state === 'checked');
                                cb.dispatchEvent(new Event('change', { bubbles: true }));
                                details.push(`✓ ตั้งค่า Checkbox "${action.text}" เป็น ${action.state}`);
                                await new Promise(r => setTimeout(r, 100));
                            } else {
                                details.push(`✗ ไม่พบ Checkbox "${action.text}"`);
                                passed = false;
                            }
                        }
                    }
                }

                // รอเวลาเพิ่มเติมเพื่อให้ UI อัปเดตเสร็จสมบูรณ์
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // ==========================================
                // STEP 3: ตรวจสอบ Outputs (ใช้ ID ที่จดไว้ใน Step 0)
                // ==========================================
                if (testCase.outputs) {
                    for (let i = 0; i < testCase.outputs.length; i++) {
                        const output = testCase.outputs[i];
                        let element = null;
                        let actualValue = '';

                        // 1) หาจาก ID ที่จดไว้ก่อน
                        if (outputMap[i]) {
                            element = iframeDoc.getElementById(outputMap[i]);
                        }

                        // 2) ถ้าไม่มี/หาไม่เจอ ลองหาจาก data-var
                        if (!element && output.widget) {
                            element = iframeDoc.querySelector(`[data-var="${output.widget}"]`);
                        }

                        // 3) fallback หา element ที่มีข้อความเท่ากับ expected (ปิดใช้งานเพื่อให้ตรวจตำแหน่งเข้มงวดขึ้น)
                        /*
                        if (!element && output.value) {
                            const allElements = Array.from(iframeDoc.querySelectorAll('.tk-label, .tk-button, button, input[type="button"], div, span, input[type="text"], input[type="checkbox"]'));
                            element = allElements.find(el => {
                                const tag = el.tagName.toLowerCase();
                                const type = tag === 'input' ? (el.getAttribute('type') || '') : '';
                                if (tag === 'input' && type === 'checkbox') {
                                    const expected = (output.value ?? '').toString().trim().toLowerCase();
                                    if (expected === 'checked' || expected === 'true' || expected === '1' || expected === 'yes') return el.checked === true;
                                    if (expected === 'unchecked' || expected === 'false' || expected === '0' || expected === 'no') return el.checked === false;
                                    return false;
                                }
                                if (tag === 'input') {
                                    return el.value && el.value.trim() === output.value;
                                }
                                return el.textContent && el.textContent.trim() === output.value;
                            });
                        }
                        */

                        if (element) {
                            const expectedRaw = (output.value ?? '').toString();
                            const expected = expectedRaw.trim();
                            const expectedLower = expected.toLowerCase();
                            const tagName = element.tagName.toLowerCase();
                            const inputType = tagName === 'input' ? (element.getAttribute('type') || '') : '';
                            const isCheckbox = (tagName === 'input' && inputType === 'checkbox') || output.type === 'Checkbutton';
                            const isInput = tagName === 'input' && inputType !== 'button' && inputType !== 'checkbox';
                            const isButton = tagName === 'button' || inputType === 'button' || element.classList.contains('tk-button') || output.type === 'Button';

                            if (isCheckbox) {
                                const widgetMeta = window.widgetDefinitions?.find(w => w.name === (output.widget || output.name)) || null;
                                const onvalue = widgetMeta?.onvalue != null ? widgetMeta.onvalue.toString() : '1';
                                const offvalue = widgetMeta?.offvalue != null ? widgetMeta.offvalue.toString() : '0';
                                const checked = !!element.checked;

                                if (/^-?\d+(\.\d+)?$/.test(expected)) {
                                    actualValue = checked ? onvalue : offvalue;
                                } else if (expectedLower === 'enabled' || expectedLower === 'disabled') {
                                    actualValue = element.disabled ? 'disabled' : 'enabled';
                                } else {
                                    actualValue = checked ? 'checked' : 'unchecked';
                                }
                            } else if (isInput) {
                                actualValue = (element.value || '').trim();
                            } else if (isButton && (expectedLower === 'disabled' || expectedLower === 'enabled')) {
                                actualValue = element.disabled ? 'disabled' : 'enabled';
                            } else if (tagName === 'input' && inputType === 'button') {
                                actualValue = ((element.value || element.getAttribute('value') || '') + '').trim();
                            } else {
                                actualValue = (element.textContent || '').trim();
                            }

                            const actualComparable = (actualValue || '').toString().trim();
                            
                            // [UPDATE] ใช้ compareText เพื่อรองรับภาษาไทยและมือถือ
                            const matches = (expectedLower === 'disabled' || expectedLower === 'enabled')
                                ? actualComparable.toLowerCase() === expectedLower
                                : compareText(actualComparable, expected);

                            if (matches) {
                                details.push(`✓ "${output.text || output.widget || 'Output'}" = "${actualValue}" (ถูกต้อง)`);
                            } else {
                                // ถ้า map ไปผิดตัว ให้ลองหาใหม่ด้วย expected อีกครั้ง (ปิดส่วนนี้เพื่อให้ไม่ผ่านถ้าอยู่ผิดที่)
                                let recovered = false;
                                /*
                                if (expected) {
                                    const allElements = Array.from(iframeDoc.querySelectorAll('.tk-label, .tk-button, button, input[type="button"], div, span, input[type="text"], input[type="checkbox"]'));
                                    const matchEl = allElements.find(el => {
                                        // ... (การค้นหา element ที่มีค่าตรงกัน)
                                        const tag = el.tagName.toLowerCase();
                                        const type = el.getAttribute('type') || '';
                                        const isCheckboxEl = tag === 'input' && type === 'checkbox';
                                        const isInputEl = tag === 'input' && type !== 'button' && type !== 'checkbox';
                                        const isButtonEl = tag === 'button' || type === 'button' || el.classList.contains('tk-button');

                                        if (isCheckboxEl) {
                                            if (expectedLower === 'checked' || expectedLower === 'true' || expectedLower === '1' || expectedLower === 'yes') return el.checked === true;
                                            if (expectedLower === 'unchecked' || expectedLower === 'false' || expectedLower === '0' || expectedLower === 'no') return el.checked === false;
                                            return false;
                                        }

                                        if (isInputEl) {
                                            return el.value && el.value.trim() === expected;
                                        }
                                        return el.textContent && el.textContent.trim() === expected;
                                    });
                                    if (matchEl) {
                                        // ... (ถอนการ recovery ออก)
                                        // recovered = true;
                                    }
                                }
                                */

                                if (!recovered) {
                                    // ระบบวิเคราะห์เพิ่มเติม: ลองหาดูว่าค่าที่คาดหวัง ไปโผล่ที่ Widget อื่นหรือไม่
                                    const allElements = Array.from(iframeDoc.querySelectorAll('.tk-label, .tk-button, button, input[type="button"], div, span'));
                                    const misplacedEl = allElements.find(el => {
                                        const val = (el.textContent || el.value || '').trim();
                                        return val === expected;
                                    });

                                    let diagnostic = `✗ "${output.text || 'Label'}": คาดหวัง "${output.value}" แต่ได้ "${actualValue}"`;
                                    if (misplacedEl) {
                                        const misplacedText = (misplacedEl.textContent || '').substring(0, 30).trim();
                                        diagnostic = `✗ "${output.text || 'Label'}": คาดหวัง "${output.value}" แต่ได้ "${actualValue}"\n   💡 (ตรวจพบว่าโค้ดของคุณส่งค่าไปผิดที่! พบผลลัพธ์ที่ถูกต้องปรากฏใน "${misplacedText}" แทน)`;
                                    }
                                    
                                    // [NEW DEBUG] Pull global variables from iframe to help diagnose
                                    try {
                                        const win = iframe.contentWindow;
                                        if (win) {
                                            const debugVars = ['A1', 'A2', 'A3', 'A5', '_ret'];
                                            const foundVars = [];
                                            debugVars.forEach(v => {
                                                if (typeof win[v] !== 'undefined') {
                                                    foundVars.push(`${v}=${win[v]}`);
                                                }
                                            });
                                            if (foundVars.length > 0) {
                                                diagnostic += `\n   🔍 (DEBUG JS: ${foundVars.join(', ')})`;
                                            }
                                            if (typeof win.cal2 === 'function') {
                                                diagnostic += `\n   📜 (cal2 Code: ${win.cal2.toString().replace(/\\n/g, ' ')})`;
                                            }
                                        }
                                    } catch(e) {}
                                    
                                    details.push(diagnostic);
                                    passed = false;
                                }
                            }
                        } else {
                            details.push(`✗ ไม่พบ Widget สำหรับผลลัพธ์: "${output.text || 'Output'}" (output Label ไม่ถูกต้อง)`);
                            passed = false;
                        }
                    }
                }
                
                // Cleanup: ลบ iframe ทิ้ง
                document.body.removeChild(iframe);

                // 👇👇 ลบอันเก่า แล้วแปะอันใหม่ตรงนี้เลยครับ 👇👇
                const caseScore = testCase.score || 1;      // ดึงคะแนนเต็มของข้อนี้ (ถ้าไม่มีให้เป็น 1)
                const earnedScore = passed ? caseScore : 0; // ถ้าผ่านก็ได้คะแนนเต็ม ถ้าไม่ผ่านได้ 0
                
                resolve({
                    testNumber,
                    passed,
                    details,
                    score: earnedScore,      // ส่งคะแนนจริงออกไป
                    maxScore: caseScore      // ส่งคะแนนเต็มออกไป
                });
                
            } catch (error) {
                console.error("Error in testSpecificTestCaseInternal:", error);
                // Cleanup ในกรณี Error
                if (iframe.parentNode) document.body.removeChild(iframe);
                
                resolve({ 
                    testNumber, 
                    passed: false, 
                    details: [`System Error: ${error.message}`], 
                    score: 0 
                });
            }
        };
    });
}

// ฟังก์ชันแสดงผลรวมทั้งหมด
function displayAllTestResults(results, totalPassed, totalTests, passedScore = totalPassed, totalScore = totalTests) {
    const previewDiv = document.getElementById('guiPreview');
    
    let html = `
        <div style="padding: 20px; background: #f5f5f5; border-radius: 8px; margin: 10px 0;">
            <h3 style="color: #333; margin-bottom: 15px;">📋 ผลการทดสอบ Test Cases ทั้งหมด</h3>
            <div style="background: ${totalPassed === totalTests ? '#d4edda' : '#f8d7da'}; 
                        color: ${totalPassed === totalTests ? '#155724' : '#721c24'}; 
                        padding: 10px; border-radius: 5px; margin-bottom: 15px; font-weight: bold;">
                ผลรวม: ${totalPassed}/${totalTests} ผ่าน (คะแนน: ${passedScore}/${totalScore})
            </div>
    `;
    
    results.forEach((result, index) => {
        const statusColor = result.passed ? '#28a745' : '#dc3545';
        const statusIcon = result.passed ? '✅' : '❌';
        
        html += `
            <div style="border: 1px solid #ddd; border-radius: 5px; margin-bottom: 10px; overflow: hidden;">
                <div style="background: ${statusColor}; color: white; padding: 10px; font-weight: bold;">
                    ${statusIcon} Test Case ${result.testNumber} - ${result.passed ? 'ผ่าน' : 'ไม่ผ่าน'}
                </div>
                <div style="padding: 10px; background: white;">
                    ${result.details.map(detail => `<div style="margin: 2px 0;">${detail}</div>`).join('')}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    previewDiv.innerHTML = html;
}
// ==========================================
// 🔧 FORCE FIX: บังคับแก้สีตัวแปร (Variable Color)
// ==========================================
// ==========================================
// 🔧 FORCE FIX: บังคับแก้สีตัวแปร (Variable Color)
// ==========================================
const fixVariableColor = setInterval(() => {
    if (window.Prism && Prism.languages.python) {
        
        // สั่งให้รู้จัก "ตัวแปร" ใน 2 กรณี:
        // 1. หน้าเครื่องหมาย = (เช่น mylabel = ...)
        // 2. หน้าจุด . (เช่น mylabel.pack())
        Prism.languages.insertBefore('python', 'operator', {
            'variable-assignment': {
                // จับคำที่อยู่หน้า = หรือ หน้า .
                pattern: /(?:^|[^\p{L}\p{N}_])[\p{L}_][\p{L}\p{N}_]*(?=\s*=\s*(?!=))|(?:^|[^\p{L}\p{N}_])[\p{L}_][\p{L}\p{N}_]*(?=\s*\.)/u, 
                alias: 'variable' 
            }
        });

        console.log("✅ Custom Syntax Highlighting Applied (Assignment & Methods)!");

        if (typeof updateCodeHighlight === 'function') {
            updateCodeHighlight();
        }

        clearInterval(fixVariableColor);
    }
}, 500);

// ==========================================
// 🔄 RESET BUTTON LOGIC: ปุ่มเริ่มใหม่ (Reset Code)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // รอจนกว่าหน้าเว็บจะโหลดเสร็จ
    setTimeout(() => {
        const resetBtn = document.getElementById('resetBtn');
        const codeEditor = document.getElementById('codeEditorTextarea');

        if (resetBtn && codeEditor) {
            console.log("✅ Reset button initialized");
            
            resetBtn.addEventListener('click', function() {
                // 1. ถามยืนยันเพื่อความปลอดภัย
                if (confirm('⚠️ คุณต้องการล้างโค้ดทั้งหมดและเริ่มใหม่ใช่หรือไม่?\n\n(โค้ดปัจจุบันจะหายไป และกลับไปเป็นค่าเริ่มต้น)')) {
                    
                    // 2. เตรียม Template เริ่มต้น
                    let startCode = `# เขียนโค้ด Python ที่นี่\n\nimport tkinter as tk\n\n# สร้างหน้าต่าง GUI\nwindow = tk.Tk()\nwindow.title('My GUI Application')\n\n# เพิ่ม widgets ที่นี่\n\n# แสดงหน้าต่าง\nwindow.mainloop()`;

                    // 3. ถ้าโจทย์ข้อนี้มี Template เฉพาะ (จาก Database) ให้ใช้ของโจทย์
                    if (window.problemData && window.problemData.templateCode) {
                        startCode = window.problemData.templateCode;
                    }

                    // 4. ใส่โค้ดลงใน Editor
                    codeEditor.value = startCode;

                    // 5. สั่งรีเฟรชหน้าจอ (เลขบรรทัด + ไฮไลท์สี)
                    if (typeof updateLineNumbers === 'function') updateLineNumbers();
                    if (typeof updateCodeHighlight === 'function') updateCodeHighlight();
                    
                    // 6. ล้างหน้าจอผลลัพธ์ (Preview) ให้โล่ง
                    const resultFrame = document.getElementById('result-frame');
                    if (resultFrame) resultFrame.srcdoc = '';
                    
                    const guiPreview = document.getElementById('guiPreview');
                    if (guiPreview) guiPreview.innerHTML = ''; // ล้างข้อความผลตรวจเก่า

                    // 7. รีเซ็ตปุ่มต่างๆ กลับสู่สถานะเริ่มต้น
                    const convertBtn = document.getElementById('convertBtn');
                    const testBtn = document.getElementById('testBtn');
                    const testCaseBtn = document.getElementById('testCaseBtn');
                    
                    if (convertBtn) convertBtn.disabled = true; // ต้อง Check ใหม่ก่อน Run
                    if (testBtn) testBtn.disabled = true;
                    if (testCaseBtn) testCaseBtn.disabled = true;

                    // 8. แสดงข้อความแจ้งเตือนเล็กๆ (Optional)
                    // alert("รีเซ็ตโค้ดเรียบร้อยแล้ว");
                }
            });
        }
    }, 1000); // รอ 1 วินาทีเผื่อ Element สร้างไม่เสร็จ
});
// ฟังก์ชันสำหรับอัปเดตตัวเลขบนหน้าจอ
// ฟังก์ชันบันทึกและอัปเดตคะแนน (ฉบับแก้ไขตรงตาม HTML ของคุณ)
// ฟังก์ชันบันทึกและอัปเดตคะแนน (เพิ่มการปลดล็อกปุ่มส่งงาน)
function saveTestResults(additionalScore, runMaxScore) {
    const newBonusScore = parseInt(additionalScore) || 0;
    const newBonusMaxScore = parseInt(runMaxScore) || 0;

    guiTestCaseBonus.maxScore = newBonusMaxScore > 0 ? newBonusMaxScore : (guiTestCaseBonus.maxScore || 0);
    guiTestCaseBonus.score = Math.max(guiTestCaseBonus.score || 0, newBonusScore);

    const displayScore = (guiBaseResult?.score || 0) + (guiTestCaseBonus.score || 0);
    const displayMaxScore = (guiBaseResult?.maxScore || 0) + (guiTestCaseBonus.maxScore || 0);

    // 1. ดึง Element ตาม ID จริงในไฟล์ HTML
    const currentScoreEl = document.getElementById('currentScore');
    const maxScoreEl = document.getElementById('maxScore');
    const percentEl = document.getElementById('scorePercentage');
    const submitBtn = document.getElementById('submitBtn'); // <--- ดึงปุ่มส่งงานมาด้วย

    if (!currentScoreEl || !maxScoreEl) {
        console.error("❌ หา Element แสดงคะแนนไม่เจอ");
        return;
    }

    console.log(`อัปเดตโบนัส Test case: ${guiTestCaseBonus.score}/${guiTestCaseBonus.maxScore}`);

    currentScoreEl.innerText = displayScore;
    maxScoreEl.innerText = displayMaxScore;

    if (percentEl) {
        const percentage = displayMaxScore > 0 ? Math.round((displayScore / displayMaxScore) * 100) : 0;
        percentEl.innerText = `${percentage}%`;
        
        // เปลี่ยนสี ProgressBar หรือ Text ตามความสวยงาม
        const scoreContainer = document.querySelector('.score-container');
        if (scoreContainer) {
            scoreContainer.classList.remove('perfect', 'good', 'poor');
            if (percentage >= 100) scoreContainer.classList.add('perfect');
            else if (percentage >= 70) scoreContainer.classList.add('good');
            else scoreContainer.classList.add('poor');
        }
    }

    if (submitBtn && guiBaseResult?.passed === true) {
        // ให้ส่งงานได้เฉพาะเมื่อได้คะแนนเต็ม (คะแนนเท่ากับคะแนนเต็ม) เท่านั้น
        if (displayMaxScore > 0 && displayScore === displayMaxScore) {
            if (problemData?.assignmentType === 'exam') {
                // ข้อสอบ ส่ง Auto ทันทีที่ผ่าน
                submitBtn.style.display = 'none';
                
                // ดึงข้อมูลเพิ่มเติมเพื่อส่ง
                const codeEditor = document.getElementById('codeEditorTextarea');
                const urlParams = new URLSearchParams(window.location.search);
                const problemId = urlParams.get('id');
                const userId = auth.currentUser ? auth.currentUser.uid : '';
                let classId = urlParams.get('classId');
                if (!classId && document.referrer) {
                    const refUrl = new URL(document.referrer);
                    const refParams = new URLSearchParams(refUrl.search);
                    classId = refParams.get('id');
                }
                if (!classId && problemData?.classId) classId = problemData.classId;
                
                submitGUICode(codeEditor?.value || '', problemId, userId, classId);
            } else {
                // แบบฝึกหัด ไม่ส่ง Auto ให้เปิดปุ่มส่งงานแทน
                submitBtn.disabled = false;
                submitBtn.style.opacity = "1";
                submitBtn.style.cursor = "pointer";
            }
        } else {
            submitBtn.disabled = true;
            submitBtn.style.opacity = "0.5";
            submitBtn.style.cursor = "not-allowed";
        }
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
// ฟังก์ชันบันทึกโค้ดแบบ Draft (บันทึกเมื่อกดแสดง GUI)
async function saveDraftCode(code) {
    const urlParams = new URLSearchParams(window.location.search);
    const problemId = urlParams.get('id');
    const classId = urlParams.get('classId');
    const userId = auth.currentUser?.uid;

    if (!problemId || !userId) return;

    try {
        await db.collection('submissions').add({
            problemId: problemId,
            studentId: userId, // ✅ แก้เป็น studentId
            classId: classId || null,
            code: code,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            type: 'gui',
            status: 'draft',
            score: 0,
            maxScore: 0,
            note: 'Auto-saved'
        });
        console.log("💾 Auto-saved draft.");
    } catch (error) {
        console.error("Failed to auto-save:", error);
    }
}
// ฟังก์ชันสร้างปุ่มลิงก์แนบ (ไม่กินที่)
function renderAttachmentsHTML(attachments) {
    if (!attachments || !Array.isArray(attachments) || attachments.length === 0) return '';

    let html = '<div class="attachments-cta">';
    html += '<div class="attachments-title">📎 สื่อประกอบการเรียนรู้</div>';
    html += '<div class="attachments-grid">';

    attachments.forEach(att => {
        const type = (att?.type || 'link').toString().toLowerCase();
        const rawTitle = (att?.title || '').toString().trim();
        const titleUpper = rawTitle.toUpperCase();
        const isGenericTitle = !rawTitle || titleUpper === 'LABEL' || titleUpper === 'LINK' || rawTitle === 'เปิดลิงก์';

        let icon = '🔗';
        let mainText = 'เปิดสื่อ';
        let variant = 'link';
        if (type === 'youtube') {
            icon = '▶️';
            mainText = 'ดูวิดีโอ';
            variant = 'youtube';
        } else if (type === 'pdf') {
            icon = '📄';
            mainText = 'เปิดเอกสาร';
            variant = 'pdf';
        } else if (type === 'image') {
            icon = '🖼️';
            mainText = 'ดูรูปภาพ';
            variant = 'image';
        }

        const subText = isGenericTitle ? 'แตะเพื่อเปิด' : rawTitle;

        html += `
            <a href="javascript:void(0);" onclick="openMediaModal('${att.url}')" class="attachment-card attachment-card--${variant}">
                <span class="attachment-icon" aria-hidden="true">${icon}</span>
                <span class="attachment-text">
                    <span class="attachment-main">${mainText}</span>
                    <span class="attachment-sub">${subText}</span>
                </span>
            </a>
        `;
    });

    html += '</div></div>';
    return html;
}

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

function playScoreAnimation(earnedScore, maxScore) {
    return new Promise(resolve => {
        let overlay = document.getElementById('scoreAnimationOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'scoreAnimationOverlay';
            overlay.innerHTML = `
                <div class="score-animation-content">
                    <div class="score-animation-title">คะแนนที่ได้</div>
                    <div class="score-animation-number" id="animScoreNumber">0</div>
                    <div class="score-animation-label">จากคะแนนเต็ม ${maxScore}</div>
                </div>
            `;
            document.body.appendChild(overlay);
        } else {
            overlay.querySelector('.score-animation-label').innerText = `จากคะแนนเต็ม ${maxScore}`;
        }
        
        overlay.style.display = 'flex';
        const numberEl = document.getElementById('animScoreNumber');
        numberEl.classList.remove('done');
        numberEl.innerText = '0';
        
        let current = 0;
        const duration = 1500;
        const fps = 60;
        const totalFrames = Math.max(1, duration / (1000 / fps));
        const increment = earnedScore / totalFrames;
        
        let frame = 0;
        const timer = setInterval(() => {
            frame++;
            current += increment;
            if (frame >= totalFrames || current >= earnedScore) {
                clearInterval(timer);
                current = earnedScore;
                numberEl.innerText = Math.round(current);
                numberEl.classList.add('done');
                setTimeout(() => {
                    overlay.style.display = 'none';
                    resolve();
                }, 1500);
            } else {
                numberEl.innerText = Math.round(current);
            }
        }, 1000 / fps);
    });
}
