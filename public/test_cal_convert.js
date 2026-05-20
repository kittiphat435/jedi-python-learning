const fs = require('fs');
const code = fs.readFileSync('student-gui.js', 'utf8');

// Remove the global top-level calls that crash
let safeCode = code.replace(/const auth = firebase\.auth\(\);/g, 'const auth = {};')
    .replace(/const db = firebase\.firestore\(\);/g, 'const db = {};')
    .replace(/const storage = firebase\.storage\(\);/g, 'const storage = {};')
    .replace(/firebase\.initializeApp\(firebaseConfig\);/g, '')
    .replace(/if \(!firebase\.apps\.length\) {/g, 'if (false) {')
    .replace(/const params\s*=\s*new URLSearchParams\(window\.location\.search\);/g, 'const params = new Map();')
    .replace(/const classId = params\.get\('class'\);/g, 'const classId = null;')
    .replace(/const problemId = params\.get\('problem'\);/g, 'const problemId = null;')
    .replace(/const isTeacher = params\.get\('role'\) === 'teacher';/g, 'const isTeacher = false;')
    .replace(/const fromDetail = params\.get\('from'\) === 'detail';/g, 'const fromDetail = false;')
    .replace(/const editor = CodeMirror\.fromTextArea/g, 'const editor = null; //')
    .replace(/if \(window\.trustedTypes && window\.trustedTypes\.createPolicy\) {/g, 'if (false) {')
    .replace(/document\.getElementById/g, '(() => ({}))')
    .replace(/document\.querySelectorAll/g, '(() => [])')
    .replace(/window\.addEventListener/g, '(() => {})');

global.window = {};
global.document = {
    addEventListener: () => {}
};
global.CodeMirror = {};

try {
    eval(safeCode);
} catch (e) {
    console.error("Eval error:", e);
}

const pyCode = `
A1=int(number1.get())
A2=int(number2.get())
C.config(text=f' A1+A2 { A1+A2 }')
`;
console.log("Converted:");
try {
    console.log(convertPythonToJs(pyCode));
} catch (e) {
    console.error("Convert error:", e);
}