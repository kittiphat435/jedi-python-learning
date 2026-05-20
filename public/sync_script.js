const fs = require('fs');

function syncFunctions(sourceFile, targetFiles) {
  const sourceContent = fs.readFileSync(sourceFile, 'utf-8');
  
  // 1. Extract checkGUICode
  const checkGUIStart = sourceContent.indexOf('async function checkGUICode(code)');
  let braceCount = 0;
  let checkGUIEnd = checkGUIStart;
  let foundFirstBrace = false;
  for (let i = checkGUIStart; i < sourceContent.length; i++) {
    if (sourceContent[i] === '{') {
      braceCount++;
      foundFirstBrace = true;
    } else if (sourceContent[i] === '}') {
      braceCount--;
    }
    if (foundFirstBrace && braceCount === 0) {
      checkGUIEnd = i + 1;
      break;
    }
  }
  const checkGUIFunc = sourceContent.substring(checkGUIStart, checkGUIEnd).trim();

  // 2. Extract mergeMultiLineStatements
  const mergeStart = sourceContent.indexOf('function mergeMultiLineStatements');
  const mergeEnd = sourceContent.indexOf('function convertCode()', mergeStart);
  const mergeFunc = sourceContent.substring(mergeStart, mergeEnd).trim();
  
  // 2.5. Extract convertPythonToJs
  const convertPyStart = sourceContent.indexOf('function convertPythonToJs(pythonCode)');
  braceCount = 0;
  let convertPyEnd = convertPyStart;
  foundFirstBrace = false;
  for (let i = convertPyStart; i < sourceContent.length; i++) {
    if (sourceContent[i] === '{') {
      braceCount++;
      foundFirstBrace = true;
    } else if (sourceContent[i] === '}') {
      braceCount--;
    }
    if (foundFirstBrace && braceCount === 0) {
      convertPyEnd = i + 1;
      break;
    }
  }
  const convertPyFunc = sourceContent.substring(convertPyStart, convertPyEnd).trim();

  // 3. Extract convertCode
  const convertStart = sourceContent.indexOf('function convertCode()');
  braceCount = 0;
  let convertEnd = convertStart;
  foundFirstBrace = false;
  for (let i = convertStart; i < sourceContent.length; i++) {
    if (sourceContent[i] === '{') {
      braceCount++;
      foundFirstBrace = true;
    } else if (sourceContent[i] === '}') {
      braceCount--;
    }
    if (foundFirstBrace && braceCount === 0) {
      convertEnd = i + 1;
      break;
    }
  }
  const convertFunc = sourceContent.substring(convertStart, convertEnd).trim();
  
  targetFiles.forEach(targetFile => {
    let targetContent = fs.readFileSync(targetFile, 'utf-8');
    
    // Replace checkGUICode
    const tCheckGUIStart = targetContent.indexOf('async function checkGUICode(code)');
    if (tCheckGUIStart !== -1) {
      let tBraceCount = 0;
      let tCheckGUIEnd = tCheckGUIStart;
      let tFoundFirstBrace = false;
      for (let i = tCheckGUIStart; i < targetContent.length; i++) {
        if (targetContent[i] === '{') {
          tBraceCount++;
          tFoundFirstBrace = true;
        } else if (targetContent[i] === '}') {
          tBraceCount--;
        }
        if (tFoundFirstBrace && tBraceCount === 0) {
          tCheckGUIEnd = i + 1;
          break;
        }
      }
      targetContent = targetContent.substring(0, tCheckGUIStart) + checkGUIFunc + targetContent.substring(tCheckGUIEnd);
    }
    
    // Find where to replace mergeMultiLineStatements and convertCode
    const tMergeStart = targetContent.indexOf('function mergeMultiLineStatements');
    let replaceStart = tMergeStart;
    if (tMergeStart === -1) {
      replaceStart = targetContent.indexOf('function convertCode()');
    }
    
    // Check if convertPythonToJs exists in target
    const tConvertPyStart = targetContent.indexOf('function convertPythonToJs(pythonCode)');
    if (tConvertPyStart !== -1 && tConvertPyStart < tMergeStart) {
      replaceStart = tConvertPyStart;
    }
    
    if (replaceStart !== -1) {
      const tConvertStart = targetContent.indexOf('function convertCode()');
      let tBraceCount = 0;
      let tConvertEnd = tConvertStart;
      let tFoundFirstBrace = false;
      for (let i = tConvertStart; i < targetContent.length; i++) {
        if (targetContent[i] === '{') {
          tBraceCount++;
          tFoundFirstBrace = true;
        } else if (targetContent[i] === '}') {
          tBraceCount--;
        }
        if (tFoundFirstBrace && tBraceCount === 0) {
          tConvertEnd = i + 1;
          break;
        }
      }
      targetContent = targetContent.substring(0, replaceStart) + convertPyFunc + '\n\n' + mergeFunc + '\n\n' + convertFunc + targetContent.substring(tConvertEnd);
    }
    
    fs.writeFileSync(targetFile, targetContent, 'utf-8');
    console.log(`Successfully synced to ${targetFile}`);
  });
}

syncFunctions('student-gui.js', ['pythongui.html', '13.html']);
