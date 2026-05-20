const fs = require('fs');

const code = `
import tkinter as tk

def press (n) :
    global expression
    global label1Text
    expression = expression+n
    label1Text.set (expression)

m=tk.Tk ()
m.title ('Main window')

expression =''

label1Text=tk.StringVar()
label1Text.set (expression)

label1 = tk.Label(m, borderwidth=2, relief='ridge',
textvariable=label1Text, width=30)
label1.pack ()
button1 = tk.Button (m, text='1', width=25,
command=lambda: press ('1') )
button1.pack ()
button = tk. Button (m, text='Stop', width=25,
command=lambda: m.destroy() )
button.pack ()
m.mainloop ()
`;

// โหลดโค้ดทั้งหมดที่จำเป็น
const studentGui = fs.readFileSync('student-gui.js', 'utf8');

// จำลอง DOM
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="htmlOutput"></div></body></html>');
global.document = dom.window.document;
global.window = dom.window;

// แยกฟังก์ชันออกมา
const convertFuncMatch = studentGui.match(/function convertTkinterToHtml\([\s\S]*?return \{\s*htmlOutput,\s*widgets: parsedWidgets,\s*jsCode\s*\};\s*\}/);
const helperMatch = studentGui.match(/function mergeMultiLineStatements[\s\S]*?return logicalLines;\n}/);
const preprocessMatch = studentGui.match(/function preprocessTkinterCode[\s\S]*?return code;\n}/);

if (convertFuncMatch && helperMatch && preprocessMatch) {
  eval(helperMatch[0]);
  eval(preprocessMatch[0]);
  eval(convertFuncMatch[0]);
  
  const result = convertTkinterToHtml(code);
  console.log("=== HTML ===");
  console.log(result.htmlOutput);
  console.log("\n=== JS ===");
  console.log(result.jsCode);
} else {
  console.log("Could not extract functions");
}
