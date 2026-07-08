const fs = require('fs');
const code = fs.readFileSync('public/student-gui.js', 'utf8');
const convertRegex = /function convertPythonToJs.*?return jsCode;\s*\}/s;
const match = code.match(convertRegex);
if(match) {
  eval(match[0]);
  const pyCode = `
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
  `;
  console.log('Result for cal:', convertPythonToJs(pyCode));
}
