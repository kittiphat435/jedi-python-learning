const fs = require('fs');

function fixFile(file) {
    let code = fs.readFileSync(file, 'utf8');

    // Match BOTH single and double quotes
    const oldRegex = /document\.addEventListener\(['"]DOMContentLoaded['"],\s*function\(\)\s*\{[\s\S]*?\}\);/g;

    code = code.replace(oldRegex, (match) => {
        // We only want to replace the generated code, NOT the actual document event listener.
        // We can check if it contains "const button = document.querySelector" or "const element = document.getElementById"
        if (match.includes("querySelector('button") || match.includes("getElementById('")) {
            return match
                .replace(/document\.addEventListener\(['"]DOMContentLoaded['"],\s*function\(\)\s*\{/, "(function() {\n                setTimeout(() => {")
                .replace(/\}\);$/, "                }, 50);\n            })();");
        }
        return match;
    });

    fs.writeFileSync(file, code, 'utf8');
    console.log("Replaced DOMContentLoaded in " + file);
}

fixFile('13.html');
fixFile('pythongui.html');