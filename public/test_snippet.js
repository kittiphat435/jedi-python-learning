const fs = require('fs');

// Mock DOMParser
class DOMParser {
    parseFromString(html, type) {
        return {}; // mock
    }
}
global.DOMParser = DOMParser;

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

const pythonCode = `from tkinter import * 
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

async function runTest() {
    try {
        console.log("--- Testing checkGUICode ---");
        const checkResult = await checkGUICode(pythonCode);
        console.log("Check Result:", checkResult);
        
        console.log("--- Testing convertTkinterToHtml ---");
        const htmlResult = convertTkinterToHtml(pythonCode);
        console.log("HTML Result JS Code:");
        console.log(htmlResult.jsCode);
    } catch(e) {
        console.error("Error:", e);
    }
}

runTest();