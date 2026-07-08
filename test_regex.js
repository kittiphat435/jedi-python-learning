const jsCode = `
def cal():
    A1=int(number1.get())
    A2=int(number2.get())
    A3=int(number3.get())
    C.config(text=f'ค่าใช้จ่ายเต็ม {(A1*A2*A3)} บาท')
    return (A1*A2*A3)

def cal2():
    A5=cal()
    if(A5 > 5000):
        E.config(text=f'ลด %10 ={ A5*10/100 } บาท')
    elif(A5 > 3000):
        E.config(text=f'ลด %5 ={ A5*5/100 } บาท')
    else:
        E.config(text=f'ไม่มีส่วนลด')
`;

function convertPythonToJs(pythonCode) {
    let jsCode = pythonCode
        .replace(/#.*$/gm, '') 
        .replace(/global\s+[\p{L}\p{N}_]+(?:\s*,\s*[\p{L}\p{N}_]+)*/gu, '')
        .replace(/^(\s*)([\p{L}\p{N}_0-9\s]+(?:\s*,\s*[\p{L}\p{N}_0-9\s]+)+)\s*=\s*/gmu, '$1[$2] = ')
        .replace(/return\s+([\p{L}\p{N}_0-9\.\(\)\+\-\*\/\s]+(?:\s*,\s*[\p{L}\p{N}_0-9\.\(\)\+\-\*\/\s]+)+)/gu, 'return [$1]')
        .replace(/([\p{L}\p{N}_]+)\.get\(\)/gu, 'document.querySelector(\'[data-var="$1"]\').value')
        .replace(/([\p{L}\p{N}_]+)\.set\s*\(\s*(['"]?[^)]+['"]?)\s*\)/gu, '(function(){})()')
        .replace(/([\p{L}\p{N}_]+)\.config\s*\(\s*text\s*=\s*f['"]([^'"]+)['"]\s*\)/gu, (match, varName, textTemplate) => {
            const jsTemplate = textTemplate.replace(/{([^}]+)}/g, '${$1}');
            return `document.querySelector('[data-var="${varName}"]').textContent = \`${jsTemplate}\``;
        })
        .replace(/([\p{L}\p{N}_]+)\.configure\s*\(\s*text\s*=\s*(['"])([^'"]+)\2\s*\)/gu, `document.querySelector('[data-var="$1"]').textContent = '$3'`)
        .replace(/\bint\s*\(/g, 'parseInt(')
        .replace(/\bfloat\s*\(/g, 'parseFloat(')
        .replace(/\bstr\s*\(/g, 'String(')
        .replace(/\bround\s*\(/g, 'Math.round(')
        .replace(/\blen\s*\(/g, '('.length)
        .replace(/==/g, '===')
        .replace(/!=/g, '!==')
        .replace(/\band\b/g, '&&')
        .replace(/\bor\b/g, '||')
        .replace(/\bnot\b/g, '!')
        .replace(/\bTrue\b/g, 'true')
        .replace(/\bFalse\b/g, 'false')
        .replace(/\belif\b/g, 'else if')
        .replace(/:\s*$/gm, '');
    return jsCode;
}

const functionRegex = /(?:^|\n)def\s+([\p{L}\p{N}_]+)\s*\(([^)]*)\)\s*:\s*([\s\S]*?)(?=\n\S|$)/gu;
let match;
while ((match = functionRegex.exec(jsCode)) !== null) {
    const functionName = match[1];
    const functionArgs = match[2];
    const functionBody = match[3];
    console.log('----- FUNCTION ' + functionName + ' -----');
    console.log(convertPythonToJs(functionBody));
}
