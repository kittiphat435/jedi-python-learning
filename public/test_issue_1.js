const fs = require('fs');

// Mock DOM manual
global.document = {
    getElementById: (id) => {
        if (id === 'pythonInput') return { value: testCode1 };
        if (id === 'htmlOutput') return { value: '' };
        return { value: '' };
    },
    addEventListener: () => {}
};
global.window = {
    labels: [],
    buttons: [],
    entries: [],
    widgets: {}
};
global.alert = console.log;

// Load student-gui.js functions
const code = fs.readFileSync('student-gui.js', 'utf-8');
const lines = code.split('\n');
let modifiedCode = lines.filter(line => !line.includes('document.addEventListener')).join('\n');
eval(modifiedCode);

const testCode1 = `from tkinter import * 
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

document.getElementById('pythonInput').value = testCode1;
convertCode();
console.log("=== Output Style 1 ===");
console.log(document.getElementById('htmlOutput').value);
