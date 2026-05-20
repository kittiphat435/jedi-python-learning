const fs = require('fs');

const file = 'c:\\python-learning-platform\\public\\student-gui.js';
let content = fs.readFileSync(file, 'utf8');

const replacements = [
    [
        `const tkMatch = trimmedLine.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\\s*=\\s*(?:tk\\.\\s*)?Tk\\s*\\(\\s*\\)/);`,
        `const tkMatch = trimmedLine.match(/^([\\p{L}_][\\p{L}\\p{N}_]*)\\s*=\\s*(?:tk\\.\\s*)?Tk\\s*\\(\\s*\\)/u);`
    ],
    [
        `const textvariableMatch = trimmedLine.match(/textvariable\\s*=\\s*([a-zA-Z_][a-zA-Z0-9_]*)/);`,
        `const textvariableMatch = trimmedLine.match(/textvariable\\s*=\\s*([\\p{L}_][\\p{L}\\p{N}_]*)/u);`
    ],
    [
        `const commandMatch = trimmedLine.match(/command\\s*=\\s*(lambda\\s*:.*?\\(.*?\\)|lambda\\s*:.*?(?=[,)])|[a-zA-Z_][a-zA-Z0-9_]*)/);`,
        `const commandMatch = trimmedLine.match(/command\\s*=\\s*(lambda\\s*:.*?\\(.*?\\)|lambda\\s*:.*?(?=[,)])|[\\p{L}_][\\p{L}\\p{N}_]*)/u);`
    ],
    [
        `commandMatch[1].match(/lambda\\s*:\\s*([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\(/)`,
        `commandMatch[1].match(/lambda\\s*:\\s*([\\p{L}_][\\p{L}\\p{N}_]*)\\s*\\(/u)`
    ],
    [
        `const variableMatch = trimmedLine.match(/variable\\s*=\\s*([a-zA-Z_][a-zA-Z0-9_]*)/);`,
        `const variableMatch = trimmedLine.match(/variable\\s*=\\s*([\\p{L}_][\\p{L}\\p{N}_]*)/u);`
    ],
    [
        `const functionRegex = /def\\s+([a-zA-Z0-9_]+)\\s*\\([^)]*\\):\\s*([\\s\\S]*?)(?=\\n\\S|$)/gm;`,
        `const functionRegex = /(?:^|\\n)def\\s+([\\p{L}\\p{N}_]+)\\s*\\([^)]*\\):\\s*([\\s\\S]*?)(?=\\n\\S|$)/gu;`
    ],
    [
        `const buttonRegex = /([a-zA-Z0-9_]+)\\s*=\\s*(?:tk\\.\\s*)?Button\\s*\\((.*)\\)/g;`,
        `const buttonRegex = /([\\p{L}\\p{N}_]+)\\s*=\\s*(?:tk\\.\\s*)?Button\\s*\\((.*)\\)/gu;`
    ],
    [
        `const commandRegex = /([a-zA-Z0-9_]+)\\.(config|configure)\\s*\\(\\s*.*?command\\s*=\\s*(lambda\\s*:.*?\\(.*?\\)|lambda\\s*:.*?(?=[,)])|[a-zA-Z_][a-zA-Z0-9_]*)/gs;`,
        `const commandRegex = /([\\p{L}\\p{N}_]+)\\.(config|configure)\\s*\\(\\s*.*?command\\s*=\\s*(lambda\\s*:.*?\\(.*?\\)|lambda\\s*:.*?(?=[,)])|[\\p{L}_][\\p{L}\\p{N}_]*)/gsu;`
    ],
    [
        `const directCommandRegex = /([a-zA-Z0-9_]+)\\s*=\\s*(?:tk\\.\\s*)?Button\\s*\\(.*?command\\s*=\\s*(lambda\\s*:.*?\\(.*?\\)|lambda\\s*:.*?(?=[,)])|[a-zA-Z_][a-zA-Z0-9_]*).*?\\)/gs;`,
        `const directCommandRegex = /([\\p{L}\\p{N}_]+)\\s*=\\s*(?:tk\\.\\s*)?Button\\s*\\(.*?command\\s*=\\s*(lambda\\s*:.*?\\(.*?\\)|lambda\\s*:.*?(?=[,)])|[\\p{L}_][\\p{L}\\p{N}_]*).*?\\)/gsu;`
    ],
    [
        `const lambdaMatch = functionName.match(/lambda\\s*:\\s*([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\(/);`,
        `const lambdaMatch = functionName.match(/lambda\\s*:\\s*([\\p{L}_][\\p{L}\\p{N}_]*)\\s*\\(/u);`
    ],
    [
        `const commandMatch = m[2].match(/command\\s*=\\s*(lambda\\s*:.*?\\(.*?\\)|lambda\\s*:.*?(?=[,)])|[a-zA-Z_][a-zA-Z0-9_]*)/);`,
        `const commandMatch = m[2].match(/command\\s*=\\s*(lambda\\s*:.*?\\(.*?\\)|lambda\\s*:.*?(?=[,)])|[\\p{L}_][\\p{L}\\p{N}_]*)/u);`
    ],
    [
        `const lambdaFuncMatch = cmd.match(/lambda\\s*:\\s*([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\(/);`,
        `const lambdaFuncMatch = cmd.match(/lambda\\s*:\\s*([\\p{L}_][\\p{L}\\p{N}_]*)\\s*\\(/u);`
    ],
    [
        `const lambdaArgsMatch = cmd.match(/lambda\\s*:\\s*[a-zA-Z_][a-zA-Z0-9_]*\\s*\\(\\s*(.*?)\\s*\\)/);`,
        `const lambdaArgsMatch = cmd.match(/lambda\\s*:\\s*[\\p{L}_][\\p{L}\\p{N}_]*\\s*\\(\\s*(.*?)\\s*\\)/u);`
    ],
    [
        `if (m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\\s*=\\s*(-?\\d+)$/)) {`,
        `if (m = line.match(/^([\\p{L}_][\\p{L}\\p{N}_]*)\\s*=\\s*(-?\\d+)$/u)) {`
    ],
    [
        `else if (m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\\s*=\\s*['"](.*?)['"]$/)) {`,
        `else if (m = line.match(/^([\\p{L}_][\\p{L}\\p{N}_]*)\\s*=\\s*['"](.*?)['"]$/u)) {`
    ],
    [
        `else if (m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\\.set\\s*\\(\\s*(?:str\\s*\\()?\\s*([^)]*?)\\s*\\)?\\s*\\)$/)) {`,
        `else if (m = line.match(/^([\\p{L}_][\\p{L}\\p{N}_]*)\\.set\\s*\\(\\s*(?:str\\s*\\()?\\s*([^)]*?)\\s*\\)?\\s*\\)$/u)) {`
    ],
    [
        `if (m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\\s*(\\+|-|\\*|\\/|%|\\*\\*|\\/\\/)?=\\s*(.+)$/)) {`,
        `if (m = line.match(/^([\\p{L}_][\\p{L}\\p{N}_]*)\\s*(\\+|-|\\*|\\/|%|\\*\\*|\\/\\/)?=\\s*(.+)$/u)) {`
    ],
    [
        `if (m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\\.set\\s*\\(\\s*(?:str\\s*\\()?\\s*([^)]*?)\\s*\\)?\\s*\\)$/)) {`,
        `if (m = line.match(/^([\\p{L}_][\\p{L}\\p{N}_]*)\\.set\\s*\\(\\s*(?:str\\s*\\()?\\s*([^)]*?)\\s*\\)?\\s*\\)$/u)) {`
    ],
    [
        `pattern: /\\b[a-zA-Z_]\\w*(?=\\s*=\\s*(?!=))|\\b[a-zA-Z_]\\w*(?=\\s*\\.)/,`,
        `pattern: /(?:^|[^\\p{L}\\p{N}_])[\\p{L}_][\\p{L}\\p{N}_]*(?=\\s*=\\s*(?!=))|(?:^|[^\\p{L}\\p{N}_])[\\p{L}_][\\p{L}\\p{N}_]*(?=\\s*\\.)/u,`
    ]
];

replacements.forEach(([oldStr, newStr]) => {
    // Escape regex characters in oldStr to do a global replacement if needed, 
    // but since we are doing literal replacement:
    if (content.includes(oldStr)) {
        content = content.split(oldStr).join(newStr);
        console.log(`Replaced: ${oldStr.substring(0, 30)}...`);
    } else {
        console.log(`NOT FOUND: ${oldStr}`);
    }
});

fs.writeFileSync(file, content);
