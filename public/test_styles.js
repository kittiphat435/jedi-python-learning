const fs = require('fs');

// Load student-gui.js
const code = fs.readFileSync('student-gui.js', 'utf-8');

// Mock document and window
global.window = { widgetDefinitions: [], location: { search: '' } };
global.document = { 
    querySelector: () => ({ value: '10', textContent: '' }),
    getElementById: () => ({ value: '10', textContent: '', style: {} }),
    addEventListener: () => {},
    createElement: () => ({}),
    head: { appendChild: () => {} }
};  
global.navigator = { userAgent: '' };
global.firebase = {
    initializeApp: () => ({}),
    firestore: () => ({}),
    auth: () => ({}),
    apps: []
};
global.firebaseConfig = {};

// extract the functions we need to test
eval(code);

const pythonCode1 = `from tkinter import * 
def cal(): 
    A1=int(number1.get()) 
    A2=int(number2.get()) 
    C.config(text=f' A1+A2 { A1+A2 }') 

root = Tk() 
root.title("เห้ยๆ ฮี่ๆ") 
root.geometry("550x200") 
B=Label(text='5555555555',fg='#FFFFCC',bg='blue') 
B.pack() 
A=Label(text='4444444444',fg='#FFFFCC',bg='blue') 
A.pack() 
C=Label(text='3333333333',fg='#FFFFCC',bg='blue') 
C.pack() 
number1=StringVar(value='ปีเกิด') 
input1=Entry(root,textvariable=number1) 
input1.pack() 
number2=StringVar(value='ปีปัจจุบัน') 
input2=Entry(root,textvariable=number2) 
input2.pack() 
button1=Button(text='คำนวณ') 
button1.pack() 
button1.configure(command=cal) 
root.mainloop()`;

const pythonCode2 = `import tkinter as tk 

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
button2.grid (row=2, column=1) 
button3 = tk. Button (m, text='3', width=6, command=lambda: press ('3') ) 
button3.grid (row=1, column=0) 
button4 = tk. Button (m, text='4', width=6, command=lambda: press ('4') ) 
button4.grid(row=1, column=1) 

button = tk. Button (m, text='Stop', width=16, 
command=lambda: m.destroy () ) 
button.grid(row=3, columnspan=2) 
m.mainloop ()`;

async function runTest() {
    try {
        console.log("=== Testing Style 1 (pack, from tkinter import *) ===");
        const htmlResult1 = convertTkinterToHtml(pythonCode1);
        console.log("HTML:", htmlResult1.htmlOutput);
        console.log("JS:", htmlResult1.jsCode);

        console.log("\n=== Testing Style 2 (grid, import tkinter as tk) ===");
        const htmlResult2 = convertTkinterToHtml(pythonCode2);
        console.log("HTML:", htmlResult2.htmlOutput);
        console.log("JS:", htmlResult2.jsCode);
    } catch(e) {
        console.error("Error:", e);
    }
}

runTest();