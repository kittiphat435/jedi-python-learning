const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const dom = new JSDOM(`
<html>
<body>
    <input type='text' data-var='number1' value='30'>
    <input type='text' data-var='number2' value='20'>
    <input type='text' data-var='number3' value='50'>
    <div data-var='C'>จ่ายตามจริง</div>
    <div data-var='E'>โปรส่วนลด</div>
    <button data-var='button1'>คำนวณงบ</button>
    <button data-var='button2'>คิดโปร</button>
    <script>
        let A1 = ''; let A2 = ''; let A3 = ''; let A5 = '';
        function cal() {
            try {
                A1=parseInt(document.querySelector('[data-var="number1"]').value);
                A2=parseInt(document.querySelector('[data-var="number2"]').value);
                A3=parseInt(document.querySelector('[data-var="number3"]').value);
                document.querySelector('[data-var="C"]').textContent = \`ค่าใช้จ่ายเต็ม \${(A1*A2*A3)} บาท\`;
                return (A1*A2*A3);
            } catch (error) {
                console.error(error);
            }
        }
        function cal2() {
            try {
                A5=cal();
                if(A5 > 5000)
                    document.querySelector('[data-var="E"]').textContent = \`ลด %10 =\${ A5*10/100 } บาท\`;
                else if(A5 > 3000)
                    document.querySelector('[data-var="E"]').textContent = \`ลด %5 =\${ A5*5/100 } บาท\`;
                else
                    document.querySelector('[data-var="E"]').textContent = \`ไม่มีส่วนลด\`;
            } catch (error) {
                console.error(error);
            }
        }
        
        document.querySelector('[data-var="button1"]').addEventListener('click', cal);
        document.querySelector('[data-var="button2"]').addEventListener('click', cal2);
    </script>
</body>
</html>
`, { runScripts: 'dangerously' });

setTimeout(() => {
    dom.window.document.querySelector('[data-var="button1"]').click();
    console.log('After button1, C is:', dom.window.document.querySelector('[data-var="C"]').textContent);
    
    setTimeout(() => {
        dom.window.document.querySelector('[data-var="button2"]').click();
        console.log('After button2, E is:', dom.window.document.querySelector('[data-var="E"]').textContent);
    }, 200);
}, 200);
