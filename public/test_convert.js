function convertPythonToJs(pythonCode) {
    let jsCode = pythonCode
        // แปลง global
        .replace(/global\s+[\p{L}\p{N}_]+(?:\s*,\s*[\p{L}\p{N}_]+)*/gu, '')
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
            return `document.querySelector('[data-var="${varName}"]').textContent = \`${jsTemplate}\``;
        })
        // แปลงการเรียกใช้ .config(text=...) แบบไม่ใช่ f-string
        .replace(/([\p{L}\p{N}_]+)\.config\s*\(\s*text\s*=\s*['"]([^'"]+)['"]\s*\)/gu, 
            'document.querySelector(\'[data-var="$1"]\').textContent = "$2"')
        // แปลงการเรียกใช้ int()
        .replace(/int\(([^)]+)\)/g, 'parseInt($1)')
        // แปลงการเรียกใช้ float()
        .replace(/float\(([^)]+)\)/g, 'parseFloat($1)')
        // แปลงการเรียกใช้ str()
        .replace(/str\(([^)]+)\)/g, 'String($1)');
        
    return jsCode;
}

const pyCode = `
from tkinter import * 
def cal(): 
    A1=int(number1.get()) 
    A2=int(number2.get()) 
    C.config(text=f' A1+A2 { A1+A2 }')

button1.configure(command=cal)
`;

console.log(convertPythonToJs(pyCode));
