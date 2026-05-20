const fs = require('fs');
let code = fs.readFileSync('student-gui.js', 'utf8');

// Remove the global top-level calls that crash
let safeCode = code.replace(/const auth = firebase\.auth\(\);/g, 'const auth = {};')
    .replace(/const db = firebase\.firestore\(\);/g, 'const db = {};')
    .replace(/const storage = firebase\.storage\(\);/g, 'const storage = {};')  
    .replace(/firebase\.initializeApp\(firebaseConfig\);/g, '')
    .replace(/if \(!firebase\.apps\.length\) {/g, 'if (false) {')

global.document = {
    getElementById: (id) => {
        if (id === 'codeEditor' || id === 'python-editor' || id === 'pythonInput') return { value: `from tkinter import *
def cal():
    A1=int(number1.get())
    A2=int(number2.get())
    C.config(text=f' A1+A2 { A1+A2 }')

root = Tk()
root.title("test")
root.geometry("550x200")
number1=StringVar()
number2=StringVar()
Entry(textvariable=number1).pack()
Entry(textvariable=number2).pack()
B=Label(text='5555555555',fg='#FFFFCC',bg='blue')
B.pack()
A=Label(text='4444444444',fg='#FFFFCC',bg='blue')
A.pack()
C=Label(text='3333333333',fg='#FFFFCC',bg='blue')
C.pack()
button1=Button(text='คำนวณ',fg='white',bg='green')
button1.pack()
button1.configure(command=cal)
root.mainloop()` };
        if (id === 'htmlOutput') return { value: '' };
        return { value: '' };
    },
    createElement: () => ({ style: {}, appendChild: () => {} }),
    addEventListener: () => {},
    querySelector: (sel) => ({ addEventListener: () => {}, textContent: '', value: '10', style: {} }),
    querySelectorAll: (sel) => [],
    body: { appendChild: () => {} },
    head: { appendChild: () => {} }
};
global.window = { addEventListener: () => {}, location: { search: '' } };
global.firebaseConfig = {};
global.firebase = { apps: [], initializeApp: () => {}, firestore: () => ({}), auth: () => ({}) };
global.CodeMirror = { fromTextArea: () => ({ setValue: () => {}, getValue: () => global.document.getElementById('python-editor').value, on: () => {} }) };

try {
    eval(safeCode);
    codeEditor = document.getElementById('python-editor');
    console.log("Mock codeEditor value:", codeEditor.value.substring(0, 30));
    convertCode();
    const output = document.getElementById('htmlOutput').value;
    const match = output.match(/<script>([\s\S]*?)<\/script>/);
    if (match) {
        console.log("Found script:\n" + match[1]);
    } else {
        console.log("No script found");
    }
} catch (e) {
    console.error(e);
}
