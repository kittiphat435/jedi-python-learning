// ฟังก์ชันหลักสำหรับเสิร์ฟเว็บแอป
function doGet() {
  return HtmlService.createTemplate(getHtmlContent())
    .evaluate()
    .setTitle('100 ปี ร้อยใจ ก้าวไปด้วยกัน')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ฟังก์ชันค้นหาข้อมูลผู้ใช้
function searchUserData(searchTerm) {
  try {
    console.log('เริ่มค้นหาข้อมูล:', searchTerm);
    
    // ตรวจสอบ Sheet ID และชื่อ Sheet
    const sheetId = '1CmLJs8fOu5IFuW4dROJ2xfcVlrwcLZpoQSsqdb0W6UM';
    const sheetName = 'Sheet1';
    
    console.log('กำลังเปิด Sheet ID:', sheetId);
    const spreadsheet = SpreadsheetApp.openById(sheetId);
    
    if (!spreadsheet) {
      console.error('ไม่สามารถเปิด Spreadsheet ได้');
      return [];
    }
    
    console.log('กำลังเข้าถึง Sheet:', sheetName);
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      console.error('ไม่พบ Sheet:', sheetName);
      const sheets = spreadsheet.getSheets();
      console.log('Sheets ที่มีอยู่:', sheets.map(s => s.getName()));
      return [];
    }
    
    console.log('กำลังดึงข้อมูลจาก Sheet');
    const data = sheet.getDataRange().getValues();
    
    if (!data || data.length <= 1) {
      console.error('ไม่มีข้อมูลใน Sheet หรือมีเพียงหัวตาราง');
      console.log('จำนวนแถว:', data ? data.length : 0);
      return [];
    }
    
    console.log('พบข้อมูล', data.length - 1, 'แถว');
    console.log('ตัวอย่างแถวแรก:', data[1]);
    
    const results = [];
    const currentYear = new Date().getFullYear();
    
    // ใช้ index แทนการค้นหาชื่อคอลัมน์
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) {
        console.log('ข้ามแถวว่าง:', i);
        continue;
      }
      
      // ตรวจสอบและแปลงข้อมูลอย่างปลอดภัย
      const orderId = (row[1] !== null && row[1] !== undefined) ? row[1].toString().toLowerCase() : '';
      const name = (row[2] !== null && row[2] !== undefined) ? row[2].toString().toLowerCase() : '';
      const surname = (row[3] !== null && row[3] !== undefined) ? row[3].toString().toLowerCase() : '';
      const phone = (row[9] !== null && row[9] !== undefined) ? row[9].toString() : '';
      
      const searchLower = searchTerm.toLowerCase();
      
      // ตรวจสอบว่าข้อมูลตรงกับการค้นหาหรือไม่
      if (orderId.includes(searchLower) || 
          name.includes(searchLower) || 
          surname.includes(searchLower) || 
          phone.includes(searchTerm)) {
        
        // คำนวณอายุจริงจากคอลัมน์ Q (index 16)
        let realAge = '';
        if (row[16] !== null && row[16] !== undefined) {
          const birthData = row[16].toString();
          console.log('ข้อมูลปีเกิด:', birthData);
          
          // ถ้าเป็นปี (4 หลัก) ให้คำนวณอายุ
          if (birthData.length === 4 && !isNaN(birthData)) {
            const birthYear = parseInt(birthData);
            realAge = (currentYear - birthYear).toString();
            console.log('คำนวณอายุจากปี:', birthYear, '-> อายุ:', realAge);
          } else {
            // ถ้าเป็นวันที่ ให้แยกปีออกมา (แก้ไข regex)
            const yearMatch = birthData.match(/\d{4}/);
            if (yearMatch) {
              const birthYear = parseInt(yearMatch[0]);
              realAge = (currentYear - birthYear).toString();
              console.log('แยกปีจากวันที่:', birthYear, '-> อายุ:', realAge);
            } else {
              console.log('ไม่สามารถแยกปีได้จาก:', birthData);
              realAge = birthData; // ใช้ข้อมูลเดิมถ้าไม่สามารถแยกปีได้
            }
          }
        }
        

        // คำนวณยอดการซื้อ
        const runningType = (row[17] !== null && row[17] !== undefined) ? row[17].toString() : '';
        const deliveryMethod = (row[14] !== null && row[14] !== undefined) ? row[14].toString() : '';
        
        let amount = 0;
        
        // คำนวณราคาตามประเภทการวิ่ง
        if (runningType.toLowerCase().includes('ประชาชนทั่วไป') || runningType.toLowerCase().includes('คอกลม')) {
          amount = 500;
        } else if (runningType.toLowerCase().includes('vip') || runningType.toLowerCase().includes('คอปก')) {
          // สำหรับ VIP ให้ตรวจสอบเพิ่มเติมว่าเป็น 500 หรือ 1000
          if (runningType.includes('1000')) {
            amount = 1000;
          } else {
            amount = 500;
          }
        }
        
        // เพิ่มค่าจัดส่ง 60 บาท สำหรับการจัดส่งทางพัสดุ
        if (deliveryMethod.includes('จัดส่ง') || deliveryMethod.includes('พัสดุ') || deliveryMethod.toLowerCase().includes('delivery')) {
          amount += 60;
        }
        
        const result = {
          orderId: (row[1] !== null && row[1] !== undefined) ? row[1].toString() : '',
          name: (row[2] !== null && row[2] !== undefined) ? row[2].toString() : '',
          surname: (row[3] !== null && row[3] !== undefined) ? row[3].toString() : '',
          gender: (row[4] !== null && row[4] !== undefined) ? row[4].toString() : '',
          ageGroup: (row[6] !== null && row[6] !== undefined) ? row[6].toString() : '',
          runningType: runningType,
          size: (row[8] !== null && row[8] !== undefined) ? row[8].toString() : '',
          deliveryMethod: deliveryMethod,
          amount: amount > 0 ? amount.toString() : '',
          status: (row[13] !== null && row[13] !== undefined) ? row[13].toString() : ''
        };
        
        results.push(result);
        console.log('พบข้อมูลที่ตรงกัน:', result.name, result.surname, 'อายุ:', realAge, 'ยอดเงิน:', result.amount);
      }
    }
    
    console.log('ผลการค้นหา:', results.length, 'รายการ');
    return results;
    
  } catch (error) {
    console.error('Error in searchUserData:', error);
    console.error('Error details:', error.toString());
    console.error('Stack trace:', error.stack);
    return [];
  }
}

// ฟังก์ชันสำหรับสร้าง HTML Content
function getHtmlContent() {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>100 ปี ร้อยใจ ก้าวไปด้วยกัน</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Sarabun', 'Kanit', Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #fef2f2 0%, #f8fafc 25%, #ffffff 50%, #fef3c7 75%, #fef2f2 100%);
            min-height: 100vh;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            padding: 30px;
            border-radius: 25px;
            box-shadow: 0 10px 40px rgba(239, 68, 68, 0.1), 0 0 20px rgba(192, 192, 192, 0.1);
            border: 2px solid transparent;
            background-clip: padding-box;
            position: relative;
        }
        
        .container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border-radius: 25px;
            padding: 2px;
            background: linear-gradient(45deg, #ef4444, #c0c0c0, #fbbf24, #ef4444);
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: exclude;
            mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            mask-composite: exclude;
            z-index: -1;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 30px;
            border-bottom: 3px solid transparent;
            background: linear-gradient(135deg, #fef2f2 0%, #f8fafc 50%, #fef3c7 100%);
            border-radius: 20px;
            margin-bottom: 30px;
            position: relative;
            overflow: hidden;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.3), transparent);
            animation: shimmer 3s infinite;
        }
        
        @keyframes shimmer {
            0% { left: -100%; }
            100% { left: 100%; }
        }
        
        .logo {
            width: 90px;
            height: 90px;
            margin: 0 auto 20px;
            display: block;
            border-radius: 50%;
            box-shadow: 0 6px 25px rgba(239, 68, 68, 0.2), 0 0 15px rgba(251, 191, 36, 0.2);
            border: 3px solid transparent;
            background: linear-gradient(45deg, #ef4444, #fbbf24) border-box;
            -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: exclude;
        }
        
        h1 {
          background: linear-gradient(45deg, #ef4444, #c0c0c0, #fbbf24);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 15px;
          font-size: 2.8em;
          font-weight: 800;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          animation: textGlow 2s ease-in-out infinite alternate;
      }
      
      h2 {
          background: linear-gradient(45deg, #ef4444, #fbbf24, #c0c0c0);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 10px;
          font-size: 2.2em;
          font-weight: 700;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          animation: textGlow 2s ease-in-out infinite alternate;
          text-align: center;
      }
      
      /* เพิ่ม CSS สำหรับ responsive title */
      .title-mobile {
          display: none;
      }
        
        @keyframes textGlow {
            from { filter: drop-shadow(0 0 5px rgba(251, 191, 36, 0.3)); }
            to { filter: drop-shadow(0 0 15px rgba(239, 68, 68, 0.3)); }
        }
        
        .subtitle {
            color: #991b1b;
            font-size: 1.3em;
            margin-bottom: 20px;
            font-weight: 600;
        }
        
        .search-section {
            background: linear-gradient(135deg, #fef2f2 0%, #f8fafc 50%, #fef3c7 100%);
            padding: 30px;
            border-radius: 20px;
            margin-bottom: 30px;
            border-left: 5px solid #ef4444;
            border-right: 5px solid #fbbf24;
            box-shadow: 0 4px 20px rgba(239, 68, 68, 0.1), 0 0 10px rgba(192, 192, 192, 0.1);
            position: relative;
        }
        
        .search-section::after {
            content: '';
            position: absolute;
            top: 10px;
            right: 10px;
            width: 20px;
            height: 20px;
            background: radial-gradient(circle, #fbbf24, #f59e0b);
            border-radius: 50%;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.7; }
            50% { transform: scale(1.2); opacity: 1; }
        }
        
        .search-box {
            display: flex;
            gap: 15px;
            align-items: center;
            flex-wrap: wrap;
        }
        
        input[type="text"] {
            flex: 1;
            min-width: 300px;
            padding: 18px 25px;
            border: 2px solid transparent;
            border-radius: 15px;
            font-size: 16px;
            transition: all 0.3s ease;
            background: linear-gradient(white, white) padding-box, linear-gradient(45deg, #ef4444, #c0c0c0, #fbbf24) border-box;
        }
        
        input[type="text"]:focus {
            outline: none;
            box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1), 0 0 20px rgba(251, 191, 36, 0.2);
            transform: translateY(-2px);
        }
        
        button {
            padding: 18px 35px;
            background: #ef4444; /* เปลี่ยนเป็นสีแดงล้วน */
            color: white;
            border: none;
            border-radius: 15px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 700;
            transition: all 0.3s ease;
            box-shadow: 0 6px 20px rgba(239, 68, 68, 0.3);
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
            position: relative;
            overflow: hidden;
        }
        
        button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
            transition: left 0.5s;
        }
        
        button:hover::before {
            left: 100%;
        }
        
        button:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4);
            background: #dc2626; /* hover เป็นสีแดงเข้มขึ้น */
        }
        
        .results {
            margin-top: 30px;
        }
        
        .no-results {
            text-align: center;
            color: #991b1b;
            font-style: italic;
            padding: 40px;
            background: linear-gradient(135deg, #fef2f2 0%, #f8fafc 50%, #fef3c7 100%);
            border-radius: 20px;
            border: 2px dashed #fecaca;
        }
        
        .loading {
            text-align: center;
            background: linear-gradient(45deg, #ef4444, #fbbf24);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-size: 20px;
            font-weight: bold;
            padding: 40px;
        }
        
        .table-container {
            overflow-x: auto;
            margin-top: 20px;
            border-radius: 20px;
            box-shadow: 0 6px 30px rgba(239, 68, 68, 0.1), 0 0 20px rgba(192, 192, 192, 0.1);
            border: 2px solid transparent;
            background: linear-gradient(white, white) padding-box, linear-gradient(45deg, #ef4444, #c0c0c0, #fbbf24) border-box;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
            background: white;
        }
        
        th {
            background: linear-gradient(135deg, #ef4444 0%, #c0c0c0 50%, #fbbf24 100%);
            color: white;
            font-weight: 700;
            padding: 18px 12px;
            text-align: center;
            position: sticky;
            top: 0;
            z-index: 10;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
            border-bottom: 2px solid #b91c1c;
        }
        
        td {
            padding: 15px 12px;
            text-align: center;
            border-bottom: 1px solid #fee2e2;
            vertical-align: middle;
            transition: all 0.3s ease;
        }
        
        tr:nth-child(even) {
            background: linear-gradient(135deg, #fefefe 0%, #f8fafc 100%);
        }
        
        tr:hover {
            background: linear-gradient(135deg, #fef2f2 0%, #fef3c7 100%);
            transform: scale(1.01);
            box-shadow: 0 2px 10px rgba(239, 68, 68, 0.1);
        }
        
        .status-cell {
            font-weight: 700;
            background: linear-gradient(45deg, #ef4444, #fbbf24);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .amount-cell {
            font-weight: 700;
            background: linear-gradient(45deg, #ef4444, #fbbf24);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            background-color: #fef2f2;
            border-radius: 8px;
        }
        
        .age-cell {
            color: #991b1b;
            font-weight: 700;
            background: linear-gradient(135deg, #fef2f2, #f8fafc);
            border-radius: 8px;
        }
        
        /* CSS สำหรับการ์ดมือถือ */
        .mobile-cards {
            display: none;
        }
        
        .mobile-card {
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 15px;
            box-shadow: 0 4px 15px rgba(239, 68, 68, 0.1);
            border: 2px solid transparent;
            background-clip: padding-box;
            position: relative;
        }
        
        .mobile-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border-radius: 15px;
            padding: 2px;
            background: linear-gradient(45deg, #ef4444, #c0c0c0, #fbbf24);
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: exclude;
            mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            mask-composite: exclude;
            z-index: -1;
        }
        
        .card-header {
            background: linear-gradient(45deg, #ef4444, #fbbf24);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-size: 1.2em;
            font-weight: bold;
            margin-bottom: 15px;
            text-align: center;
            border-bottom: 2px solid #fee2e2;
            padding-bottom: 10px;
        }
        
        .card-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #fee2e2;
        }
        
        .card-row:last-child {
            border-bottom: none;
        }
        
        .card-label {
            font-weight: 600;
            color: #991b1b;
            min-width: 100px;
            font-size: 0.9em;
        }
        
        .card-value {
            text-align: right;
            flex: 1;
            margin-left: 10px;
            font-weight: 500;
        }
        
        .card-value.status {
            background: linear-gradient(45deg, #ef4444, #fbbf24);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-weight: bold;
        }
        
        .card-value.amount {
            background: linear-gradient(45deg, #ef4444, #fbbf24);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-weight: bold;
        }
        
        /* Responsive Design */
        @media (max-width: 1024px) {
            .container {
                margin: 10px;
                padding: 20px;
            }
            
            h1 {
                font-size: 2.2em;
            }
            
            table {
                font-size: 12px;
            }
            
            th, td {
                padding: 10px 8px;
            }
        }
        
        @media (max-width: 768px) {
            .search-box {
                flex-direction: column;
            }
            
            input[type="text"] {
                min-width: 100%;
                margin-bottom: 15px;
            }
            
            button {
                width: 100%;
            }
            
            h1 {
                font-size: 2em;
            }
            
            /* ซ่อน title ปกติและแสดง title สำหรับมือถือ */
            .title-desktop {
                display: none;
            }
            
            .title-mobile {
                display: block;
                background: linear-gradient(45deg, #ef4444, #c0c0c0, #fbbf24);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin-bottom: 15px;
                font-size: 2em;
                font-weight: 800;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                animation: textGlow 2s ease-in-out infinite alternate;
                line-height: 1.2;
            }
            
            /* ซ่อนตารางและแสดงการ์ดสำหรับมือถือ */
            .table-container {
                display: none;
            }
            
            .mobile-cards {
                display: block;
            }
            
            .logo {
                width: 70px;
                height: 70px;
            }
        }
        
        @media (max-width: 480px) {
            body {
                padding: 10px;
            }
            
            .container {
                padding: 15px;
            }
            
            .title-mobile {
                font-size: 1.6em;
            }
        }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 25px;
            color: #991b1b;
            border-top: 2px solid transparent;
            background: linear-gradient(135deg, #fef2f2 0%, #f8fafc 50%, #fef3c7 100%) padding-box, linear-gradient(45deg, #ef4444, #c0c0c0, #fbbf24) border-box;
            border-radius: 20px;
        }
        
        .team-badge {
                display: inline-block;
                background: #ef4444; /* เปลี่ยนกลับเป็นสีแดงล้วน */
                color: white;
                padding: 12px 25px;
                border-radius: 30px;
                font-weight: 700;
                margin: 15px 0;
                box-shadow: 0 4px 15px rgba(239, 68, 68, 0.2); /* เปลี่ยน shadow เป็นสีแดง */
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
                animation: badgeGlow 3s ease-in-out infinite alternate;
            }
        
        @keyframes badgeGlow {
            from { box-shadow: 0 4px 15px rgba(239, 68, 68, 0.2); } /* เปลี่ยน glow เป็นสีแดง */
            to { box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4); } /* เปลี่ยน glow เป็นสีแดง */
        }
        
        .search-title {
            margin-bottom: 20px;
            background: linear-gradient(45deg, #ef4444, #c0c0c0, #fbbf24);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-weight: 700;
            font-size: 1.1em;
        }
        
        /* Responsive Design */
        @media (max-width: 1024px) {
            .container {
                margin: 10px;
                padding: 20px;
            }
            
            h1 {
                font-size: 2.2em;
            }
            
            table {
                font-size: 12px;
            }
            
            th, td {
                padding: 10px 8px;
            }
        }
        
        @media (max-width: 768px) {
            .search-box {
                flex-direction: column;
            }
            
            input[type="text"] {
                min-width: 100%;
                margin-bottom: 15px;
            }
            
            button {
                width: 100%;
            }
            
            h1 {
                font-size: 2em;
            }
            
            /* ซ่อน title ปกติและแสดง title สำหรับมือถือ */
            .title-desktop {
                display: none;
            }
            
            .title-mobile {
                display: block;
                background: linear-gradient(45deg, #ef4444, #c0c0c0, #fbbf24);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin-bottom: 15px;
                font-size: 2em;
                font-weight: 800;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                animation: textGlow 2s ease-in-out infinite alternate;
                line-height: 1.2;
            }
            
            table {
                font-size: 11px;
            }
            
            th, td {
                padding: 8px 6px;
            }
            
            .logo {
                width: 70px;
                height: 70px;
            }
        }
        
        @media (max-width: 480px) {
            body {
                padding: 10px;
            }
            
            .container {
                padding: 15px;
            }
            
            .title-mobile {
                font-size: 1.6em;
            }
            
            table {
                font-size: 10px;
            }
            
            th, td {
                padding: 6px 4px;
            }
        }px;
            padding: 25px;
            color: #991b1b;
            border-top: 2px solid transparent;
            background: linear-gradient(135deg, #fef2f2 0%, #f8fafc 50%, #fef3c7 100%) padding-box, linear-gradient(45deg, #ef4444, #c0c0c0, #fbbf24) border-box;
            border-radius: 20px;
        }
        
        .team-badge {
  display: inline-block;
  background: #ef4444; /* เปลี่ยนเป็นสีแดงล้วน */
  color: white;
  padding: 12px 25px;
  border-radius: 30px;
  font-weight: 700;
  margin: 15px 0;
  box-shadow: 0 4px 15px rgba(239, 68, 68, 0.2); /* เปลี่ยน shadow เป็นสีแดง */
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  animation: badgeGlow 3s ease-in-out infinite alternate;
}

@keyframes badgeGlow {
  from { box-shadow: 0 4px 15px rgba(239, 68, 68, 0.2); } /* เปลี่ยน glow เป็นสีแดง */
  to { box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4); } /* เปลี่ยน glow เป็นสีแดง */
}
        
        .search-title {
            margin-bottom: 20px;
            background: linear-gradient(45deg, #ef4444, #c0c0c0, #fbbf24);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-weight: 700;
            font-size: 1.1em;
        }
        
        /* Responsive Design */
        @media (max-width: 1024px) {
            .container {
                margin: 10px;
                padding: 20px;
            }
            
            h1 {
                font-size: 2.2em;
            }
            
            table {
                font-size: 12px;
            }
            
            th, td {
                padding: 10px 8px;
            }
        }
        
        @media (max-width: 768px) {
            .search-box {
                flex-direction: column;
            }
            
            input[type="text"] {
                min-width: 100%;
                margin-bottom: 15px;
            }
            
            button {
                width: 100%;
            }
            
            h1 {
                font-size: 2em;
            }
            
            table {
                font-size: 11px;
            }
            
            th, td {
                padding: 8px 6px;
            }
            
            .logo {
                width: 70px;
                height: 70px;
            }
        }
        
        @media (max-width: 480px) {
            body {
                padding: 10px;
            }
            
            .container {
                padding: 15px;
            }
            
            .title-mobile {
                font-size: 1.6em;
            }
            
            table {
                font-size: 10px;
            }
            
            th, td {
                padding: 6px 4px;
            }
        }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 25px;
            color: #991b1b;
            border-top: 2px solid transparent;
            background: linear-gradient(135deg, #fef2f2 0%, #f8fafc 50%, #fef3c7 100%) padding-box, linear-gradient(45deg, #ef4444, #c0c0c0, #fbbf24) border-box;
            border-radius: 20px;
        }
        
        .team-badge {
            display: inline-block;
            background: #ef4444; /* เปลี่ยนเป็นสีแดงล้วน */
            color: white;
            padding: 12px 25px;
            border-radius: 30px;
            font-weight: 700;
            margin: 15px 0;
            box-shadow: 0 4px 15px rgba(239, 68, 68, 0.2);
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
            animation: badgeGlow 3s ease-in-out infinite alternate;
        }
        
        @keyframes badgeGlow {
            from { box-shadow: 0 4px 15px rgba(239, 68, 68, 0.2); }
            to { box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4); }
        }
        
        .search-title {
            margin-bottom: 20px;
            background: linear-gradient(45deg, #ef4444, #c0c0c0, #fbbf24);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-weight: 700;
            font-size: 1.1em;
        }
        
        /* Responsive Design */
        @media (max-width: 1024px) {
            .container {
                margin: 10px;
                padding: 20px;
            }
            
            h1 {
                font-size: 2.2em;
            }
            
            table {
                font-size: 12px;
            }
            
            th, td {
                padding: 10px 8px;
            }
        }
        
        @media (max-width: 768px) {
            .search-box {
                flex-direction: column;
            }
            
            input[type="text"] {
                min-width: 100%;
                margin-bottom: 15px;
            }
            
            button {
                width: 100%;
            }
            
            h1 {
                font-size: 2em;
            }
            
            table {
                font-size: 11px;
            }
            
            th, td {
                padding: 8px 6px;
            }
            
            .logo {
                width: 70px;
                height: 70px;
            }
        }
        
        @media (max-width: 480px) {
            body {
                padding: 10px;
            }
            
            .container {
                padding: 15px;
            }
            
            .title-mobile {
                font-size: 1.6em;
            }
            
            table {
                font-size: 10px;
            }
            
            th, td {
                padding: 6px 4px;
            }
        }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 25px;
            color: #991b1b;
            border-top: 2px solid transparent;
            background: linear-gradient(135deg, #fef2f2 0%, #f8fafc 50%, #fef3c7 100%) padding-box, linear-gradient(45deg, #ef4444, #c0c0c0, #fbbf24) border-box;
            border-radius: 20px;
        }
        
        .team-badge {
            display: inline-block;
            background: #ef4444; /* เปลี่ยนเป็นสีแดงล้วน */
            color: white;
            padding: 12px 25px;
            border-radius: 30px;
            font-weight: 700;
            margin: 15px 0;
            box-shadow: 0 4px 15px rgba(239, 68, 68, 0.2);
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
            animation: badgeGlow 3s ease-in-out infinite alternate;
        }
        
        @keyframes badgeGlow {
            from { box-shadow: 0 4px 15px rgba(239, 68, 68, 0.2); }
            to { box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4); }
        }
        
        .search-title {
            margin-bottom: 20px;
            background: linear-gradient(45deg, #ef4444, #c0c0c0, #fbbf24);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-weight: 700;
            font-size: 1.1em;
        }
        
        /* Responsive Design */
        @media (max-width: 1024px) {
            .container {
                margin: 10px;
                padding: 20px;
            }
            
            h1 {
                font-size: 2.2em;
            }
            
            table {
                font-size: 12px;
            }
            
            th, td {
                padding: 10px 8px;
            }
        }
        
        @media (max-width: 768px) {
            .search-box {
                flex-direction: column;
            }
            
            input[type="text"] {
                min-width: 100%;
                margin-bottom: 15px;
            }
            
            button {
                width: 100%;
            }
            
            h1 {
                font-size: 2em;
            }
            
            table {
                font-size: 11px;
            }
            
            th, td {
                padding: 8px 6px;
            }
            
            .logo {
                width: 70px;
                height: 70px;
            }
        }
        
        @media (max-width: 480px) {
            body {
                padding: 10px;
            }
            
            .container {
                padding: 15px;
            }
            
            .title-mobile {
                font-size: 1.6em;
            }
            
            table {
                font-size: 10px;
            }
            
            th, td {
                padding: 6px 4px;
            }
        }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 25px;
            color: #991b1b;
            border-top: 2px solid transparent;
            background: linear-gradient(135deg, #fef2f2 0%, #f8fafc 50%, #fef3c7 100%) padding-box, linear-gradient(45deg, #ef4444, #c0c0c0, #fbbf24) border-box;
            border-radius: 20px;
        }
        
        .team-badge {
            display: inline-block;
            background: #ef4444; /* เปลี่ยนเป็นสีแดงล้วน */
            color: white;
            padding: 12px 25px;
            border-radius: 30px;
            font-weight: 700;
            margin: 15px 0;
            box-shadow: 0 4px 15px rgba(239, 68, 68, 0.2);
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
            animation: badgeGlow 3s ease-in-out infinite alternate;
        }
        
        @keyframes badgeGlow {
            from { box-shadow: 0 4px 15px rgba(239, 68, 68, 0.2); }
            to { box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4); }
        }
        
        .search-title {
            margin-bottom: 20px;
            background: linear-gradient(45deg, #ef4444, #c0c0c0, #fbbf24);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-weight: 700;
            font-size: 1.1em;
        }
        
        /* Responsive Design */
        @media (max-width: 1024px) {
            .container {
                margin: 10px;
                padding: 20px;
            }
            
            h1 {
                font-size: 2.2em;
            }
            
            table {
                font-size: 12px;
            }
            
            th, td {
                padding: 10px 8px;
            }
        }
        
        @media (max-width: 768px) {
            .search-box {
                flex-direction: column;
            }
            
            input[type="text"] {
                min-width: 100%;
                margin-bottom: 15px;
            }
            
            button {
                width: 100%;
            }
            
            h1 {
                font-size: 2em;
            }
            
            table {
                font-size: 11px;
            }
            
            th, td {
                padding: 8px 6px;
            }
            
            .logo {
                width: 70px;
                height: 70px;
            }
        }
        
        @media (max-width: 480px) {
            body {
                padding: 10px;
            }
            
            .container {
                padding: 15px;
            }
            
            .title-mobile {
                font-size: 1.6em;
            }
            
            table {
                font-size: 10px;
            }
            
            th, td {
                padding: 6px 4px;
            }
        }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 25px;
            color: #991b1b;
            border-top: 2px solid transparent;
            background: linear-gradient(135deg, #fef2f2 0%, #f8fafc 50%, #fef3c7 100%) padding-box, linear-gradient(45deg, #ef4444, #c0c0c0, #fbbf24) border-box;
            border-radius: 20px;
        }
                   
      .team-badge {
  display: inline-block;
  background: #ef4444; /* เปลี่ยนเป็นสีแดงล้วน */
  color: white;
  padding: 12px 25px;
  border-radius: 30px;
  font-weight: 700;
  margin: 15px 0;
  box-shadow: 0 4px 15px rgba(239, 68, 68, 0.2); /* เปลี่ยน shadow เป็นสีแดง */
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  animation: badgeGlow 3s ease-in-out infinite alternate;
}

@keyframes badgeGlow {
  from { box-shadow: 0 4px 15px rgba(239, 68, 68, 0.2); } /* เปลี่ยน glow เป็นสีแดง */
  to { box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4); } /* เปลี่ยน glow เป็นสีแดง */
}
        
        .search-title {
            margin-bottom: 20px;
            background: linear-gradient(45deg, #ef4444, #c0c0c0, #fbbf24);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-weight: 700;
            font-size: 1.1em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
    
            <h1 class="title-desktop">🏃‍♂️ 100 ปี ร้อยใจ ก้าวไปด้วยกัน 🏃‍♀️</h1>
            <h1 class="title-mobile">🏃‍♂️ 100 ปี ร้อยใจ<br>ก้าวไปด้วยกัน 🏃‍♀️</h1>
           <h2>ถาวรานุกูล️</h2>
            <div class="team-badge">⚪ ทีมแดงขาว 🥈🥇 ⚪</div>
            <div class="subtitle">ระบบตรวจสอบสถานะการสมัคร</div>
        </div>
        
        <div class="search-section">
            <h3 class="search-title">🔍 ค้นหาข้อมูลผู้เข้าร่วม ✨</h3>
            <div class="search-box">
                <input type="text" id="searchInput" placeholder="กรอกชื่อ, นามสกุล, เบอร์โทรศัพท์ หรือรหัสการซื้อ">
                <button onclick="searchData()">🔍 ค้นหา ✨</button>
            </div>
        </div>
        
        <div id="results" class="results"></div>
        
        <div class="footer">
            <div class="team-badge">🏃‍♂️ ทีมแดงขาว 🥈🥇 🏃‍♀️</div>
            <p>© 2025 งานวิ่ง 100 ปี ถาวรานุกูล | ระบบจัดการโดย M.master</p>
        </div>
    </div>

    <script>
        function searchData() {
            const searchTerm = document.getElementById('searchInput').value.trim();
            const resultsDiv = document.getElementById('results');
            
            if (!searchTerm) {
                alert('กรุณากรอกข้อมูลที่ต้องการค้นหา');
                return;
            }
            
            resultsDiv.innerHTML = '<div class="loading">🔄 กำลังค้นหาข้อมูล...</div>';
            
            google.script.run
                .withSuccessHandler(displayResults)
                .withFailureHandler(showError)
                .searchUserData(searchTerm);
        }
        
        function displayResults(results) {
            const resultsDiv = document.getElementById('results');
            
            if (!results || !Array.isArray(results)) {
                resultsDiv.innerHTML = '<div class="no-results">❌ เกิดข้อผิดพลาดในการดึงข้อมูล</div>';
                return;
            }
            
            if (results.length === 0) {
                resultsDiv.innerHTML = '<div class="no-results">❌ ไม่พบข้อมูลที่ค้นหา <br> กรุณาตรวจสอบการสะกดหรือลองค้นหาด้วยข้อมูลอื่น</div>';
                return;
            }
            
            // สร้างตารางสำหรับเดสก์ท็อป
            let html = '<div class="table-container">';
            html += '<table>';
            html += '<thead><tr>';
            html += '<th style="min-width: 120px;">🆔 รหัสคำสั่งซื้อ</th>';
            html += '<th style="min-width: 100px;">👤 ชื่อ</th>';
            html += '<th style="min-width: 100px;">👤 นามสกุล</th>';
            html += '<th style="min-width: 60px;">⚧ เพศ</th>';
            html += '<th style="min-width: 120px;">📊 รุ่นการแข่งขัน</th>';
            html += '<th style="min-width: 120px;">🏃 ประเภทการวิ่ง</th>';
            html += '<th style="min-width: 80px;">👕 ไซส์เสื้อ</th>';
            html += '<th style="min-width: 120px;">📦 วิธีการรับเสื้อ</th>';
            html += '<th style="min-width: 100px;">💰 ยอดการซื้อ (บาท)</th>';
            html += '<th style="min-width: 100px;">✅ สถานะ</th>';
            html += '</tr></thead>';
            html += '<tbody>';
            
            results.forEach((result, index) => {
                html += '<tr>';
                html += '<td><strong>' + (result.orderId || '-') + '</strong></td>';
                html += '<td>' + (result.name || '-') + '</td>';
                html += '<td>' + (result.surname || '-') + '</td>';
                html += '<td>' + (result.gender || '-') + '</td>';
                html += '<td>' + (result.ageGroup || '-') + '</td>';
                html += '<td>' + (result.runningType || '-') + '</td>';
                html += '<td>' + (result.size || '-') + '</td>';
                html += '<td>' + (result.deliveryMethod || '-') + '</td>';
                html += '<td class="amount-cell">' + (result.amount || '-') + '</td>';
                html += '<td class="status-cell">' + (result.status || '-') + '</td>';
                html += '</tr>';
            });
            
            html += '</tbody></table></div>';
            
            // สร้างการ์ดสำหรับมือถือ
            html += '<div class="mobile-cards">';
            results.forEach((result, index) => {
                html += '<div class="mobile-card">';
                html += '<div class="card-header">🆔 ' + (result.orderId || '-') + '</div>';
                html += '<div class="card-row">';
                html += '<span class="card-label">👤 ชื่อ-นามสกุล:</span>';
                html += '<span class="card-value">' + (result.name || '-') + ' ' + (result.surname || '-') + '</span>';
                html += '</div>';
                html += '<div class="card-row">';
                html += '<span class="card-label">⚧ เพศ:</span>';
                html += '<span class="card-value">' + (result.gender || '-') + '</span>';
                html += '</div>';
                html += '<div class="card-row">';
                html += '<span class="card-label">📊 รุ่นการแข่งขัน:</span>';
                html += '<span class="card-value">' + (result.ageGroup || '-') + '</span>';
                html += '</div>';
                html += '<div class="card-row">';
                html += '<span class="card-label">🏃 ประเภทการวิ่ง:</span>';
                html += '<span class="card-value">' + (result.runningType || '-') + '</span>';
                html += '</div>';
                html += '<div class="card-row">';
                html += '<span class="card-label">👕 ไซส์เสื้อ:</span>';
                html += '<span class="card-value">' + (result.size || '-') + '</span>';
                html += '</div>';
                html += '<div class="card-row">';
                html += '<span class="card-label">📦 วิธีการรับเสื้อ:</span>';
                html += '<span class="card-value">' + (result.deliveryMethod || '-') + '</span>';
                html += '</div>';
                html += '<div class="card-row">';
                html += '<span class="card-label">💰 ยอดการซื้อ:</span>';
                html += '<span class="card-value amount">' + (result.amount || '-') + ' บาท</span>';
                html += '</div>';
                html += '<div class="card-row">';
                html += '<span class="card-label">✅ สถานะ:</span>';
                html += '<span class="card-value status">' + (result.status || '-') + '</span>';
                html += '</div>';
                html += '</div>';
            });
            html += '</div>';
            
            html += '<div style="margin-top: 20px; text-align: center; color: #dc2626; font-weight: bold;">';
            html += '<div class="team-badge">📊 พบข้อมูล ' + results.length + ' รายการ</div>';
            html += '</div>';
            
            resultsDiv.innerHTML = html;
        }
        
        function showError(error) {
            document.getElementById('results').innerHTML =
                '<div class="no-results">❌ เกิดข้อผิดพลาด: ' + error.message + '<br><small>กรุณาลองใหม่อีกครั้ง</small></div>';
        }
        
        // ให้สามารถกด Enter เพื่อค้นหาได้
        document.getElementById('searchInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchData();
            }
        });
        
        // Auto focus ที่ช่องค้นหาเมื่อโหลดหน้า
        window.onload = function() {
            document.getElementById('searchInput').focus();
        };

    </script>
</body>
</html>
`}