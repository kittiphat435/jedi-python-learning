// ฟังก์ชันหลักสำหรับเสิร์ฟเว็บแอป
function doGet() {
    return HtmlService.createTemplate(getHtmlContent())
      .evaluate()
      .setTitle('ตรวจสอบสถานะการสมัคร')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  
  // ฟังก์ชันค้นหาข้อมูลผู้ใช้
  function searchUserData(searchTerm) {
    try {
      // แก้ไข Sheet ID ตรงนี้ให้เป็น ID ของ Google Sheet จริงของคุณ
      const sheet = SpreadsheetApp.openById('YOUR_SHEET_ID_HERE').getActiveSheet();
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      
      // หาตำแหน่งของคอลัมน์ที่ต้องการ
      const nameCol = headers.indexOf('ชื่อผู้แข่ง');
      const surnameCol = headers.indexOf('นามสกุล');
      const phoneCol = headers.indexOf('เบอร์โทรศัพท์');
      const orderIdCol = headers.indexOf('รหัสการซื้อ');
      const genderCol = headers.indexOf('เพศ');
      const ageGroupCol = headers.indexOf('ช่วงอายุที่ลงแข่ง');
      const realAgeCol = headers.indexOf('อายุจริง (ปี)');
      const distanceCol = headers.indexOf('ระยะทาง');
      const deliveryMethodCol = headers.indexOf('วิธีการรับเสื้อ');
      const amountCol = headers.indexOf('ยอดการซื้อ (บาท)');
      const statusCol = headers.indexOf('สถานะ');
      
      const results = [];
      
      // ค้นหาข้อมูลที่ตรงกับเงื่อนไข (เริ่มจากแถวที่ 2 เพื่อข้าม header)
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const name = row[nameCol] ? row[nameCol].toString().toLowerCase() : '';
        const surname = row[surnameCol] ? row[surnameCol].toString().toLowerCase() : '';
        const phone = row[phoneCol] ? row[phoneCol].toString() : '';
        
        const searchLower = searchTerm.toLowerCase();
        
        // ตรวจสอบว่าข้อมูลตรงกับการค้นหาหรือไม่
        if (name.includes(searchLower) || surname.includes(searchLower) || phone.includes(searchTerm)) {
          results.push({
            orderId: row[orderIdCol] || '',
            name: row[nameCol] || '',
            surname: row[surnameCol] || '',
            gender: row[genderCol] || '',
            ageGroup: row[ageGroupCol] || '',
            realAge: row[realAgeCol] || '',
            distance: row[distanceCol] || '',
            deliveryMethod: row[deliveryMethodCol] || '',
            amount: row[amountCol] || '',
            status: row[statusCol] || ''
          });
        }
      }
      
      return results;
      
    } catch (error) {
      console.error('Error in searchUserData:', error);
      throw new Error('เกิดข้อผิดพลาดในการค้นหาข้อมูล: ' + error.message);
    }
  }
  
  // ฟังก์ชันสำหรับสร้าง HTML Content
  function getHtmlContent() {
    return `
  <!DOCTYPE html>
  <html>
  <head>
      <title>ตรวจสอบสถานะการสมัคร</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
          body {
              font-family: 'Sarabun', Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background-color: #f5f5f5;
          }
          .container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h1 {
              text-align: center;
              color: #333;
              margin-bottom: 30px;
          }
          .search-box {
              margin-bottom: 30px;
          }
          input[type="text"] {
              width: 70%;
              padding: 12px;
              border: 2px solid #ddd;
              border-radius: 5px;
              font-size: 16px;
          }
          button {
              padding: 12px 20px;
              background-color: #4CAF50;
              color: white;
              border: none;
              border-radius: 5px;
              cursor: pointer;
              font-size: 16px;
              margin-left: 10px;
          }
          button:hover {
              background-color: #45a049;
          }
          .results {
              margin-top: 20px;
          }
          .result-item {
              background: #f9f9f9;
              padding: 15px;
              margin-bottom: 10px;
              border-radius: 5px;
              border-left: 4px solid #4CAF50;
          }
          .no-results {
              text-align: center;
              color: #666;
              font-style: italic;
              padding: 20px;
          }
          .loading {
              text-align: center;
              color: #666;
          }
          table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              font-size: 14px;
          }
          th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
          }
          th {
              background-color: #4CAF50;
              color: white;
              font-weight: bold;
          }
          tr:nth-child(even) {
              background-color: #f2f2f2;
          }
          @media (max-width: 768px) {
              .container {
                  padding: 15px;
              }
              input[type="text"] {
                  width: 60%;
                  margin-bottom: 10px;
              }
              button {
                  margin-left: 0;
              }
              table {
                  font-size: 12px;
              }
              th, td {
                  padding: 6px;
              }
          }
      </style>
  </head>
  <body>
      <div class="container">
          <h1>ตรวจสอบสถานะการสมัคร</h1>
          
          <div class="search-box">
              <input type="text" id="searchInput" placeholder="กรอกชื่อ, นามสกุล หรือเบอร์โทรศัพท์">
              <button onclick="searchData()">ค้นหา</button>
          </div>
          
          <div id="results" class="results"></div>
      </div>
  
      <script>
          function searchData() {
              const searchTerm = document.getElementById('searchInput').value.trim();
              const resultsDiv = document.getElementById('results');
              
              if (!searchTerm) {
                  alert('กรุณากรอกข้อมูลที่ต้องการค้นหา');
                  return;
              }
              
              resultsDiv.innerHTML = '<div class="loading">กำลังค้นหา...</div>';
              
              google.script.run
                  .withSuccessHandler(displayResults)
                  .withFailureHandler(showError)
                  .searchUserData(searchTerm);
          }
          
          function displayResults(results) {
              const resultsDiv = document.getElementById('results');
              
              if (results.length === 0) {
                  resultsDiv.innerHTML = '<div class="no-results">ไม่พบข้อมูลที่ค้นหา</div>';
                  return;
              }
              
              let html = '<table>';
              html += '<tr>';
              html += '<th>รหัสการซื้อ</th>';
              html += '<th>ชื่อผู้แข่ง</th>';
              html += '<th>นามสกุล</th>';
              html += '<th>เพศ</th>';
              html += '<th>ช่วงอายุที่ลงแข่ง</th>';
              html += '<th>อายุจริง (ปี)</th>';
              html += '<th>ระยะทาง</th>';
              html += '<th>วิธีการรับเสื้อ</th>';
              html += '<th>ยอดการซื้อ (บาท)</th>';
              html += '<th>สถานะ</th>';
              html += '</tr>';
              
              results.forEach(result => {
                  html += '<tr>';
                  html += \`<td>\${result.orderId}</td>\`;
                  html += \`<td>\${result.name}</td>\`;
                  html += \`<td>\${result.surname}</td>\`;
                  html += \`<td>\${result.gender}</td>\`;
                  html += \`<td>\${result.ageGroup}</td>\`;
                  html += \`<td>\${result.realAge}</td>\`;
                  html += \`<td>\${result.distance}</td>\`;
                  html += \`<td>\${result.deliveryMethod}</td>\`;
                  html += \`<td>\${result.amount}</td>\`;
                  html += \`<td>\${result.status}</td>\`;
                  html += '</tr>';
              });
              
              html += '</table>';
              resultsDiv.innerHTML = html;
          }
          
          function showError(error) {
              document.getElementById('results').innerHTML =
                  '<div class="no-results">เกิดข้อผิดพลาด: ' + error.message + '</div>';
          }
          
          // ให้สามารถกด Enter เพื่อค้นหาได้
          document.getElementById('searchInput').addEventListener('keypress', function(e) {
              if (e.key === 'Enter') {
                  searchData();
              }
          });
      </script>
  </body>
  </html>
    `;
  }