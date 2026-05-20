const fs = require('fs');
const js = fs.readFileSync('student-gui.js', 'utf8');

// Use a simple indexOf / slice to extract the function if regex is tricky
const startStr = 'function convertTkinterToHtml(code) {';
const startIdx = js.indexOf(startStr);
// Let's just run the whole script in a sandbox to avoid parsing errors
const sandbox = {
    console: { log: () => {}, error: () => {}, warn: () => {} },
    window: { document: {} },
    document: {
        addEventListener: () => {},
        getElementById: () => ({ value: '' })
    },
    setTimeout: () => {},
    Math: Math,
    parseInt: parseInt,
    Object: Object
};

// We just want to check if the file parses as valid JS
try {
    const vm = require('vm');
    const script = new vm.Script(js);
    console.log("student-gui.js parsed successfully");
} catch (e) {
    console.error("Syntax Error in student-gui.js:", e);
}