let line = 'A1=int(number1.get())';
let m = line.match(/^([\p{L}_][\p{L}\p{N}_]*)\s*(\+|-|\*|\/|%|\*\*|\/\/)?=\s*(.+)$/u);
if (m) {
    let expr = m[3]
        .replace(/\bint\s*\(/g, 'parseInt(')
        .replace(/\bfloat\s*\(/g, 'parseFloat(')
        .replace(/\bstr\s*\(/g, 'String(')
        .replace(/([\p{L}\p{N}_]+)\.get\(\)/gu, 'parseFloat(document.getElementById("entry_$1") ? document.getElementById("entry_$1").value : 0)');
    console.log(`Matched! expr: ${expr}`);
} else {
    console.log('Not matched!');
}
