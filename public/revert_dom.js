const fs = require('fs');

function revert(file) {
    let code = fs.readFileSync(file, 'utf8');

    // We want to find:
    // (function() {
    //     setTimeout(() => {
    // ...
    //     }, 50);
    // })();
    
    // Actually, let's just write a regex that finds the exact two parts we inserted
    // and replace them back.
    
    code = code.replace(/\(function\(\) \{\n\s*setTimeout\(\(\) => \{/g, "document.addEventListener('DOMContentLoaded', function() {");
    code = code.replace(/\}, 50\);\n\s*\}\)\(\);/g, "});");
    
    fs.writeFileSync(file, code, 'utf8');
    console.log("Reverted " + file);
}

revert('student-gui.js');
revert('13.html');
revert('pythongui.html');