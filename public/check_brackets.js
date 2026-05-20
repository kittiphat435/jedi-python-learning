function checkBrackets(code) {
    let stack = [];
    let lines = code.split('\n');
    let inString = false;
    let stringChar = '';
    let inTemplate = false;
    let inComment = false;
    let inMultiComment = false;
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        for (let j = 0; j < line.length; j++) {
            if (inMultiComment) {
                if (line[j] === '*' && line[j+1] === '/') {
                    inMultiComment = false;
                    j++;
                }
                continue;
            }
            if (inComment) {
                break;
            }
            if (inTemplate) {
                if (line[j] === '\\') { j++; continue; }
                if (line[j] === '`') { inTemplate = false; continue; }
                if (line[j] === '$' && line[j+1] === '{') {
                    stack.push({ type: 'template_expr', line: i+1 });
                    j++;
                }
                continue;
            }
            if (inString) {
                if (line[j] === '\\') { j++; continue; }
                if (line[j] === stringChar) { inString = false; }
                continue;
            }
            
            if (line[j] === '/' && line[j+1] === '/') {
                break; // end of line comment
            }
            if (line[j] === '/' && line[j+1] === '*') {
                inMultiComment = true;
                j++;
                continue;
            }
            if (line[j] === '`') {
                inTemplate = true;
                continue;
            }
            if (line[j] === '"' || line[j] === "'") {
                inString = true;
                stringChar = line[j];
                continue;
            }
            
            if (line[j] === '{') stack.push({ type: '{', line: i+1 });
            if (line[j] === '(') stack.push({ type: '(', line: i+1 });
            if (line[j] === '[') stack.push({ type: '[', line: i+1 });
            
            if (line[j] === '}') {
                if (stack.length && (stack[stack.length-1].type === '{' || stack[stack.length-1].type === 'template_expr')) {
                    stack.pop();
                } else {
                    console.log('Unmatched } at line', i+1);
                }
            }
            if (line[j] === ')') {
                if (stack.length && stack[stack.length-1].type === '(') {
                    stack.pop();
                } else {
                    console.log('Unmatched ) at line', i+1);
                }
            }
            if (line[j] === ']') {
                if (stack.length && stack[stack.length-1].type === '[') {
                    stack.pop();
                } else {
                    console.log('Unmatched ] at line', i+1);
                }
            }
        }
        inComment = false;
    }
    
    if (stack.length > 0) {
        console.log('Unclosed brackets:');
        stack.forEach(s => console.log(s.type, 'at line', s.line));
    } else {
        console.log('All matched!');
    }
}

const fs = require('fs');
const code = fs.readFileSync('student-gui.js', 'utf8');
checkBrackets(code);
