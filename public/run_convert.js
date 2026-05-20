const fs = require('fs');
const js = fs.readFileSync('student-gui.js', 'utf8');

const vm = require('vm');

const sandbox = {
    console: { log: () => {}, error: () => {}, warn: () => {} },
    URLSearchParams: class { constructor() {} get() { return null; } },
    window: { document: {}, location: { search: '' } },
    document: {
        addEventListener: () => {},
        getElementById: () => ({ value: `import tkinter as tk 
m=tk.Tk() 
m.title ('Main window') 
button = tk. Button (m, text='Stop', width=25, command=lambda: m.destroy() ) 
button.pack () 
m.mainloop ()` })
    },
    setTimeout: () => {},
    Math: Math,
    parseInt: parseInt,
    firebase: { initializeApp: () => {}, auth: () => {}, firestore: () => {}, apps: [] },
    Object: Object,
    preprocessTkinterCode: (x) => x
};

vm.createContext(sandbox);
vm.runInContext(js, sandbox);
vm.runInContext(`
    try {
        console.log("Calling convertTkinterToHtml...");
        const result = convertTkinterToHtml(document.getElementById('codeEditor').value);
        console.log("HTML:", result.htmlOutput.substring(0, 100) + '...');
        console.log("Widgets:", JSON.stringify(result.widgets));
        console.log("JS:", result.jsCode.substring(0, 200) + '...');
    } catch(e) {
        console.error("convertTkinterToHtml Error:", e.message);
    }
`, sandbox);

vm.runInContext(`
    try {
        console.log("Calling convertCode...");
        convertCode();
    } catch(e) {
        console.error("convertCode Error:", e.message);
    }
`, sandbox);

