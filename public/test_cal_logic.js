const fs = require('fs');

// Read the file content
const html = fs.readFileSync('test_cal.html', 'utf8');

// A simple manual DOM simulation to test the logic
const state = {
    number1: '2529',
    number2: '2569',
    C: '3333333333'
};

const document = {
    querySelector: (selector) => {
        if (selector === '[data-var="number1"]') return { value: state.number1 };
        if (selector === '[data-var="number2"]') return { value: state.number2 };
        if (selector === '[data-var="C"]') return { 
            get textContent() { return state.C; },
            set textContent(val) { state.C = val; console.log("C updated to:", val); }
        };
        return null;
    }
};

function cal() {
    console.log("เรียกใช้ฟังก์ชัน cal");
    try {
        A1=parseInt(document.querySelector('[data-var="number1"]').value)
        A2=parseInt(document.querySelector('[data-var="number2"]').value)
        document.querySelector('[data-var="C"]').textContent = ` A1+A2 ${ A1+A2 }`
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในฟังก์ชัน cal:", error);
    }
}

console.log("Before click, C is:", state.C);
cal();
console.log("After click, C is:", state.C);
