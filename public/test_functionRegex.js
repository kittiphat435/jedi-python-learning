const fs = require('fs');

const code = `from tkinter import *
def cal():
    A1=int(number1.get())

    A2=int(number2.get())
    C.config(text=f' A1+A2 { A1+A2 }')
# comment here
root = Tk()
root.title("เน€เธซเนเธขเน เธฎเธตเนเน")
root.geometry("550x200") `;

function convertPythonToJs(pythonCode) {
    let jsCode = pythonCode
        .replace(/([\p{L}\p{N}_]+)\.get\(\)/gu, 'document.querySelector(\'[data-var="$1"]\').value')
        .replace(/([\p{L}\p{N}_]+)\.config\s*\(\s*text\s*=\s*f['"]([^'"]+)['"]\s*\)/gu, (match, varName, textTemplate) => {
            const jsTemplate = textTemplate.replace(/{([^}]+)}/g, '${$1}');
            return `document.querySelector('[data-var="${varName}"]').textContent = \`${jsTemplate}\``;
        })
        .replace(/int\(([^)]+)\)/g, 'parseInt($1)')
        .replace(/float\(([^)]+)\)/g, 'parseFloat($1)')
        .replace(/str\(([^)]+)\)/g, 'String($1)');
    return jsCode;
}

const functionRegex = /(?:^|\n)def\s+([\p{L}\p{N}_]+)\s*\([^)]*\):\s*([\s\S]*?)(?=\n\S|$)/gu;
let match = functionRegex.exec(code);
if (match) {
    console.log(convertPythonToJs(match[2]));
}
