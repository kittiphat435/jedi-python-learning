const fs = require('fs');
const path = require('path');

const publicDir = 'C:\\python-learning-platform\\python-learning-platform\\jedi-python-learning\\public';

const cssFiles = [
    'admin-add-ploblem.css',
    'student-problem-detail.css',
    'student-gui.css',
    'student-iot-gui.css',
    'student-flowchart-detail.css',
    'student-summary-detail.css',
    'class-detail-styles.css',
    'class-detail.css'
];

for (const file of cssFiles) {
    const filePath = path.join(publicDir, file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Add Sarabun to Consolas, Courier New, monospace
        content = content.replace(/'Consolas',\s*'Courier New',\s*monospace/g, "'Consolas', 'Courier New', 'Sarabun', monospace");
        // Add Sarabun to Consolas, monospace
        content = content.replace(/'Consolas',\s*monospace/g, "'Consolas', 'Sarabun', monospace");

        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated fonts in ${file}`);
    }
}
