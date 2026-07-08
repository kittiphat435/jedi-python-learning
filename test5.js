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
`;

const functionRegex = /(?:^|\n)def\s+([\p{L}\p{N}_]+)\s*\(([^)]*)\)\s*:\s*([\s\S]*?)(?=\n\S|$)/gu;
let match;
while ((match = functionRegex.exec(code)) !== null) {
    console.log("Found function:", match[1]);
    console.log("Body:", match[3]);
}
