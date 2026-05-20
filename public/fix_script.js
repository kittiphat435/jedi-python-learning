const fs = require('fs');

let content = fs.readFileSync('student-gui.js', 'utf8');

// The replacement for testGUICode
const newContent = content.replace(
    /previewDiv\.innerHTML = `[\s\n]*<div class="gui-preview">[\s\n]*\$\{htmlOutput\}[\s\n]*<script>[\s\n]*\/\/ JavaScript.*?[\s\n]*\$\{jsCode\}[\s\n]*<\/script>[\s\n]*<\/div>[\s\n]*`;/,
    `previewDiv.innerHTML = \`
            <div class="gui-preview">
                \${htmlOutput}
            </div>
        \`;

        // Create and append script tag to make JavaScript actually run
        if (jsCode) {
            const scriptEl = document.createElement('script');
            scriptEl.textContent = jsCode;
            previewDiv.appendChild(scriptEl);
        }`
);

fs.writeFileSync('student-gui.js', newContent, 'utf8');
console.log("Replaced successfully!");