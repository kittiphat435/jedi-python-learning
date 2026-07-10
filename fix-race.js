const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');

function findFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            findFiles(filePath, fileList);
        } else if (filePath.endsWith('.js') || filePath.endsWith('.html')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const files = findFiles(publicDir);
let modifiedCount = 0;

const searchPattern = /resultFrame\.srcdoc = htmlOutput;[\s\S]*?resultFrame\.onload = \(\) => {[\s\S]*?};/g;

const replacement = `      // **เพิ่ม onload ก่อนกำหนดค่า srcdoc เพื่อป้องกันปัญหา Race Condition และกำหนด Timeout ให้ Render ทัน**
      resultFrame.onload = () => {
        setTimeout(() => {
          try {
            const doc = resultFrame.contentDocument || resultFrame.contentWindow.document;
            const contentHeight = doc.documentElement.scrollHeight;
            resultFrame.style.height = (contentHeight > 300 ? contentHeight : 300) + 'px';
            console.log('ปรับขนาด iframe อัตโนมัติสำเร็จ Height:', contentHeight);
          } catch (e) {
            console.warn('ปรับขนาด iframe อัตโนมัติไม่สำเร็จ:', e);
          }
        }, 100);
      };

      // แสดงผลใน result-frame
      resultFrame.srcdoc = htmlOutput;
      
      console.log('iframe.srcdoc หลังกำหนดค่า:', resultFrame.srcdoc.substring(0, 500) + '...');`;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Check if it has the exact race condition pattern
    // The pattern matches: resultFrame.srcdoc = htmlOutput; ... resultFrame.onload = ... };
    
    // We will do a custom replace using a regex that handles the variable spacing
    // Since regex might be tricky across multiple lines, let's use a simpler replace
    
    if (content.includes('resultFrame.srcdoc = htmlOutput;') && content.includes('resultFrame.onload = () => {') && !content.includes('เพิ่ม onload ก่อนกำหนดค่า srcdoc')) {
        
        // Find the index of both
        const srcdocIdx = content.indexOf('resultFrame.srcdoc = htmlOutput;');
        const onloadIdx = content.indexOf('resultFrame.onload = () => {');
        
        if (srcdocIdx < onloadIdx) {
            // It's in the wrong order!
            // Let's replace the whole block manually
            // Find end of onload block
            let endOnloadIdx = content.indexOf('};', onloadIdx) + 2;
            
            // Extract the block we want to replace
            let beforeBlock = content.substring(0, srcdocIdx);
            
            // Find the start of the line for srcdocIdx
            let lineStart = beforeBlock.lastIndexOf('\\n');
            if (lineStart === -1) lineStart = 0; else lineStart += 1;
            
            let spaces = beforeBlock.substring(lineStart, srcdocIdx);
            beforeBlock = content.substring(0, lineStart); // Strip the spaces before srcdoc
            
            let afterBlock = content.substring(endOnloadIdx);
            
            let newBlock = spaces + '// **เพิ่ม onload ก่อนกำหนดค่า srcdoc เพื่อป้องกันปัญหา Race Condition และกำหนด Timeout ให้ Render ทัน**\\n' +
                           spaces + 'resultFrame.onload = () => {\\n' +
                           spaces + '  setTimeout(() => {\\n' +
                           spaces + '    try {\\n' +
                           spaces + '      const doc = resultFrame.contentDocument || resultFrame.contentWindow.document;\\n' +
                           spaces + '      const contentHeight = doc.documentElement.scrollHeight;\\n' +
                           spaces + '      resultFrame.style.height = (contentHeight > 300 ? contentHeight : 300) + \\'px\\';\\n' +
                           spaces + '    } catch (e) {\\n' +
                           spaces + '      console.warn(\\'ปรับขนาด iframe อัตโนมัติไม่สำเร็จ:\\', e);\\n' +
                           spaces + '    }\\n' +
                           spaces + '  }, 100);\\n' +
                           spaces + '};\\n\\n' +
                           spaces + '// แสดงผลใน result-frame\\n' +
                           spaces + 'resultFrame.srcdoc = htmlOutput;\\n';
                           
            content = beforeBlock + newBlock + afterBlock;
            fs.writeFileSync(file, content, 'utf8');
            modifiedCount++;
            console.log('Fixed:', file);
        }
    }
}

console.log('Modified files:', modifiedCount);
