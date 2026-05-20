const fs = require('fs');

const code = fs.readFileSync('student-gui.js', 'utf8');

// Mock browser APIs before eval
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
    apps: [],
    initializeApp: () => {},
    auth: () => ({ onAuthStateChanged: () => {} }),
    firestore: () => ({
        collection: () => ({
            doc: () => ({
                get: () => Promise.resolve({ exists: true, data: () => ({}) })
            })
        })
    })
};

// Evaluate the entire student-gui.js script to load its functions
eval(code);

const pyCode = `
from tkinter import * 
def cal(): 
    A1=int(number1.get()) 
    A2=int(number2.get()) 
    C.config(text=f' A1+A2 { A1+A2 }') 

root = Tk() 
root.title("test") 
root.geometry("550x200") 
B=Label(text='5555555555',fg='#FFFFCC',bg='blue') 
B.pack() 
A=Label(text='4444444444',fg='#FFFFCC',bg='blue') 
A.pack() 
C=Label(text='3333333333',fg='#FFFFCC',bg='blue') 
C.pack() 
number1=StringVar(value='2529') 
input1=Entry(root,textvariable=number1) 
input1.pack() 
number2=StringVar(value='2569') 
input2=Entry(root,textvariable=number2) 
input2.pack() 
button1=Button(text='calc') 
button1.pack() 
button1.configure(command=cal) 
root.mainloop() 
`;

try {
    const result = convertTkinterToHtml(pyCode);
    fs.writeFileSync('test_gui_output.html', result.htmlOutput + "\n<script>\n" + result.jsCode + "\n</script>");
    console.log("Generated HTML saved to test_gui_output.html");
} catch(e) {
    console.error(e);
}