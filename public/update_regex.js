const fs = require('fs');

const files = [
    'c:\\python-learning-platform\\public\\student-gui.js'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // Regex to find literal regexes containing [a-zA-Z_][a-zA-Z0-9_]*
    // We want to replace [a-zA-Z_][a-zA-Z0-9_]* with [\p{L}_][\p{L}\p{N}_]*
    // and make sure the regex literal has the 'u' flag.
    
    // First, let's find all occurrences of /[a-zA-Z_][a-zA-Z0-9_]*/ and similar in the code
    const regexPattern = /\/([^\/]*\[a-zA-Z_\]\[a-zA-Z0-9_\]\*[^\/]*)\/([a-z]*)/g;
    
    content = content.replace(regexPattern, (match, pattern, flags) => {
        const newPattern = pattern.replace(/\[a-zA-Z_\]\[a-zA-Z0-9_\]\*/g, '[\\p{L}_][\\p{L}\\p{N}_]*');
        const newFlags = flags.includes('u') ? flags : flags + 'u';
        return `/${newPattern}/${newFlags}`;
    });

    // Also handle \b[a-zA-Z_]\w*
    const syntaxHighlighterPattern = /\/([^\/]*\\b\[a-zA-Z_\]\\w\*[^\/]*)\/([a-z]*)/g;
    content = content.replace(syntaxHighlighterPattern, (match, pattern, flags) => {
        const newPattern = pattern.replace(/\\b\[a-zA-Z_\]\\w\*/g, '(?:^|[^\\p{L}\\p{N}_])[\\p{L}_][\\p{L}\\p{N}_]*');
        const newFlags = flags.includes('u') ? flags : flags + 'u';
        return `/${newPattern}/${newFlags}`;
    });

    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
});
