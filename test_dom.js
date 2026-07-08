const { JSDOM } = require("jsdom");

const html = `
<!DOCTYPE html>
<html>
<body>
    <input type="text" id="widget_1" data-var="number1" value="ความกว้างห้อง">
    <input type="text" id="widget_2" data-var="number2" value="ความยาวห้อง">
    <input type="text" id="widget_3" data-var="number3" value="ราคากระเบื้องต่อตาราง">
    <button id="widget_4" data-var="button1">คำนวณงบ</button>
    <button id="widget_5" data-var="button2">คิดโปร</button>
    <div id="widget_6" data-var="C">จ่ายตามจริง</div>
    <div id="widget_7" data-var="E">โปรส่วนลด</div>
    <script>
        function cal() {
            try {
                A1=parseInt(document.querySelector('[data-var="number1"]').value)
                A2=parseInt(document.querySelector('[data-var="number2"]').value)
                A3=parseInt(document.querySelector('[data-var="number3"]').value)
                document.querySelector('[data-var="C"]').textContent = \`ค่าใช้จ่ายเต็ม \${(A1*A2*A3)} บาท\`
                return (A1*A2*A3)
            } catch (error) {
                console.error(error);
            }
        }
        function cal2() {
            try {
                A5=cal()
                if(A5 > 5000)
                    document.querySelector('[data-var="E"]').textContent = \`ลด %10 =\${ A5*10/100 } บาท\`
                else if(A5 > 3000)
                    document.querySelector('[data-var="E"]').textContent = \`ลด %5 =\${ A5*5/100 } บาท\`
                else
                    document.querySelector('[data-var="E"]').textContent = \`ไม่มีส่วนลด\`
            } catch (error) {
                console.error(error);
            }
        }
        
        document.querySelector('[data-var="button1"]').addEventListener('click', cal);
        document.querySelector('[data-var="button2"]').addEventListener('click', cal2);
    </script>
</body>
</html>
`;

const dom = new JSDOM(html, { runScripts: "dangerously" });
const window = dom.window;
const document = window.document;

// Simulate step 1
const allInputs = Array.from(document.querySelectorAll('input[type="text"]'));
allInputs[0].value = "30";
allInputs[1].value = "20";
allInputs[2].value = "50";

// Simulate step 2
document.querySelector('[data-var="button1"]').click();
console.log("After button1:", document.querySelector('[data-var="C"]').textContent);

document.querySelector('[data-var="button2"]').click();
console.log("After button2:", document.querySelector('[data-var="E"]').textContent);
