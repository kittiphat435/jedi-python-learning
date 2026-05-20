// Mock DOM
const dom = {
    els: {
        number1: { value: '2529' },
        number2: { value: '2569' },
        C: { textContent: '3333333333' }
    }
};

global.document = {
    querySelector: (selector) => {
        const match = selector.match(/data-var="(.*?)"/);
        if (match) return dom.els[match[1]];
        return null;
    }
};

function cal() {
    try {
        A1=parseInt(document.querySelector('[data-var="number1"]').value)
        A2=parseInt(document.querySelector('[data-var="number2"]').value)
        document.querySelector('[data-var="C"]').textContent = ` A1+A2 ${ A1+A2 }`  
    } catch (error) {
        console.error("error:", error);
    }
}

cal();
console.log("C text is now:", dom.els.C.textContent);
