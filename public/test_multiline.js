const fs = require('fs');

// Mock DOM and convertTkinterToHtml for testing
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="htmlOutput"></div></body></html>');
global.document = dom.window.document;
global.window = dom.window;

// read student-gui.js
const studentGui = fs.readFileSync('student-gui.js', 'utf8');
eval(studentGui);

const codes = [
// Case 1: Standard
`button = tk. Button (m, text='Stop', width=25,command=lambda: m.destroy () )`,

// Case 2: Break after text, with indentation
`button = tk. Button (m, text='Stop', 
    width=25,command=lambda: m.destroy () )`,

// Case 3: Break after text and width, with varying indentation
`button = tk. Button (m, text='Stop', 
    width=25, 
        command=lambda: m.destroy () )`,

// Case 4: Break after width, with indentation
`button = tk. Button (m, text='Stop',width=25, 
    command=lambda: m.destroy () )`,

// Case 5: Break multiple times, NO indentation
`button = tk. Button (m, text='Stop', 
width=25, 
command=lambda: m.destroy () )`
];

codes.forEach((code, index) => {
    console.log(`\n=== Test Case ${index + 1} ===`);
    const { widgets } = convertTkinterToHtml(code);
    console.log(`Parsed Widgets:`, widgets);
});