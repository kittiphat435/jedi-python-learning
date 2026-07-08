let savedWidgets = [];
// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDWiPuk0WP9z5_mjDe1FkqeVZ-vcYClyLs",
    authDomain: "python-learning-platform-596e1.firebaseapp.com",
    projectId: "python-learning-platform-596e1",
    storageBucket: "python-learning-platform-596e1.firebasestorage.app",
    messagingSenderId: "5262153531",
    appId: "1:5262153531:web:55f6246093e1780003491e"
};


// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();
// เพิ่มการตรวจสอบอีเมลแอดมิน
const ADMIN_EMAIL = "kitti2@thawara.ac.th";

// ฟังก์ชันตรวจสอบว่าเป็นแอดมินหรือไม่
function checkAdminAccess(user) {
    if (user.email !== ADMIN_EMAIL) {
        alert("คุณไม่มีสิทธิ์เข้าถึงหน้านี้ เฉพาะแอดมินเท่านั้น");
        window.location.href = "index.html";
        return false;
    }
    return true;
}
const defaultAvatar = `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <path fill="#999" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
    </svg>
  `)}`;
function getProfileImage(user) {
    if (!user || !user.photoURL) {
        return defaultAvatar;
    }

    // Cache รูปภาพใน localStorage
    const cachedImage = localStorage.getItem(`profileImage_${user.uid}`);
    if (cachedImage) {
        return cachedImage;
    }

    // ถ้าไม่มี cache ให้ใช้ defaultAvatar ก่อน แล้วค่อยๆ โหลดรูปจริง
    setTimeout(() => {
        fetch(user.photoURL)
            .then(response => response.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    localStorage.setItem(`profileImage_${user.uid}`, reader.result);
                    const profileImages = document.querySelectorAll(`.profile-image[data-uid="${user.uid}"]`);
                    profileImages.forEach(img => img.src = reader.result);
                };
                reader.readAsDataURL(blob);
            })
            .catch(() => {
                localStorage.setItem(`profileImage_${user.uid}`, defaultAvatar);
            });
    }, 1000);

    return defaultAvatar;
}
// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    addSaveWidgetButton();
    // อ้างอิง <textarea> โดยตรง
    const template = document.getElementById('guiTemplate');
    const solution = document.getElementById('guiSolution'); // เพิ่มอ้างอิงไปยัง textarea สำหรับเฉลย
    const editNameBtn = document.getElementById('editNameBtn');
    const editNameForm = document.getElementById('editNameForm');
    const saveNameBtn = document.getElementById('saveNameBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const createClassBtn = document.getElementById('createClassBtn');
    const createProblemBtn = document.getElementById('createProblemBtn');
    const guiRequirements = document.getElementById('guiRequirements');
    if (guiRequirements) {
        const observer = new MutationObserver(() => {
            savedWidgets = getWidgetsFromRequirements();
            refreshTestCaseActions(); // รีเฟรช dropdown การกระทำ
        });

        observer.observe(guiRequirements, {
            childList: true,
            subtree: true,
            attributes: true
        });

        guiRequirements.addEventListener('input', () => {
            savedWidgets = getWidgetsFromRequirements();
            refreshTestCaseActions(); // รีเฟรช dropdown การกระทำ
        });
    }
    if (window.editor) {
        window.editor.toTextArea(); // แปลงกลับเป็น textarea
    }
    if (window.solutionEditor) {
        window.solutionEditor.toTextArea(); // แปลงกลับเป็น textarea สำหรับเฉลย
    }

    // ใช้ค่าเริ่มต้นจาก <textarea> ใน HTML โดยไม่ต้องตั้งค่า defaultCode
    const initialCode = template.value.trim(); // ดึงค่าเริ่มต้นจาก <textarea>
    const initialSolution = solution ? solution.value.trim() : ''; // ดึงค่าเริ่มต้นของเฉลย

    // สร้าง CodeMirror ใหม่แบบไม่มีการเยื้อง
    window.editor = CodeMirror.fromTextArea(template, {
        mode: 'python',
        lineNumbers: true,
        indentUnit: 0,
        indentWithTabs: false,
        tabSize: 0,
        smartIndent: false,
        flattenSpans: false,
        viewportMargin: Infinity,
        lineWrapping: true
    });

    // บังคับให้ทำงานในโหมด no-indent
    window.editor.setOption('extraKeys', {
        Tab: function(cm) {
            // ไม่ต้องทำอะไรเมื่อกด Tab
        }
    });
    
    // เพิ่ม CodeMirror สำหรับเฉลย
    if (solution) {
        window.solutionEditor = CodeMirror.fromTextArea(solution, {
            mode: 'python',
            lineNumbers: true,
            indentUnit: 0,
            indentWithTabs: false,
            tabSize: 0,
            smartIndent: false,
            flattenSpans: false,
            viewportMargin: Infinity,
            lineWrapping: true,
            theme: 'elegant' // หรือใช้ theme อื่นที่ต่างจาก template เพื่อแยกความแตกต่าง
        });

        // บังคับให้ทำงานในโหมด no-indent เช่นเดียวกัน
        window.solutionEditor.setOption('extraKeys', {
            Tab: function(cm) {
                // ไม่ต้องทำอะไรเมื่อกด Tab
            }
        });
        
        // ปรับแต่ง CSS เพื่อให้เห็นชัดเจนว่าเป็นเฉลย
        const solutionWrapper = window.solutionEditor.getWrapperElement();
        solutionWrapper.style.border = '1px solid #4CAF50';
        solutionWrapper.style.backgroundColor = '#f8fff8';
    }
    
    const editor = window.editor;
    
    // ปรับสไตล์ wrapper
    editor.getWrapperElement().style.border = '1px solid #333';
    editor.getWrapperElement().style.padding = '0';
    editor.getWrapperElement().style.maxWidth = '600px';
    editor.getWrapperElement().style.width = '100%';
    editor.getWrapperElement().style.boxSizing = 'border-box';
    
    // เพิ่มสไตล์ CSS สำหรับ token ต่างๆ
    const style = document.createElement('style');
    style.textContent = `
    /* แก้ไขการแสดงผล tokens ของ Python */
    .cm-s-default .cm-keyword,
    .cm-s-default .cm-builtin,
    .cm-s-default .cm-operator,
    .cm-s-default .cm-variable,
    .cm-s-default .cm-string,
    .cm-s-default .cm-number,
    .cm-s-default .cm-comment {
      margin-left: 0 !important;
      padding-left: 0 !important;
      text-indent: 0 !important;
    }
    
    /* แก้ไขการเยื้องบรรทัดแรก */
    .CodeMirror pre.CodeMirror-line:first-child,
    .CodeMirror pre.CodeMirror-line:first-child > span,
    .CodeMirror pre.CodeMirror-line:first-child > span > span {
      margin-left: 0 !important;
      padding-left: 0 !important;
      text-indent: 0 !important;
    }
      /* กำหนดการเยื้องแบบคงที่สำหรับทุก line */
  .CodeMirror-line > span {
    margin-left: 5ch !important; /* เยื้อง 5 ตัวอักษร */
    padding-left: 0 !important;
    text-indent: 0 !important;
  }
  
  /* ยกเว้นการเยื้องของเลขบรรทัด */
  .CodeMirror-gutter-text {
    margin-left: 0 !important;
  }
  `;
    document.head.appendChild(style);
    editor.refresh();

    // ปรับ gutter
    const gutterElement = editor.getGutterElement();
    if (gutterElement) {
        gutterElement.style.paddingLeft = '5px';
        gutterElement.style.paddingRight = '5px';
    }

    // ตั้งค่าเริ่มต้นใน CodeMirror โดยใช้ initialCode
    editor.setValue(initialCode);

    // ฟังก์ชันเพิ่มเติมเพื่อแก้ไข indentation
    setTimeout(() => {
        document.querySelectorAll('.CodeMirror .cm-indent').forEach(el => {
          el.style.width = '0px';
          el.style.display = 'none';
        });
        
        const content = document.querySelector('.CodeMirror-code');
        if (content) {
          content.style.marginLeft = '0';
          content.style.paddingLeft = '0';
        }
        
        const sizer = document.querySelector('.CodeMirror-sizer');
        if (sizer) {
          const lineNumbers = document.querySelector('.CodeMirror-linenumbers');
          const lineNumbersWidth = lineNumbers ? lineNumbers.offsetWidth : 30;
          sizer.style.marginLeft = `${lineNumbersWidth}px`;
        }
        
        document.querySelectorAll('.CodeMirror-line').forEach(line => {
          Array.from(line.children).forEach(child => {
            if (child.tagName.toLowerCase() === 'span') {
              child.style.marginLeft = '0';
              child.style.paddingLeft = '0';
              child.style.textIndent = '0';
              
              const firstToken = child.firstChild;
              if (firstToken && firstToken.nodeType === Node.ELEMENT_NODE) {
                firstToken.style.marginLeft = '0';
                firstToken.style.paddingLeft = '0';
                firstToken.style.textIndent = '0';
              }
            }
          });
        });
        
        editor.refresh();
    }, 200);

    function fixCodeMirrorIndentation() {
        const cmLines = document.querySelectorAll('.CodeMirror-line');
        const cmSpans = document.querySelectorAll('.CodeMirror-line > span, .CodeMirror-line span > span');
        
        cmLines.forEach(line => {
          line.style.paddingLeft = '0';
          line.style.textIndent = '0';
          line.style.marginLeft = '0';
        });
        
        cmSpans.forEach(span => {
          span.style.paddingLeft = '0';
          span.style.textIndent = '0'; 
          span.style.marginLeft = '0';
        });
        
        editor.refresh();
    }
    
    setTimeout(fixCodeMirrorIndentation, 100);
    editor.on('change', fixCodeMirrorIndentation);

    // Event listeners สำหรับการจัดการ UI
   

    if (editNameBtn) {
        editNameBtn.addEventListener('click', () => {
            document.getElementById('displayName').style.display = 'none';
            editNameForm.style.display = 'block';
        });
    }

    if (saveNameBtn) {
        saveNameBtn.addEventListener('click', updateDisplayName);
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            document.getElementById('displayName').style.display = 'block';
            editNameForm.style.display = 'none';
        });
    }

    if (createClassBtn) {
        createClassBtn.addEventListener('click', createClass);
    }

    
    if (createProblemBtn) {
        createProblemBtn.addEventListener('click', () => {
            // รีเซ็ตฟอร์มก่อนแสดง modal
            const form = document.getElementById('problemForm');
            if (form) {
                form.reset();
                form.removeAttribute('data-problem-id');
            }
            
            // รีเซ็ต CodeMirror editor
            if (window.editor) {
                window.editor.setValue(`from tkinter import *
from tkinter import ttk
    
root = Tk()
root.title("โปรแกรมของฉัน")
root.geometry("400x300")
    
# เขียนโค้ดตรงนี้   
    
root.mainloop()`);
            }
            
            // ล้าง requirements
            const guiRequirements = document.getElementById('guiRequirements');
            if (guiRequirements) {
            guiRequirements.innerHTML = '';
            }

            // รีเซ็ต savedWidgets
            savedWidgets = [];
            
            // รีเซ็ต matching questions และ answers (ถ้ามี)
            const matchingQuestionsList = document.getElementById('matchingQuestionsList');
            const matchingAnswersList = document.getElementById('matchingAnswersList');
            if (matchingQuestionsList) matchingQuestionsList.innerHTML = '';
            if (matchingAnswersList) matchingAnswersList.innerHTML = '';
            
            // รีเซ็ต comprehension questions (ถ้ามี)
            const questionsList = document.getElementById('questionsList');
            if (questionsList) questionsList.innerHTML = '';
            
            // รีเซ็ต test cases สำหรับโจทย์ Python (ถ้ามี)
            const testCasesList = document.getElementById('testCasesList');
            if (testCasesList) testCasesList.innerHTML = '';
            
            // รีเซ็ตค่าอื่นๆ
            const preview = document.getElementById('guiPreview');
            const imagePreview = document.getElementById('guiImagePreview');
            const validationMessage = document.getElementById('guiValidationMessage');
            if (preview) {
                preview.style.display = 'none';
                preview.innerHTML = '';
            }
            if (imagePreview) {
                imagePreview.style.display = 'none';
                imagePreview.innerHTML = '';
            }
            if (validationMessage) validationMessage.style.display = 'none';
            
            // กำหนด problemType เป็น python และเรียก toggleProblemTypeFields
            if (document.getElementById('problemType')) {
                document.getElementById('problemType').value = 'gui';
                toggleProblemTypeFields();
            }
            
            // แสดง modal
            const modal = document.getElementById('problemModal');
            const modalTitle = document.getElementById('modalTitle');
            if (modal) {
                modal.style.display = 'flex';
                if (modalTitle) modalTitle.textContent = 'สร้างโจทย์ใหม่';
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.signOut().then(() => {
                window.location.href = 'index.html';
            }).catch((error) => {
                console.error('Error signing out:', error);
            });
        });
    }
});






window.toggleProblemTypeFields = function () {
    const problemType = document.getElementById('problemType').value;
    const sections = ['pythonSection', 'comprehensionContentGroup', 'questionsSection', 'matchingSection', 'flowchartSection', 'guiSection', 'summarySection', 'iotSection'];

    sections.forEach(section => {
        const element = document.getElementById(section);
        if (element) {
            element.style.display = 'none';
        }
    });

    if (problemType === 'flowchart') {
        document.getElementById('flowchartSection').style.display = 'block';
        if (!window.flowchartEditor) {
            window.flowchartEditor = new FlowchartEditor('flowchartCanvas');
        }
    } else if (problemType === 'python') {
        document.getElementById('pythonSection').style.display = 'block';
    } else if (problemType === 'comprehension') {
        document.getElementById('comprehensionContentGroup').style.display = 'block';
        document.getElementById('questionsSection').style.display = 'block';
    } else if (problemType === 'matching') {
        document.getElementById('matchingSection').style.display = 'block';
    } else if (problemType === 'gui') {
        document.getElementById('guiSection').style.display = 'block';
        // เรียก addSaveWidgetButton หลังจากแสดง guiSection
        setTimeout(() => {
            addSaveWidgetButton();
        }, 100); // เพิ่ม delay เพื่อให้แน่ใจว่า DOM อัพเดตแล้ว
    } else if (problemType === 'summary') {
        document.getElementById('summarySection').style.display = 'block';
    } else if (problemType === 'iot') {
        document.getElementById('pythonSection').style.display = 'block';
        const iotSection = document.getElementById('iotSection');
        if (iotSection) iotSection.style.display = 'block';
    } else if (problemType === 'iot_gui') {
        const iotSection = document.getElementById('iotSection');
        if (iotSection) iotSection.style.display = 'block';
        const guiSection = document.getElementById('guiSection');
        if (guiSection) {
            guiSection.style.display = 'block';
            setTimeout(() => {
                addSaveWidgetButton();
            }, 100);
        }
    }
};


function refreshTestCaseActions() {
    const testCases = document.querySelectorAll('#guiTestCasesList .test-case');
    testCases.forEach(testCase => {
        const actionList = testCase.querySelector('.action-list');
        if (!actionList) return;

        const actionEntries = Array.from(actionList.querySelectorAll('.action-entry'));
        let widgets = savedWidgets.length ? savedWidgets : [];

        // ถ้า savedWidgets ว่างเปล่า ลองโหลดจาก DOM
        if (widgets.length === 0) {
            console.log('refreshTestCaseActions: savedWidgets ว่างเปล่า ลองโหลดจาก DOM');
            widgets = getWidgetsFromRequirements();
            if (widgets.length === 0) {
                console.log('refreshTestCaseActions: ไม่พบ widgets ใน DOM กรุณากด "Save Widget Requirements" ก่อน');
                actionEntries.forEach(entry => {
                    const actionSelect = entry.querySelector('.action-widget');
                    const actionStateSelect = entry.querySelector('.action-state');
                    if (!actionSelect || !actionStateSelect) return;
                    actionSelect.innerHTML = '<option value="">เลือก Widget</option>';
                    actionStateSelect.innerHTML = '<option value="">เลือกสถานะ</option>';
                    actionStateSelect.disabled = true;
                });
                return;
            }
            savedWidgets = widgets;
            window.savedWidgets = [...savedWidgets];
        }

        const actionOptions = widgets
            .filter(widget => widget.type && widget.name && ['Button', 'Checkbutton', 'Radiobutton'].includes(widget.type))
            .map(widget => `<option value="${widget.name}" data-type="${widget.type}">${widget.type}: ${widget.text || widget.name}${widget.action ? ` (${widget.action})` : ''}</option>`)
            .join('');

        actionEntries.forEach(entry => {
            const actionSelect = entry.querySelector('.action-widget');
            const actionStateSelect = entry.querySelector('.action-state');
            if (!actionSelect || !actionStateSelect) return;

            const currentAction = actionSelect.value;
            const currentState = actionStateSelect.value;

            // อัพเดต dropdown และรีเซ็ตถ้า widget ไม่มีอยู่ใน requirements
            actionSelect.innerHTML = `
                <option value="">เลือก Widget</option>
                ${actionOptions}
            `;
            if (currentAction && widgets.some(widget => widget.name === currentAction && widget.type)) {
                actionSelect.value = currentAction;
            } else {
                actionSelect.value = ''; // รีเซ็ตถ้า widget หายไป
            }

            // อัพเดตสถานะหลังจากเปลี่ยน widget
            updateActionState(actionSelect);

            // รักษาค่าสถานะเดิมถ้ามี
            if (actionSelect.value && currentState && actionStateSelect.querySelector(`option[value="${currentState}"]`)) {
                actionStateSelect.value = currentState;
                console.log(`refreshTestCaseActions: รักษาค่าสถานะเดิม '${currentState}' สำหรับ widget '${actionSelect.value}'`);
            } else {
                actionStateSelect.value = '';
                console.log(`refreshTestCaseActions: รีเซ็ตสถานะสำหรับ widget '${actionSelect.value}'`);
            }

            // เปิดใช้งาน dropdown หากมีตัวเลือก
            if (actionStateSelect.options.length > 1) {
                actionStateSelect.disabled = false;
                actionStateSelect.dispatchEvent(new Event('change'));
            }
        });
    });
}


function addSaveWidgetButton() {
    // หาตำแหน่งของ #guiRequirements และ #guiTestCasesList
    const guiRequirements = document.getElementById('guiRequirements');
    const guiTestCasesList = document.getElementById('guiTestCasesList');

    if (!guiRequirements) {
        console.error('addSaveWidgetButton: ไม่พบ #guiRequirements ใน DOM');
        return;
    }
    if (!guiTestCasesList) {
        console.error('addSaveWidgetButton: ไม่พบ #guiTestCasesList ใน DOM');
        return;
    }
    if (!guiTestCasesList.parentNode) {
        console.error('addSaveWidgetButton: #guiTestCasesList ไม่มี parent node');
        return;
    }

    // ตรวจสอบว่า #guiSection ถูกซ่อนหรือไม่
    const guiSection = document.getElementById('guiSection');
    if (guiSection && guiSection.style.display === 'none') {
        console.log('addSaveWidgetButton: #guiSection ถูกซ่อนอยู่ รอให้แสดงก่อน');
        return;
    }

    if (document.getElementById('saveWidgetRequirementsBtn') || document.getElementById('saveWidgetBar')) {
        return;
    }

    const bar = document.createElement('div');
    bar.id = 'saveWidgetBar';
    bar.className = 'save-widget-bar';

    const saveButton = document.createElement('button');
    saveButton.id = 'saveWidgetRequirementsBtn';
    saveButton.type = 'button';
    saveButton.className = 'save-widget-btn';
    saveButton.textContent = 'Save Widget Requirements';
    saveButton.onclick = saveWidgetRequirements;

    bar.appendChild(saveButton);

    // ย้ายมาแทรกก่อนส่วน Test Cases (ให้ขึ้นมาก่อนคำว่า Test Case)
    const testCaseSection = guiTestCasesList.closest('.form-group');
    if (testCaseSection) {
        testCaseSection.parentNode.insertBefore(bar, testCaseSection);
    } else {
        guiTestCasesList.parentNode.insertBefore(bar, guiTestCasesList);
    }
    console.log('addSaveWidgetButton: เพิ่มปุ่ม Save Widget Requirements เรียบร้อย (ย้ายไปก่อน Test Cases)');
}

function initFlowchartEditor() {
    if (!window.flowchartEditor) {
        window.flowchartEditor = new FlowchartEditor('flowchartCanvas');

        // เพิ่ม event listener สำหรับการเปลี่ยน tool
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const toolType = e.currentTarget.dataset.type;

                // ลบ active state จากทุกปุ่ม
                document.querySelectorAll('.tool-btn').forEach(b => {
                    b.classList.remove('active');
                });

                // เพิ่ม active state ให้ปุ่มที่เลือก
                e.currentTarget.classList.add('active');

                // อัพเดทการแสดง connection points
                const canvas = document.getElementById('flowchartCanvas');
                if (toolType === 'arrow') {
                    canvas.classList.add('show-connection-points');
                } else {
                    canvas.classList.remove('show-connection-points');
                }

                // อัพเดท cursor style
                if (toolType === 'arrow') {
                    canvas.style.cursor = 'crosshair';
                } else if (toolType === 'delete') {
                    canvas.style.cursor = 'no-drop';
                } else {
                    canvas.style.cursor = 'default';
                }
            });
        });
    }
}

// ฟังก์ชันอัพเดทการแสดงผลโปรไฟล์
function getUserProfileImage(user) {
    if (user.photoURL) {
        // ถ้ามีรูปจาก Google Account
        return user.photoURL;
    } else if (user.email) {
        // ถ้าไม่มีรูปจาก Google ใช้ Gravatar
        const hash = md5(user.email.trim().toLowerCase());
        return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=200`;
    } else {
        // ถ้าไม่มีทั้งสองอย่าง
        return '/images/default-avatar.png';
    }
}

// Check Teacher Role
async function checkTeacherRole(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists && userDoc.data().role === 'teacher') {
            await loadClasses(userId);
            if (typeof loadProblems === 'function') {
                await loadProblems();
            }
        } else {
            alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error("Error checking role:", error);
        alert('เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์');
    }
}




// แก้ไขใน auth.onAuthStateChanged
auth.onAuthStateChanged(async (user) => {
    if (user) {
        try {
            console.log('User logged in:', user.email);
            await loadUserInfo(user);
            
            // ตรวจสอบสิทธิ์การเข้าถึง
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            // อนุญาตให้เข้าถึงถ้าเป็นแอดมินหรือครู
            if (user.email === ADMIN_EMAIL || (userDoc.exists && userDoc.data().role === 'teacher')) {
                console.log('Access granted');
                await loadClasses(user.uid);
                if (typeof loadProblems === 'function') {
                    await loadProblems();
                }
                return;
            }
            
            // ถ้าไม่มีสิทธิ์
            alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
            window.location.href = 'index.html';

        } catch (error) {
            console.error('Error setting up dashboard:', error);
            console.log('Error details:', error);
        }
    } else {
        window.location.href = 'index.html';
    }
});
// แก้ไขฟังก์ชัน loadUserInfo
async function loadUserInfo(user) {
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        const userInfo = document.querySelector('.user-info');

        const profileContent = `
            <div class="profile-container">
                <img src="${user.photoURL || defaultAvatar}" 
                     alt="โปรไฟล์" 
                     class="profile-image"
                     onerror="this.src='${defaultAvatar}'"
                     style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover;">
                <div class="profile-details">
                    <div class="profile-name-container">
                        <span id="displayName">${user.displayName || 'กิตติพัฒน์ จิตต์สว่าง'}</span>
                    </div>
                    <div class="profile-info">
                        <p>อีเมล: ${user.email}</p>
                        <p>โรงเรียน: ${userData.school || 'ถ.น111'}</p>
                    </div>
                    <button onclick="editUserProfile()" class="edit-profile-btn">
                        แก้ไขข้อมูลส่วนตัว
                    </button>
                </div>
            </div>
            <button onclick="logout()" class="logout-btn">ออกจากระบบ</button>
        `;

        if (userInfo) {
            userInfo.innerHTML = profileContent;
        }
    } catch (error) {
        console.error('Error loading user info:', error);
    }
}
async function editUserProfile() {
    const user = auth.currentUser;
    const userDoc = await db.collection('users').doc(user.uid).get();
    // เพิ่มการตรวจสอบว่า userDoc มีข้อมูลหรือไม่
    const userData = userDoc.exists ? userDoc.data() : {};

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';

    const content = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>แก้ไขข้อมูลส่วนตัว</h2>
                <span class="close" onclick="closeEditProfileModal()">&times;</span>
            </div>
            <div class="modal-body">
                <form id="editProfileForm">
                    <div class="form-group">
                        <label>ชื่อ-นามสกุล *</label>
                        <input type="text" id="editName" value="${userData?.displayName || ''}" required
                               placeholder="กรุณากรอกชื่อ-นามสกุล">
                    </div>
                    <div class="form-group">
                        <label>โรงเรียน *</label>
                        <input type="text" id="editSchool" value="${userData?.school || ''}" required
                               placeholder="กรุณากรอกชื่อโรงเรียน">
                    </div>
                    ${userData?.role === 'teacher' ? `
                        <div class="form-group">
                            <label>วิชาที่สอน *</label>
                            <input type="text" id="editSubject" value="${userData?.subject || ''}" required
                                   placeholder="กรุณากรอกวิชาที่สอน">
                        </div>
                        <div class="form-group">
                            <label>ระดับชั้นที่สอน *</label>
                            <select id="editTeachingLevel" multiple required>
                                <optgroup label="ประถมศึกษา">
                                    <option value="ป.1" ${(userData?.teachingLevel || []).includes('ป.1') ? 'selected' : ''}>ป.1</option>
                                    <option value="ป.2" ${(userData?.teachingLevel || []).includes('ป.2') ? 'selected' : ''}>ป.2</option>
                                    <option value="ป.3" ${(userData?.teachingLevel || []).includes('ป.3') ? 'selected' : ''}>ป.3</option>
                                    <option value="ป.4" ${(userData?.teachingLevel || []).includes('ป.4') ? 'selected' : ''}>ป.4</option>
                                    <option value="ป.5" ${(userData?.teachingLevel || []).includes('ป.5') ? 'selected' : ''}>ป.5</option>
                                    <option value="ป.6" ${(userData?.teachingLevel || []).includes('ป.6') ? 'selected' : ''}>ป.6</option>
                                </optgroup>
                                <optgroup label="มัธยมศึกษา">
                                    <option value="ม.1" ${(userData?.teachingLevel || []).includes('ม.1') ? 'selected' : ''}>ม.1</option>
                                    <option value="ม.2" ${(userData?.teachingLevel || []).includes('ม.2') ? 'selected' : ''}>ม.2</option>
                                    <option value="ม.3" ${(userData?.teachingLevel || []).includes('ม.3') ? 'selected' : ''}>ม.3</option>
                                    <option value="ม.4" ${(userData?.teachingLevel || []).includes('ม.4') ? 'selected' : ''}>ม.4</option>
                                    <option value="ม.5" ${(userData?.teachingLevel || []).includes('ม.5') ? 'selected' : ''}>ม.5</option>
                                    <option value="ม.6" ${(userData?.teachingLevel || []).includes('ม.6') ? 'selected' : ''}>ม.6</option>
                                </optgroup>
                            </select>
                            <small>*กดปุ่ม Ctrl (Windows) หรือ Command (Mac) เพื่อเลือกหลายระดับชั้น</small>
                        </div>
                    ` : `
                        <div class="form-group">
                            <label>ระดับชั้น *</label>
                            <select id="editGrade" required>
                                <option value="">กรุณาเลือกระดับชั้น</option>
                                <optgroup label="ประถมศึกษา">
                                    <option value="ป.1" ${userData?.grade === 'ป.1' ? 'selected' : ''}>ป.1</option>
                                    <option value="ป.2" ${userData?.grade === 'ป.2' ? 'selected' : ''}>ป.2</option>
                                    <option value="ป.3" ${userData?.grade === 'ป.3' ? 'selected' : ''}>ป.3</option>
                                    <option value="ป.4" ${userData?.grade === 'ป.4' ? 'selected' : ''}>ป.4</option>
                                    <option value="ป.5" ${userData?.grade === 'ป.5' ? 'selected' : ''}>ป.5</option>
                                    <option value="ป.6" ${userData?.grade === 'ป.6' ? 'selected' : ''}>ป.6</option>
                                </optgroup>
                                <optgroup label="มัธยมศึกษา">
                                    <option value="ม.1" ${userData?.grade === 'ม.1' ? 'selected' : ''}>ม.1</option>
                                    <option value="ม.2" ${userData?.grade === 'ม.2' ? 'selected' : ''}>ม.2</option>
                                    <option value="ม.3" ${userData?.grade === 'ม.3' ? 'selected' : ''}>ม.3</option>
                                    <option value="ม.4" ${userData?.grade === 'ม.4' ? 'selected' : ''}>ม.4</option>
                                    <option value="ม.5" ${userData?.grade === 'ม.5' ? 'selected' : ''}>ม.5</option>
                                    <option value="ม.6" ${userData?.grade === 'ม.6' ? 'selected' : ''}>ม.6</option>
                                </optgroup>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>อายุ *</label>
                            <input type="number" id="editAge" value="${userData?.age || ''}" min="6" max="20" required
                                   placeholder="กรุณากรอกอายุ">
                        </div>
                    `}
                    <div class="form-actions">
                        <button type="submit" class="submit-btn">บันทึกข้อมูล</button>
                        <button type="button" class="cancel-btn" onclick="closeEditProfileModal()">ยกเลิก</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    modal.innerHTML = content;
    document.body.appendChild(modal);

    // เพิ่ม Event Listener สำหรับการ Submit Form
    document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        // ตรวจสอบการเลือกระดับชั้นสำหรับครู
        if (userData?.role === 'teacher') {
            const teachingLevelSelect = document.getElementById('editTeachingLevel');
            if (teachingLevelSelect.selectedOptions.length === 0) {
                alert('กรุณาเลือกระดับชั้นที่สอนอย่างน้อย 1 ระดับ');
                return;
            }
        }

        await updateUserProfile(userData?.role);
    });
}

async function updateUserProfile(role) {
    try {
        const user = auth.currentUser;
        const userData = {
            displayName: document.getElementById('editName').value.trim(),
            school: document.getElementById('editSchool').value.trim(),
        };

        if (role === 'teacher') {
            userData.subject = document.getElementById('editSubject').value.trim();
            const teachingLevelSelect = document.getElementById('editTeachingLevel');
            userData.teachingLevel = Array.from(teachingLevelSelect.selectedOptions).map(option => option.value);
        } else {
            userData.grade = document.getElementById('editGrade').value;
            userData.age = parseInt(document.getElementById('editAge').value);
        }

        await db.collection('users').doc(user.uid).update(userData);
        await user.updateProfile({ displayName: userData.displayName });

        alert('อัพเดทข้อมูลสำเร็จ');
        closeEditProfileModal();
        
        // สั่ง refresh page หลังจากปิด modal
        window.location.reload(true); // true คือการบังคับให้โหลดใหม่จาก server ไม่ใช้ cache (เหมือน Ctrl+F5)
        
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('เกิดข้อผิดพลาดในการอัพเดทข้อมูล');
    }
}


function closeEditProfileModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.remove();
        }, 150);
    }
}
function addVariable() {
    const variablesList = document.getElementById('variablesList');
    if (!variablesList) return;

    const varItem = document.createElement('div');
    varItem.className = 'variable-item';
    varItem.innerHTML = `
        <input type="text" class="var-name" placeholder="ชื่อตัวแปร เช่น num1, total" required>
        <textarea class="var-description" placeholder="คำอธิบายตัวแปร เช่น ตัวเลขที่ 1, ผลรวมทั้งหมด" required></textarea>
        <div class="variable-actions">
            <button type="button" class="delete-var-btn" onclick="deleteVariable(this)">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    variablesList.appendChild(varItem);
}

function deleteVariable(button) {
    if (confirm('คุณต้องการลบตัวแปรนี้ใช่หรือไม่?')) {
        const varItem = button.closest('.variable-item');
        varItem.remove();
    }
}
// เพิ่มฟังก์ชันที่จำเป็น
function showEditNameForm() {
    document.getElementById('displayName').style.display = 'none';
    document.getElementById('editNameForm').style.display = 'block';
}

function cancelEditName() {
    document.getElementById('displayName').style.display = 'block';
    document.getElementById('editNameForm').style.display = 'none';
}

async function updateDisplayName() {
    const newName = document.getElementById('newName').value.trim();
    if (!newName) {
        alert('กรุณากรอกชื่อ');
        return;
    }

    try {
        const user = auth.currentUser;
        await db.collection('users').doc(user.uid).update({
            displayName: newName
        });

        // อัพเดท displayName ใน Firebase Auth
        await user.updateProfile({
            displayName: newName
        });

        document.getElementById('displayName').textContent = newName;
        document.getElementById('displayName').style.display = 'block';
        document.getElementById('editNameForm').style.display = 'none';

        alert('อัพเดทชื่อสำเร็จ');
    } catch (error) {
        console.error('Error updating name:', error);
        alert('เกิดข้อผิดพลาดในการอัพเดทชื่อ');
    }
}

async function logout() {
    try {
        await auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error signing out:', error);
        alert('เกิดข้อผิดพลาดในการออกจากระบบ');
    }
}



// Create Class
async function createClass() {
    const className = document.getElementById('className').value;
    if (!className) {
        alert('กรุณาใส่ชื่อห้องเรียน');
        return;
    }

    try {
        const user = auth.currentUser;
        const classCode = generateClassCode();

        await db.collection('classes').add({
            name: className,
            code: classCode,
            teacherId: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert(`สร้างห้องเรียนสำเร็จ!\nรหัสห้องเรียน: ${classCode}`);
        document.getElementById('className').value = '';
        loadClasses(user.uid);
    } catch (error) {
        console.error('Error creating class:', error);
        alert('เกิดข้อผิดพลาดในการสร้างห้องเรียน');
    }
}

// Load Classes
async function loadClasses(userId) {
    const classList = document.getElementById('classList');
    if (!classList) return;

    try {
        classList.innerHTML = '<p>กำลังโหลดข้อมูล...</p>';

        const snapshot = await db.collection('classes')
            .where('teacherId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get();

        if (snapshot.empty) {
            classList.innerHTML = '<p>ยังไม่มีห้องเรียน</p>';
            return;
        }

        classList.innerHTML = '';
        snapshot.forEach(doc => {
            const classData = doc.data();
            const classDiv = document.createElement('div');
            classDiv.className = 'class-card';
            classDiv.innerHTML = `
                <div class="class-info">
                    <h3>${classData.name}</h3>
                    <p class="class-code">รหัสห้องเรียน: ${classData.code}</p>
                </div>
                <div class="class-actions">
                    <button onclick="viewClass('${doc.id}')" class="secondary-btn">ดูรายละเอียด</button>
                    <button onclick="deleteClass('${doc.id}')" class="delete-btn">ลบห้องเรียน</button>
                </div>
            `;
            classList.appendChild(classDiv);
        });
    } catch (error) {
        console.error('Error loading classes:', error);
        classList.innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    }
}

// Load Problems
async function loadProblem(problemId, userId) {
    try {
        const problemDoc = await db.collection('problems').doc(problemId).get();

        if (!problemDoc.exists) {
            throw new Error('ไม่พบโจทย์');
        }

        // ดึงข้อมูลและทำความสะอาด test cases
        let problemData = problemDoc.data();

        // ทำความสะอาด test cases
        if (problemData.testCases) {
            problemData.testCases = problemData.testCases.map(testCase => ({
                ...testCase,
                // ลบ quotes และ extra escapes
                input: testCase.input.replace(/^["']|["']$/g, '').replace(/\\\\/g, '\\'),
                expected: testCase.expected.replace(/^["']|["']$/g, '')
            }));
        }

        currentProblem = {
            id: problemDoc.id,
            ...problemData,
            createdAt: problemData.createdAt?.toDate() || null,
            updatedAt: problemData.updatedAt?.toDate() || null
        };

        // อัพเดทการแสดงผล
        updateProblemDisplay();
        await loadLastSubmission(problemId, userId);

        return true;
    } catch (error) {
        console.error('Error loading problem:', error);
        throw error;
    }
}

// Generate Class Code
function generateClassCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Handle Problem Modal
function closeModal() {
    const modal = document.getElementById('problemModal');
    const form = document.getElementById('problemForm');

    // รีเซ็ตฟอร์มทั้งหมด
    form.reset();
    form.removeAttribute('data-problem-id');

    // รีเซ็ตข้อความปุ่มบันทึก
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'บันทึก';
    }

    // รีเซ็ตค่าใน CodeMirror editor สำหรับโจทย์ GUI
    if (window.editor) {
        window.editor.setValue(`from tkinter import *
from tkinter import ttk

root = Tk()
root.title("โปรแกรมของฉัน")
root.geometry("400x300")

# เขียนโค้ดตรงนี้   

root.mainloop()`);
    }

    if (window.solutionEditor) {
        window.solutionEditor.setValue(`from tkinter import *
from tkinter import ttk
    
def calculate():
# เขียนเฉลยที่นี่
    pass
    
root = Tk()
root.title("โปรแกรมของฉัน")
root.geometry("400x300")
    
# เขียนโค้ดเฉลยตรงนี้
    
root.mainloop()`);
    }

    // ล้าง requirements สำหรับโจทย์ GUI
    const guiRequirements = document.getElementById('guiRequirements');
    if (guiRequirements) {
        guiRequirements.innerHTML = '';
    }
    
    // เคลียร์ค่าตัวแปร global ที่เกี่ยวข้องกับโจทย์ก่อนหน้า
    if (typeof window.savedWidgets !== 'undefined') {
        window.savedWidgets = [];
    }
    if (typeof savedWidgets !== 'undefined') {
        savedWidgets = [];
    }
    
    // ล้าง GUI Test Cases (Action)
    const guiTestCases = document.getElementById('guiTestCases');
    if (guiTestCases) {
        guiTestCases.innerHTML = '';
    }

  

    // รีเซ็ต flowchart (ถ้ามี)
    if (window.flowchartEditor) {
        window.flowchartEditor.clearCanvas();
    }

    // รีเซ็ต matching questions และ answers (ถ้ามี)
    const matchingQuestionsList = document.getElementById('matchingQuestionsList');
    const matchingAnswersList = document.getElementById('matchingAnswersList');
    if (matchingQuestionsList) matchingQuestionsList.innerHTML = '';
    if (matchingAnswersList) matchingAnswersList.innerHTML = '';

    // รีเซ็ต comprehension questions (ถ้ามี)
    const questionsList = document.getElementById('questionsList');
    if (questionsList) questionsList.innerHTML = '';

    // รีเซ็ต test cases สำหรับโจทย์ Python (ถ้ามี)
    const testCasesList = document.getElementById('testCasesList');
    if (testCasesList) testCasesList.innerHTML = '';

    // รีเซ็ต attachmentList
    const attachmentList = document.getElementById('attachmentList');
    if (attachmentList) attachmentList.innerHTML = '';

    // รีเซ็ตค่าอื่นๆ ตามต้องการ
    const preview = document.getElementById('guiPreview');
    const imagePreview = document.getElementById('guiImagePreview');
    const validationMessage = document.getElementById('guiValidationMessage');
    if (preview) preview.style.display = 'none';
    if (preview) preview.innerHTML = '';
    if (imagePreview) imagePreview.style.display = 'none';
    if (imagePreview) imagePreview.innerHTML = '';
    if (validationMessage) validationMessage.style.display = 'none';

    // กำหนด problemType กลับเป็นค่าเริ่มต้น (python) และเรียก toggleProblemTypeFields
    if (document.getElementById('problemType')) {
        document.getElementById('problemType').value = 'python';
        toggleProblemTypeFields();
    }

// เคลียร์รูปภาพที่ถูกอัปโหลดในรอบนี้แต่ไม่ได้กดบันทึก (Orphaned images)
    if (window.pendingImageUploads && window.pendingImageUploads.length > 0) {
        window.pendingImageUploads.forEach(async (url) => {
            try {
                await firebase.storage().refFromURL(url).delete();
                console.log('ลบรูปภาพที่ไม่ได้ใช้งาน (กดยกเลิก):', url);
            } catch (e) {
                console.error('Error deleting unused image:', e);
            }
        });
        window.pendingImageUploads = [];
    }

    // ซ่อน modal
    modal.style.display = 'none';
}
function addTestCase() {
    const testCasesList = document.getElementById('testCasesList');
    if (!testCasesList) return;

    const testCase = document.createElement('div');
    testCase.className = 'test-case';
    testCase.innerHTML = `
        <div class="test-case-content">
            <div class="inputs-section">
                <h4>Inputs</h4>
                <div class="input-list">
                    <!-- จะถูกเพิ่มด้วย addInputToTestCase -->
                </div>
                <button type="button" class="secondary-btn add-input-btn" onclick="addInputToTestCase(this)">
                    + เพิ่ม Input
                </button>
            </div>
            
            <div class="form-group">
                <label>Expected Output *</label>
                <textarea class="test-output input-field" 
                    placeholder="เช่น: ผลบวก 5 + 3 = 8"
                    rows="3" required></textarea>
            </div>

            <div class="form-group">
                <label>คะแนน</label>
                <input type="number" class="test-score input-field" 
                    value="1" min="1" max="10">
            </div>
            
            <div class="form-group">
                <label>คำอธิบาย Test Case</label>
                <input type="text" class="test-explanation input-field" 
                    placeholder="อธิบายเพิ่มเติมเกี่ยวกับ test case นี้">
            </div>
        </div>
        <button type="button" onclick="removeTestCase(this)" class="delete-btn">ลบ Test Case</button>
    `;
    testCasesList.appendChild(testCase);

    // เพิ่ม input แรกอัตโนมัติ
    const addInputBtn = testCase.querySelector('.add-input-btn');
    addInputToTestCase(addInputBtn);
}
// ในฟังก์ชัน addTestCase()
function addInputToTestCase(button) {
    const inputList = button.parentElement.querySelector('.input-list');
    const inputCount = inputList.children.length + 1;

    const inputDiv = document.createElement('div');
    inputDiv.className = 'input-entry';
    inputDiv.innerHTML = `
        <div class="input-entry-content">
            <div class="form-group">
                <label>ชื่อ Input</label>
                <input type="text" class="input-name input-field" 
                    value="ตัวเลขที่ ${inputCount}" required>
            </div>
            <div class="form-group">
                <label>ค่า</label>
                <input type="text" class="input-value input-field" required>
            </div>
        </div>
        <button type="button" class="delete-btn small" onclick="removeInput(this)">ลบ</button>
    `;
    inputList.appendChild(inputDiv);
}

function removeInput(button) {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบ input นี้?')) {
        const inputEntry = button.parentElement;
        const inputList = inputEntry.parentElement;
        inputEntry.remove();

        // รีเนมเบอร์ inputs ที่เหลือ
        inputList.querySelectorAll('.input-entry').forEach((entry, index) => {
            const nameInput = entry.querySelector('.input-name');
            if (nameInput.value.startsWith('ตัวเลขที่')) {
                nameInput.value = `ตัวเลขที่ ${index + 1}`;
            }
        });
    }
}

// เพิ่มฟังก์ชันลบ Test Case
function removeTestCase(button) {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบ Test Case นี้?')) {
        button.parentElement.remove();
    }
}
async function editProblem(problemId) {
    try {
        const problemDoc = await db.collection('problems').doc(problemId).get();
        if (!problemDoc.exists) {
            alert('ไม่พบโจทย์');
            return;
        }

        const problemData = problemDoc.data();
        console.log("โหลดข้อมูลโจทย์:", problemData);

        const modal = document.getElementById('problemModal');
        const modalTitle = document.getElementById('modalTitle');
        if (modal) {
            modal.style.display = 'flex';
            if (modalTitle) modalTitle.textContent = 'แก้ไขโจทย์';
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        const problemTitle = document.getElementById('problemTitle');
        const problemType = document.getElementById('problemType');
        const problemTopic = document.getElementById('problemTopic');
        const problemDifficulty = document.getElementById('problemDifficulty');
        const assignmentType = document.getElementById('assignmentType');
        const problemImage = document.getElementById('problemImage');

        if (problemTitle && problemType && problemDifficulty) {
            problemTitle.value = problemData.title || '';
            problemType.value = problemData.type || 'python';
            if (problemTopic) {
                problemTopic.value = problemData.topic || 'basic';
            }
            problemDifficulty.value = problemData.difficulty || 'medium';
            if (assignmentType) assignmentType.value = problemData.assignmentType || 'exercise';
            if (problemImage) problemImage.value = problemData.image || '';
            toggleProblemTypeFields(); // จะเรียก addSaveWidgetButton ถ้าเป็น gui
        }

        const variablesList = document.getElementById('variablesList');
        if (variablesList) {
            variablesList.innerHTML = '';
            if (problemData.variables && problemData.variables.length > 0) {
                problemData.variables.forEach(variable => {
                    const varItem = document.createElement('div');
                    varItem.className = 'variable-item';
                    varItem.innerHTML = `
                        <input type="text" class="var-name" value="${variable.name}" placeholder="ชื่อตัวแปร เช่น num1, total" required>
                        <textarea class="var-description" placeholder="คำอธิบายตัวแปร เช่น ตัวเลขที่ 1, ผลรวมทั้งหมด" required>${variable.description}</textarea>
                        <div class="variable-actions">
                            <button type="button" class="delete-var-btn" onclick="deleteVariable(this)">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                    variablesList.appendChild(varItem);
                });
            }
        }

        const imageInput = document.getElementById('problemImage');
        if (problemData.image && imageInput) {
            imageInput.value = problemData.image;
        }

        // แสดงข้อมูลสื่อประกอบการเรียน (attachments)
        const attachmentList = document.getElementById('attachmentList');
        if (attachmentList) {
            attachmentList.innerHTML = ''; // เคลียร์ของเก่า
            if (problemData.attachments && Array.isArray(problemData.attachments)) {
                problemData.attachments.forEach(att => {
                    addAttachmentRow(att);
                });
            }
        }

        switch (problemData.type) {
            case 'gui':
                if (document.getElementById('guiDescription')) {
                    document.getElementById('guiDescription').value = problemData.description || '';
                }

                if (window.editor) {
                    console.log('โหลดโค้ดเทมเพลตจาก Firebase:', problemData.templateCode);
                    window.editor.setValue(problemData.templateCode || '');
                } else {
                    console.error('window.editor ไม่ได้กำหนด');
                }

                if (window.solutionEditor) {
                    console.log('โหลดโค้ดเฉลยจาก Firebase:', problemData.solutionCode);
                    window.solutionEditor.setValue(problemData.solutionCode || '');
                } else {
                    console.error('window.solutionEditor ไม่ได้กำหนด');
                }

                if (document.getElementById('guiImageUrl') && problemData.guiImage) {
                    document.getElementById('guiImageUrl').value = problemData.guiImage;
                    if (typeof previewGUIImage === 'function') {
                        previewGUIImage();
                    }
                }

                // อัพเดต guiRequirements
                const guiRequirements = document.getElementById('guiRequirements');
                if (guiRequirements && problemData.widgets) {
                    guiRequirements.innerHTML = '';
                    savedWidgets = [...problemData.widgets]; // อัพเดต savedWidgets จาก Firebase
                    window.savedWidgets = [...savedWidgets]; // ซิงโครไนซ์ window.savedWidgets
                    problemData.widgets.forEach(req => {
                        const item = document.createElement('div');
                        item.className = 'requirement-item';
                        item.innerHTML = `
                            <div class="requirement-row">
                                <select class="requirement-type">
                                    <option value="Label" ${req.type === 'Label' ? 'selected' : ''}>Label</option>
                                    <option value="Button" ${req.type === 'Button' ? 'selected' : ''}>Button</option>
                                    <option value="Entry" ${req.type === 'Entry' ? 'selected' : ''}>Entry</option>
                                    <option value="Combobox" ${req.type === 'Combobox' ? 'selected' : ''}>Combobox</option>
                                    <option value="Checkbutton" ${req.type === 'Checkbutton' ? 'selected' : ''}>Checkbutton</option>
                                    <option value="Radiobutton" ${req.type === 'Radiobutton' ? 'selected' : ''}>Radiobutton</option>
                                    <option value="Canvas" ${req.type === 'Canvas' ? 'selected' : ''}>Canvas</option>
                                    <option value="Menu" ${req.type === 'Menu' ? 'selected' : ''}>Menu</option>
                                    <option value="Frame" ${req.type === 'Frame' ? 'selected' : ''}>Frame</option>
                                    <option value="Listbox" ${req.type === 'Listbox' ? 'selected' : ''}>Listbox</option>
                                    <option value="Scale" ${req.type === 'Scale' ? 'selected' : ''}>Scale</option>
                                </select>
                                <input type="text" class="requirement-name" value="${req.name}" placeholder="ชื่อตัวแปร เช่น btn1" required>
                                <input type="text" class="requirement-text" value="${req.text || ''}" placeholder="ข้อความบน Widget เช่น คลิกฉัน" style="width: 150px;">
                                <input type="text" class="requirement-props" value="${req.props || ''}" placeholder="Properties เช่น bg='red'" style="width: 150px;">
                                <input type="text" class="requirement-action" value="${req.action || ''}" placeholder="การทำงาน เช่น แสดงผลรวมใน Label" style="width: 150px;">
                                <input type="number" class="requirement-score" value="${req.score !== undefined ? req.score : 5}" style="width: 60px;">
                                <button type="button" class="delete-requirement-btn" onclick="deleteRequirement(this)">ลบ</button>
                            </div>
                        `;
                        guiRequirements.appendChild(item);

                        const typeSelect = item.querySelector('.requirement-type');
                        const actionInput = item.querySelector('.requirement-action');
                        actionInput.style.display = ['Button', 'Checkbutton', 'Radiobutton'].includes(typeSelect.value) ? 'block' : 'none';

                        typeSelect.addEventListener('change', () => {
                            actionInput.style.display = ['Button', 'Checkbutton', 'Radiobutton'].includes(typeSelect.value) ? 'block' : 'none';
                        });
                    });
                    console.log('editProblem: อัพเดต savedWidgets จาก Firebase:', savedWidgets);
                }

                // อัพเดต guiTestCasesList
                const guiTestCasesList = document.getElementById('guiTestCasesList');
                if (guiTestCasesList && problemData.testCases) {
                    guiTestCasesList.innerHTML = '';
                    problemData.testCases.forEach(testCase => {
                        const testCaseDiv = document.createElement('div');
                        testCaseDiv.className = 'test-case';
                        const inputOptions = problemData.widgets
                            .filter(widget => ['Entry', 'Combobox', 'Scale'].includes(widget.type))
                            .map(widget => `<option value="${widget.name}">${widget.type}: ${widget.text || widget.name}</option>`)
                            .join('');
                        const outputOptions = problemData.widgets
                            .filter(widget => ['Label', 'Entry', 'Combobox'].includes(widget.type))
                            .map(widget => `<option value="${widget.name}">${widget.type}: ${widget.text || widget.name}</option>`)
                            .join('');
                        const actionOptions = problemData.widgets
                            .filter(widget => ['Button', 'Checkbutton', 'Radiobutton'].includes(widget.type))
                            .map(widget => `<option value="${widget.name}" data-type="${widget.type}">${widget.type}: ${widget.text || widget.name}${widget.action ? ` (${widget.action})` : ''}</option>`)
                            .join('');
                        testCaseDiv.innerHTML = `
                            <div class="test-case-content">
                                <div class="inputs-section">
                                    <h4>Inputs</h4>
                                    <div class="input-list">
                                        ${testCase.inputs.map(input => `
                                            <div class="input-entry">
                                                <div class="input-entry-content">
                                                    <div class="form-group">
                                                        <label>ชื่อ Input</label>
                                                        <select class="input-name input-field" required>
                                                            <option value="">เลือก Widget</option>
                                                            ${inputOptions}
                                                        </select>
                                                    </div>
                                                    <div class="form-group">
                                                        <label>ค่า</label>
                                                        <input type="text" class="input-value input-field" value="${input.value}" placeholder="เช่น 1990" required>
                                                    </div>
                                                </div>
                                                <button type="button" class="delete-btn small" onclick="removeGUIInput(this)">ลบ</button>
                                            </div>
                                        `).join('')}
                                    </div>
                                    <button type="button" class="secondary-btn add-input-btn" onclick="addGUIInputToTestCase(this)">+ เพิ่ม Input</button>
                                </div>
                                <div class="actions-section">
                                    <h4>การกระทำ *</h4>
                                    <div class="action-list">
                                        ${testCase.actions.map(action => `
                                            <div class="action-entry">
                                                <div class="action-entry-content">
                                                    <div class="form-group">
                                                        <label>Widget *</label>
                                                        <select class="action-widget input-field" required onchange="updateActionState(this)">
                                                            <option value="">เลือก Widget</option>
                                                            ${actionOptions}
                                                        </select>
                                                    </div>
                                                    <div class="form-group">
                                                        <label>สถานะ *</label>
                                                        <select class="action-state input-field" required>
                                                            <option value="">เลือกสถานะ</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <button type="button" class="delete-btn small" onclick="removeGUIAction(this)">ลบ</button>
                                            </div>
                                        `).join('')}
                                    </div>
                                    <button type="button" class="secondary-btn add-action-btn" onclick="addGUIAction(this)">+ เพิ่มการกระทำ</button>
                                </div>
                                <div class="outputs-section">
                                    <h4>Outputs *</h4>
                                    <div class="output-list">
                                        ${testCase.outputs.map(output => `
                                            <div class="output-entry">
                                                <div class="output-entry-content">
                                                    <div class="form-group">
                                                        <label>Widget *</label>
                                                        <select class="test-output-widget input-field" required>
                                                            <option value="">เลือก Widget สำหรับ Output</option>
                                                            ${outputOptions}
                                                        </select>
                                                    </div>
                                                    <div class="form-group">
                                                        <label>ผลลัพธ์ *</label>
                                                        <input type="text" class="test-output-value input-field" value="${output.value}" placeholder="ผลลัพธ์ที่คาดหวัง เช่น ชาย" required>
                                                    </div>
                                                </div>
                                                <button type="button" class="delete-btn small" onclick="removeGUIOutput(this)">ลบ</button>
                                            </div>
                                        `).join('')}
                                    </div>
                                    <button type="button" class="secondary-btn add-output-btn" onclick="addGUIOutputToTestCase(this)">+ เพิ่ม Output</button>
                                </div>
                                <div class="form-group">
                                    <label>คะแนน</label>
                                    <input type="number" class="test-score input-field" value="${testCase.score || 1}" min="1" max="10">
                                </div>
                                <div class="form-group">
                                    <label>คำอธิบาย Test Case</label>
                                    <input type="text" class="test-explanation input-field" value="${testCase.explanation || ''}" placeholder="อธิบายเพิ่มเติมเกี่ยวกับ test case นี้">
                                </div>
                            </div>
                            <button type="button" onclick="removeGUITestCase(this)" class="delete-btn">ลบ Test Case</button>
                        `;
                        guiTestCasesList.appendChild(testCaseDiv);

                        // อัพเดต dropdown หลังจากเพิ่ม test case
                        const actionEntries = testCaseDiv.querySelectorAll('.action-entry');
                        actionEntries.forEach((entry, index) => {
                            const actionWidgetSelect = entry.querySelector('.action-widget');
                            const actionStateSelect = entry.querySelector('.action-state');
                            const action = testCase.actions[index];
                            if (action) {
                                actionWidgetSelect.value = action.widget;
                                updateActionState(actionWidgetSelect);
                                actionStateSelect.value = action.state;
                            }
                        });

                        const inputEntries = testCaseDiv.querySelectorAll('.input-entry');
                        inputEntries.forEach((entry, index) => {
                            const inputNameSelect = entry.querySelector('.input-name');
                            const input = testCase.inputs[index];
                            if (input) {
                                inputNameSelect.value = input.name;
                            }
                        });

                        const outputEntries = testCaseDiv.querySelectorAll('.output-entry');
                        outputEntries.forEach((entry, index) => {
                            const outputWidgetSelect = entry.querySelector('.test-output-widget');
                            const output = testCase.outputs[index];
                            if (output) {
                                outputWidgetSelect.value = output.widget;
                            }
                        });
                    });
                    // รีเฟรช dropdown หลังจากโหลด test cases เสร็จ
                    refreshTestCaseActions();
                }
                break;

            case 'iot':
            case 'python':
                if (document.getElementById('problemDescription')) {
                    document.getElementById('problemDescription').value = problemData.description || '';
                }
                if (document.getElementById('templateCode')) {
                    document.getElementById('templateCode').value = problemData.templateCode || '';
                }

                const testCasesList = document.getElementById('testCasesList');
                if (testCasesList && problemData.testCases) {
                    testCasesList.innerHTML = '';
                    problemData.testCases.forEach(testCase => {
                        const testCaseDiv = document.createElement('div');
                        testCaseDiv.className = 'test-case';
                        const inputsHTML = (testCase.inputs || []).map(input => `
                            <div class="input-entry">
                                <div class="form-group">
                                    <label>ชื่อ Input</label>
                                    <input type="text" class="input-name input-field" value="${input.name || ''}" placeholder="เช่น num1" required>
                                </div>
                                <div class="form-group">
                                    <label>ค่า</label>
                                    <input type="text" class="input-value input-field" value="${input.value || ''}" placeholder="เช่น 5" required>
                                </div>
                                <button type="button" class="delete-btn small" onclick="this.parentElement.remove()">ลบ</button>
                            </div>
                        `).join('');
                        testCaseDiv.innerHTML = `
                            <div class="test-case-content">
                                <div class="inputs-section">
                                    <h4>Inputs</h4>
                                    <div class="input-list">${inputsHTML}</div>
                                    <button type="button" class="secondary-btn" onclick="addInputToTestCase(this)">+ เพิ่ม Input</button>
                                </div>
                                <div class="form-group">
                                    <label>Output *</label>
                                    <textarea class="test-output input-field" placeholder="เช่น 15" rows="3" required>${testCase.expected || ''}</textarea>
                                </div>
                                <div class="form-group">
                                    <label>คะแนน</label>
                                    <input type="number" class="test-score input-field" value="${testCase.score || 1}" min="1" max="10">
                                </div>
                                <div class="form-group">
                                    <label>คำอธิบาย Test Case</label>
                                    <input type="text" class="test-explanation input-field" value="${testCase.explanation || ''}" placeholder="อธิบายเพิ่มเติมเกี่ยวกับ test case นี้">
                                </div>
                            </div>
                            <button type="button" onclick="removeTestCase(this)" class="delete-btn">ลบ Test Case</button>
                        `;
                        testCasesList.appendChild(testCaseDiv);
                    });
                }
                break;

            case 'flowchart':
                if (document.getElementById('flowchartDescription')) {
                    document.getElementById('flowchartDescription').value = problemData.description || '';
                }
                if (document.getElementById('flowchartMaxScore')) {
                    document.getElementById('flowchartMaxScore').value = problemData.maxScore || 10;
                }
                
                // แก้ไขการโหลดข้อมูล flowchart
                if (window.flowchartEditor && problemData.flowchartData) {
                    console.log('กำลังโหลดข้อมูล flowchart:', problemData.flowchartData);
                    
                    // ตรวจสอบว่ามีฟังก์ชันอะไรบ้างใน flowchartEditor
                    console.log('ฟังก์ชันที่มีใน flowchartEditor:', Object.keys(window.flowchartEditor));
                    
                    try {
                        // ลองใช้วิธีต่างๆ ในการโหลดข้อมูล
                        if (typeof window.flowchartEditor.setData === 'function') {
                            window.flowchartEditor.setData(problemData.flowchartData);
                        } 
                        else if (typeof window.flowchartEditor.loadData === 'function') {
                            window.flowchartEditor.loadData(problemData.flowchartData);
                        }
                        else if (typeof window.flowchartEditor.load === 'function') {
                            window.flowchartEditor.load(problemData.flowchartData);
                        }
                        else if (typeof window.flowchartEditor.setValue === 'function') {
                            window.flowchartEditor.setValue(problemData.flowchartData);
                        }
                        else if (typeof window.flowchartEditor.data !== 'undefined') {
                            window.flowchartEditor.data = problemData.flowchartData;
                            // ถ้ามีฟังก์ชัน render ให้เรียกใช้เพื่ออัพเดตการแสดงผล
                            if (typeof window.flowchartEditor.render === 'function') {
                                window.flowchartEditor.render();
                            }
                        } else {
                            console.error('ไม่พบวิธีการโหลดข้อมูล flowchart ที่เหมาะสม');
                        }
                    } catch (error) {
                        console.error('เกิดข้อผิดพลาดในการโหลดข้อมูล flowchart:', error);
                    }
                }
                
                const scoringCriteriaList = document.getElementById('scoringCriteriaList');
                if (scoringCriteriaList && problemData.scoringCriteria) {
                    scoringCriteriaList.innerHTML = '';
                    problemData.scoringCriteria.forEach(criteria => {
                        const criteriaItem = document.createElement('div');
                        criteriaItem.className = 'criteria-item';
                        criteriaItem.innerHTML = `
                            <input type="text" class="criteria-description input-field" value="${criteria.description || ''}" placeholder="เกณฑ์การให้คะแนน" required>
                            <input type="number" class="score-input" value="${criteria.score}" min="0" required>
                            <button type="button" onclick="this.parentElement.remove()">ลบ</button>
                        `;
                        scoringCriteriaList.appendChild(criteriaItem);
                    });
                }
                break;

            case 'comprehension':
                if (document.getElementById('comprehensionContent')) {
                    document.getElementById('comprehensionContent').value = problemData.content || '';
                }
                const questionsList = document.getElementById('questionsList');
                if (questionsList && problemData.questions) {
                    questionsList.innerHTML = '';
                    problemData.questions.forEach(q => {
                        const questionItem = document.createElement('div');
                        questionItem.className = 'question-item';
                        questionItem.style.display = 'flex';
                        questionItem.style.gap = '20px';
                        questionItem.style.border = '1px solid #404040';
                        questionItem.style.padding = '15px';
                        questionItem.style.marginBottom = '15px';
                        questionItem.style.borderRadius = '8px';
                        questionItem.style.background = '#333';
                        
                        const tagsStr = q.tags ? q.tags.join(', ') : '';
                        
                        questionItem.innerHTML = \`
                            <div class="left-panel" style="flex: 1; border-right: 1px solid #555; padding-right: 20px;">
                                <div class="question-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                    <h4 style="margin: 0; color: #fff;">คำถามที่ \${q.number || 1}</h4>
                                    <button type="button" onclick="removeComprehensionQuestion(this)" class="delete-btn" style="padding: 5px 10px; font-size: 12px;">
                                        ลบคำถาม
                                    </button>
                                </div>

                                <div class="form-group">
                                    <label>คำถาม *</label>
                                    <textarea class="question-text input-field" required style="height: 80px;">\${q.question || ''}</textarea>
                                </div>

                                <div class="form-group">
                                    <label>รูปภาพประกอบคำถาม (ถ้ามี)</label>
                                    <input type="file" class="question-image-upload input-field" accept="image/*" onchange="handleQuestionImageUpload(this)">
                                    <input type="hidden" class="question-image-url" value="\${q.imageUrl || ''}">
                                    <div class="question-image-preview" style="margin-top: 10px; \${q.imageUrl ? 'display: block;' : 'display: none;'} text-align: center;">
                                        <img src="\${q.imageUrl || ''}" style="max-width: 100%; max-height: 150px; border-radius: 4px; border: 1px solid #555;">
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label>Tag (ป้ายกำกับ) คั่นด้วยลูกน้ำ</label>
                                    <input type="text" class="question-tags input-field" placeholder="เช่น logic, loop, variable" value="\${tagsStr}">
                                </div>
                            </div>

                            <div class="right-panel" style="flex: 1; padding-left: 20px;">
                                <h4 style="margin-top: 0; margin-bottom: 15px; color: #fff;">ส่วนของเฉลย (ซ่อนจากนักเรียน)</h4>
                                
                                <div class="form-group">
                                    <label>คำตอบที่ถูกต้อง *</label>
                                    <textarea class="correct-answer input-field" required style="height: 80px;">\${q.correctAnswer || ''}</textarea>
                                </div>

                                <div class="form-group">
                                    <label>คะแนน</label>
                                    <input type="number" class="question-score input-field" value="\${q.score || 1}" min="1" max="10">
                                </div>

                                <div class="form-group">
                                    <label>คำอธิบายเพิ่มเติม</label>
                                    <textarea class="question-explanation input-field" style="height: 60px;">\${q.explanation || ''}</textarea>
                                </div>
                            </div>
                        \`;
                        questionsList.appendChild(questionItem);
                    });
                }
                break;

            case 'matching':
                // ตรวจสอบว่ามี element ที่จำเป็นหรือไม่
                const matchingDescription = document.getElementById('matchingDescription');
                const matchingQuestionsList = document.getElementById('matchingQuestionsList');
                const matchingAnswersList = document.getElementById('matchingAnswersList');
                const matchingPairsList = document.getElementById('matchingPairsList');
                
                console.log("โหลดข้อมูลโจทย์จับคู่:", problemData);
                
                if (matchingDescription) {
                    matchingDescription.value = problemData.description || '';
                }
                
                // ตรวจสอบรูปแบบข้อมูล
                let questions = [];
                let answers = [];
                
                // กรณีที่มีข้อมูลในรูปแบบเก่า (pairs มี question และ answer เป็นข้อความ)
                if (Array.isArray(problemData.pairs) && problemData.pairs.length > 0 && 
                    (typeof problemData.pairs[0].question === 'string' && typeof problemData.pairs[0].answer === 'string')) {
                    
                    console.log("พบข้อมูลในรูปแบบเก่า กำลังแปลงข้อมูล...");
                    
                    // สร้าง arrays ของคำถามและคำตอบจาก pairs
                    problemData.pairs.forEach(pair => {
                        if (!questions.includes(pair.question)) {
                            questions.push(pair.question);
                        }
                        if (!answers.includes(pair.answer)) {
                            answers.push(pair.answer);
                        }
                    });
                    
                    // โหลดคำถาม
                    if (matchingQuestionsList) {
                        matchingQuestionsList.innerHTML = '';
                        questions.forEach((question, index) => {
                            const questionItem = document.createElement('div');
                            questionItem.className = 'matching-item';
                            questionItem.innerHTML = `
                                <span class="item-number">${index + 1}.</span>
                                <input type="text" class="matching-question input-field" value="${question}" required>
                                <button type="button" class="delete-btn" onclick="this.parentElement.remove()">ลบ</button>
                            `;
                            matchingQuestionsList.appendChild(questionItem);
                        });
                    }
                    
                    // โหลดคำตอบ
                    if (matchingAnswersList) {
                        matchingAnswersList.innerHTML = '';
                        answers.forEach((answer, index) => {
                            const answerItem = document.createElement('div');
                            answerItem.className = 'matching-item';
                            answerItem.innerHTML = `
                                <span class="item-number">${index + 1}.</span>
                                <input type="text" class="matching-answer input-field" value="${answer}" required>
                                <button type="button" class="delete-btn" onclick="this.parentElement.remove()">ลบ</button>
                            `;
                            matchingAnswersList.appendChild(answerItem);
                        });
                    }
                    
                    // โหลดคู่คำถาม-คำตอบ
                    if (matchingPairsList) {
                        matchingPairsList.innerHTML = '';
                        problemData.pairs.forEach((pair, index) => {
                            const questionIndex = questions.indexOf(pair.question);
                            const answerIndex = answers.indexOf(pair.answer);
                            
                            const pairItem = document.createElement('div');
                            pairItem.className = 'matching-pair';
                            pairItem.innerHTML = `
                                <div class="pair-header">
                                    <h4>คู่ที่ ${index + 1}</h4>
                                    <button type="button" class="delete-btn" onclick="this.closest('.matching-pair').remove()">ลบ</button>
                                </div>
                                <div class="form-group">
                                    <label>คำถาม</label>
                                    <select class="pair-question input-field" required>
                                        ${generateQuestionOptions(questions.length, questionIndex)}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>คำตอบ</label>
                                    <select class="pair-answer input-field" required>
                                        ${generateAnswerOptions(answers.length, answerIndex)}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>คะแนน</label>
                                    <input type="number" class="pair-score input-field" value="${pair.score || 1}" min="1">
                                </div>
                            `;
                            matchingPairsList.appendChild(pairItem);
                        });
                    }
                } 
                // กรณีที่มีข้อมูลในรูปแบบใหม่ (มี questions และ answers แยกกัน)
                else if (Array.isArray(problemData.questions) && Array.isArray(problemData.answers)) {
                    // โหลดคำถาม
                    if (matchingQuestionsList) {
                        matchingQuestionsList.innerHTML = '';
                        problemData.questions.forEach((question, index) => {
                            const questionItem = document.createElement('div');
                            questionItem.className = 'matching-item';
                            questionItem.innerHTML = `
                                <span class="item-number">${index + 1}.</span>
                                <input type="text" class="matching-question input-field" value="${question}" required>
                                <button type="button" class="delete-btn" onclick="this.parentElement.remove()">ลบ</button>
                            `;
                            matchingQuestionsList.appendChild(questionItem);
                        });
                    }
                    
                    // โหลดคำตอบ
                    if (matchingAnswersList) {
                        matchingAnswersList.innerHTML = '';
                        problemData.answers.forEach((answer, index) => {
                            const answerItem = document.createElement('div');
                            answerItem.className = 'matching-item';
                            answerItem.innerHTML = `
                                <span class="item-number">${index + 1}.</span>
                                <input type="text" class="matching-answer input-field" value="${answer}" required>
                                <button type="button" class="delete-btn" onclick="this.parentElement.remove()">ลบ</button>
                            `;
                            matchingAnswersList.appendChild(answerItem);
                        });
                    }
                    
                    // โหลดคู่คำถาม-คำตอบ
                    if (matchingPairsList && Array.isArray(problemData.pairs)) {
                        matchingPairsList.innerHTML = '';
                        problemData.pairs.forEach((pair, index) => {
                            const pairItem = document.createElement('div');
                            pairItem.className = 'matching-pair';
                            pairItem.innerHTML = `
                                <div class="pair-header">
                                    <h4>คู่ที่ ${index + 1}</h4>
                                    <button type="button" class="delete-btn" onclick="this.closest('.matching-pair').remove()">ลบ</button>
                                </div>
                                <div class="form-group">
                                    <label>คำถาม</label>
                                    <select class="pair-question input-field" required>
                                        ${generateQuestionOptions(problemData.questions.length, pair.questionIndex)}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>คำตอบ</label>
                                    <select class="pair-answer input-field" required>
                                        ${generateAnswerOptions(problemData.answers.length, pair.answerIndex)}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>คะแนน</label>
                                    <input type="number" class="pair-score input-field" value="${pair.score || 1}" min="1">
                                </div>
                            `;
                            matchingPairsList.appendChild(pairItem);
                        });
                    }
                }
                break;
        }

        const form = document.getElementById('problemForm');
        if (form) {
            form.dataset.problemId = problemId;
        }
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการโหลดโจทย์:', error);
        alert('เกิดข้อผิดพลาดในการโหลดโจทย์');
    }
}

function logFlowchartData(message, data) {
    console.log(`[Flowchart Debug] ${message}:`, JSON.stringify(data, null, 2));
}

function generateQuestionOptions(count, selectedIndex) {
    let options = '';
    for (let i = 0; i < count; i++) {
        options += `<option value="${i}" ${i === selectedIndex ? 'selected' : ''}>${i + 1}</option>`;
    }
    return options;
}

function generateAnswerOptions(count, selectedIndex) {
    let options = '';
    for (let i = 0; i < count; i++) {
        options += `<option value="${i}" ${i === selectedIndex ? 'selected' : ''}>${i + 1}</option>`;
    }
    return options;
}

// ฟังก์ชันดูตัวอย่างสื่อ
function previewImage() {
    const imageUrl = document.getElementById('problemImage').value;
    const preview = document.getElementById('imagePreview');

    if (!imageUrl) {
        if(preview) {
            preview.style.display = 'none';
            preview.innerHTML = '';
        }
        return;
    }

    if(preview) {
        preview.style.display = 'block';
        
        // ตรวจสอบว่าเป็น YouTube หรือไม่
        const lowerUrl = imageUrl.toLowerCase();
        if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
            let videoId = '';
            if (lowerUrl.includes('youtu.be/')) {
                videoId = imageUrl.split('youtu.be/')[1].split('?')[0];
            } else if (lowerUrl.includes('v=')) {
                videoId = imageUrl.split('v=')[1].split('&')[0];
            }
            if (videoId) {
                preview.innerHTML = `<div class="preview-container"><iframe width="100%" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe></div>`;
            } else {
                preview.innerHTML = `<div class="preview-container"><iframe width="100%" height="315" src="${imageUrl}" frameborder="0" allowfullscreen></iframe></div>`;
            }
        } else if (lowerUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) == null && lowerUrl.includes('http')) {
            // อาจจะเป็นเว็บอื่นหรือ PDF
            preview.innerHTML = `<div class="preview-container"><iframe width="100%" height="315" src="${imageUrl}" frameborder="0" allowfullscreen></iframe></div>`;
        } else {
            // ถือว่าเป็นรูปภาพ
            preview.innerHTML = `
                <div class="preview-container">
                    <img src="${imageUrl}" 
                         alt="ตัวอย่างสื่อ"
                         onerror="handleImageError(this)">
                </div>
            `;
        }
    }
}

function handleImageError(img) {
    const container = img.parentElement;
    container.innerHTML = `
        <div class="error-message" style="color: #dc3545; text-align: center; padding: 20px;">
            ไม่สามารถโหลดรูปภาพได้ กรุณาตรวจสอบ URL
        </div>
    `;
}

// อัปโหลดและบีบอัดรูปภาพด้วย Firebase Storage
async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
        return;
    }

    const progressDiv = document.getElementById('uploadProgress');
    progressDiv.style.display = 'block';
    progressDiv.innerText = 'กำลังบีบอัดและอัปโหลดรูปภาพ...';

    try {
        // บีบอัดรูปภาพ
        const compressedFile = await compressImage(file, 1024, 1024, 0.7);
        
        // สร้างชื่อไฟล์ใหม่ไม่ให้ซ้ำ
        const fileName = `problem_images/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const storageRef = firebase.storage().ref();
        const imageRef = storageRef.child(fileName);

        // อัปโหลดไปยัง Firebase Storage
        progressDiv.innerText = 'กำลังบันทึกลงระบบ...';
        const snapshot = await imageRef.put(compressedFile);
        
        // ดึง URL
        const downloadURL = await snapshot.ref.getDownloadURL();
        
        // เพิ่มรูปลงใน attachmentList
        addAttachmentRow({
            type: 'image',
            title: 'รูปภาพประกอบ',
            url: downloadURL
        });
        
        // บันทึก URL ไว้ในคิวรอลบกรณีกดยกเลิก
        window.pendingImageUploads = window.pendingImageUploads || [];
        window.pendingImageUploads.push(downloadURL);
        
        progressDiv.innerText = 'อัปโหลดสำเร็จ!';
        setTimeout(() => { progressDiv.style.display = 'none'; }, 3000);
    } catch (error) {
        console.error('Error uploading image:', error);
        progressDiv.innerText = 'เกิดข้อผิดพลาดในการอัปโหลด';
        progressDiv.style.color = '#dc3545';
    }
}

async function handleGuiImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
        return;
    }

    const progressDiv = document.getElementById('guiUploadProgress');
    progressDiv.style.display = 'block';
    progressDiv.innerText = 'กำลังบีบอัดและอัปโหลดรูปภาพ...';

    try {
        const compressedFile = await compressImage(file, 1024, 1024, 0.7);
        const fileName = `problem_images/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const storageRef = firebase.storage().ref();
        const imageRef = storageRef.child(fileName);

        progressDiv.innerText = 'กำลังบันทึกลงระบบ...';
        const snapshot = await imageRef.put(compressedFile);
        const downloadURL = await snapshot.ref.getDownloadURL();
        
        document.getElementById('guiImageUrl').value = downloadURL;
        previewGUIImage();
        
        // บันทึก URL ไว้ในคิวรอลบกรณีกดยกเลิก
        window.pendingImageUploads = window.pendingImageUploads || [];
        window.pendingImageUploads.push(downloadURL);
        
        progressDiv.innerText = 'อัปโหลดสำเร็จ!';
        setTimeout(() => { progressDiv.style.display = 'none'; }, 3000);
    } catch (error) {
        console.error('Error uploading image:', error);
        progressDiv.innerText = 'เกิดข้อผิดพลาดในการอัปโหลด';
        progressDiv.style.color = '#dc3545';
    }
}

// ฟังก์ชันสำหรับบีบอัดรูปภาพด้วย Canvas
function compressImage(file, maxWidth, maxHeight, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // คำนวณสัดส่วนใหม่
                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height *= maxWidth / width));
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width *= maxHeight / height));
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // แปลงกลับเป็น Blob (File)
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Canvas to Blob failed'));
                    }
                }, 'image/jpeg', quality);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
}

function handleImageSuccess(img) {
    img.parentElement.style.display = 'block';
}


function addComprehensionQuestion() {
    const questionsList = document.getElementById('questionsList');
    const questionNumber = questionsList.children.length + 1;

    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-item';
    questionDiv.style.display = 'flex';
    questionDiv.style.gap = '20px';
    questionDiv.style.border = '1px solid #404040';
    questionDiv.style.padding = '15px';
    questionDiv.style.marginBottom = '15px';
    questionDiv.style.borderRadius = '8px';
    questionDiv.style.background = '#333';

    questionDiv.innerHTML = `
        <div class="left-panel" style="flex: 1; border-right: 1px solid #555; padding-right: 20px;">
            <div class="question-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h4 style="margin: 0; color: #fff;">คำถามที่ ${questionNumber}</h4>
                <button type="button" onclick="removeComprehensionQuestion(this)" class="delete-btn" style="padding: 5px 10px; font-size: 12px;">
                    ลบคำถาม
                </button>
            </div>

            <div class="form-group">
                <label>คำถาม *</label>
                <textarea class="question-text input-field" required 
                    placeholder="พิมพ์คำถามที่ต้องการถามนักเรียน" style="height: 80px;"></textarea>
            </div>

            <div class="form-group">
                <label>รูปภาพประกอบคำถาม (ถ้ามี)</label>
                <input type="file" class="question-image-upload input-field" accept="image/*" onchange="handleQuestionImageUpload(this)">
                <input type="hidden" class="question-image-url">
                <div class="question-image-preview" style="margin-top: 10px; display: none; text-align: center;">
                    <img src="" style="max-width: 100%; max-height: 150px; border-radius: 4px; border: 1px solid #555;">
                </div>
            </div>

            <div class="form-group">
                <label>Tag (ป้ายกำกับ) คั่นด้วยลูกน้ำ</label>
                <input type="text" class="question-tags input-field" placeholder="เช่น logic, loop, variable">
            </div>
        </div>

        <div class="right-panel" style="flex: 1; padding-left: 20px;">
            <h4 style="margin-top: 0; margin-bottom: 15px; color: #fff;">ส่วนของเฉลย (ซ่อนจากนักเรียน)</h4>
            
            <div class="form-group">
                <label>คำตอบที่ถูกต้อง *</label>
                <textarea class="correct-answer input-field" required 
                    placeholder="ใส่คำตอบที่ถูกต้อง" style="height: 80px;"></textarea>
            </div>

            <div class="form-group">
                <label>คะแนน</label>
                <input type="number" class="question-score input-field" 
                    value="1" min="1" max="10">
            </div>

            <div class="form-group">
                <label>คำอธิบายเพิ่มเติม</label>
                <textarea class="question-explanation input-field" 
                    placeholder="คำอธิบายเพิ่มเติมเกี่ยวกับคำตอบนี้" style="height: 60px;"></textarea>
            </div>
        </div>
    `;

    questionsList.appendChild(questionDiv);
}

// อัปโหลดรูปภาพย่อยของแต่ละคำถาม
async function handleQuestionImageUpload(inputElement) {
    const file = inputElement.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
        return;
    }

    const questionItem = inputElement.closest('.question-item');
    const previewDiv = questionItem.querySelector('.question-image-preview');
    const imgElement = previewDiv.querySelector('img');
    const urlInput = questionItem.querySelector('.question-image-url');

    try {
        const compressedFile = await compressImage(file, 800, 800, 0.7);
        const fileName = \`problem_images/q_\${Date.now()}_\${Math.random().toString(36).substring(7)}.jpg\`;
        const storageRef = firebase.storage().ref();
        const imageRef = storageRef.child(fileName);

        const snapshot = await imageRef.put(compressedFile);
        const downloadURL = await snapshot.ref.getDownloadURL();
        
        urlInput.value = downloadURL;
        imgElement.src = downloadURL;
        previewDiv.style.display = 'block';
        
        window.pendingImageUploads = window.pendingImageUploads || [];
        window.pendingImageUploads.push(downloadURL);
    } catch (error) {
        console.error('Error uploading question image:', error);
        alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพคำถาม');
    }
}

function removeComprehensionQuestion(button) {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบคำถามนี้?')) {
        const questionItem = button.closest('.question-item');
        questionItem.remove();

        // รีเนมเบอร์คำถามที่เหลือ
        const questions = document.querySelectorAll('.question-item');
        questions.forEach((q, index) => {
            q.querySelector('h4').textContent = `คำถามที่ ${index + 1}`;
        });
    }
}

function removeQuestion(button) {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบคำถามนี้?')) {
        const questionItem = button.closest('.question-item');
        questionItem.remove();

        // รีเนมเบอร์คำถามที่เหลือ
        const questions = document.querySelectorAll('.question-item');
        questions.forEach((q, index) => {
            q.querySelector('h4').textContent = `คำถามที่ ${index + 1}`;
        });
    }
}

// Save Problem
function countWidgets(code) {
    const widgetTypes = ['Label', 'Button', 'Entry', 'Combobox', 'Checkbutton', 'Radiobutton', 'Canvas'];
    const counts = {};
    widgetTypes.forEach(type => counts[type] = 0);
    // remove newlines and extra spaces to count widgets correctly even if split across lines
    const normalizedCode = code.replace(/\s+/g, '');
    widgetTypes.forEach(type => {
        const regex = new RegExp(type + '\\(', 'g');
        const matches = normalizedCode.match(regex);
        if (matches) {
            counts[type] += matches.length;
        }
    });
    return counts;
}

async function saveProblem(event) {
    // ตรวจสอบว่า event มีอยู่ก่อนเรียก preventDefault
    if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
    }

    const problemTitle = document.getElementById('problemTitle').value.trim();
    const problemType = document.getElementById('problemType').value;
    const problemTopic = document.getElementById('problemTopic') ? document.getElementById('problemTopic').value : 'other';
    const problemDifficulty = document.getElementById('problemDifficulty').value;
    const problemImage = document.getElementById('problemImage').value.trim();
    const problemId = document.getElementById('problemForm')?.dataset.problemId;
    const isEditing = !!problemId;

    if (!problemTitle) {
        alert('กรุณากรอกชื่อโจทย์');
        return;
    }

    const variables = Array.from(document.querySelectorAll('.variable-item')).map(item => ({
        name: item.querySelector('.var-name')?.value?.trim() || '',
        description: item.querySelector('.var-description')?.value?.trim() || ''
    })).filter(v => v.name && v.description);

    const attachments = Array.from(document.querySelectorAll('#attachmentList .attachment-item')).map(item => {
        return {
            type: item.querySelector('.attach-type').value,
            title: item.querySelector('.attach-title').value.trim(),
            url: item.querySelector('.attach-url').value.trim()
        };
    }).filter(item => item.url);

    const assignmentType = document.getElementById('assignmentType')?.value || 'exercise';

    const problemData = {
        title: problemTitle,
        type: problemType,
        topic: problemTopic,
        difficulty: problemDifficulty,
        assignmentType: assignmentType,
        variables: variables,
        image: problemImage,
        attachments: attachments,
        teacherId: auth.currentUser.uid,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if (problemType === 'gui') {
            const description = document.getElementById('guiDescription')?.value?.trim() || '';
            const templateCode = window.editor?.getValue() || '';
            const solutionCode = window.solutionEditor?.getValue() || '';
            const guiImage = document.getElementById('guiImageUrl')?.value?.trim() || '';

            // รวบรวม widgets
            const widgets = getWidgetsFromRequirements();
            if (widgets.length === 0) {
                alert('กรุณาเพิ่ม Widget Requirements และกด "Save Widget Requirements" ก่อนบันทึกโจทย์');
                return;
            }

            // รวบรวม test cases
            const testCases = Array.from(document.querySelectorAll('#guiTestCasesList .test-case')).map(testCase => {
                const inputs = Array.from(testCase.querySelectorAll('.input-entry')).map(inputEntry => {
                    const name = inputEntry.querySelector('.input-name')?.value;
                    const value = inputEntry.querySelector('.input-value')?.value?.trim();
                    return name && value ? { name, value } : null;
                }).filter(input => input);

                const actions = Array.from(testCase.querySelectorAll('.action-entry')).map(actionEntry => {
                    const widget = actionEntry.querySelector('.action-widget')?.value;
                    const state = actionEntry.querySelector('.action-state')?.value;
                    return widget && state ? { widget, state } : null;
                }).filter(action => action);

                const outputs = Array.from(testCase.querySelectorAll('.output-entry')).map(outputEntry => {
                    const widget = outputEntry.querySelector('.test-output-widget')?.value;
                    const value = outputEntry.querySelector('.test-output-value')?.value?.trim();
                    return widget && value ? { widget, value } : null;
                }).filter(output => output);

                const score = parseInt(testCase.querySelector('.test-score')?.value) || 1;
                const explanation = testCase.querySelector('.test-explanation')?.value?.trim() || '';

                // ตรวจสอบว่ามี outputs ครบถ้วนหรือไม่
                if (outputs.length === 0) {
                    console.warn('Test Case ไม่สมบูรณ์: ขาด outputs (ค่าที่คาดหวัง)');
                    return null;
                }

                return { inputs, actions, outputs, score, explanation };
            }).filter(testCase => testCase);

            if (testCases.length === 0) {
                alert('กรุณาเพิ่ม Test Case ที่มี Output (ค่าที่คาดหวัง) ครบถ้วนก่อนบันทึกโจทย์');
                return;
            }

            // เพิ่มข้อมูล GUI เข้าไปใน problemData
            Object.assign(problemData, {
                description,
                templateCode,
                solutionCode,
                guiImage,
                widgets,
                testCases,
                templateWidgetCount: countWidgets(templateCode),
                solutionWidgetCount: countWidgets(solutionCode)
            });

            if (problemType === 'iot_gui') {
                const iotWokwiId = document.getElementById('iotWokwiId')?.value?.trim() || '';
                const iotSolution = document.getElementById('iotSolution')?.value || '';
                
                if (!iotWokwiId) {
                    alert('กรุณากรอก Wokwi Project ID สำหรับโจทย์ IoT');
                    return;
                }

                const codeChecks = Array.from(document.querySelectorAll('#iotCodeChecksList .iot-code-check')).map(checkEntry => {
                    const keyword = checkEntry.querySelector('.iot-keyword')?.value?.trim();
                    const score = parseInt(checkEntry.querySelector('.iot-score')?.value) || 1;
                    return keyword ? { keyword, score } : null;
                }).filter(c => c);

                Object.assign(problemData, {
                    iotWokwiId,
                    iotSolution,
                    codeChecks
                });
            }
        } else if (problemType === 'python' || problemType === 'iot') {
            const description = document.getElementById('problemDescription')?.value?.trim() || '';
            const templateCode = document.getElementById('templateCode')?.value || '';
            const solutionCode = ''; // admin-add-ploblem.html ไม่มีฟิลด์สำหรับเฉลยใน python
            
            // รวบรวม test cases
            const testCases = Array.from(document.querySelectorAll('#testCasesList .test-case')).map(testCase => {
                
                // เก็บข้อมูลจาก input-entry ทั้งหมด (รองรับ UI ใหม่)
                const inputEntries = Array.from(testCase.querySelectorAll('.input-entry')).map(inputEntry => {
                    const name = inputEntry.querySelector('.input-name')?.value;
                    const value = inputEntry.querySelector('.input-value')?.value?.trim();
                    return name && value ? { name, value } : null;
                }).filter(input => input);
                
                // เก็บ input เก่า (รองรับ UI เก่าที่อาจจะค้างอยู่)
                const legacyInput = testCase.querySelector('.test-input')?.value?.trim() || '';
                
                let inputs = [];
                if (inputEntries.length > 0) {
                    inputs = inputEntries;
                } else if (legacyInput) {
                    inputs = legacyInput.split('\n').map((line, idx) => {
                        const val = line.trim();
                        return val ? { name: `Input ${idx+1}`, value: val } : null;
                    }).filter(i => i);
                }

                // เอาค่า value มาต่อกันเป็น string เดียวด้วย newline สำหรับการแสดงผลที่ยังใช้ .input
                const input = inputs.map(i => i.value).join('\n');
                
                const expected = testCase.querySelector('.test-output')?.value?.trim() || '';
                const score = parseInt(testCase.querySelector('.test-score')?.value) || 1;
                const explanation = testCase.querySelector('.test-explanation')?.value?.trim() || '';
                
                // ให้บันทึกได้แม้ไม่มี input (แต่ต้องมี expected output)
                return expected ? { 
                    input,
                    inputs, 
                    expected, 
                    score, 
                    explanation 
                } : null;
            }).filter(tc => tc);

            if (testCases.length === 0) {
                alert('กรุณาเพิ่ม Test Case ที่มี Output อย่างน้อย 1 ข้อก่อนบันทึกโจทย์');
                return;
            }

            Object.assign(problemData, {
                description,
                templateCode,
                solutionCode,
                testCases
            });

            if (problemType === 'iot') {
                const iotWokwiId = document.getElementById('iotWokwiId')?.value?.trim() || '';
                const iotSolution = document.getElementById('iotSolution')?.value || '';
                
                if (!iotWokwiId) {
                    alert('กรุณากรอก Wokwi Project ID สำหรับโจทย์ IoT');
                    return;
                }

                const codeChecks = Array.from(document.querySelectorAll('#iotCodeChecksList .iot-code-check')).map(checkEntry => {
                    const keyword = checkEntry.querySelector('.iot-keyword')?.value?.trim();
                    const score = parseInt(checkEntry.querySelector('.iot-score')?.value) || 1;
                    return keyword ? { keyword, score } : null;
                }).filter(c => c);

                Object.assign(problemData, {
                    iotWokwiId,
                    iotSolution,
                    codeChecks
                });
            }
        } else if (problemType === 'comprehension') {
            const content = document.getElementById('comprehensionContent')?.value?.trim() || '';
            if (!content) {
                alert('กรุณาใส่เนื้อหา/บทความ');
                return;
            }
            
            const questions = Array.from(document.querySelectorAll('#questionsList .question-item')).map((item, index) => {
                const questionText = item.querySelector('.question-text')?.value?.trim() || '';
                const correctAnswer = item.querySelector('.correct-answer')?.value?.trim() || '';
                const score = parseInt(item.querySelector('.question-score')?.value) || 1;
                const explanation = item.querySelector('.question-explanation')?.value?.trim() || '';
                
                return questionText && correctAnswer ? { 
                    number: index + 1,
                    question: questionText, 
                    correctAnswer, 
                    score,
                    explanation 
                } : null;
            }).filter(q => q);

            if (questions.length === 0) {
                alert('กรุณาเพิ่มอย่างน้อย 1 คำถาม');
                return;
            }

            Object.assign(problemData, {
                content,
                questions
            });
        } else if (problemType === 'matching') {
            const description = document.getElementById('matchingDescription')?.value?.trim() || '';
            
            // เก็บคำถาม
            const questions = Array.from(document.querySelectorAll('#matchingQuestionsList .matching-question'))
                .map(q => q.value.trim())
                .filter(val => val);
            
            // เก็บคำตอบ
            const answers = Array.from(document.querySelectorAll('#matchingAnswersList .matching-answer'))
                .map(a => a.value.trim())
                .filter(val => val);
            
            // เก็บคู่คำถาม-คำตอบ
            const pairs = Array.from(document.querySelectorAll('#matchingPairsList .matching-pair'))
                .map(pair => {
                    const questionIndex = parseInt(pair.querySelector('.pair-question')?.value) || -1;
                    const answerIndex = parseInt(pair.querySelector('.pair-answer')?.value) || -1;
                    const score = parseInt(pair.querySelector('.pair-score')?.value) || 1;
                    
                    return questionIndex >= 0 && answerIndex >= 0 ? { 
                        questionIndex, 
                        answerIndex,
                        score 
                    } : null;
                }).filter(p => p);
            
            // ตรวจสอบข้อมูล
            if (questions.length < 2) {
                alert('กรุณาเพิ่มอย่างน้อย 2 คำถาม');
                return;
            }
            if (answers.length < 2) {
                alert('กรุณาเพิ่มอย่างน้อย 2 คำตอบ');
                return;
            }
            if (pairs.length < 1) {
                alert('กรุณาเพิ่มอย่างน้อย 1 คู่คำถาม-คำตอบ');
                return;
            }
            
            // เพิ่มข้อมูลลงใน problemData
            Object.assign(problemData, {
                description,
                questions,
                answers,
                pairs
            });
        } else if (problemType === 'flowchart') {
            // แก้ไขการดึงข้อมูล flowchart
            let flowchartData = null;
            
            try {
                console.log('กำลังบันทึกข้อมูล flowchart');
                console.log('ฟังก์ชันที่มีใน flowchartEditor:', Object.keys(window.flowchartEditor));
                
                // ลองใช้วิธีต่างๆ ในการดึงข้อมูล flowchart
                if (typeof window.flowchartEditor.getFlowchartData === 'function') {
                    flowchartData = window.flowchartEditor.getFlowchartData();
                } 
                else if (typeof window.flowchartEditor.getData === 'function') {
                    flowchartData = window.flowchartEditor.getData();
                }
                else if (typeof window.flowchartEditor.getValue === 'function') {
                    flowchartData = window.flowchartEditor.getValue();
                }
                else if (typeof window.flowchartEditor.data !== 'undefined') {
                    flowchartData = window.flowchartEditor.data;
                }
                else if (typeof window.flowchartEditor.toJSON === 'function') {
                    flowchartData = window.flowchartEditor.toJSON();
                }
                else {
                    console.error('ไม่พบวิธีการดึงข้อมูล flowchart ที่เหมาะสม');
                    showNotification('ไม่สามารถดึงข้อมูล flowchart ได้', 'error');
                    return;
                }
                
                console.log('ข้อมูล flowchart ที่จะบันทึก:', flowchartData);
            } catch (error) {
                console.error('เกิดข้อผิดพลาดในการดึงข้อมูล flowchart:', error);
                showNotification('เกิดข้อผิดพลาดในการดึงข้อมูล flowchart: ' + error.message, 'error');
                return;
            }
            
            // ดึงข้อมูลอื่นๆ ของโจทย์ประเภท flowchart
            const description = document.getElementById('flowchartDescription').value;
            const maxScore = parseInt(document.getElementById('flowchartMaxScore').value) || 10;
            
            // ดึงข้อมูลเกณฑ์การให้คะแนน
            const scoringCriteriaItems = document.querySelectorAll('#scoringCriteriaList .criteria-item');
            const scoringCriteria = Array.from(scoringCriteriaItems).map(item => {
                return {
                    description: item.querySelector('.criteria-description')?.value || '',
                    score: parseInt(item.querySelector('.score-input').value) || 0
                };
            });
            
            // เพิ่มข้อมูลลงใน problemData แทนการกำหนดค่าใหม่
            Object.assign(problemData, {
                description,
                maxScore,
                flowchartData,
                scoringCriteria
            });
        }

        // เพิ่มคำต่อท้ายสำหรับข้อสอบ
        if (problemType === 'comprehension' && !problemData.title.endsWith('(ข้อสอบ)')) {
            problemData.title += ' (ข้อสอบ)';
        }

        console.log('กำลังบันทึกข้อมูลโจทย์:', problemData);

        // บันทึกข้อมูล
        if (isEditing) {
            await db.collection('problems').doc(problemId).update(problemData);
            console.log('อัพเดทโจทย์สำเร็จ:', problemId);
            alert('อัพเดทโจทย์สำเร็จ');
        } else {
            // เพิ่ม createdAt เฉพาะเมื่อสร้างโจทย์ใหม่
            problemData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            const docRef = await db.collection('problems').add(problemData);
            console.log('สร้างโจทย์ใหม่สำเร็จ:', docRef.id);
            alert('บันทึกโจทย์สำเร็จ');
        }
        
        // บันทึกสำเร็จแล้ว เคลียร์คิวรูปภาพที่รออัปโหลด เพื่อไม่ให้โดนลบตอน closeModal
        window.pendingImageUploads = [];
        
        document.getElementById('problemModal').style.display = 'none';
        loadProblems();
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการบันทึกโจทย์:', error);
        alert('เกิดข้อผิดพลาดในการบันทึกโจทย์: ' + error.message);
    }
}


function initConnectionPoints(symbolElement) {
    const connectionPoints = [];
    const positions = ['top', 'right', 'bottom', 'left'];
    const symbolBBox = symbolElement.getBBox();

    positions.forEach((position, index) => {
        const point = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        let x, y;

        switch (position) {
            case 'top':
                x = symbolBBox.x + symbolBBox.width / 2;
                y = symbolBBox.y;
                break;
            case 'right':
                x = symbolBBox.x + symbolBBox.width;
                y = symbolBBox.y + symbolBBox.height / 2;
                break;
            case 'bottom':
                x = symbolBBox.x + symbolBBox.width / 2;
                y = symbolBBox.y + symbolBBox.height;
                break;
            case 'left':
                x = symbolBBox.x;
                y = symbolBBox.y + symbolBBox.height / 2;
                break;
        }

        point.setAttribute('cx', x);
        point.setAttribute('cy', y);
        point.setAttribute('r', 4);
        point.setAttribute('class', `connection-point ${position}`);
        point.setAttribute('data-position', position);

        // เพิ่ม event listeners สำหรับการลากเส้น
        point.addEventListener('mousedown', startConnection);
        point.addEventListener('mouseover', () => {
            if (window.flowchartEditor?.state?.isConnecting) {
                point.classList.add('active');
            }
        });
        point.addEventListener('mouseout', () => {
            point.classList.remove('active');
        });

        symbolElement.appendChild(point);
        connectionPoints.push(point);
    });

    return connectionPoints;
}
function sanitizeConnectionData(connection) {
    // ลบ properties ที่เป็น DOM elements
    const { element, elements, ...cleanData } = connection;
    return cleanData;
}

function startConnection(event) {
    const state = window.flowchartEditor.state;
    if (!state || state.currentTool !== 'arrow') return;

    event.stopPropagation();
    const point = event.target;
    const symbol = point.closest('.flowchart-symbol');

    state.isConnecting = true;
    state.sourceSymbol = symbol;
    state.sourcePoint = {
        x: parseFloat(point.getAttribute('cx')),
        y: parseFloat(point.getAttribute('cy')),
        position: point.getAttribute('data-position')
    };

    // สร้างเส้นชั่วคราว
    const svg = document.querySelector('#flowchartCanvas svg');
    state.tempLine = document.createElementNS("http://www.w3.org/2000/svg", "path");
    state.tempLine.setAttribute('class', 'temp-connection');
    state.tempLine.setAttribute('stroke', '#666');
    state.tempLine.setAttribute('stroke-width', '2');
    svg.appendChild(state.tempLine);

    // เพิ่ม event listeners
    svg.addEventListener('mousemove', updateConnection);
    svg.addEventListener('mouseup', finishConnection);
}
function updateConnection(event) {
    const state = window.flowchartEditor.state;
    if (!state.isConnecting || !state.tempLine) return;

    const svg = document.querySelector('#flowchartCanvas svg');
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const transformedPoint = point.matrixTransform(svg.getScreenCTM().inverse());

    const d = `M ${state.sourcePoint.x} ${state.sourcePoint.y} L ${transformedPoint.x} ${transformedPoint.y}`;
    state.tempLine.setAttribute('d', d);
}

function finishConnection(event) {
    const state = window.flowchartEditor.state;
    if (!state.isConnecting) return;

    const targetPoint = event.target;
    if (targetPoint.classList.contains('connection-point')) {
        const targetSymbol = targetPoint.closest('.flowchart-symbol');
        if (targetSymbol && targetSymbol !== state.sourceSymbol) {
            createConnection(
                state.sourceSymbol,
                targetSymbol,
                state.sourcePoint,
                {
                    x: parseFloat(targetPoint.getAttribute('cx')),
                    y: parseFloat(targetPoint.getAttribute('cy')),
                    position: targetPoint.getAttribute('data-position')
                }
            );
        }
    }

    // ทำความสะอาด
    if (state.tempLine) {
        state.tempLine.remove();
        state.tempLine = null;
    }

    const svg = document.querySelector('#flowchartCanvas svg');
    svg.removeEventListener('mousemove', updateConnection);
    svg.removeEventListener('mouseup', finishConnection);

    state.isConnecting = false;
    state.sourceSymbol = null;
    state.sourcePoint = null;
}

function createConnection(sourceSymbol, targetSymbol, sourcePoint, targetPoint) {
    const connectionId = `connection-${Date.now()}`;
    const connection = {
        id: connectionId,
        sourceSymbol: sourceSymbol.id,
        targetSymbol: targetSymbol.id,
        sourcePoint: sourcePoint.position,
        targetPoint: targetPoint.position,
        bendPoints: []
    };

    const path = createConnectionPath(connection);
    window.flowchartEditor.addConnection(connection);
}

async function saveComprehensionProblem() {
    try {
        const problemData = {
            title: document.getElementById('problemTitle').value.trim(),
            type: 'comprehension',
            difficulty: document.getElementById('problemDifficulty').value,
            content: document.getElementById('comprehensionContent').value.trim(),
            questions: [],
            teacherId: auth.currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // รวบรวมคำถาม
        const questionElements = document.querySelectorAll('.question-item');
        questionElements.forEach((el, index) => {
            const rawTags = el.querySelector('.question-tags') ? el.querySelector('.question-tags').value : '';
            const tags = rawTags.split(',').map(t => t.trim()).filter(t => t);
            
            problemData.questions.push({
                number: index + 1,
                question: el.querySelector('.question-text').value.trim(),
                imageUrl: el.querySelector('.question-image-url') ? el.querySelector('.question-image-url').value : '',
                tags: tags,
                correctAnswer: el.querySelector('.correct-answer').value.trim(),
                score: parseInt(el.querySelector('.question-score').value) || 1,
                explanation: el.querySelector('.question-explanation').value.trim()
            });
        });

        // ตรวจสอบข้อมูล
        if (!problemData.title) throw new Error('กรุณาใส่ชื่อโจทย์');
        if (!problemData.content) throw new Error('กรุณาใส่เนื้อหา/บทความ');
        if (problemData.questions.length === 0) throw new Error('กรุณาเพิ่มอย่างน้อย 1 คำถาม');

        // บันทึกข้อมูล
        await db.collection('problems').add(problemData);
        alert('บันทึกโจทย์สำเร็จ');
        
        // บันทึกสำเร็จแล้ว เคลียร์คิวรูปภาพที่รออัปโหลด เพื่อไม่ให้โดนลบตอน closeModal
        window.pendingImageUploads = [];
        
        closeModal();
        loadProblems(); // รีโหลดรายการโจทย์

    } catch (error) {
        console.error('Error saving comprehension problem:', error);
        alert(error.message || 'เกิดข้อผิดพลาดในการบันทึกโจทย์');
    }
}

async function loadProblems() {
    const problemList = document.getElementById('problemList');
    if (!problemList) {
        console.error('loadProblems: problemList element not found'); // Debug log
        return;
    }

    try {
        console.log('loadProblems: Fetching problems'); // Debug log
        const user = auth.currentUser;
        problemList.innerHTML = '<p>กำลังโหลดข้อมูล...</p>';

        const snapshot = await db.collection('problems')
            .where('teacherId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .get();

        if (snapshot.empty) {
            problemList.innerHTML = '<p>ยังไม่มีโจทย์</p>';
            console.log('loadProblems: No problems found'); // Debug log
            return;
        }

        problemList.innerHTML = '';
        snapshot.forEach(doc => {
            const problem = doc.data();
            console.log('loadProblems: Loaded problem:', problem); // Debug log
            const div = document.createElement('div');
            div.className = 'problem-card';

            // แปลงประเภทโจทย์เป็นภาษาไทย
            const typeMapping = {
                'python': 'โจทย์เขียนโปรแกรม',
                'comprehension': 'คำถามความเข้าใจ',
                'matching': 'จับคู่',
                'flowchart': 'ผังงาน',
                'gui': 'ส่วนต่อประสานกราฟิก', // เพิ่ม gui
                'summary': 'กระดานสรุปผล',
                'iot': 'โจทย์ IoT (ESP32/Wokwi)',
                'iot_gui': 'IoT + GUI Dashboard'
            };

            // เลือกไอคอนตามประเภทโจทย์
            const iconMapping = {
                'python': '💻',
                'comprehension': '📝',
                'matching': '🔄',
                'gui': '🪟',
                'flowchart': '📊',
                'summary': '📝',
                'iot': '🔌',
                'iot_gui': '📱'
            };

            const typeIcon = iconMapping[problem.type] || '📄';
            const typeText = typeMapping[problem.type] || 'ไม่ระบุประเภท';

            // เลือกเนื้อหาที่จะแสดงตามประเภทโจทย์
            let contentPreview = '';
            let countText = '';
            
            const topicMapping = {
                'basic': '1. พื้นฐาน Python',
                'condition': '2. เงื่อนไข',
                'loop': '3. การวนซ้ำ',
                'function': '4. ฟังก์ชัน',
                'datastructure': '5. โครงสร้างข้อมูล',
                'gui': '6. การสร้างหน้าต่าง (GUI)',
                'other': '7. อื่นๆ'
            };
            const topicText = problem.topic ? (topicMapping[problem.topic] || problem.topic) : 'ไม่ระบุหมวดหมู่';

            switch (problem.type) {
                case 'flowchart':
                    contentPreview = problem.description || 'ไม่มีคำอธิบาย';
                    const symbolCount = problem.flowchartData?.symbols?.length || 0;
                    countText = `จำนวน Symbols: ${symbolCount}`;
                    break;
                case 'python':
                    contentPreview = problem.description || 'ไม่มีคำอธิบาย';
                    countText = `จำนวน Test Cases: ${problem.testCases?.length || 0}`;
                    break;
                case 'comprehension':
                    contentPreview = problem.content || 'ไม่มีเนื้อหา';
                    countText = `จำนวนคำถาม: ${problem.questions?.length || 0}`;
                    break;
                case 'matching':
                    contentPreview = problem.description || 'ไม่มีคำอธิบาย';
                    countText = `จำนวนคู่คำถาม-คำตอบ: ${problem.pairs?.length || 0}`;
                    break;
                case 'gui':
                    contentPreview = problem.description || 'ไม่มีคำอธิบาย';
                    countText = `จำนวน Test Cases: ${problem.testCases?.length || 0}`;
                    break;
                case 'summary':
                    contentPreview = problem.description || 'ไม่มีคำอธิบาย';
                    countText = 'โจทย์สรุปความรู้';
                    break;
                case 'iot':
                    contentPreview = problem.description || problem.iotDescription || 'ไม่มีคำอธิบาย';
                    countText = `จำนวน Code Checks: ${problem.codeChecks?.length || 0}`;
                    break;
                case 'iot_gui':
                    contentPreview = problem.description || 'ไม่มีคำอธิบาย';
                    countText = `GUI Test Cases: ${problem.testCases?.length || 0}`;
                    break;
                default:
                    contentPreview = 'ไม่มีข้อมูล';
                    countText = 'ไม่ระบุ';
            }

            div.innerHTML = `
                <div class="problem-info">
                    <div class="problem-header">
                        <span class="problem-type">${typeIcon} ${typeText}</span>
                        <span class="status-badge" style="background-color:#4CAF50;color:white;">${topicText}</span>
                    </div>
                    <h3>${problem.title || 'ไม่มีชื่อ'}</h3>
                    <p>${contentPreview}</p>
                    <p>${countText}</p>
                </div>
                <div class="problem-actions">
                    <button onclick="editProblem('${doc.id}')" class="secondary-btn">แก้ไข</button>
                    <button onclick="deleteProblem('${doc.id}')" class="delete-btn">ลบ</button>
                    <button onclick="addProblemToClass('${doc.id}')" class="primary-btn">เพิ่มคำถามให้ผู้เรียน</button>
                </div>
            `;
            problemList.appendChild(div);
        });

        console.log('loadProblems: Loaded', snapshot.size, 'problems'); // Debug log

    } catch (error) {
        console.error('Error loading problems:', error);
        problemList.innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    }
}

// Delete Problem
async function deleteProblem(problemId) {
    try {
        // เช็คการใช้งานโจทย์ในห้องเรียนต่างๆ
        const problem = await db.collection('problems').doc(problemId).get();
        const classProblems = await db.collection('class_problems')
            .where('problemId', '==', problemId)
            .get();

        if (!classProblems.empty) {
            // ถ้ามีการใช้งานในห้องเรียน
            const usedClassNames = problem.data().classNames || [];
            const confirmMessage = `โจทย์นี้กำลังถูกใช้งานในห้องเรียน:\n${usedClassNames.join(', ')}\n\nการลบโจทย์จะทำให้โจทย์หายไปจากทุกห้องเรียน\nยืนยันที่จะลบหรือไม่?`;

            if (!confirm(confirmMessage)) {
                return;
            }
        } else {
            // ถ้าไม่มีการใช้งานในห้องเรียน
            if (!confirm('คุณแน่ใจหรือไม่ที่จะลบโจทย์นี้?')) {
                return;
            }
        }

        // ลบความสัมพันธ์กับห้องเรียนทั้งหมด
        const deleteClassProblems = classProblems.docs.map(doc => doc.ref.delete());

        // ดึงข้อมูลโจทย์เพื่อลบรูปภาพและสื่อที่เกี่ยวข้องจาก Storage
        const problemData = problem.data();
        const deleteStoragePromises = [];

        // ลบรูปภาพหลักของโจทย์
        if (problemData.image) {
            try {
                const imageRef = firebase.storage().refFromURL(problemData.image);
                deleteStoragePromises.push(imageRef.delete().catch(e => console.log('Image not found or already deleted:', e)));
            } catch (error) {
                console.log('Error parsing main image URL:', error);
            }
        }

        // ลบสื่อแนบ (Attachments) ที่เป็นไฟล์ใน Storage (pdf, image)
        if (problemData.attachments && Array.isArray(problemData.attachments)) {
            problemData.attachments.forEach(att => {
                if ((att.type === 'image' || att.type === 'pdf') && att.url.includes('firebasestorage')) {
                    try {
                        const attRef = firebase.storage().refFromURL(att.url);
                        deleteStoragePromises.push(attRef.delete().catch(e => console.log('Attachment not found or already deleted:', e)));
                    } catch (error) {
                         console.log('Error parsing attachment URL:', error);
                    }
                }
            });
        }

        // รอให้ลบไฟล์จาก Storage เสร็จสิ้น (แบบไม่บังคับว่าต้องสำเร็จทั้งหมด)
        if (deleteStoragePromises.length > 0) {
            await Promise.allSettled(deleteStoragePromises);
        }

        // ลบโจทย์
        const deleteProblem = db.collection('problems').doc(problemId).delete();

        // ดำเนินการลบทั้งหมดพร้อมกัน
        await Promise.all([...deleteClassProblems, deleteProblem]);

        alert('ลบโจทย์สำเร็จ');
        loadProblems();
    } catch (error) {
        console.error('Error deleting problem:', error);
        alert('เกิดข้อผิดพลาดในการลบโจทย์');
    }
}

// Delete Class
async function deleteClass(classId) {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบห้องเรียนนี้?')) return;

    try {
        await db.collection('classes').doc(classId).delete();
        alert('ลบห้องเรียนสำเร็จ');
        loadClasses(auth.currentUser.uid);
    } catch (error) {
        console.error('Error deleting class:', error);
        alert('เกิดข้อผิดพลาดในการลบห้องเรียน');
    }
}



// View Class
function viewClass(classId) {
    window.location.href = `class-detail.html?id=${classId}`;
}
function toggleProblemTypeFields() {
    const problemType = document.getElementById('problemType').value;

    // ซ่อนทุก section ก่อน
    const sections = ['pythonSection', 'comprehensionContentGroup', 'questionsSection', 'matchingSection', 'flowchartSection'];
    sections.forEach(section => {
        const element = document.getElementById(section);
        if (element) element.style.display = 'none';
    });

    // แสดง section ตามประเภทที่เลือก
    if (problemType === 'flowchart') {
        document.getElementById('flowchartSection').style.display = 'block';
        // ไม่ต้อง initialize ใหม่ถ้ามีอยู่แล้ว
        if (!window.flowchartEditor) {
            window.flowchartEditor = new FlowchartEditor('flowchartCanvas');
        }
    } else if (problemType === 'python') {
        document.getElementById('pythonSection').style.display = 'block';
    } else if (problemType === 'comprehension') {
        document.getElementById('comprehensionContentGroup').style.display = 'block';
        document.getElementById('questionsSection').style.display = 'block';
    } else if (problemType === 'matching') {
        document.getElementById('matchingSection').style.display = 'block';
    }
}

function addMatchingPair() {
    try {
        const questionsList = document.getElementById('questionsList');
        const answersList = document.getElementById('answersList');

        if (!questionsList || !answersList) {
            console.error('Cannot find questionsList or answersList');
            return;
        }

        const pairIndex = questionsList.children.length + 1;

        // สร้างคำถาม
        const questionDiv = document.createElement('div');
        questionDiv.className = 'pair-item';

        // สร้าง label
        const questionLabel = document.createElement('label');
        questionLabel.textContent = `คำถามที่ ${pairIndex}`;

        // สร้าง textarea
        const questionTextarea = document.createElement('textarea');
        questionTextarea.className = 'question-text';
        questionTextarea.required = true;

        // สร้างปุ่มลบ
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'ลบ';
        deleteBtn.onclick = () => deleteMatchingPair(pairIndex);

        // ประกอบส่วนของคำถาม
        questionDiv.appendChild(questionLabel);
        questionDiv.appendChild(questionTextarea);
        questionDiv.appendChild(deleteBtn);

        // สร้างคำตอบ
        const answerDiv = document.createElement('div');
        answerDiv.className = 'pair-item';

        // สร้าง label สำหรับคำตอบ
        const answerLabel = document.createElement('label');
        answerLabel.textContent = `คำตอบที่ ${pairIndex}`;

        // สร้าง textarea สำหรับคำตอบ
        const answerTextarea = document.createElement('textarea');
        answerTextarea.className = 'answer-text';
        answerTextarea.required = true;

        // ประกอบส่วนของคำตอบ
        answerDiv.appendChild(answerLabel);
        answerDiv.appendChild(answerTextarea);

        // เพิ่มเข้าไปในรายการ
        questionsList.appendChild(questionDiv);
        answersList.appendChild(answerDiv);

        console.log('Added new pair successfully');
    } catch (error) {
        console.error('Error adding matching pair:', error);
    }
}

function deleteMatchingPair(index) {
    try {
        if (confirm('คุณแน่ใจหรือไม่ที่จะลบคู่คำถาม-คำตอบนี้?')) {
            const questionsList = document.getElementById('questionsList');
            const answersList = document.getElementById('answersList');

            if (!questionsList || !answersList) {
                console.error('Cannot find lists');
                return;
            }

            // ลบคำถามและคำตอบ
            if (questionsList.children[index - 1]) {
                questionsList.children[index - 1].remove();
            }
            if (answersList.children[index - 1]) {
                answersList.children[index - 1].remove();
            }

            // รีเนมเบอร์คู่ที่เหลือ
            Array.from(questionsList.children).forEach((item, i) => {
                const label = item.querySelector('label');
                if (label) {
                    label.textContent = `คำถามที่ ${i + 1}`;
                }
            });

            Array.from(answersList.children).forEach((item, i) => {
                const label = item.querySelector('label');
                if (label) {
                    label.textContent = `คำตอบที่ ${i + 1}`;
                }
            });
        }
    } catch (error) {
        console.error('Error deleting matching pair:', error);
    }
}



function addMatchingQuestion(data = null) {
    const questionsList = document.getElementById('matchingQuestionsList');

    if (!questionsList) {
        console.error('matchingQuestionsList element not found');
        return;
    }

    const pairIndex = questionsList.children.length + 1;
    const questionDiv = document.createElement('div');
    questionDiv.className = 'pair-item';
    questionDiv.innerHTML = `
        <div class="pair-header">
            <div class="pair-label">คำถามที่ ${pairIndex}</div>
            <div class="score-input">
                <input type="number" 
                       class="score" 
                       value="${data?.score || 1}" 
                       min="1" 
                       max="10">
                <span>คะแนน</span>
            </div>
            <button type="button" class="delete-btn" onclick="deleteMatchingItem(this.parentElement.parentElement, 'question')">ลบ</button>
        </div>
        <textarea 
            class="question-text" 
            placeholder="พิมพ์คำถามที่นี่..." 
            required
        >${data?.question || ''}</textarea>
    `;

    questionsList.appendChild(questionDiv);
}

function addMatchingAnswer() {
    const answersList = document.getElementById('matchingAnswersList');

    if (!answersList) {
        console.error('matchingAnswersList element not found');
        return;
    }

    const pairIndex = answersList.children.length + 1;
    const answerDiv = document.createElement('div');
    answerDiv.className = 'pair-item';
    answerDiv.innerHTML = `
        <div class="pair-header">
            <div class="pair-label">คำตอบที่ ${pairIndex}</div>
            <button type="button" class="delete-btn" onclick="deleteMatchingItem(this.parentElement.parentElement, 'answer')">ลบ</button>
        </div>
        <textarea 
            class="answer-text" 
            placeholder="พิมพ์คำตอบที่นี่..." 
            required
        ></textarea>
    `;

    answersList.appendChild(answerDiv);
}

function deleteMatchingItem(element, type) {
    if (confirm(`คุณแน่ใจหรือไม่ที่จะลบ${type === 'question' ? 'คำถาม' : 'คำตอบ'}นี้?`)) {
        element.remove();
        // Renumber remaining items
        const listId = type === 'question' ? 'matchingQuestionsList' : 'matchingAnswersList';
        const list = document.getElementById(listId);
        if (list) {
            Array.from(list.children).forEach((item, i) => {
                const label = item.querySelector('.pair-label');
                if (label) {
                    label.textContent = `${type === 'question' ? 'คำถาม' : 'คำตอบ'}ที่ ${i + 1}`;
                }
            });
        }
    }
}
function clearFlowchart() {
    if (confirm('คุณแน่ใจหรือไม่ที่จะล้าง Flowchart?')) {
        try {
            // ล้าง state ทั้งหมด
            if (window.flowchartEditor) {
                window.flowchartEditor.clearCanvas();
            }

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
            if (window.flowchartEditor) {
                window.flowchartEditor.state = {
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
            }

            console.log('Canvas cleared successfully');
        } catch (error) {
            console.error('Error clearing canvas:', error);
        }
    }
}
// เพิ่มฟังก์ชัน convertTkinterToHtml (คัดลอกจาก student-gui.js หรือปรับแต่งตามความเหมาะสม)
function convertTkinterToHtml(tkinterCode) {
    const elements = [];
    
    // Helper function สำหรับรวมบรรทัดที่มีการขึ้นบรรทัดใหม่
    function mergeMultiLineStatements(lines) {
        const logicalLines = [];
        let currentRaw = '';
        let currentLine = '';
        let openParens = 0;
        let inString = false;
        let stringChar = '';

        lines.forEach(raw => {
            let line = raw.trim();
            if (line.startsWith('#') || line === '') return;
            let isLineContinuation = false;
            if (line.endsWith('\\')) {
                line = line.slice(0, -1).trim();
                isLineContinuation = true;
            }

            if (!currentLine) currentRaw = raw;

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
                logicalLines.push(currentLine);
                currentLine = '';
                currentRaw = '';
                openParens = 0;
                inString = false;
            }
        });

        if (currentLine) {
            logicalLines.push(currentLine);
        }
        return logicalLines;
    }

    const lines = mergeMultiLineStatements(tkinterCode.split('\n'));

    // เพิ่มตัวแปรเก็บขนาด default
    let windowWidth = 400;  // ขนาดเริ่มต้น
    let windowHeight = 400;

    // เพิ่มค่าสูงสุดที่อนุญาต
    const MAX_WIDTH = 600;
    const MAX_HEIGHT = 500;

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) continue;

        try {
            // ตรวจสอบการกำหนด geometry
            if (trimmedLine.includes('geometry(')) {
                const geometryMatch = trimmedLine.match(/geometry\(['"](\d+x\d+)['"]\)/);
                if (geometryMatch) {
                    const [width, height] = geometryMatch[1].split('x').map(Number);

                    // จำกัดขนาดไม่ให้เกินค่าสูงสุด
                    windowWidth = Math.min(width || windowWidth, MAX_WIDTH);
                    windowHeight = Math.min(height || windowHeight, MAX_HEIGHT);

                    if (width > MAX_WIDTH || height > MAX_HEIGHT) {
                        elements.push(`
                            <div style="color: red; font-size: 12px; margin: 5px 0;">
                                Warning: Maximum window size is ${MAX_WIDTH}x${MAX_HEIGHT} pixels
                            </div>
                        `);
                    }
                }
                continue;
            }
            // Title
            else if (trimmedLine.includes('title(')) {
                const title = trimmedLine.match(/title\(['"](.*?)['"]\)/)[1];
                elements.push(`
                    <div style="
                        width: 100%;
                        background-color: #f0f0f0;
                        padding: 5px 10px;
                        border-bottom: 1px solid #ccc;
                        display: flex;
                        align-items: center;
                        position: relative;
                    ">
                        <div style="
                            position: absolute;
                            right: 10px;
                            display: flex;
                            gap: 5px;
                        ">
                            <span style="
                                width: 12px;
                                height: 12px;
                                background: #ddd;
                                border: 1px solid #999;
                                border-radius: 2px;
                            "></span>
                            <span style="
                                width: 12px;
                                height: 12px;
                                background: #ddd;
                                border: 1px solid #999;
                                border-radius: 2px;
                            "></span>
                        </div>
                        <div style="flex-grow: 1; text-align: center; font-size: 14px;">
                            ${title}
                        </div>
                    </div>
                `);
            }

            // Label
            else if (trimmedLine.includes('Label(')) {
                const textMatch = trimmedLine.match(/text=['"](.*?)['"]/);
                const text = textMatch ? textMatch[1] : '';
                const fg = trimmedLine.match(/fg=['"]([^'"]*)['"]/)?.[1] || 'black';
                const bg = trimmedLine.match(/bg=['"]([^'"]*)['"]/)?.[1] || 'transparent';
                const fontMatch = trimmedLine.match(/font=\((.*?)\)/);
                const font = fontMatch ? fontMatch[1] : null;
                const relief = trimmedLine.match(/relief=['"]([^'"]*)['"]/)?.[1] || '';
                const borderwidth = trimmedLine.match(/borderwidth=(\d+)/)?.[1] || '';

                let style = `color:${fg};background-color:${bg};padding:2px;`;
                if (relief && borderwidth) {
                    if (relief === 'ridge') style += `border:${borderwidth}px ridge #ccc;`;
                    else if (relief === 'solid') style += `border:${borderwidth}px solid #ccc;`;
                    else if (relief === 'sunken') style += `border:${borderwidth}px inset #ccc;`;
                    else if (relief === 'raised') style += `border:${borderwidth}px outset #ccc;`;
                    else if (relief === 'groove') style += `border:${borderwidth}px groove #ccc;`;
                }

                if (font) {
                    try {
                        const fontParts = font.replace(/['"]/g, '').split(',').map(s => s.trim());
                        if (fontParts.length >= 2) {
                            style += `font-family:${fontParts[0]};font-size:${fontParts[1]}px;`;
                            if (fontParts.includes('bold')) style += 'font-weight:bold;';
                        }
                    } catch (e) {
                        console.log("Error parsing font:", e);
                    }
                }

                elements.push(`<div style="${style} display:inline-block; margin:2px;">${text}</div><br>`);
            }
            // Button
            else if (trimmedLine.includes('Button(')) {
                const text = trimmedLine.match(/text=['"]([^'"]*)['"]/)?.[1] || '';
                const bg = trimmedLine.match(/bg=['"]([^'"]*)['"]/)?.[1] || '#f0f0f0';
                const fg = trimmedLine.match(/fg=['"]([^'"]*)['"]/)?.[1] || 'black';

                const style = `background-color:${bg};color:${fg};padding:5px 10px;border:none;cursor:pointer;margin:5px;`;
                elements.push(`<button onclick="handleClick(this)" style="${style}">${text}</button>`);
            }
            // Entry
            else if (trimmedLine.includes('Entry(')) {
                const width = trimmedLine.match(/width=(\d+)/)?.[1] || '20';
                const style = `width:${parseInt(width) * 8}px;padding:5px;margin:5px;`;
                elements.push(`<input type="text" style="${style}">`);
            }
            // Combobox
            else if (trimmedLine.includes('Combobox(')) {
                const valuesMatch = trimmedLine.match(/values=\[(.*?)\]/);
                if (valuesMatch) {
                    const values = eval(`[${valuesMatch[1]}]`);
                    const options = values.map(v => `<option>${v}</option>`).join('');
                    elements.push(`<select style="padding:5px;width:150px;margin:5px;">${options}</select>`);
                }
            }
            // Checkbutton
            else if (trimmedLine.includes('Checkbutton(')) {
                const text = trimmedLine.match(/text=['"]([^'"]*)['"]/)?.[1] || '';
                elements.push(`<label style="margin:5px;"><input type="checkbox" style="margin-right:5px;">${text}</label>`);
            }
            // Radiobutton
            else if (trimmedLine.includes('Radiobutton(')) {
                const text = trimmedLine.match(/text=['"]([^'"]*)['"]/)?.[1] || '';
                const value = trimmedLine.match(/value=(\d+)/)?.[1] || '0';
                elements.push(`<label style="margin:5px;"><input type="radio" name="radiogroup" value="${value}" style="margin-right:5px;">${text}</label>`);
            }
            // Canvas
            else if (trimmedLine.includes('Canvas(')) {
                const width = trimmedLine.match(/width=(\d+)/)?.[1] || '200';
                const height = trimmedLine.match(/height=(\d+)/)?.[1] || '200';
                const bg = trimmedLine.match(/bg=['"]([^'"]*)['"]/)?.[1] || 'lightgray';
                elements.push(`<div style="width:${width}px;height:${height}px;background-color:${bg};border:1px solid #ccc;margin:5px;"></div>`);
            }
        } catch (err) {
            console.error('Error parsing line:', trimmedLine, err);
            elements.push(`<div style="color:red;">Error parsing: ${trimmedLine}</div>`);
        }
    }

    return `
        <div style="
            font-family: Arial;
            border: 1px solid #ccc;
            border-radius: 4px;
            overflow: hidden;
            margin: 0 auto;
            width: ${windowWidth}px;
            max-width: 100%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        ">
            <div style="
                background: white;
                height: ${windowHeight}px;
                max-height: ${MAX_HEIGHT}px;
                padding: 20px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                align-items: center;
                overflow-y: auto;
            ">
                ${elements.join('')}
            </div>
        </div>
    `;
}

// เพิ่มฟังก์ชัน previewGUI
function previewGUI() {
    // ดึงโค้ดล่าสุดจาก CodeMirror แทน <textarea>
    if (!window.editor) {
        console.error('window.editor is not defined');
        return;
    }
    const code = window.editor.getValue().trim(); // ใช้โค้ดจาก CodeMirror
    validateGUICode(code); // ตรวจสอบก่อนแสดงตัวอย่าง
    const html = convertTkinterToHtml(code);
    const preview = document.getElementById('guiPreview');
    preview.innerHTML = html;
    preview.style.display = 'block';
}

function previewGUIImage() {
    const imageUrl = document.getElementById('guiImageUrl').value;
    const preview = document.getElementById('guiImagePreview');
    if (imageUrl) {
        preview.innerHTML = `<img src="${imageUrl}" alt="ภาพประกอบ GUI" onerror="this.parentElement.style.display='none'">`;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
        preview.innerHTML = '';
    }
}
function addGUIRequirement() {
    const container = document.getElementById('guiRequirements');
    const item = document.createElement('div');
    item.className = 'requirement-item';
    item.innerHTML = `
        <div class="requirement-row">
            <select class="requirement-type">
                <option value="Label">Label</option>
                <option value="Button">Button</option>
                <option value="Entry">Entry</option>
                <option value="Combobox">Combobox</option>
                <option value="Checkbutton">Checkbutton</option>
                <option value="Radiobutton">Radiobutton</option>
                <option value="Canvas">Canvas</option>
                <option value="Menu">Menu</option>
                <option value="Frame">Frame</option>
                <option value="Listbox">Listbox</option>
                <option value="Scale">Scale</option>
            </select>
            <input type="text" class="requirement-name" placeholder="ชื่อตัวแปร เช่น btn1" required>
            <input type="text" class="requirement-text" placeholder="ข้อความบน Widget เช่น คลิกฉัน" style="width: 150px;">
            <input type="text" class="requirement-props" placeholder="Properties เช่น bg='red'" style="width: 150px;">
            <input type="text" class="requirement-action" placeholder="การทำงาน เช่น แสดงผลรวมใน Label" style="width: 150px;">
            <input type="number" class="requirement-score" value="5" style="width: 60px;">
            <button type="button" class="delete-requirement-btn" onclick="deleteRequirement(this)">ลบ</button>
        </div>
    `;
    container.appendChild(item);

    // เพิ่ม logic เพื่อซ่อน/แสดงช่อง action ตามประเภท widget
    const typeSelect = item.querySelector('.requirement-type');
    const actionInput = item.querySelector('.requirement-action');

    typeSelect.addEventListener('change', () => {
        const type = typeSelect.value;
        actionInput.style.display = ['Button', 'Checkbutton', 'Radiobutton'].includes(type) ? 'block' : 'none';
    });

    // อัพเดต savedWidgets และรีเฟรช dropdown ทันทีหลังจากเพิ่ม widget
    savedWidgets = getWidgetsFromRequirements();
    window.savedWidgets = [...savedWidgets]; // อัพเดต window.savedWidgets
    refreshTestCaseActions();
}



function deleteRequirement(button) {
    if (confirm('การลบข้อกำหนดนี้อาจส่งผลต่อ Test Case ที่เกี่ยวข้อง คุณแน่ใจหรือไม่ที่จะลบ?')) {
        const widgetName = button.parentElement.querySelector('.requirement-name')?.value?.trim();
        button.parentElement.remove();
        savedWidgets = getWidgetsFromRequirements();
        window.savedWidgets = [...savedWidgets]; // อัพเดต window.savedWidgets
        refreshTestCaseActions(); // อัพเดต dropdown ทันที
        console.log(`ลบ widget: ${widgetName}`);
    }
}

function validateGUICode(code) {
    const validationMessage = document.getElementById('guiValidationMessage');
    try {
        const isEditMode = document.getElementById('problemForm').hasAttribute('data-problem-id');

        if (isEditMode) {
            if (!code || code.trim() === '') {
                throw new Error('กรุณาใส่โค้ด GUI');
            }
            validationMessage.className = 'validation-message success';
            validationMessage.textContent = 'โค้ดผ่านการตรวจสอบในโหมดแก้ไข';
            validationMessage.style.display = 'block';
            return true;
        }

        if (!code.match(/=\s*(?:tk\.)?Tk\s*\(\s*\)/)) {
            throw new Error('โค้ดต้องมีการสร้างหน้าต่างหลัก เช่น root = Tk() หรือ tk.Tk()');
        }
        if (!code.match(/mainloop\s*\(\s*\)/)) {
            throw new Error('โค้ดต้องมีคำสั่ง mainloop() เพื่อรันโปรแกรม');
        }

        const requirements = Array.from(document.querySelectorAll('.requirement-item'))
            .map(item => ({
                type: item.querySelector('.requirement-type')?.value || '',
                name: item.querySelector('.requirement-name')?.value?.trim() || '',
                text: item.querySelector('.requirement-text')?.value?.trim() || '',
                props: item.querySelector('.requirement-props')?.value?.trim() || '',
                action: item.querySelector('.requirement-action')?.value?.trim() || '',
                score: item.querySelector('.requirement-score')?.value !== '' && !isNaN(item.querySelector('.requirement-score')?.value) ? parseInt(item.querySelector('.requirement-score')?.value) : 5
            }))
            .filter(req => req.type && req.name);

        const testCases = Array.from(document.querySelectorAll('#guiTestCasesList .test-case'))
            .map(testCase => ({
                inputs: Array.from(testCase.querySelectorAll('.input-entry')).map(entry => ({
                    name: entry.querySelector('.input-name')?.value?.trim() || '',
                    value: entry.querySelector('.input-value')?.value?.trim() || ''
                })),
                actions: Array.from(testCase.querySelectorAll('.action-entry')).map(entry => ({
                    widget: entry.querySelector('.action-widget')?.value?.trim() || '',
                    state: entry.querySelector('.action-state')?.value?.trim() || ''
                })),
                outputs: Array.from(testCase.querySelectorAll('.output-entry')).map(entry => ({
                    widget: entry.querySelector('.test-output-widget')?.value?.trim() || '',
                    value: entry.querySelector('.test-output-value')?.value?.trim() || ''
                })),
                explanation: testCase.querySelector('.test-explanation')?.value?.trim() || '',
                score: parseInt(testCase.querySelector('.test-score')?.value) || 1
            }));

        const requiredWidgetCounts = {};
        requirements.forEach(req => {
            requiredWidgetCounts[req.type] = (requiredWidgetCounts[req.type] || 0) + 1;
        });

        const actualWidgetCounts = {};
        const widgetTypes = ['Label', 'Button', 'Entry', 'Combobox', 'Checkbutton', 'Radiobutton', 'Canvas', 'Menu', 'Frame', 'Listbox', 'Scale'];
        widgetTypes.forEach(type => {
            actualWidgetCounts[type] = (code.match(new RegExp(`${type}\\s*\\(`, 'g')) || []).length;
        });

        for (const type in requiredWidgetCounts) {
            if ((actualWidgetCounts[type] || 0) < requiredWidgetCounts[type]) {
                throw new Error(`โค้ดต้องมี Widget ประเภท ${type} อย่างน้อย ${requiredWidgetCounts[type]} ตัว`);
            }
        }

        requirements.forEach(req => {
            if (['Button', 'Checkbutton', 'Radiobutton'].includes(req.type) && req.action) {
                const hasAction = code.includes('command=') || code.includes('variable=') || code.includes('.config(') || code.includes('.bind(');
                if (!hasAction) {
                    throw new Error(`${req.type} (${req.text || req.name}) ต้องมีการกำหนดการทำงาน`);
                }
            }
        });

        for (const testCase of testCases) {
            // ไม่บังคับให้ต้องมี Input และ Action เสมอไป
            // เพราะบาง GUI แค่โหลดขึ้นมาก็แสดง Label ได้เลย
            // if (!testCase.inputs.length) {
            //     throw new Error('Test Case ต้องมีอย่างน้อย 1 Input');
            // }
            // if (!testCase.actions.length) {
            //     throw new Error('Test Case ต้องมีอย่างน้อย 1 การกระทำ');
            // }
            if (!testCase.outputs.length) {
                throw new Error('Test Case ต้องมีอย่างน้อย 1 Output (ค่าที่คาดหวัง)');
            }

            for (const input of testCase.inputs) {
                const inputWidget = requirements.find(req => req.name === input.name);
                if (!inputWidget || !['Entry', 'Combobox', 'Scale'].includes(inputWidget.type)) {
                    throw new Error(`Widget สำหรับ Input (${inputWidget?.text || input.name}) ไม่พบในข้อกำหนดหรือประเภทไม่ถูกต้อง`);
                }
            }

            for (const action of testCase.actions) {
                const actionWidget = requirements.find(req => req.name === action.widget);
                if (!actionWidget) {
                    throw new Error(`Widget สำหรับ Action (${action.widget}) ไม่พบในข้อกำหนด`);
                }
                if (!['Button', 'Checkbutton', 'Radiobutton'].includes(actionWidget.type)) {
                    throw new Error(`Widget สำหรับ Action (${actionWidget.text || action.widget}) ต้องเป็น Button, Checkbutton หรือ Radiobutton`);
                }
                if (actionWidget.type === 'Button' && action.state !== 'pressed') {
                    throw new Error(`สถานะสำหรับ Button (${actionWidget.text || action.widget}) ต้องเป็น "pressed"`);
                }
                if (['Checkbutton', 'Radiobutton'].includes(actionWidget.type) && !['checked', 'unchecked'].includes(action.state)) {
                    throw new Error(`สถานะสำหรับ ${actionWidget.type} (${actionWidget.text || action.widget}) ต้องเป็น "checked" หรือ "unchecked"`);
                }
            }

            for (const output of testCase.outputs) {
                const outputWidget = requirements.find(req => req.name === output.widget);
                if (!outputWidget || !['Label', 'Entry', 'Combobox'].includes(outputWidget.type)) {
                    throw new Error(`Widget สำหรับ Output (${outputWidget?.text || output.widget}) ไม่พบในข้อกำหนดหรือประเภทไม่ถูกต้อง`);
                }
            }

            try {
                const mockTk = {
                    Tk: function() { return { mainloop: () => {} }; },
                    Button: function() { 
                        const btn = { config: () => {}, invoke: () => { btn.command && btn.command(); } };
                        return btn;
                    },
                    Checkbutton: function() { 
                        const cb = { 
                            state: 'deselected', 
                            select: () => { cb.state = 'selected'; }, 
                            deselect: () => { cb.state = 'deselected'; }, 
                            invoke: () => { 
                                cb.state = cb.state === 'selected' ? 'deselected' : 'selected'; 
                                cb.command && cb.command(); 
                            } 
                        };
                        return cb;
                    },
                    Radiobutton: function() { 
                        const rb = { 
                            state: 'deselected', 
                            select: () => { rb.state = 'selected'; }, 
                            deselect: () => { rb.state = 'deselected'; }, 
                            invoke: () => { 
                                rb.state = 'selected'; 
                                rb.command && rb.command(); 
                            } 
                        };
                        return rb;
                    },
                    Label: function() { return { config: (options) => { if (options.text) this.text = options.text; }, text: '' }; },
                    Entry: function() { return { insert: () => {}, get: () => '' }; },
                    Combobox: function() { return { set: () => {}, get: () => '' }; },
                    Scale: function() { return { set: () => {}, get: () => '' }; }
                };

                const sandbox = {
                    tkinter: mockTk,
                    ttk: { Combobox: mockTk.Combobox },
                    widgets: [],
                    outputs: {}
                };

                requirements.forEach(req => {
                    if (mockTk[req.type]) {
                        const widget = mockTk[req.type]();
                        widget.type = req.type;
                        widget.name = req.name;
                        widget.text = req.text;
                        sandbox.widgets.push(widget);
                    }
                });

                const getWidgetsByType = (type) => sandbox.widgets.filter(w => w.type === type);
                const getWidgetByReqName = (name) => sandbox.widgets.find(w => w.name === name) || null;

                testCase.inputs.forEach(input => {
                    const widget = getWidgetByReqName(input.name);
                    if (widget) {
                        if (['Entry', 'Combobox', 'Scale'].includes(widget.type)) {
                            widget.get = () => input.value;
                            if (widget.insert) widget.insert(0, input.value);
                            if (widget.set) widget.set(input.value);
                        }
                    }
                });

                testCase.actions.forEach((action, actionIndex) => {
                    const actionReq = requirements.find(req => req.name === action.widget);
                    let actionWidget = getWidgetByReqName(action.widget);
                    if (!actionWidget) {
                        const availableWidgets = getWidgetsByType(actionReq.type).filter(w => !w.used);
                        actionWidget = availableWidgets[0];
                        if (actionWidget) {
                            actionWidget.used = true;
                        }
                    }
                    if (!actionWidget) {
                        throw new Error(`ไม่พบ Widget สำหรับการกระทำ (${actionReq?.text || action.widget}) ในขั้นตอนที่ ${actionIndex + 1}`);
                    }

                    if (actionReq.type === 'Button' && action.state === 'pressed') {
                        if (actionWidget.invoke) {
                            actionWidget.invoke();
                        }
                    } else if (actionReq.type === 'Checkbutton') {
                        if (action.state === 'checked') {
                            if (actionWidget.select) actionWidget.select();
                        } else if (action.state === 'unchecked') {
                            if (actionWidget.deselect) actionWidget.deselect();
                        }
                    } else if (actionReq.type === 'Radiobutton') {
                        if (action.state === 'checked') {
                            if (actionWidget.select) actionWidget.select();
                        } else if (action.state === 'unchecked') {
                            if (actionWidget.deselect) actionWidget.deselect();
                        }
                    }
                });

                sandbox.widgets.forEach(w => delete w.used);

                testCase.outputs.forEach((output, index) => {
                    let outputWidget = getWidgetByReqName(output.widget);
                    if (!outputWidget) {
                        const availableOutputs = getWidgetsByType(requirements.find(req => req.name === output.widget)?.type).filter(w => !w.used);
                        outputWidget = availableOutputs[0];
                        if (outputWidget) {
                            outputWidget.used = true;
                        }
                    }
                    if (outputWidget) {
                        const mockOutput = outputWidget.text || sandbox.outputs[output.widget] || '';
                        if (mockOutput !== output.value) {
                            throw new Error(`ผลลัพธ์ของ ${outputWidget.text || output.widget} ไม่ตรงกับที่คาดหวัง: ได้ "${mockOutput}", คาดหวัง "${output.value}"`);
                        }
                    } else {
                        throw new Error(`ไม่พบ Widget สำหรับ Output ${index + 1} (${output.widget})`);
                    }
                });
            } catch (simError) {
                throw new Error(`การจำลอง Test Case ล้มเหลว: ${simError.message}`);
            }
        }

        const functions = Array.from(document.querySelectorAll('#guiFunctions .function-item'))
            .map(item => ({
                description: item.querySelector('.function-description')?.value?.trim() || '',
                expected: item.querySelector('.function-expected')?.value?.trim() || '',
                example: item.querySelector('.function-example')?.value?.trim() || ''
            }));

        for (const func of functions) {
            if (func.description) {
                const funcNameMatch = func.description.match(/function\s+(\w+)/) || func.example.match(/(\w+)\s*\(/);
                if (funcNameMatch) {
                    const funcName = funcNameMatch[1];
                    if (!code.includes(funcName)) {
                        throw new Error(`โค้ดต้องมีฟังก์ชัน ${funcName} ตามที่กำหนดใน Functions`);
                    }
                }
            }
        }

        validationMessage.className = 'validation-message success';
        validationMessage.textContent = 'โค้ดถูกต้องตามข้อกำหนดและ Test Case!';
        validationMessage.style.display = 'block';
        return true;
    } catch (error) {
        validationMessage.className = 'validation-message error';
        validationMessage.textContent = `ข้อผิดพลาด: ${error.message}`;
        validationMessage.style.display = 'block';
        return false;
    }
}

function addGUITestCase() {
    const testCasesList = document.getElementById('guiTestCasesList');
    if (!testCasesList) return;

    const widgets = savedWidgets.length ? savedWidgets : getWidgetsFromRequirements();
    if (!widgets.length) {
        alert('กรุณาเพิ่ม Widget ที่มีประเภทและชื่อครบถ้วนในข้อกำหนดก่อน');
        return;
    }

    const inputOptions = widgets
        .filter(widget => ['Entry', 'Combobox', 'Scale'].includes(widget.type))
        .map(widget => `<option value="${widget.name}">${widget.type}: ${widget.text || widget.name}</option>`)
        .join('');
    const outputOptions = widgets
        .filter(widget => ['Label', 'Entry', 'Combobox'].includes(widget.type))
        .map(widget => `<option value="${widget.name}">${widget.type}: ${widget.text || widget.name}</option>`)
        .join('');
    const actionOptions = widgets
        .filter(widget => ['Button', 'Checkbutton', 'Radiobutton'].includes(widget.type))
        .map(widget => `<option value="${widget.name}" data-type="${widget.type}">${widget.type}: ${widget.text || widget.name}${widget.action ? ` (${widget.action})` : ''}</option>`)
        .join('');

    const testCase = document.createElement('div');
    testCase.className = 'test-case';
    testCase.innerHTML = `
        <div class="test-case-content">
            <div class="inputs-section">
                <h4>Inputs</h4>
                <div class="input-list"></div>
                <button type="button" class="secondary-btn add-input-btn" onclick="addGUIInputToTestCase(this)">+ เพิ่ม Input</button>
            </div>
            <div class="actions-section">
                <h4>การกระทำ *</h4>
                <div class="action-list"></div>
                <button type="button" class="secondary-btn add-action-btn" onclick="addGUIAction(this)">+ เพิ่มการกระทำ</button>
            </div>
            <div class="outputs-section">
                <h4>Outputs *</h4>
                <div class="output-list"></div>
                <button type="button" class="secondary-btn add-output-btn" onclick="addGUIOutputToTestCase(this)">+ เพิ่ม Output</button>
            </div>
            <div class="form-group">
                <label>คะแนน</label>
                <input type="number" class="test-score input-field" value="1" min="1" max="10">
            </div>
            <div class="form-group">
                <label>คำอธิบาย Test Case</label>
                <input type="text" class="test-explanation input-field" placeholder="อธิบายเพิ่มเติมเกี่ยวกับ test case นี้">
            </div>
        </div>
        <button type="button" onclick="removeGUITestCase(this)" class="delete-btn">ลบ Test Case</button>
    `;
    testCasesList.appendChild(testCase);
    addGUIInputToTestCase(testCase.querySelector('.add-input-btn'));
    addGUIAction(testCase.querySelector('.add-action-btn'));
    addGUIOutputToTestCase(testCase.querySelector('.add-output-btn')); // เพิ่ม Output แรก
}

function addGUIOutputToTestCase(button) {
    const testCase = button.closest('.test-case');
    const outputList = testCase.querySelector('.output-list');
    const outputOptions = window.savedWidgets
        .filter(widget => ['Label', 'Entry', 'Combobox'].includes(widget.type))
        .map(widget => `<option value="${widget.name}">${widget.type}: ${widget.text || widget.name}</option>`)
        .join('');
    const outputEntry = document.createElement('div');
    outputEntry.className = 'output-entry';
    outputEntry.innerHTML = `
        <div class="output-entry-content">
            <div class="form-group">
                <label>Widget *</label>
                <select class="test-output-widget input-field" required>
                    <option value="">เลือก Widget สำหรับ Output</option>
                    ${outputOptions}
                </select>
            </div>
            <div class="form-group">
                <label>ผลลัพธ์ *</label>
                <input type="text" class="test-output-value input-field" placeholder="ผลลัพธ์ที่คาดหวัง เช่น ชาย" required>
            </div>
        </div>
        <button type="button" class="delete-btn small" onclick="removeGUIOutput(this)">ลบ</button>
    `;
    outputList.appendChild(outputEntry);
}

function removeGUIInput(button) {
    button.closest('.input-entry').remove();
}

function removeGUIAction(button) {
    button.closest('.action-entry').remove();
}

function removeGUIOutput(button) {
    button.closest('.output-entry').remove();
}

function removeGUITestCase(button) {
    button.closest('.test-case').remove();
}


function addGUIAction(button) {
    const testCase = button.closest('.test-case');
    const actionList = testCase.querySelector('.action-list');
    const widgets = savedWidgets.length ? savedWidgets : getWidgetsFromRequirements();
    const actionOptions = widgets
        .filter(widget => widget.type && widget.name && ['Button', 'Checkbutton', 'Radiobutton'].includes(widget.type))
        .map(widget => `<option value="${widget.name}" data-type="${widget.type}">${widget.type}: ${widget.text || widget.name}${widget.action ? ` (${widget.action})` : ''}</option>`)
        .join('');
    
    if (!widgets.some(widget => widget.type && widget.name && ['Button', 'Checkbutton', 'Radiobutton'].includes(widget.type))) {
        alert('กรุณาเพิ่ม Widget ประเภท Button, Checkbutton หรือ Radiobutton ที่มี type และ name ครบถ้วนในข้อกำหนดก่อน');
        return;
    }

    const actionEntry = document.createElement('div');
    actionEntry.className = 'action-entry';
    actionEntry.innerHTML = `
        <div class="action-entry-content">
            <div class="form-group">
                <label>Widget *</label>
                <select class="action-widget input-field" required onchange="updateActionState(this)">
                    <option value="">เลือก Widget</option>
                    ${actionOptions}
                </select>
            </div>
            <div class="form-group">
                <label>สถานะ *</label>
                <select class="action-state input-field" required>
                    <option value="">เลือกสถานะ</option>
                </select>
            </div>
        </div>
        <button type="button" class="delete-btn small" onclick="removeGUIAction(this)">ลบ</button>
    `;
    actionList.appendChild(actionEntry);
}



function updateActionState(select) {
    const actionEntry = select.closest('.action-entry');
    const actionStateSelect = actionEntry.querySelector('.action-state');
    const widgetName = select.value;
    const widget = window.savedWidgets?.find(w => w.name === widgetName);

    // ล้างตัวเลือกก่อนเพิ่มใหม่
    actionStateSelect.innerHTML = '<option value="">เลือกสถานะ</option>';

    // ตรวจสอบว่า window.savedWidgets มีข้อมูลหรือไม่
    if (!window.savedWidgets || window.savedWidgets.length === 0) {
        actionStateSelect.disabled = true;
        console.log(`updateActionState: window.savedWidgets ว่างเปล่า กรุณากด "Save Widget Requirements" ก่อน`);
        alert('กรุณากด "Save Widget Requirements" เพื่อบันทึก Widget ก่อนเพิ่มการกระทำ');
        return;
    }

    // ตรวจสอบว่า widget มีอยู่และมี type และ name ครบถ้วนหรือไม่
    if (!widget || !widget.type || !widget.name) {
        actionStateSelect.disabled = true;
        console.log(`updateActionState: Widget '${widgetName}' ไม่พบหรือข้อมูลไม่ครบถ้วน (type: ${widget?.type}, name: ${widget?.name}), ปิดใช้งาน dropdown`);
        return;
    }

    // เพิ่มตัวเลือกตามประเภท widget
    if (widget.type === 'Button') {
        actionStateSelect.innerHTML += `
            <option value="pressed">กด</option>
        `;
        actionStateSelect.value = 'pressed'; // ตั้งค่าเริ่มต้น
    } else if (['Checkbutton', 'Radiobutton'].includes(widget.type)) {
        actionStateSelect.innerHTML += `
            <option value="checked">เลือก</option>
            <option value="unchecked">ไม่เลือก</option>
        `;
        // ไม่ตั้งค่าเริ่มต้น เพื่อให้ผู้ใช้เลือกเอง
    }

    // เปิดใช้งาน dropdown และรีเฟรช DOM
    actionStateSelect.disabled = false;
    actionStateSelect.dispatchEvent(new Event('change'));
    console.log(`updateActionState: อัพเดต dropdown สำหรับ widget '${widgetName}', type: ${widget.type}, value: ${actionStateSelect.value}`);
}


function addGUIInputToTestCase(button) {
    const testCase = button.closest('.test-case');
    const inputList = testCase.querySelector('.input-list');
    const inputOptions = window.savedWidgets
        .filter(widget => ['Entry', 'Combobox', 'Scale'].includes(widget.type))
        .map(widget => `<option value="${widget.name}">${widget.type}: ${widget.text || widget.name}</option>`)
        .join('');
    const inputEntry = document.createElement('div');
    inputEntry.className = 'input-entry';
    inputEntry.innerHTML = `
        <div class="input-entry-content">
            <div class="form-group">
                <label>ชื่อ Input</label>
                <select class="input-name input-field" required>
                    <option value="">เลือก Widget</option>
                    ${inputOptions}
                </select>
            </div>
            <div class="form-group">
                <label>ค่า</label>
                <input type="text" class="input-value input-field" placeholder="เช่น 1990" required>
            </div>
        </div>
        <button type="button" class="delete-btn small" onclick="removeGUIInput(this)">ลบ</button>
    `;
    inputList.appendChild(inputEntry);
}


function removeGUITestCase(button) {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบ Test Case นี้?')) {
        button.parentElement.remove();
    }
}

function removeGUIInput(button) {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบ Input นี้?')) {
        button.parentElement.remove();
    }
}
function getWidgetsFromRequirements() {
    const requirements = Array.from(document.querySelectorAll('#guiRequirements .requirement-item'));
    const widgets = [];
    const texts = new Set();

    requirements.forEach((item, index) => {
        const widget = {
            type: item.querySelector('.requirement-type')?.value || '',
            name: item.querySelector('.requirement-name')?.value?.trim() || '',
            text: item.querySelector('.requirement-text')?.value?.trim() || '',
            props: item.querySelector('.requirement-props')?.value?.trim() || '',
            action: item.querySelector('.requirement-action')?.value?.trim() || '',
            score: item.querySelector('.requirement-score')?.value !== '' && !isNaN(item.querySelector('.requirement-score')?.value) ? parseInt(item.querySelector('.requirement-score')?.value) : 5
        };

        // ตรวจสอบว่า widget มี type และ name ครบถ้วนหรือไม่
        if (!widget.type || !widget.name) {
            console.log(`getWidgetsFromRequirements: Widget ที่ index ${index} ไม่สมบูรณ์ (type: ${widget.type}, name: ${widget.name}) ข้ามไป`);
            return; // ข้าม widget ที่ไม่สมบูรณ์
        }

        // ตรวจสอบข้อความซ้ำ
        if (widget.text && texts.has(widget.text)) {
            throw new Error(`ข้อความ "${widget.text}" ซ้ำกันใน Widget อื่น กรุณาใช้ข้อความที่ไม่ซ้ำ`);
        }
        if (widget.text) texts.add(widget.text);

        widgets.push(widget);
    });

    console.log('getWidgetsFromRequirements: อัพเดต savedWidgets', widgets);
    return widgets;
}


function saveWidgetRequirements() {
    try {
        savedWidgets = getWidgetsFromRequirements();
        // อัพเดต window.savedWidgets เพื่อให้ updateActionState ใช้ข้อมูลล่าสุด
        window.savedWidgets = [...savedWidgets];
        if (savedWidgets.length === 0) {
            alert('ไม่มี Widget Requirements ให้บันทึก กรุณาเพิ่ม Widget ที่มี type และ name ครบถ้วนก่อน');
        } else {
            alert('บันทึก Widget Requirements สำเร็จ');
            console.log('saveWidgetRequirements: อัพเดต window.savedWidgets', window.savedWidgets);
        }
        // รีเฟรช dropdown ทันทีหลังจากบันทึก
        refreshTestCaseActions();
    } catch (error) {
        alert(error.message);
    }
}

window.addGUIOutputToTestCase = addGUIOutputToTestCase;
window.removeGUIOutput = removeGUIOutput;
// Export ฟังก์ชัน
window.addGUITestCase = addGUITestCase;
window.addGUIInputToTestCase = addGUIInputToTestCase;
window.removeGUITestCase = removeGUITestCase;
window.removeGUIInput = removeGUIInput;


// Export functions for HTML
window.clearFlowchart = clearFlowchart;
window.logout = logout;
window.addTestCase = addTestCase;
window.closeModal = closeModal;
window.handleImageUpload = handleImageUpload;
window.handleGuiImageUpload = handleGuiImageUpload;

function addAttachmentRow(data = null) {
    const list = document.getElementById('attachmentList');
    if (!list) return;

    const div = document.createElement('div');
    div.className = 'attachment-item';
    div.style = "display: flex; gap: 10px; margin-bottom: 10px; align-items: center; flex-wrap: wrap;";
    
    // กำหนดค่าเริ่มต้น (กรณีโหลดข้อมูลเก่า)
    const type = data ? data.type : 'link';
    const title = data ? data.title : '';
    const url = data ? data.url : '';

    div.innerHTML = `
        <select class="attach-type input-field" style="width: 120px;" onchange="updateAttachmentPreview(this)">
            <option value="youtube" ${type === 'youtube' ? 'selected' : ''}>YouTube</option>
            <option value="pdf" ${type === 'pdf' ? 'selected' : ''}>PDF</option>
            <option value="image" ${type === 'image' ? 'selected' : ''}>รูปภาพ</option>
            <option value="link" ${type === 'link' ? 'selected' : ''}>เว็บไซต์</option>
        </select>
        <input type="text" class="attach-title input-field" placeholder="ชื่อเรียก (เช่น วิดีโอสอน)" value="${title}" style="flex: 1; min-width: 150px;">
        <input type="text" class="attach-url input-field" placeholder="วาง URL ที่นี่ (https://...)" value="${url}" style="flex: 2; min-width: 200px;" oninput="updateAttachmentPreview(this)">
        <button type="button" class="preview-btn" onclick="previewAttachment(this)" style="padding: 8px 12px; background-color: #17a2b8; font-size: 14px; margin: 0;">พรีวิว</button>
        <button type="button" class="delete-btn" onclick="deleteAttachmentRow(this)" style="padding: 8px 12px;">ลบ</button>
        <div class="attachment-preview-box" style="width: 100%; margin-top: 10px; display: none;"></div>
    `;
    list.appendChild(div);

    // เรียกพรีวิวทันทีถ้าเป็นรูปภาพและมี URL
    if (type === 'image' && url) {
        setTimeout(() => previewAttachment(div.querySelector('.preview-btn')), 100);
    }
}

// ฟังก์ชันลบแถวและลบรูปจาก Storage
window.deleteAttachmentRow = async function(btnElement) {
    const row = btnElement.closest('.attachment-item');
    const url = row.querySelector('.attach-url').value;
    const type = row.querySelector('.attach-type').value;

    if (!confirm('ต้องการลบสื่อนี้ใช่หรือไม่?\n(หากเป็นรูปภาพที่อัปโหลดไว้ จะถูกลบออกจากพื้นที่เก็บข้อมูลถาวร)')) return;

    // ถ้าเป็นรูปภาพและเป็นลิงก์จาก Firebase Storage ให้ลบไฟล์ด้วยเพื่อประหยัดพื้นที่
    if (type === 'image' && url.includes('firebasestorage.googleapis.com')) {
        try {
            btnElement.innerText = 'กำลังลบ...';
            btnElement.disabled = true;
            btnElement.style.opacity = '0.5';
            
            const storageRef = firebase.storage().refFromURL(url);
            await storageRef.delete();
            console.log('ลบรูปภาพออกจาก Storage สำเร็จ:', url);
        } catch (error) {
            console.error('Error deleting image from storage:', error);
            // ถึุงจะลบไฟล์ไม่สำเร็จ (เช่น ไฟล์ไม่มีอยู่แล้ว) ก็ยังให้ลบออกจากหน้าจออยู่ดี
        }
    }
    
    // ลบแถวออกจากหน้าจอ
    row.remove();
};

// ฟังก์ชันอัปเดตสถานะปุ่มพรีวิวและช่องพรีวิว
window.updateAttachmentPreview = function(element) {
    const row = element.closest('.attachment-item');
    const type = row.querySelector('.attach-type').value;
    const previewBox = row.querySelector('.attachment-preview-box');
    previewBox.style.display = 'none';
    previewBox.innerHTML = '';
};

// ฟังก์ชันกดปุ่มพรีวิว
window.previewAttachment = function(btnElement) {
    const row = btnElement.closest('.attachment-item');
    const type = row.querySelector('.attach-type').value;
    const url = row.querySelector('.attach-url').value;
    const previewBox = row.querySelector('.attachment-preview-box');

    if (!url) {
        alert('กรุณาใส่ URL หรืออัปโหลดไฟล์ก่อนกดพรีวิว');
        return;
    }

    if (previewBox.style.display === 'block') {
        previewBox.style.display = 'none';
        return;
    }

    if (type === 'image') {
        previewBox.innerHTML = `<img src="${url}" style="max-height: 200px; border-radius: 8px; border: 1px solid #ddd; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-left: 130px;">`;
        previewBox.style.display = 'block';
    } else if (type === 'youtube') {
        let embedUrl = url;
        if (url.includes('watch?v=')) embedUrl = url.replace('watch?v=', 'embed/');
        else if (url.includes('youtu.be/')) embedUrl = url.replace('youtu.be/', 'youtube.com/embed/');
        
        previewBox.innerHTML = `<iframe width="350" height="200" src="${embedUrl}" frameborder="0" allowfullscreen style="border-radius: 8px; margin-left: 130px;"></iframe>`;
        previewBox.style.display = 'block';
    } else {
        window.open(url, '_blank');
    }
};
window.addAttachmentRow = addAttachmentRow;

window.saveProblem = saveProblem;
window.deleteProblem = deleteProblem;
window.editProblem = editProblem;
window.viewClass = viewClass;
window.deleteClass = deleteClass;
window.removeTestCase = removeTestCase;
window.showEditNameForm = showEditNameForm;
window.cancelEditName = cancelEditName;
window.updateDisplayName = updateDisplayName;
window.addComprehensionQuestion = addComprehensionQuestion;
window.removeComprehensionQuestion = removeComprehensionQuestion;
window.addMatchingQuestion = addMatchingQuestion;
window.addMatchingAnswer = addMatchingAnswer;
window.deleteMatchingItem = deleteMatchingItem;
window.addVariable = addVariable;
window.deleteVariable = deleteVariable;
window.addGUIRequirement = addGUIRequirement;
window.deleteRequirement = deleteRequirement;
window.previewGUI = previewGUI;
window.validateGUICode = validateGUICode;
window.previewGUI = previewGUI;
window.previewGUIImage = previewGUIImage;
window.addGUIRequirement = addGUIRequirement;
window.deleteRequirement = deleteRequirement;
window.closeModal = closeModal;
