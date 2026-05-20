const fs = require('fs');
let content = fs.readFileSync('student-gui.js', 'utf8');

// Replace command: commandMatch ? commandMatch[1] : null,
content = content.replace(
  /command:\s*commandMatch\s*\?\s*commandMatch\[1\]\s*:\s*null,/g,
  'command: commandMatch ? (commandMatch[1].startsWith("lambda") ? "lambda_func" : commandMatch[1]) : null,'
);

// Replace functionName = commandMatch[3].trim();
content = content.replace(
  /functionName = commandMatch\[3\]\.trim\(\);/g,
  'functionName = commandMatch[3].trim();\n                if (functionName.startsWith("lambda")) functionName = "lambda_func";'
);

fs.writeFileSync('student-gui.js', content);
console.log('Done replacements');