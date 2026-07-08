const code = "def cal():\r\n    A1=int(number1.get())\r\n    A2=int(number2.get())\r\n    A3=int(number3.get())\r\n    C.config(text=f'ค่าใช้จ่ายเต็ม {(A1*A2*A3)} บาท')\r\n    return (A1*A2*A3)\r\n\r\ndef cal2():\r\n    A5=cal()\r\n    if(A5 > 5000):\r\n        E.config(text=f'ลด %10 ={ A5*10/100 } บาท')\r\n    elif(A5 > 3000):\r\n        E.config(text=f'ลด %5 ={ A5*5/100 } บาท')\r\n    else:\r\n        E.config(text=f'ไม่มีส่วนลด')\r\n";

const functionRegex = /(?:^|\n)def\s+([\p{L}\p{N}_]+)\s*\(([^)]*)\)\s*:\s*([\s\S]*?)(?=\n\S|$)/gu;
let match;
while ((match = functionRegex.exec(code)) !== null) {
    console.log("Found function:", match[1]);
    console.log("Body:", JSON.stringify(match[3]));
}
