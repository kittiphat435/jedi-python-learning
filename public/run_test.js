const fs = require('fs');

const code = `from tkinter import *
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

let scriptContent = fs.readFileSync('student-gui.js', 'utf-8');

// Mock browser objects
global.window = { 
    widgetDefinitions: [],
    location: { search: '' }
};
global.document = { 
    createElement: () => ({}),
    querySelector: () => ({}),
    addEventListener: () => {},
    head: { appendChild: () => {} }
};
global.firebase = { 
    firestore: () => ({}),
    initializeApp: () => ({}),
    auth: () => ({}),
    apps: []
};

// Remove firebase initialization
scriptContent = scriptContent.replace(/const db = firebase\.firestore\(\);/g, '');
scriptContent = scriptContent.replace(/firebase\.initializeApp\(firebaseConfig\);/g, '');

eval(scriptContent);

const result = convertTkinterToHtml(code);
console.log("=== JS CODE ===");
console.log(result.jsCode);
