const code = `
from tkinter import *
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
root.title("ผู้รับเหมา")
root.geometry("550x200")
number1=StringVar(value='ความกว้างห้อง')
input1=Entry(root,textvariable=number1)
input1.pack()
number2=StringVar(value='ความยาวห้อง')
input2=Entry(root,textvariable=number2)
input2.pack()

number3=StringVar(value='ราคากระเบื้องต่อตาราง')
input3=Entry(root,textvariable=number3)
input3.pack()
button1=Button(text='คำนวณงบ')
button1.pack()
button1.configure(command=cal)
button2=Button(text='คิดโปร')
button2.pack()
button2.configure(command=cal2)
C=Label(text='จ่ายตามจริง')
C.pack()
E=Label(text='โปรส่วนลด')
E.pack()

root.mainloop()
`;

const widgets = {};
const buttonRegex = /([\p{L}\p{N}_]+)\s*=\s*(?:tk\.\s*)?Button\s*\((.*)\)/gu;
const commandRegex = /([\p{L}\p{N}_]+)\.(config|configure)\s*\(\s*.*?command\s*=\s*(lambda\s*:.*?\(.*?\)|lambda\s*:.*?(?=[,)])|[\p{L}_][\p{L}\p{N}_]*)/gsu;

let buttonMatch;
while ((buttonMatch = buttonRegex.exec(code)) !== null) {
    const buttonVar = buttonMatch[1];
    widgets[buttonVar] = { type: 'Button', command: null };
    
    // หาฟังก์ชันที่เชื่อมโยงกับปุ่ม (จากการใช้ config/configure)
    let commandMatch;
    commandRegex.lastIndex = 0;
    let functionName = null;
    
    while ((commandMatch = commandRegex.exec(code)) !== null) {
        if (commandMatch[1] === buttonVar) {
            functionName = commandMatch[3].trim();
            if (widgets[buttonVar]) {
                widgets[buttonVar].command = functionName;
            }
            break;
        }
    }
    console.log(buttonVar, "->", widgets[buttonVar].command);
}
