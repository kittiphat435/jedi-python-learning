import os

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    target = """      // แสดงผลใน result-frame
      resultFrame.srcdoc = htmlOutput;
      
      // เพิ่ม console.log หลังจากกำหนดค่า iframe.srcdoc
      console.log('iframe.srcdoc หลังกำหนดค่า:', resultFrame.srcdoc.substring(0, 500) + '...');
  
      // **เพิ่ม onload เพื่อปรับขนาด iframe ตามเนื้อหาในตัวมันเอง**
      resultFrame.onload = () => {
        try {
          const doc = resultFrame.contentDocument || resultFrame.contentWindow.document;
          const contentHeight = doc.documentElement.scrollHeight;
          resultFrame.style.height = contentHeight + 'px';
        } catch (e) {
          console.warn('ปรับขนาด iframe อัตโนมัติไม่สำเร็จ:', e);
        }
      };"""

    replacement = """      // **เพิ่ม onload ก่อนกำหนดค่า srcdoc เพื่อป้องกันปัญหา Race Condition และกำหนด Timeout ให้ Render ทัน**
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
      
      // เพิ่ม console.log หลังจากกำหนดค่า iframe.srcdoc
      console.log('iframe.srcdoc หลังกำหนดค่า:', resultFrame.srcdoc.substring(0, 500) + '...');"""

    if target in content:
        content = content.replace(target, replacement)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {filepath}")
    else:
        print(f"Target not found in {filepath}")

fix_file('public/pythongui.html')
