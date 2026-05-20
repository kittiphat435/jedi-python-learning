const fs = require('fs');
let code = fs.readFileSync('student-gui.js', 'utf8');

// Match BOTH single and double quotes
const oldRegex = /document\.addEventListener\(['"]DOMContentLoaded['"],\s*function\(\)\s*\{[\s\S]*?\}\);/g;

code = code.replace(oldRegex, (match) => {
    // Change the DOMContentLoaded listener to an IIFE with a timeout
    return match
        .replace(/document\.addEventListener\(['"]DOMContentLoaded['"],\s*function\(\)\s*\{/, "(function() {\n                setTimeout(() => {")
        .replace(/\}\);$/, "                }, 50);\n            })();");
});

fs.writeFileSync('student-gui.js', code, 'utf8');
console.log("Replaced DOMContentLoaded with IIFE + setTimeout");