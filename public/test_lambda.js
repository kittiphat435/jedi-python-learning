const fs = require('fs');
const code = fs.readFileSync('student-gui.js', 'utf8');

// Match convertTkinterToHtml
const convertFuncMatch = code.match(/function convertTkinterToHtml\([\s\S]*?return \{\s*htmlOutput,\s*widgets: parsedWidgets, \/\/ คืนค่าเป็น array\s*jsCode \/\/ เพิ่ม JavaScript code ในผลลัพธ์\s*\};\s*\}/);

if (!convertFuncMatch) {
  console.log("Could not find convertTkinterToHtml");
  process.exit(1);
}

const convertFunc = convertFuncMatch[0];

const sandbox = {
    console: { log: () => {}, error: () => {}, warn: () => {} },
    convertPythonToJs: (x) => x,
    hasTkinterCode: () => true
};
const vm = require('vm');
vm.createContext(sandbox);

const testCode = `
${convertFunc}
function simulateFunction() { return 'simulated'; }
const result = convertTkinterToHtml(\`
import tkinter as tk 
m=tk.Tk() 
m.title ('Main window') 
button = tk. Button (m, text='Stop', width=25, command=lambda: m.destroy() ) 
button.pack () 
m.mainloop ()
\`);
result.jsCode;
`;

console.log(new vm.Script(testCode).runInContext(sandbox));
