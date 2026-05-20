const fs = require('fs');
const js = fs.readFileSync('student-gui.js', 'utf8');
const vm = require('vm');

const codeToTest = `
import tkinter as tk 
 
def press (n) : 
    global expression 
    global label1Text 
    expression = expression+n 
    label1Text.set (expression) 

m=tk.Tk () 
m.title ('Main window') 

expression='' 
label1Text=tk.StringVar () 
label1Text.set (expression) 

label1 = tk.Label (m, borderwidth=2, relief="ridge", 
textvariable=label1Text, width=20) 
label1.grid(row=0, columnspan=2) 

button1 = tk. Button (m, text='1', width=6, command=lambda: press ('1') ) 
button1.grid(row=2, column=0) 
button2 = tk. Button (m, text='2', width=6, command=lambda: press ('2') ) 
button2.grid(row=2, column=1) 
button3 = tk. Button (m, text='3', width=6, command=lambda: press ('3') ) 
button3.grid(row=1, column=0) 
button4 = tk. Button (m, text='4', width=6, command=lambda: press ('4') ) 
button4.grid(row=1, column=1) 

button = tk. Button (m, text='Stop', width=16, 
command=lambda: m.destroy () ) 
button.grid(row=3, columnspan=2) 
m.mainloop() 
`;

const sandbox = {
    console: console,
    window: { document: {}, location: { search: '' } },
    URLSearchParams: class { constructor() {} get() { return null; } },
    document: {
        addEventListener: () => {},
        getElementById: (id) => {
            console.log("Getting element:", id);
            if (id === 'codeEditor') return { value: codeToTest };
            if (id === 'pythonInput') return { value: codeToTest };
            if (id === 'htmlOutput') {
                if (!this.htmlOutput) this.htmlOutput = { value: '' };
                return this.htmlOutput;
            }
            return { value: '' };
        },
        createElement: () => ({ setAttribute: () => {}, appendChild: () => {}, innerHTML: '' }),
        head: { appendChild: () => {} },
        querySelector: () => ({ srcdoc: '' })
    },
    setTimeout: () => {},
    setInterval: () => {},
    clearInterval: () => {},
    Math: Math,
    parseInt: parseInt,
    Object: Object,
    firebase: { initializeApp: () => {}, auth: () => {}, firestore: () => {}, apps: [] },
    preprocessTkinterCode: (x) => {
        // Mock implementation of preprocessTkinterCode to just return the code
        return x;
    }
};

vm.createContext(sandbox);
try {
    vm.runInContext(js, sandbox);
    console.log("student-gui.js parsed OK.");
    
    vm.runInContext(`
        console.log("=== Testing convertTkinterToHtml ===");
        const code = document.getElementById('codeEditor').value;
        console.log("Input code:", code);
        const result = convertTkinterToHtml(code);
        console.log("convertTkinterToHtml length:", result.htmlOutput.length);
        console.log("Widgets parsed:", JSON.stringify(result.widgets, null, 2));
        
        console.log("=== Testing convertCode ===");
        try {
            convertCode();
            console.log("HTML generated:", document.getElementById('htmlOutput').value ? "YES" : "NO");
            console.log("HTML output length:", document.getElementById('htmlOutput').value.length);
            console.log("=== HTML Output ===");
            console.log(document.getElementById('htmlOutput').value);
        } catch (e) {
            console.error(e);
        }
    `, sandbox);
} catch(e) {
    console.error("Test Error:", e);
}