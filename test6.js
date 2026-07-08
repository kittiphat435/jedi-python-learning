const fs = require('fs');
const code = fs.readFileSync('public/student-gui.js', 'utf8');
const convertRegex = /function convertPythonToJs.*?return jsCode;\s*\}/s;
const htmlRegex = /function convertTkinterToHtml.*?return \{\s*htmlOutput,\s*widgets:\s*parsedWidgets,\s*jsCode\s*\};\s*\}/s;

const match1 = code.match(convertRegex);
const match2 = code.match(htmlRegex);

if(match1 && match2) {
  eval(match1[0]);
  
  global.preprocessTkinterCode = (code) => code;
  global.convertPythonToJs = convertPythonToJs;
  
  eval(match2[0]);
  
  const pyCode = `from tkinter import *
def cal():
    A1=int(number1.get())
    A2=int(number2.get())
    A3=int(number3.get())
    C.config(text=f'ค่าใช้จ่ายเต็ม {(A1*A2*A3)} บาท')
    return (A1*A2*A3)

def cal2():
    A5=cal()
    if(A5 > 5000):
        E.config(text=f'ลด %10 ={ A5*10/100 } บาท')
    elif(A5 > 3000):
        E.config(text=f'ลด %5 ={ A5*5/100 } บาท')
    else:
        E.config(text=f'ไม่มีส่วนลด')

root = Tk()
number1=StringVar(value='ความกว้างห้อง')
input1=Entry(root,textvariable=number1)
number2=StringVar(value='ความยาวห้อง')
input2=Entry(root,textvariable=number2)
number3=StringVar(value='ราคากระเบื้องต่อตาราง')
input3=Entry(root,textvariable=number3)
button1=Button(text='คำนวณงบ')
button1.configure(command=cal)
button2=Button(text='คิดโปร')
button2.configure(command=cal2)
C=Label(text='จ่ายตามจริง')
E=Label(text='โปรส่วนลด')
`;
  
  const result = convertTkinterToHtml(pyCode);
  fs.writeFileSync('test_output.html', result.htmlOutput);
  console.log('HTML saved to test_output.html');
} else {
  console.log('Functions not found');
}
