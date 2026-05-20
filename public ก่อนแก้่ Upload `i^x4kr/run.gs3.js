// เพิ่มฟังก์ชันนี้ที่ด้านบนของไฟล์
function formatDistance(distance) {
  if (!distance || distance === '-') {
    return '-';
  }
  
  const distanceStr = distance.toString().toLowerCase();
  
  // เช็ค VIP ก่อน
  if (distanceStr.includes('vip')) {
    return 'VIP';
  }
  // เช็ค 10 ก่อน 5 และ 3 เพื่อป้องกันการเจอตัวเลขใน "500 บาท"
  else if (distanceStr.includes('10 กิโลเมตร') || distanceStr.includes('10กิโลเมตร')) {
    return '10';
  }
  else if (distanceStr.includes('5 กิโลเมตร') || distanceStr.includes('5กิโลเมตร')) {
    return '5';
  }
  else if (distanceStr.includes('3 กิโลเมตร') || distanceStr.includes('3กิโลเมตร')) {
    return '3';
  }
  
  return distance; // ถ้าไม่ตรงเงื่อนไขใดๆ ให้แสดงค่าเดิม
}

// ฟังก์ชันแยกข้อมูลระยะทางและช่วงอายุ
function parseAgeGroupData(ageGroupText) {
  if (!ageGroupText || ageGroupText === '-' || ageGroupText.trim() === '') {
    return { distance: '-', ageRange: '-' };
  }
  
  let distance = '-';
  let ageRange = '-';
  
  const text = ageGroupText.toString().trim();
  
  // แยกระยะทาง
  if (text.includes('3 Km') || text.includes('3Km')) {
    distance = '3 Km';
  } else if (text.includes('5 Km') || text.includes('5Km')) {
    distance = '5 Km';
  } else if (text.includes('10 Km') || text.includes('10Km')) {
    distance = '10 Km';
  }
  
  // แยกช่วงอายุ
  if (text.includes('อายุไม่จำกัด')) {
    ageRange = 'อายุไม่จำกัด';
  } else if (text.includes('อายุ ไม่เกิน 15 ปี')) {
    ageRange = 'อายุ ไม่เกิน 15 ปี';
  } else if (text.includes('อายุ ไม่เกิน 18 ปี')) {
    ageRange = 'อายุ ไม่เกิน 18 ปี';
  } else if (text.includes('อายุ 16-29 ปี')) {
    ageRange = 'อายุ 16-29 ปี';
  } else if (text.includes('อายุ 30 - 39 ปี')) {
    ageRange = 'อายุ 30 - 39 ปี';
  } else if (text.includes('อายุ 40 - 49 ปี')) {
    ageRange = 'อายุ 40 - 49 ปี';
  } else if (text.includes('อายุ 50 - 59 ปี')) {
    ageRange = 'อายุ 50 - 59 ปี';
  } else if (text.includes('อายุ 60 - 69 ปี')) {
    ageRange = 'อายุ 60 - 69 ปี';
  } else if (text.includes('อายุ 70 ปี ขึ้นไป')) {
    ageRange = 'อายุ 70 ปี ขึ้นไป';
  }
  
  return { distance: distance, ageRange: ageRange };
}

// เพิ่มฟังก์ชันนี้หลังจากฟังก์ชัน parseAgeGroupData
function processExistingDataForUV() {
  try {
    const sheet = SpreadsheetApp.openById('1CmLJs8fOu5IFuW4dROJ2xfcVlrwcLZpoQSsqdb0W6UM').getSheetByName('Sheet1');
    if (!sheet) {
      Logger.log('ไม่พบ Sheet ชื่อ Sheet1');
      return 'ไม่พบ Sheet ชื่อ Sheet1';
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return 'ไม่มีข้อมูลในชีต';
    }

    // ดึงข้อมูลจากคอลัมน์ G (คอลัมน์ที่ 7) ทั้งหมด
    const ageGroupData = sheet.getRange(2, 7, lastRow - 1, 1).getValues();
    
    let processedCount = 0;
    
    // ประมวลผลแต่ละแถว
    for (let i = 0; i < ageGroupData.length; i++) {
      const rowIndex = i + 2; // แถวจริงในชีต (เริ่มจากแถว 2)
      const ageGroupText = ageGroupData[i][0];
      
      if (ageGroupText && ageGroupText !== '-' && ageGroupText.toString().trim() !== '') {
        const parsedData = parseAgeGroupData(ageGroupText);
        
        // บันทึกลงคอลัมน์ U (คอลัมน์ที่ 21) และ V (คอลัมน์ที่ 22)
        sheet.getRange(rowIndex, 21).setValue(parsedData.distance);
        sheet.getRange(rowIndex, 22).setValue(parsedData.ageRange);
        
        processedCount++;
      }
    }
    
    Logger.log(`ประมวลผลข้อมูลเสร็จสิ้น: ${processedCount} แถว`);
    return `ประมวลผลข้อมูลเสร็จสิ้น: ${processedCount} แถว`;
    
  } catch (error) {
    Logger.log('Error processing existing data: ' + error.message);
    return 'เกิดข้อผิดพลาด: ' + error.message;
  }
}

// ฟังก์ชันคำนวณอายุจากปีเกิด (วิธีใหม่)
function calculateAgeFromBirthYear(birthDateString) {
  if (!birthDateString || birthDateString === '-' || birthDateString.trim() === '') {
    return '-';
  }
  
  try {
    // แยกวันที่ในรูปแบบ DD/MM/YYYY
    const parts = birthDateString.split('/');
    if (parts.length === 3) {
      let year = parseInt(parts[2]);
      
      // ตรวจสอบว่าเป็นปี พ.ศ. หรือ ค.ศ.
      if (!isNaN(year)) {
        // ถ้าปีมากกว่า 2500 ถือว่าเป็น พ.ศ. ให้แปลงเป็น ค.ศ.
        if (year > 2025) {
          year = year - 543;
        }
        
        // ตรวจสอบว่าปีอยู่ในช่วงที่สมเหตุสมผล
        if (year >= 1900 && year <= 2025) {
          const age = 2025 - year;
          return age >= 0 ? age : '-';
        }
      }
    }
    return '-';
  } catch (e) {
    return '-';
  }
}

// ฟังก์ชันที่ทำงานเมื่อมีการส่งข้อมูลจาก Google Form
function onFormSubmit(e) {
  const sheet = SpreadsheetApp.openById('1CmLJs8fOu5IFuW4dROJ2xfcVlrwcLZpoQSsqdb0W6UM').getSheetByName('Sheet1');
  if (!sheet) {
    Logger.log('ไม่พบ Sheet ชื่อ Sheet1');
    return;
  }

  // ดึงข้อมูลแถวล่าสุดจาก event
  const range = e.range;
  const row = range.getRow();

  // สร้างรหัส 5 หลักแบบสุ่ม (ผสม A-Z และ 0-9)
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let orderId;
  const existingIds = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues().flat();
  do {
    orderId = '';
    for (let i = 0; i < 5; i++) {
      orderId += characters.charAt(Math.floor(Math.random() * characters.length));
    }
  } while (existingIds.includes(orderId));

  sheet.getRange(row, 2).setValue(orderId); // อัปเดตคอลัมน์ B
  sheet.getRange(row, 14).setValue('รอการตรวจสอบ'); // อัปเดตคอลัมน์ N
  
  // คำนวณและบันทึกอายุลงในคอลัมน์ S (คอลัมน์ที่ 19)
  const birthDate = sheet.getRange(row, 17).getValue(); // ดึงวันเกิดจากคอลัมน์ Q (คอลัมน์ที่ 17)
  const age = calculateAgeFromBirthYear(birthDate);
  sheet.getRange(row, 19).setValue(age); // บันทึกอายุลงคอลัมน์ S (คอลัมน์ที่ 19)
  
  // แยกข้อมูลจากคอลัมน์ G และบันทึกลงคอลัมน์ U และ V
  const ageGroupData = sheet.getRange(row, 7).getValue(); // ดึงข้อมูลจากคอลัมน์ G (คอลัมน์ที่ 7)
  const parsedData = parseAgeGroupData(ageGroupData);
  
  sheet.getRange(row, 21).setValue(parsedData.distance); // บันทึกระยะทางลงคอลัมน์ U (คอลัมน์ที่ 21)
  sheet.getRange(row, 22).setValue(parsedData.ageRange); // บันทึกช่วงอายุลงคอลัมน์ V (คอลัมน์ที่ 22)
}
function markOrderUnsuccessful(rowIndex, reason) {
  try {
    const sheet = SpreadsheetApp.openById('1CmLJs8fOu5IFuW4dROJ2xfcVlrwcLZpoQSsqdb0W6UM').getSheetByName('Sheet1');
    sheet.getRange(rowIndex + 1, 19).setValue(reason); // คอลัมน์ S (เปลี่ยนจาก 18 เป็น 19)
    sheet.getRange(rowIndex + 1, 14).setValue('สมัครไม่สำเร็จ'); // คอลัมน์ N
    
    // ลบยอดการซื้อจากคอลัมน์ Y ถ้ามี
    sheet.getRange(rowIndex + 1, 25).setValue('');
    
    // เพิ่มการเรียก updateTotalConfirmedAmount กลับมา
    updateTotalConfirmedAmount(sheet);
    
    // อัปเดตลำดับหลังจากทำเครื่องหมายไม่สำเร็จ
    updateSequenceNumbers(sheet);
    
    Logger.log(`Marked row ${rowIndex + 1} as unsuccessful with reason: ${reason}`);
  } catch (error) {
    Logger.log('Error marking order unsuccessful: ' + error.message);
  }
}

// ฟังก์ชันหลักสำหรับ Web App
function doGet() {
  return HtmlService.createTemplate(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>ระบบจัดการคำสั่งซื้อ</title>
        <style>
          
          body { font-family: Arial, sans-serif; margin: 20px; background-color: #f4f4f4; position: relative; }
          h1, h2 { color: #333; }
          
          /* เพิ่ม CSS สำหรับแสดงยอดรวมที่มุมขวาบน */
          .total-display {
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #28a745;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            font-weight: bold;
            font-size: 16px;
            z-index: 1000;
            min-width: 250px;
            text-align: center;
          }
          
          .table-container { 
            max-height: 500px; 
            overflow-y: auto; 
            margin-top: 20px;
            border: 1px solid #ddd;
          }
          
          body { font-family: Arial, sans-serif; margin: 20px; background-color: #f4f4f4; }
          h1, h2 { color: #333; }
          .table-container { 
            max-height: 500px; 
            overflow-y: auto; 
            margin-top: 20px;
            border: 1px solid #ddd;
          }
            .search-tip {
  font-size: 12px;
  color: #666;
  margin: 5px 0 0 0;
}
          table { border-collapse: collapse; width: 100%; background-color: #fff; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #4CAF50; color: white; position: sticky; top: 0; z-index: 10; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          tr:hover { background-color: #f5f5f5; }
          input[type="text"] { padding: 8px; width: 200px; margin-right: 10px; }
          button { padding: 8px 16px; border: none; cursor: pointer; }
          button.confirm { background-color: #4CAF50; color: white; }
          button.confirm:disabled { background-color: #cccccc; cursor: not-allowed; }
          button.cancel { background-color: #FFC107; color: white; }
          button.cancel:disabled { background-color: #cccccc; cursor: not-allowed; }
          #result { margin-top: 20px; font-weight: bold; }
          .search-container { margin: 20px 0; }
          /* เพิ่ม CSS สำหรับ Filter */
          .filter-container {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
          }
          .unsuccessful { background-color: #dc3545; color: white; }
          .unsuccessful:disabled { background-color: #cccccc; cursor: not-allowed; }  
          .filter-row {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
            flex-wrap: wrap;
            gap: 10px;
          }
          .filter-row:last-child {
            margin-bottom: 0;
          }
          .filter-row label {
            font-weight: bold;
            margin-right: 5px;
            min-width: 80px;
          }
          input[type="date"] {
            padding: 6px;
            border: 1px solid #ccc;
            border-radius: 3px;
          }
          select {
            padding: 6px;
            border: 1px solid #ccc;
            border-radius: 3px;
            min-width: 150px;
          }
          .quick-date-btn {
            background-color: #17a2b8;
            color: white;
            padding: 6px 12px;
            font-size: 12px;
            margin: 0 2px;
          }
          .filter-actions {
            margin-top: 10px;
          }
          .results-info {
            font-size: 14px;
            color: #666;
            margin: 10px 0;
            font-style: italic;
          }
          /* เพิ่ม CSS สำหรับ Modal */
          .modal {
            display: none;
            position: fixed;
            z-index: 100;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            overflow: auto;
            background-color: rgba(0,0,0,0.4);
          }
          
          .modal-content {
            background-color: #fefefe;
            margin: 15% auto;
            padding: 20px;
            border: 1px solid #888;
            width: 80%;
            max-width: 600px;
            border-radius: 5px;
          }
          
          .close {
            color: #aaa;
            float: right;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
          }
          
          .close:hover,
          .close:focus {
            color: black;
            text-decoration: none;
          }
          
          .user-details-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          
          .user-details-table td {
            padding: 8px;
            border-bottom: 1px solid #eee;
          }
          
          .user-details-table tr:last-child td {
            border-bottom: none;
          }
        </style>
      </head>
      <body>
        
        <!-- แสดงยอดรวมที่มุมขวาบน -->
        <div class="total-display" id="totalDisplay">
          <div id="totalAmount">กำลังโหลด...</div>
        </div>
        <h2>ระบบจัดการคำสั่งซื้อ</h2>
        
        <!-- Filter Container -->
        <div class="filter-container">
          <div class="filter-row">
            <label>ช่วงวันที่:</label>
            <input type="date" id="startDate" title="วันที่เริ่มต้น">
            <span>ถึง</span>
            <input type="date" id="endDate" title="วันที่สิ้นสุด">
            <button class="quick-date-btn" onclick="setQuickDate('today')">วันนี้</button>
            <button class="quick-date-btn" onclick="setQuickDate('week')">7 วัน</button>
            <button class="quick-date-btn" onclick="setQuickDate('month')">เดือนนี้</button>
            <button class="quick-date-btn" onclick="setQuickDate('all')">ทั้งหมด</button>
          </div>
          
          <div class="filter-row">
            <label>สถานะ:</label>
            <select id="statusFilter">
              <option value="all">ทั้งหมด</option>
              <option value="รอการตรวจสอบ">รอการตรวจสอบ</option>
              <option value="การสมัครเสร็จสิ้น">การสมัครเสร็จสิ้น</option>
              <option value="สมัครไม่สำเร็จ">สมัครไม่สำเร็จ</option>
            </select>
            <label style="margin-left: 20px;">
              <input type="checkbox" id="pendingOnly"> แสดงเฉพาะรอตรวจสอบ
            </label>
          </div>
          
          <div class="filter-row">
            <label>ค้นหา:</label>
            <input type="text" id="searchInput" placeholder="ค้นหาจากรหัส, ชื่อ, นามสกุล หรือเบอร์โทร" style="width: 300px;">
            <button onclick="applyFilters()">ค้นหา & Filter</button>
            <button onclick="clearFilters()" style="background-color: #6c757d;">ล้างตัวกรอง</button>
            <button onclick="printShippingLabels()" style="background-color: #28a745; color: white; margin-left: 10px;">ปริ้นจ่าหน้าซอง</button>
          </div>
          
          <div id="resultsInfo" class="results-info"></div>
        </div>

       
        <div class="table-container">
          <table id="ordersTable">
          <tr>
            <th>ลำดับ</th>
            <th>รหัสการซื้อ</th>
            <th>ชื่อผู้แข่ง</th>
            <th>นามสกุล</th>
            <th>เพศ</th>
            <th>วันที่โอนเงิน</th>
            <th>เวลาที่โอน</th>
            <th>ประเภทวิ่ง</th>
            <th>วิธีการรับเสื้อ</th>
            <th>ยอดการซื้อ (บาท)</th>
            <th>หลักฐานโอนเงิน</th>
            <th>สถานะ</th>
            <th>Action</th>
          </tr>
          <?!= getOrdersHtml() ?>
        </table>
          
         </div>
         <div id="userDetailsModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeUserDetails()">&times;</span>
                <h3>รายละเอียดผู้ซื้อ</h3>
                <div id="userDetailsContent"></div>
                </div>
            </div>
        <script>
          function loadTotalAmount() {
            google.script.run
              .withSuccessHandler(function(total) {
                document.getElementById('totalAmount').innerText = total;
              })
              .withFailureHandler(function(error) {
                document.getElementById('totalAmount').innerText = 'เกิดข้อผิดพลาด';
              })
              .getTotalConfirmedAmount();
          }
          
          // โหลดยอดรวมเมื่อหน้าเว็บโหลดเสร็จ
          window.onload = function() {
            loadTotalAmount();
          };
          function checkStatus() {
            const orderId = document.getElementById('orderId').value.trim();
            if (!orderId) {
              document.getElementById('result').innerText = 'กรุณากรอกรหัสการสั่งซื้อ';
              return;
            }
            google.script.run
              .withSuccessHandler(showResult)
              .withFailureHandler(showError)
              .getOrderStatus(orderId);
          }

          function showResult(result) {
            document.getElementById('result').innerHTML = result;
          }

          function showError(error) {
            document.getElementById('result').innerText = 'เกิดข้อผิดพลาด: ' + error.message;
          }
          function confirmOrder(rowIndex) {
            if (window.confirm('ยืนยันการสมัครสำหรับแถวที่ ' + rowIndex + '?')) {
              google.script.run
                .withSuccessHandler(() => {
                  alert('ยืนยันการสมัครสำเร็จ');
                  // แทนที่ location.reload() ด้วยการโหลดข้อมูลใหม่
                  google.script.run
                    .withSuccessHandler(function(html) {
                  document.getElementById('ordersTable').innerHTML = 
                    '<tr><th>ลำดับ</th><th>รหัสการซื้อ</th><th>ชื่อผู้แข่ง</th><th>นามสกุล</th><th>เพศ</th><th>วันที่โอนเงิน</th><th>เวลาที่โอน</th><th>ระยะทาง</th><th>วิธีการรับเสื้อ</th><th>ยอดการซื้อ (บาท)</th><th>หลักฐานโอนเงิน</th><th>สถานะ</th><th>Action</th></tr>' + html;
                  // อัปเดตยอดรวมด้วย
                  loadTotalAmount();
                })
                    .getOrdersHtml();
                })
                .withFailureHandler((error) => alert('เกิดข้อผิดพลาด: ' + error.message))
                .confirmOrder(rowIndex);
            }
          }
          

          function cancelOrder(rowIndex) {
            if (window.confirm('ยกเลิกการยืนยันสำหรับแถวที่ ' + rowIndex + '?')) {
              google.script.run
                .withSuccessHandler(() => {
                  alert('ยกเลิกการยืนยันสำเร็จ');
                  google.script.run
                    .withSuccessHandler(function(html) {
                      document.getElementById('ordersTable').innerHTML = 
                        '<tr><th>ลำดับ</th><th>รหัสการซื้อ</th><th>ชื่อผู้แข่ง</th><th>นามสกุล</th><th>เพศ</th><th>วันที่โอนเงิน</th><th>เวลาที่โอน</th><th>ระยะทาง</th><th>วิธีการรับเสื้อ</th><th>ยอดการซื้อ (บาท)</th><th>หลักฐานโอนเงิน</th><th>สถานะ</th><th>Action</th></tr>' + html;
                      // อัปเดตยอดรวมด้วย
                      loadTotalAmount();
                    })
                    .getOrdersHtml();
                })
                .withFailureHandler((error) => alert('เกิดข้อผิดพลาด: ' + error.message))
                .cancelOrder(rowIndex);
            }
          }

          function markUnsuccessful(rowIndex) {
            const reason = prompt('กรุณาระบุเหตุผลที่สมัครไม่สำเร็จ:');
            if (reason && reason.trim() !== '') {
              if (window.confirm('ยืนยันการทำเครื่องหมายไม่สำเร็จสำหรับแถวที่ ' + rowIndex + '?')) {
                google.script.run
                  .withSuccessHandler(() => {
                    alert('ทำเครื่องหมายไม่สำเร็จเรียบร้อยแล้ว');
                    google.script.run
                      .withSuccessHandler(function(html) {
                        document.getElementById('ordersTable').innerHTML = 
                        '<tr><th>ลำดับ</th><th>รหัสการซื้อ</th><th>ชื่อผู้แข่ง</th><th>นามสกุล</th><th>เพศ</th><th>วันที่โอนเงิน</th><th>เวลาที่โอน</th><th>ระยะทาง</th><th>วิธีการรับเสื้อ</th><th>ยอดการซื้อ (บาท)</th><th>หลักฐานโอนเงิน</th><th>สถานะ</th><th>Action</th></tr>' + html;
                        // อัปเดตยอดรวมด้วย
                        loadTotalAmount();
                      })
                      .getOrdersHtml();
                  })
                  .withFailureHandler((error) => alert('เกิดข้อผิดพลาด: ' + error.message))
                  .markOrderUnsuccessful(rowIndex, reason);
              }
            }
          }
           window.confirmOrder = confirmOrder;
          window.cancelOrder = cancelOrder;
          window.markUnsuccessful = markUnsuccessful;

          function printShippingLabels() {
            google.script.run
              .withSuccessHandler(function(result) {
                if (result.success) {
                  // เปิดหน้าต่างใหม่สำหรับปริ้น
                  const printWindow = window.open('', '_blank');
                  printWindow.document.write(result.html);
                  printWindow.document.close();
                  printWindow.focus();
                  // รอให้โหลดเสร็จแล้วเปิด print dialog
                  setTimeout(() => {
                    printWindow.print();
                  }, 500);
                } else {
                  alert(result.message);
                }
              })
              .withFailureHandler((error) => alert('เกิดข้อผิดพลาด: ' + error.message))
              .generateShippingLabels();
          }

          function processExistingData() {
            if (confirm('ต้องการประมวลผลข้อมูลที่มีอยู่แล้วในชีตเพื่อแยกระยะทางและช่วงอายุหรือไม่?')) {
              google.script.run
                .withSuccessHandler(function(result) {
                  alert(result);
                })
                .withFailureHandler((error) => alert('เกิดข้อผิดพลาด: ' + error.message))
                .processExistingDataForUV();
            }
          }

          // เพิ่มฟังก์ชันนี้ในส่วน script
          function processUVData() {
            if (confirm('ต้องการประมวลผลข้อมูลคอลัมน์ U และ V สำหรับข้อมูลที่มีอยู่ทั้งหมดหรือไม่?')) {
              // แสดงข้อความกำลังประมวลผล
              const button = event.target;
              const originalText = button.textContent;
              button.textContent = 'กำลังประมวลผล...';
              button.disabled = true;
              
              google.script.run
                .withSuccessHandler(function(result) {
                  alert(result);
                  button.textContent = originalText;
                  button.disabled = false;
                  // รีเฟรชตารางข้อมูล
                  google.script.run
                    .withSuccessHandler(function(html) {
                      document.getElementById('ordersTable').innerHTML = 
                        '<tr><th>ลำดับ</th><th>รหัสการซื้อ</th><th>ชื่อผู้แข่ง</th><th>นามสกุล</th><th>เพศ</th><th>วันที่โอนเงิน</th><th>เวลาที่โอน</th><th>ประเภทวิ่ง</th><th>วิธีการรับเสื้อ</th><th>ยอดการซื้อ (บาท)</th><th>หลักฐานโอนเงิน</th><th>สถานะ</th><th>Action</th></tr>' + html;
                    })
                    .getOrdersHtml();
                })
                .withFailureHandler(function(error) {
                  alert('เกิดข้อผิดพลาด: ' + error.message);
                  button.textContent = originalText;
                  button.disabled = false;
                })
                .processExistingDataForUV();
            }
          }

          function searchOrders() {
            applyFilters();
            const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
            if (!searchTerm) {
              google.script.run
              .withSuccessHandler(function(html) {
                document.getElementById('ordersTable').innerHTML = 
                  '<tr><th>ลำดับ</th><th>รหัสการซื้อ</th><th>ชื่อผู้แข่ง</th><th>นามสกุล</th><th>เพศ</th><th>วันที่โอนเงิน</th><th>เวลาที่โอน</th><th>ระยะทาง</th><th>วิธีการรับเสื้อ</th><th>ยอดการซื้อ (บาท)</th><th>หลักฐานโอนเงิน</th><th>สถานะ</th><th>Action</th></tr>' + html;
              })
              .getOrdersHtml();
              return;
            }
            
            google.script.run
              .withSuccessHandler(function(html) {
                document.getElementById('ordersTable').innerHTML = 
                  '<tr><th>ลำดับ</th><th>รหัสการซื้อ</th><th>ชื่อผู้แข่ง</th><th>นามสกุล</th><th>เพศ</th><th>วันที่โอนเงิน</th><th>เวลาที่โอน</th><th>ระยะทาง</th><th>วิธีการรับเสื้อ</th><th>ยอดการซื้อ (บาท)</th><th>หลักฐานโอนเงิน</th><th>สถานะ</th><th>Action</th></tr>' + html;
              })
              .searchOrdersHtml(searchTerm);
          }



              function showUserDetailsFromAttr(element) {
                try {
                  const userData = element.getAttribute('data-user');
                  if (!userData) {
                    console.error('No user data found in element');
                    return;
                  }
                  // แปลง JSON string เป็น object
                  const userDataObj = JSON.parse(userData);
                  showUserDetails(userDataObj);
                } catch (error) {
                  console.error('Error in showUserDetailsFromAttr:', error);
                }
              }

            function showUserDetails(data) {
  let html = '<table class="user-details-table">';
  html += '<tr><td><strong>เวลากรอกฟอร์ม:</strong></td><td>' + data.columnA + '</td></tr>';
  html += '<tr><td><strong>รหัสการซื้อ:</strong></td><td>' + data.orderId + '</td></tr>';
  html += '<tr><td><strong>ชื่อผู้แข่ง:</strong></td><td>' + data.name + '</td></tr>';
  html += '<tr><td><strong>นามสกุล:</strong></td><td>' + data.surname + '</td></tr>';
  html += '<tr><td><strong>เพศ:</strong></td><td>' + data.gender + '</td></tr>';
  html += '<tr><td><strong>ชื่อทีม:</strong></td><td>' + data.teamName + '</td></tr>';
  html += '<tr><td><strong>ช่วงอายุที่ลงแข่ง:</strong></td><td>' + data.ageGroup + '</td></tr>';
  html += '<tr><td><strong>ระยะทาง:</strong></td><td>' + data.distance + '</td></tr>';
  html += '<tr><td><strong>ประเภทวิ่ง:</strong></td><td>' + data.runningType + '</td></tr>';
  html += '<tr><td><strong>ไซต์เสื้อ:</strong></td><td>' + data.size + '</td></tr>';
  html += '<tr><td><strong>เบอร์โทร:</strong></td><td>' + data.phone + '</td></tr>';
  html += '<tr><td><strong>วันที่โอนเงิน:</strong></td><td>' + data.transferDate + '</td></tr>';
  html += '<tr><td><strong>เวลาที่โอน:</strong></td><td>' + data.transferTime + '</td></tr>';
  const slipLink = data.slipUrl ? '<a href="' + data.slipUrl + '" target="_blank">ดูสลิป</a>' : '-';
  html += '<tr><td><strong>หลักฐานโอนเงิน:</strong></td><td>' + slipLink + '</td></tr>';
  html += '<tr><td><strong>สถานะ:</strong></td><td>' + data.status + '</td></tr>';
  html += '<tr><td><strong>เหตุผลไม่สำเร็จ:</strong></td><td>' + (data.reason || '-') + '</td></tr>';
  html += '<tr><td><strong>วิธีการรับเสื้อ:</strong></td><td>' + data.deliveryMethod + '</td></tr>';
  html += '<tr><td><strong>ที่อยู่:</strong></td><td>' + data.address + '</td></tr>';
  html += '<tr><td><strong>วันเกิด:</strong></td><td>' + data.birthDate + '</td></tr>';
  html += '<tr><td><strong>อายุ:</strong></td><td>' + data.age + ' ปี</td></tr>';
  html += '<tr><td><strong>ยอดการซื้อ:</strong></td><td>' + data.totalPrice + ' บาท</td></tr>';
  html += '</table>';

  document.getElementById('userDetailsContent').innerHTML = html;
  document.getElementById('userDetailsModal').style.display = 'block';
}

            function closeUserDetails() {
            document.getElementById('userDetailsModal').style.display = 'none';
            }

            window.onclick = function(event) {
            const modal = document.getElementById('userDetailsModal');
            if (event.target === modal) {
                modal.style.display = 'none';
            }
            };
            function setQuickDate(period) {
              const today = new Date();
              const startDateInput = document.getElementById('startDate');
              const endDateInput = document.getElementById('endDate');
              
              switch(period) {
                case 'today':
                  const todayStr = today.toISOString().split('T')[0];
                  startDateInput.value = todayStr;
                  endDateInput.value = todayStr;
                  break;
                case 'week':
                  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                  startDateInput.value = weekAgo.toISOString().split('T')[0];
                  endDateInput.value = today.toISOString().split('T')[0];
                  break;
                case 'month':
                  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                  startDateInput.value = firstDay.toISOString().split('T')[0];
                  endDateInput.value = lastDay.toISOString().split('T')[0];
                  break;
                case 'all':
                  startDateInput.value = '';
                  endDateInput.value = '';
                  break;
              }
              applyFilters();
            }
              function clearFilters() {
            document.getElementById('startDate').value = '';
            document.getElementById('endDate').value = '';
            document.getElementById('statusFilter').value = 'all';
            document.getElementById('searchInput').value = '';
            document.getElementById('pendingOnly').checked = false;
            
            // โหลดข้อมูลทั้งหมด
            google.script.run
              .withSuccessHandler(function(html) {
                document.getElementById('ordersTable').innerHTML = 
                  '<tr><th>ลำดับ</th><th>รหัสการซื้อ</th><th>ชื่อผู้แข่ง</th><th>นามสกุล</th><th>เพศ</th><th>วันที่โอนเงิน</th><th>เวลาที่โอน</th><th>ระยะทาง</th><th>วิธีการรับเสื้อ</th><th>ยอดการซื้อ (บาท)</th><th>หลักฐานโอนเงิน</th><th>สถานะ</th><th>Action</th></tr>' + html;
                document.getElementById('resultsInfo').innerHTML = '';
              })
              .getOrdersHtml();
          }
              function applyFilters() {
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            const status = document.getElementById('statusFilter').value;
            const searchTerm = document.getElementById('searchInput').value.trim();
            const pendingOnly = document.getElementById('pendingOnly').checked;
            
            const filters = {
              startDate: startDate,
              endDate: endDate,
              status: pendingOnly ? 'รอการตรวจสอบ' : status,
              searchTerm: searchTerm
            };
            
            google.script.run
              .withSuccessHandler(function(result) {
                document.getElementById('ordersTable').innerHTML = 
                  '<tr><th>ลำดับ</th><th>รหัสการซื้อ</th><th>ชื่อผู้แข่ง</th><th>นามสกุล</th><th>เพศ</th><th>วันที่โอนเงิน</th><th>เวลาที่โอน</th><th>ระยะทาง</th><th>วิธีการรับเสื้อ</th><th>ยอดการซื้อ (บาท)</th><th>หลักฐานโอนเงิน</th><th>สถานะ</th><th>Action</th></tr>' + result.html;
                document.getElementById('resultsInfo').innerHTML = result.info;
              })
              .withFailureHandler(function(error) {
                alert('เกิดข้อผิดพลาด: ' + error.message);
              })
              .getFilteredOrdersHtml(filters);
          }
          
          // ฟังก์ชันสำหรับ Clear Filters
          function clearFilters() {
            document.getElementById('startDate').value = '';
            document.getElementById('endDate').value = '';
            document.getElementById('statusFilter').value = 'all';
            document.getElementById('searchInput').value = '';
            document.getElementById('pendingOnly').checked = false;
            
            // โหลดข้อมูลทั้งหมด
            google.script.run
            .withSuccessHandler(function(html) {
              document.getElementById('ordersTable').innerHTML = 
                '<tr><th>ลำดับ</th><th>รหัสการซื้อ</th><th>ชื่อผู้แข่ง</th><th>นามสกุล</th><th>เพศ</th><th>วันที่โอนเงิน</th><th>เวลาที่โอน</th><th>ระยะทาง</th><th>วิธีการรับเสื้อ</th><th>ยอดการซื้อ (บาท)</th><th>หลักฐานโอนเงิน</th><th>สถานะ</th><th>Action</th></tr>' + html;
              document.getElementById('resultsInfo').innerHTML = '';
            })
            .getOrdersHtml();
          }
              document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('pendingOnly').addEventListener('change', function() {
              if (this.checked) {
                document.getElementById('statusFilter').value = 'รอการตรวจสอบ';
                document.getElementById('statusFilter').disabled = true;
              } else {
                document.getElementById('statusFilter').disabled = false;
              }
            });
          });
        </script>
      </body>
    </html>
  `).evaluate()
    .setTitle('ระบบจัดการคำสั่งซื้อ')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ดึงข้อมูลคำสั่งซื้อเป็น HTML
function getOrdersHtml() {
  try {
    const sheet = SpreadsheetApp.openById('1CmLJs8fOu5IFuW4dROJ2xfcVlrwcLZpoQSsqdb0W6UM').getSheetByName('Sheet1');
    if (!sheet) {
      return '<tr><td colspan="12">ไม่พบ Sheet ชื่อ Sheet1 กรุณาตรวจสอบชื่อ Sheet</td></tr>';
    }
    
    // เพิ่มการคำนวณยอดรวมเมื่อโหลดหน้าเว็บ
    updateTotalConfirmedAmount(sheet);
    
    // เพิ่มการอัปเดตลำดับในคอลัมน์ S
    updateSequenceNumbers(sheet);
    
    const data = sheet.getDataRange().getDisplayValues();
    if (data.length <= 1) {
      return '<tr><td colspan="13">ไม่มีข้อมูลคำสั่งซื้อ</td></tr>';
    }
    
    let html = '';
    for (let i = 1; i < data.length; i++) {
      const sequenceNumber = data[i][19] || i;  // T - ลำดับ (คอลัมน์ที่ 20, index 19)
      const orderId = data[i][1] || '-';        // B - รหัสการซื้อ
      const name = data[i][2] || '-';           // C - ชื่อผู้แข่ง
      const surname = data[i][3] || '-';        // D - นามสกุล
      const gender = data[i][4] || '-';         // E - เพศ
      const teamName = data[i][5] || '-';       // F - ชื่อทีม
      const ageGroup = data[i][6] || '-';       // G - ช่วงอายุที่ลงแข่ง
      const runningType = data[i][17] || '-';   // R - ประเภทวิ่ง (เปลี่ยนจาก distance = data[i][7])
      const distance = data[i][7] || '-';       // H - ระยะทาง
      const size = data[i][8] || '-';           // I - ไซ์เสื้อ
      const phone = data[i][9] || '-';          // J - เบอร์โทร
      const transferDate = data[i][10] || '-';  // K - วันที่โอนเงิน
      const transferTime = data[i][11] || '-';  // L - เวลาที่โอน
      const slipUrl = data[i][12] || '';        // M - หลักฐานการโอน
      const status = data[i][13] || 'รอการตรวจสอบ'; // N - สถานะ
      const deliveryMethod = data[i][14] || '-'; // O - วิธีการรับเสื้อ
      const address = data[i][15] || '-';       // P - ที่อยู่
      const birthDate = data[i][16] || '-';     // Q - วันเกิด
      const reason = data[i][18] || '-';        // S - เหตุผลไม่สำเร็จ
      
      const isPending = status === 'รอการตรวจสอบ';
      
      // คำนวณอายุจากปีเกิด (วิธีใหม่)
      const age = calculateAgeFromBirthYear(birthDate);
      
      // คำนวณยอดการซื้อจากประเภทวิ่ง (แก้ไขจาก distance เป็น runningType)
      let totalPrice = 0;
      if (runningType) {
        if (runningType.toLowerCase().includes('vip')) {
          totalPrice = 1000;
        } else if (runningType.toLowerCase().includes('ประชาชนทั่วไป')) {
          totalPrice = 500;
        }
      }
        
        // แก้ไขการแสดงผลวิธีการรับเสื้อ
        let displayDeliveryMethod = deliveryMethod;
        if (deliveryMethod) {
          if (deliveryMethod.includes('walk in') || deliveryMethod.includes('Walk in') || deliveryMethod.includes('โรงเรียนาวรานุกูล')) {
            displayDeliveryMethod = 'walk in';
          } else if (deliveryMethod.includes('จัดส่ง') || deliveryMethod.includes('พัสดุ')) {
            displayDeliveryMethod = 'จัดส่ง';
            // เพิ่มค่าจัดส่ง 60 บาท
            totalPrice += 60;
          }
        }
      
      // สร้างลิงก์สำหรับรูปภาพสลิป
      const slipLink = slipUrl ? `<a href="${slipUrl}" target="_blank">ดูสลิป</a>` : '-';
      
      // เก็บข้อมูลทั้งหมดสำหรับ modal
      const allData = JSON.stringify({
        columnA: data[i][0] || '-',           // A - เวลากรอกฟอร์ม
        orderId: orderId,                     // B - รหัสการซื้อ
        name: name,                           // C - ชื่อผู้แข่ง
        surname: surname,                     // D - นามสกุล
        gender: gender,                       // E - เพศ
        teamName: teamName,                   // F - ชื่อทีม
        ageGroup: ageGroup,                   // G - ช่วงอายุที่ลงแข่ง
        distance: distance,                   // H - ระยะทาง
        runningType: runningType,             // R - ประเภทวิ่ง
        size: size,                           // I - ไซ์เสื้อ
        phone: phone,                         // J - เบอร์โทร
        transferDate: transferDate,           // K - วันที่โอนเงิน
        transferTime: transferTime,           // L - เวลาที่โอน
        slipUrl: slipUrl,                     // M - หลักฐานการโอน
        status: status,                       // N - สถานะ
        deliveryMethod: deliveryMethod,       // O - วิธีการรับเสื้อ
        address: address,                     // P - ที่อยู่
        birthDate: birthDate,                 // Q - วันเกิด
        age: age,                             // คำนวณจากวันเกิด
        totalPrice: totalPrice,               // คำนวณจากระยะทางและการจัดส่ง
        reason: reason
      }).replace(/'/g, "&#39;");
      
      html += `
        <tr>
          <td>${sequenceNumber}</td>
          <td>${orderId}</td>
          <td>
            <a href="javascript:void(0)"
                data-user='${allData}'
                onclick="showUserDetailsFromAttr(this)"
                style="text-decoration: underline; cursor: pointer;">
                ${name}
            </a>
          </td>
          <td>${surname}</td>
                    <td>${gender}</td>
                    <td>${transferDate}</td>
                    <td>${transferTime}</td>
                    <td>${runningType}</td>
                    <td>${displayDeliveryMethod}</td>
          <td>${totalPrice}</td>
          <td>${slipLink}</td>
          <td>${status}</td>
          <td>
            <button class="confirm" onclick="confirmOrder(${i})" ${isPending ? '' : 'disabled'}>ยืนยัน</button>
            <button class="cancel" onclick="cancelOrder(${i})" ${isPending ? 'disabled' : ''}>ยกเลิกยืนยัน</button>
            <button class="unsuccessful" onclick="window.markUnsuccessful(${i})" ${isPending ? '' : 'disabled'}>ไม่สำเร็จ</button>
          </td>
        </tr>
      `;
    }
    return html;
  } catch (error) {
    return `<tr><td colspan="13">เกิดข้อผิดพลาด: ${error.message}</td></tr>`;
  }
}

function markUnsuccessful(rowIndex) {
  const reason = prompt('กรุณากรอกเหตุผลที่ไม่ผ่าน');
  if (reason && confirm('ยืนยันการทำเครื่องหมายไม่สำเร็จด้วยเหตุผล: ' + reason)) {
    google.script.run
      .withSuccessHandler(() => {
        alert('บันทึกเหตุผลเรียบร้อย');
        // แทนที่ location.reload() ด้วยการโหลดข้อมูลใหม่
        google.script.run
          .withSuccessHandler(function(html) {
            document.getElementById('ordersTable').innerHTML = 
              '<tr><th>ลำดับ</th><th>รหัสการซื้อ</th><th>ชื่อผู้แข่ง</th><th>นามสกุล</th><th>เพศ</th><th>วันที่โอนเงิน</th><th>เวลาที่โอน</th><th>ระยะทาง</th><th>วิธีการรับเสื้อ</th><th>ยอดการซื้อ (บาท)</th><th>หลักฐานโอนเงิน</th><th>สถานะ</th><th>Action</th></tr>' + html;
          })
          .getOrdersHtml();
      })
      .withFailureHandler((error) => alert('เกิดข้อผิดพลาด: ' + error.message))
      .markOrderUnsuccessful(rowIndex, reason);
  }
}

// ตรวจสอบสถานะคำสั่งซื้อ
function getOrderStatus(orderId) {
  try {
    const sheet = SpreadsheetApp.openById('1CmLJs8fOu5IFuW4dROJ2xfcVlrwcLZpoQSsqdb0W6UM').getSheetByName('Sheet1');
    if (!sheet) {
      return 'ไม่พบ Sheet ชื่อ Sheet1 กรุณาตรวจสอบชื่อ Sheet';
    }
    const data = sheet.getDataRange().getDisplayValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] == orderId) {
        const name = data[i][2] || '-';
        const surname = data[i][3] || '-';
        const gender = data[i][4] || '-';
        const teamName = data[i][5] || '-';
        const ageGroup = data[i][6] || '-';
        const distance = data[i][7] || '-';
        const size = data[i][8] || '-';
        const phone = data[i][9] || '-';
        const transferDate = data[i][10] || '-';
        const transferTime = data[i][11] || '-';
        const slipUrl = data[i][12] || '';
        const status = data[i][13] || 'รอการตรวจสอบ';
        const deliveryMethod = data[i][14] || '-';
        const address = data[i][15] || '-';
        const birthDate = data[i][16] || '-';
        
        // คำนวณอายุจากปีเกิด (วิธีใหม่)
        const age = calculateAgeFromBirthYear(birthDate);
        
        // คำนวณยอดการซื้อจากประเภทวิ่ง (แก้ไขจาก distance เป็น runningType)
        let totalPrice = 0;
        if (runningType) {
          if (runningType.toLowerCase().includes('vip')) {
            totalPrice = 1000;
          } else if (runningType.toLowerCase().includes('ประชาชนทั่วไป')) {
            totalPrice = 500;
          }
        }
        
        // ค่าจัดส่ง
        if (deliveryMethod && deliveryMethod.includes('จัดส่ง')) {
          totalPrice += 60;
        }
        
        const slipLink = slipUrl ? `<a href="${slipUrl}" target="_blank">ดูสลิป</a>` : '-';
        
        return `
          <style>
          .order-details {
            background-color: #fff;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 15px;
            margin-top: 20px;
          }
          .order-details h3 {
            margin-top: 0;
            color: #4CAF50;
          }
          .order-details table {
            width: 100%;
            border-collapse: collapse;
          }
          .order-details td {
            padding: 8px;
            border-bottom: 1px solid #eee;
          }
          .order-details tr:last-child td {
            border-bottom: none;
          }
          </style>
          <div class="order-details">
          <table>
            <tr><td><strong>เวลากรอกฟอร์ม:</strong></td><td>${data[i][0] || '-'}</td></tr>
            <tr><td><strong>รหัสการซื้อ:</strong></td><td>${orderId}</td></tr>
            <tr><td><strong>ชื่อผู้แข่ง:</strong></td><td>${name}</td></tr>
            <tr><td><strong>นามสกุล:</strong></td><td>${surname}</td></tr>
            <tr><td><strong>เพศ:</strong></td><td>${gender}</td></tr>
            <tr><td><strong>ชื่อทีม:</strong></td><td>${teamName}</td></tr>
            <tr><td><strong>ช่วงอายุที่ลงแข่ง:</strong></td><td>${ageGroup}</td></tr>
            <tr><td><strong>ระยะทาง:</strong></td><td>${formatDistance(distance)}</td></tr>
            <tr><td><strong>ประเภทวิ่ง:</strong></td><td>${runningType}</td></tr>
            <tr><td><strong>ไซ์เสื้อ:</strong></td><td>${size}</td></tr>
            <tr><td><strong>เบอร์โทร:</strong></td><td>${phone}</td></tr>
            <tr><td><strong>วันที่โอนเงิน:</strong></td><td>${transferDate}</td></tr>
            <tr><td><strong>เวลาที่โอน:</strong></td><td>${transferTime}</td></tr>
            <tr><td><strong>หลักฐานโอนเงิน:</strong></td><td>${slipLink}</td></tr>
            <tr><td><strong>สถานะ:</strong></td><td>${status}</td></tr>
            <tr><td><strong>วิธีการรับเสื้อ:</strong></td><td>${deliveryMethod}</td></tr>
            <tr><td><strong>ที่อยู่:</strong></td><td>${address}</td></tr>
            <tr><td><strong>วันเกิด:</strong></td><td>${birthDate}</td></tr>
            <tr><td><strong>อายุ:</strong></td><td>${age} ปี</td></tr>
            <tr><td><strong>ยอดการซื้อ:</strong></td><td>${totalPrice} บาท</td></tr>
          </table>
          </div>
        `;
      }
    }
    return 'ไม่พบคำสั่งซื้อสำหรับรหัส: ' + orderId;
  } catch (error) {
    throw new Error('ไม่สามารถดึงข้อมูลได้: ' + error.message);
  }
}

// ยืนยอด
function confirmOrder(rowIndex) {
  try {
    const sheet = SpreadsheetApp.openById('1CmLJs8fOu5IFuW4dROJ2xfcVlrwcLZpoQSsqdb0W6UM').getSheetByName('Sheet1');
    if (!sheet) {
      throw new Error('ไม่พบ Sheet ชื่อ Sheet1 กรุณาตรวจสอบชื่อ Sheet');
    }
    const data = sheet.getDataRange().getValues();
    if (rowIndex >= 1 && rowIndex < data.length) {
      // อัปเดตสถานะเป็น 'การสมัครเสร็จสิ้น'
      sheet.getRange(rowIndex + 1, 14).setValue('การสมัครเสร็จสิ้น'); // คอลัมน์ N
      
      // คำนวณยอดการซื้อและบันทึกลงคอลัมน์ Y (คอลัมน์ที่ 25)
      const runningType = data[rowIndex][17]; // คอลัมน์ R - ประเภทวิ่ง
      const deliveryMethod = data[rowIndex][14]; // คอลัมน์ O - วิธีการรับเสื้อ
      
      let totalPrice = 0;
      if (runningType) {
        if (runningType.toString().toLowerCase().includes('vip')) {
          totalPrice = 1000;
        } else if (runningType.toString().toLowerCase().includes('ประชาชนทั่วไป')) {
          totalPrice = 500;
        }
      }
      
      // เพิ่มค่าจัดส่งถ้ามี
      if (deliveryMethod && deliveryMethod.toString().includes('จัดส่ง')) {
        totalPrice += 60;
      }
      
      // บันทึกยอดการซื้อลงคอลัมน์ Y (คอลัมน์ที่ 25)
      sheet.getRange(rowIndex + 1, 25).setValue(totalPrice);
      
      // เพิ่มการประมวลผลข้อมูล U & V
      try {
        processExistingDataForUV();
        Logger.log('ประมวลผลข้อมูล U & V เสร็จสิ้น');
      } catch (uvError) {
        Logger.log('เกิดข้อผิดพลาดในการประมวลผล U & V: ' + uvError.message);
      }
      
      // เพิ่มการเรียก updateTotalConfirmedAmount กลับมา
      updateTotalConfirmedAmount(sheet);
      
      // อัปเดตลำดับหลังจากยืนยัน
      updateSequenceNumbers(sheet);
      
      Logger.log(`Updated row ${rowIndex + 1} to 'การสมัครเสร็จสิ้น' and saved amount ${totalPrice} to column Y`);
    } else {
      throw new Error('แถวที่ระบุไม่ถูกต้อง');
    }
    
    return 'ยืนยันคำสั่งซื้อเรียบร้อยแล้ว';
  } catch (error) {
    throw new Error('เกิดข้อผิดพลาดในการยืนยันคำสั่งซื้อ: ' + error.message);
  }
}

// ยกเลิกยืนยัน
function cancelOrder(rowIndex) {
  try {
    const sheet = SpreadsheetApp.openById('1CmLJs8fOu5IFuW4dROJ2xfcVlrwcLZpoQSsqdb0W6UM').getSheetByName('Sheet1');
    if (!sheet) {
      throw new Error('ไม่พบ Sheet ชื่อ Sheet1 กรุณาตรวจสอบชื่อ Sheet');
    }
    const data = sheet.getDataRange().getValues();
    if (rowIndex >= 1 && rowIndex < data.length) {
      // อัปเดตสถานะเป็น 'รอการตรวจสอบ'
      sheet.getRange(rowIndex + 1, 14).setValue('รอการตรวจสอบ'); // คอลัมน์ N
      
      // ลบยอดการซื้อจากคอลัมน์ Y (คอลัมน์ที่ 25)
      sheet.getRange(rowIndex + 1, 25).setValue('');
      
      // เพิ่มการเรียก updateTotalConfirmedAmount กลับมา
      updateTotalConfirmedAmount(sheet);
      
      // อัปเดตลำดับหลังจากยกเลิก
      updateSequenceNumbers(sheet);
      
      Logger.log(`Updated row ${rowIndex + 1} to 'รอการตรวจสอบ' and cleared amount from column Y`);
    } else {
      throw new Error('แถวที่ระบุไม่ถูกต้อง');
    }
    
    return 'ยกเลิกการยืนยันเรียบร้อยแล้ว';
  } catch (error) {
    throw new Error('เกิดข้อผิดพลาดในการยกเลิกการยืนยัน: ' + error.message);
  }
}

// ฟังก์ชันใหม่สำหรับอัปเดตผลรวมยอดที่ยืนยันแล้ว
function updateTotalConfirmedAmount(sheet) {
  try {
    // ดึงข้อมูลจากคอลัมน์ Y (ยอดการซื้อที่ยืนยันแล้ว)
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const confirmedAmounts = sheet.getRange(2, 25, lastRow - 1, 1).getValues(); // คอลัมน์ Y จากแถว 2 ถึงแถวสุดท้าย
      
      // คำนวณผลรวม
      let totalConfirmed = 0;
      for (let i = 0; i < confirmedAmounts.length; i++) {
        const amount = confirmedAmounts[i][0];
        if (amount && typeof amount === 'number') {
          totalConfirmed += amount;
        }
      }
      
      // บันทึกผลรวมลงคอลัมน์ Z แถวที่ 2 (คอลัมน์ที่ 26)
      sheet.getRange(2, 26).setValue(totalConfirmed);
      
      // เพิ่มหัวข้อในคอลัมน์ Y และ Z แถวที่ 1 ถ้ายังไม่มี
      const headerY = sheet.getRange(1, 25).getValue();
      const headerZ = sheet.getRange(1, 26).getValue();
      
      if (!headerY || headerY.toString().trim() === '') {
        sheet.getRange(1, 25).setValue('ยอดยืนยันแล้ว (บาท)');
      }
      
      if (!headerZ || headerZ.toString().trim() === '' || typeof headerZ === 'number') {
        sheet.getRange(1, 26).setValue('ยอดยืนยัน');
      }
      
      Logger.log(`Updated total confirmed amount: ${totalConfirmed} บาท`);
    }
  } catch (error) {
    Logger.log('Error updating total confirmed amount: ' + error.message);
  }
}

// เพิ่มฟังก์ชันใหม่หลังจาก updateTotalConfirmedAmount
function updateSequenceNumbers(sheet) {
  try {
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      // เพิ่มหัวข้อในคอลัมน์ T แถวที่ 1 ถ้ายังไม่มี
      const headerT = sheet.getRange(1, 20).getValue(); // คอลัมน์ T = 20
      if (!headerT || headerT.toString().trim() === '') {
        sheet.getRange(1, 20).setValue('ลำดับ');
      }
      
      // เขียนลำดับจาก 1 ถึง n ในคอลัมน์ T
      const sequenceData = [];
      for (let i = 1; i <= lastRow - 1; i++) {
        sequenceData.push([i]);
      }
      
      if (sequenceData.length > 0) {
        sheet.getRange(2, 20, sequenceData.length, 1).setValues(sequenceData);
      }
      
      Logger.log(`Updated sequence numbers for ${sequenceData.length} rows`);
    }
  } catch (error) {
    Logger.log('Error updating sequence numbers: ' + error.message);
  }
}

// ฟังก์ชันสร้างหน้าปริ้นจ่าหน้าซอง
function generateShippingLabels() {
  try {
    const sheet = SpreadsheetApp.openById('1CmLJs8fOu5IFuW4dROJ2xfcVlrwcLZpoQSsqdb0W6UM').getSheetByName('Sheet1');
    if (!sheet) {
      return { success: false, message: 'ไม่พบ Sheet ชื่อ Sheet1' };
    }
    
    const data = sheet.getDataRange().getValues();
    const shippingOrders = [];
    
    // กรองข้อมูลเฉพาะคนที่เลือกจัดส่งพัสดุ
    for (let i = 1; i < data.length; i++) {
      const deliveryMethod = data[i][14] || ''; // คอลัมน์ O - วิธีการรับเสื้อ
      const status = data[i][13] || ''; // คอลัมน์ N - สถานะ
      
      // เช็คว่าเป็นการจัดส่งและสถานะเป็นการสมัครเสร็จสิ้น
      if (deliveryMethod.includes('จัดส่ง') && status === 'การสมัครเสร็จสิ้น') {
        shippingOrders.push({
          orderId: data[i][1] || '-',     // คอลัมน์ B - รหัสสั่งซื้อ
          name: data[i][2] || '-',        // คอลัมน์ C - ชื่อ
          surname: data[i][3] || '-',     // คอลัมน์ D - นามสกุล
          address: data[i][15] || '-',    // คอลัมน์ P - ที่อยู่
          phone: data[i][9] || '-'        // คอลัมน์ J - เบอร์โทร
        });
      }
    }
    
    if (shippingOrders.length === 0) {
      return { success: false, message: 'ไม่พบข้อมูลการจัดส่งพัสดุที่เสร็จสิ้นแล้ว' };
    }
    
    // สร้าง HTML สำหรับปริ้น
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>จ่าหน้าซองพัสดุ</title>
        <style>
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            font-family: 'Sarabun', Arial, sans-serif;
            margin: 0;
            padding: 0;
            font-size: 12px;
          }
          .page {
            width: 100%;
            height: 100vh;
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: repeat(5, 1fr);
            gap: 5mm;
            page-break-after: always;
          }
          .page:last-child {
            page-break-after: avoid;
          }
          .label {
            border: 2px solid #000;
            padding: 8px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: white;
          }
          .header {
            text-align: center;
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 8px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 4px;
          }
          .recipient {
            flex-grow: 1;
          }
          .field {
            margin-bottom: 4px;
            line-height: 1.3;
          }
          .field strong {
            display: inline-block;
            width: 60px;
            font-weight: bold;
          }
          .address {
            margin-top: 6px;
            padding: 4px;
            border: 1px solid #ddd;
            background: #f9f9f9;
            min-height: 40px;
            word-wrap: break-word;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
    `;
    
    // แบ่งข้อมูลเป็นหน้าๆ ละ 10 คน
    const itemsPerPage = 10;
    const totalPages = Math.ceil(shippingOrders.length / itemsPerPage);
    
    for (let page = 0; page < totalPages; page++) {
      html += '<div class="page">';
      
      const startIndex = page * itemsPerPage;
      const endIndex = Math.min(startIndex + itemsPerPage, shippingOrders.length);
      
      for (let i = startIndex; i < endIndex; i++) {
        const order = shippingOrders[i];
        html += `
          <div class="label">
            <div class="header">จ่าหน้าซองพัสดุ</div>
            <div class="recipient">
              <div class="field"><strong>รหัสการซื้อ:</strong> ${order.orderId}</div>
              <div class="field"><strong>ชื่อ:</strong> ${order.name} ${order.surname}</div>
              <div class="field"><strong>โทร:</strong> ${order.phone}</div>
              <div class="address">
                <strong>ที่อยู่:</strong><br>
                ${order.address}
              </div>
            </div>
          </div>
        `;
      }
      
      // เติมช่องว่างถ้าหน้าสุดท้ายมีข้อมูลไม่ครบ 10 คน
      const remainingSlots = itemsPerPage - (endIndex - startIndex);
      for (let j = 0; j < remainingSlots; j++) {
        html += '<div class="label" style="border: 1px dashed #ccc; background: #f5f5f5;"></div>';
      }
      
      html += '</div>';
    }
    
    html += `
        <script>
          window.onload = function() {
            // แสดงข้อมูลสถิติ
            console.log('จำนวนรายการจัดส่ง: ${shippingOrders.length} คน');
            console.log('จำนวนหน้าที่จะปริ้น: ${totalPages} หน้า');
          };
        </script>
      </body>
      </html>
    `;
    
    return {
      success: true,
      html: html,
      totalItems: shippingOrders.length,
      totalPages: totalPages
    };
    
  } catch (error) {
    return { success: false, message: 'เกิดข้อผิดพลาด: ' + error.message };
  }
}

// ฟังก์ชันทดสอบการเข้าถึง Sheet
function testSheetAccess() {
  const sheet = SpreadsheetApp.openById('1CmLJs8fOu5IFuW4dROJ2xfcVlrwcLZpoQSsqdb0W6UM').getSheetByName('Sheet1');
  Logger.log(sheet ? 'Sheet found: ' + sheet.getName() : 'Sheet not found');
}

function testDistanceLog() {
  Logger.log('=== Testing Distance Log ===');
  const sheet = SpreadsheetApp.openById('1CmLJs8fOu5IFuW4dROJ2xfcVlrwcLZpoQSsqdb0W6UM').getSheetByName('Sheet1');
  const data = sheet.getDataRange().getValues();
  
  Logger.log('Total rows:', data.length);
  
  // ทดสอบ 3 แถวแรก
  for (let i = 1; i < Math.min(4, data.length); i++) {
    const distance = data[i][7]; // คอลัมน์ H
    Logger.log(`Row ${i} - Column H (Distance):`, distance);
    Logger.log(`Row ${i} - Type:`, typeof distance);
    Logger.log(`Row ${i} - formatDistance result:`, formatDistance(distance));
    Logger.log('---');
  }
}

// ค้นหาข้อมูลคำสั่งซื้อ
function searchOrdersHtml(searchTerm) {
  try {
    const sheet = SpreadsheetApp.openById('1CmLJs8fOu5IFuW4dROJ2xfcVlrwcLZpoQSsqdb0W6UM').getSheetByName('Sheet1');
    if (!sheet) {
      return '<tr><td colspan="10">ไม่พบ Sheet ชื่อ Sheet1 กรุณาตรวจสอบชื่อ Sheet</td></tr>';
    }
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return '<tr><td colspan="10">ไม่มีข้อมูลคำสั่งซื้อ</td></tr>';
    }
    
    searchTerm = searchTerm.toLowerCase().trim();
    let html = '';
    let found = false;
    
    for (let i = 1; i < data.length; i++) {
      const orderId = (data[i][1] || '-').toString().toLowerCase(); // คอลัมน์ B
      const name = (data[i][2] || '-').toString().toLowerCase();   // คอลัมน์ C
      const surname = (data[i][3] || '-').toString().toLowerCase(); // คอลัมน์ D
      const phone = (data[i][9] || '-').toString().toLowerCase();  // คอลัมน์ J
      const fullName = name + ' ' + surname;
      
      // แยกคำค้นหาเป็นคำย่อยๆ เพื่อค้นหาแบบบางส่วน
      const searchTerms = searchTerm.split(' ').filter(term => term.length > 0);
      let isMatch = false;
      
      // ถ้าไม่มีการแยกคำ ให้ค้นหาแบบปกติ
      if (searchTerms.length <= 1) {
        isMatch = orderId.includes(searchTerm) || 
                 name.includes(searchTerm) || 
                 surname.includes(searchTerm) || 
                 phone.includes(searchTerm) ||
                 fullName.includes(searchTerm);
      } else {
        // ถ้ามีหลายคำ ต้องตรงกับทุกคำที่ค้นหา
        isMatch = searchTerms.every(term => {
          return orderId.includes(term) || 
                 name.includes(term) || 
                 surname.includes(term) || 
                 phone.includes(term) ||
                 fullName.includes(term);
        });
      }
      
      if (isMatch) {
        found = true;
        const gender = data[i][4] || '-'; // คอลัมน์ E
        const distance = data[i][7] || '-'; // คอลัมน์ H
        const size = data[i][8] || '-';   // คอลัมน์ I
        const slipUrl = data[i][12] || ''; // คอลัมน์ M
        const status = data[i][13] || 'รอการตรวจสอบ'; // คอลัมน์ N
        const isPending = status === 'รอการตรวจสอบ';
        
        // สร้างลิงก์สำหรับรูปภาพสลิป
        const slipLink = slipUrl ? `<a href="${slipUrl}" target="_blank">ดูสลิป</a>` : '-';
        
        html += `
          <tr>
            <td>${data[i][1] || '-'}</td>
            <td>${data[i][2] || '-'}</td>
            <td>${data[i][3] || '-'}</td>
            <td>${gender}</td>
            <td>${formatDistance(distance)}</td>
            <td>${size}</td>
            <td>${phone}</td>
            <td>${slipLink}</td>
            <td>${status}</td>
            <td>
              <button class="confirm" onclick="confirmOrder(${i})" ${isPending ? '' : 'disabled'}>ยืนยัน</button>
            <button class="cancel" onclick="cancelOrder(${i})" ${isPending ? 'disabled' : ''}>ยกเลิกยืนยัน</button>
              <button class="unsuccessful" onclick="window.markUnsuccessful(${i})" ${isPending ? '' : 'disabled'}>ไม่สำเร็จ</button>
            </td>
          </tr>
        `;
      }
    }
    
    if (!found) {
      return '<tr><td colspan="13">ไม่พบข้อมูลที่ตรงกับคำค้นหา</td></tr>';
    }
    
    return html;
  } catch (error) {
    return `<tr><td colspan="13">เกิดข้อผิดพลาด: ${error.message}</td></tr>`;
  }
}





// เพิ่มฟังก์ชันใหม่สำหรับจัดการกรณีวันเดียวกัน
function filterBySingleDate(data, targetDate) {
  const filteredData = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const transferDate = row[10]; // คอลัมน์ K - วันที่โอนเงิน
    const rowDate = extractDateFromTimestamp(transferDate);
    
    if (rowDate === targetDate) {
      filteredData.push({index: i, data: row});
    }
  }
  
  return filteredData;
}

function getFilteredOrdersHtml(filters) {
            try {
              const sheet = SpreadsheetApp.openById('1CmLJs8fOu5IFuW4dROJ2xfcVlrwcLZpoQSsqdb0W6UM').getSheetByName('Sheet1');
              if (!sheet) {
                return {
                html: '<tr><td colspan="13">ไม่พบ Sheet ชื่อ Sheet1 กรุณาตรวจสอบชื่อ Sheet</td></tr>',
                info: ''
              };
              }
              
              const data = sheet.getDataRange().getDisplayValues();
              if (data.length <= 1) {
                return {
                  html: '<tr><td colspan="13">ไม่มีข้อมูลคำสั่งซื้อ</td></tr>',
                  info: ''
                };
              }
              
              let filteredData = [];
              const searchTerm = (filters.searchTerm || '').toLowerCase().trim();
              
              // ตรวจสอบว่าเป็นการค้นหาวันเดียวกันหรือไม่
              const isSingleDateSearch = filters.startDate && filters.endDate && filters.startDate === filters.endDate;
              
              if (isSingleDateSearch) {
                // ใช้ฟังก์ชันใหม่สำหรับวันเดียวกัน
                filteredData = filterBySingleDate(data, filters.startDate);
                
                // กรองตามสถานะและคำค้นหา
                filteredData = filteredData.filter(item => {
                  const row = item.data;
                  const orderId = (row[1] || '').toString().toLowerCase();
                  const name = (row[2] || '').toString().toLowerCase();
                  const surname = (row[3] || '').toString().toLowerCase();
                  const phone = (row[9] || '').toString().toLowerCase();
                  const status = row[13] || 'รอการตรวจสอบ';
                  
                  // Filter ตามสถานะ
                  let statusMatch = true;
                  if (filters.status && filters.status !== 'all') {
                    statusMatch = status === filters.status;
                  }
                  
                  // Filter ตามคำค้นหา
                  let searchMatch = true;
                  if (searchTerm) {
                    const fullName = name + ' ' + surname;
                    searchMatch = orderId.includes(searchTerm) || 
                                 name.includes(searchTerm) || 
                                 surname.includes(searchTerm) || 
                                 phone.includes(searchTerm) ||
                                 fullName.includes(searchTerm);
                  }
                  
                  return statusMatch && searchMatch;
                });
              } else {
                // ใช้ฟังก์ชันเดิมสำหรับช่วงวันที่
                for (let i = 1; i < data.length; i++) {
                  const row = data[i];
                  const timestamp = row[0] || ''; // คอลัมน์ A - เวลากรอกฟอร์ม
                  const orderId = (row[1] || '').toString().toLowerCase();
                  const name = (row[2] || '').toString().toLowerCase();
                  const surname = (row[3] || '').toString().toLowerCase();
                  const phone = (row[9] || '').toString().toLowerCase();
                  const status = row[13] || 'รอการตรวจสอบ';
                  const transferDate = row[10] || ''; // คอลัมน์ K - วันที่โอนเงิน
                  
                  // Filter ตามวันที่โอนเงิน
                  let dateMatch = true;
                  if (filters.startDate || filters.endDate) {
                    const rowDate = extractDateFromTimestamp(transferDate);
                    
                    if (rowDate) {
                      const startMatch = !filters.startDate || rowDate >= filters.startDate;
                      const endMatch = !filters.endDate || rowDate <= filters.endDate;
                      dateMatch = startMatch && endMatch;
                    } else {
                      dateMatch = false;
                    }
                  }
                  
                  // Filter ตามสถานะ
                  let statusMatch = true;
                  if (filters.status && filters.status !== 'all') {
                    statusMatch = status === filters.status;
                  }
                  
                  // Filter ตามคำค้นหา
                  let searchMatch = true;
                  if (searchTerm) {
                    const fullName = name + ' ' + surname;
                    searchMatch = orderId.includes(searchTerm) || 
                                 name.includes(searchTerm) || 
                                 surname.includes(searchTerm) || 
                                 phone.includes(searchTerm) ||
                                 fullName.includes(searchTerm);
                  }
                  
                  if (dateMatch && statusMatch && searchMatch) {
                    filteredData.push({index: i, data: row});
                  }
                }
              }
              
              // สร้าง HTML
              let html = '';
              for (let item of filteredData) {
                const i = item.index;
                const row = item.data;
                
                const orderId = row[1] || '-';
                const name = row[2] || '-';
                const surname = row[3] || '-';
                const gender = row[4] || '-';
                const ageGroup = row[6] || '-';       // G - ช่วงอายุที่ลงแข่ง
                const distance = row[7] || '-';       // H - ระยะทาง
                const runningType = row[17] || '-';   // R - ประเภทวิ่ง
                const size = row[8] || '-';
                const phone = row[9] || '-';
                const transferDate = row[10] || '-';
                const transferTime = row[11] || '-';
                const slipUrl = row[12] || '';
                const status = row[13] || 'รอการตรวจสอบ';
                const deliveryMethod = row[14] || '-'; // O - วิธีการรับเสื้อ
                const birthDate = row[16] || '-';     // Q - วันเกิด
                const reason = row[17] || '-';        // R - เหตุผลไม่สำเร็จ
                const isPending = status === 'รอการตรวจสอบ';
                
                // คำนวณอายุจากปีเกิด (วิธีใหม่)
                const age = calculateAgeFromBirthYear(birthDate);
                
                // แก้ไขการแสดงผลวิธีการรับเสื้อ
                let displayDeliveryMethod = deliveryMethod;
                if (deliveryMethod) {
                  if (deliveryMethod.includes('walk in') || deliveryMethod.includes('Walk in') || deliveryMethod.includes('โรงเรียนาวรานุกูล')) {
                    displayDeliveryMethod = 'walk in';
                  } else if (deliveryMethod.includes('จัดส่ง') || deliveryMethod.includes('พัสดุ')) {
                    displayDeliveryMethod = 'จัดส่ง';
                  }
                }
                
                // คำนวณยอดการซื้อจากประเภทวิ่ง (แก้ไขจาก distance เป็น runningType)
                let totalPrice = 0;
                  if (runningType) {
                    if (runningType.toLowerCase().includes('vip')) {
                      totalPrice = 1000;
                    } else if (runningType.toLowerCase().includes('ประชาชนทั่วไป')) {
                      totalPrice = 500;
                    }
                  }
                if (deliveryMethod && deliveryMethod.includes('จัดส่ง')) {
                  totalPrice += 60;
                }
                
                const slipLink = slipUrl ? `<a href="${slipUrl}" target="_blank">ดูสลิป</a>` : '-';
                
                // เก็บข้อมูลทั้งหมดสำหรับ modal
                const sequenceNumber = row[19] || i; // T - ลำดับ (คอลัมน์ที่ 20, index 19)
                
                const allData = JSON.stringify({
                  columnA: row[0] || '-',
                  orderId: orderId,
                  name: name,
                  surname: surname,
                  gender: gender,
                  teamName: row[5] || '-',
                  ageGroup: ageGroup,
                  distance: distance,
                  runningType: runningType,
                  size: size,
                  phone: phone,
                  transferDate: transferDate,
                  transferTime: transferTime,
                  slipUrl: slipUrl,
                  status: status,
                  deliveryMethod: deliveryMethod,
                  address: row[15] || '-',
                  birthDate: birthDate,
                  age: age,
                  totalPrice: totalPrice,
                  reason: reason
                }).replace(/'/g, "&#39;");
                
                html += `
                  <tr>
                    <td>${sequenceNumber}</td>
                    <td>${orderId}</td>
                    <td>
                      <a href="javascript:void(0)"
                          data-user='${allData}'
                          onclick="showUserDetailsFromAttr(this)"
                          style="text-decoration: underline; cursor: pointer;">
                          ${name}
                      </a>
                    </td>
                    <td>${surname}</td>
                    <td>${gender}</td>
                    <td>${transferDate}</td>
                    <td>${transferTime}</td>
                    <td>${runningType}</td>
                    <td>${displayDeliveryMethod}</td>
                    <td>${totalPrice}</td>
                    <td>${slipLink}</td>
                    <td>${status}</td>
                    <td>
                      <button class="confirm" onclick="confirmOrder(${i})" ${isPending ? '' : 'disabled'}>ยืนยัน</button>
            <button class="cancel" onclick="cancelOrder(${i})" ${isPending ? 'disabled' : ''}>ยกเลิกยืนยัน</button>
                      <button class="unsuccessful" onclick="window.markUnsuccessful(${i})" ${isPending ? '' : 'disabled'}>ไม่สำเร็จ</button>
                    </td>
                  </tr>
                `;
              }
              
              if (filteredData.length === 0) {
                html = '<tr><td colspan="13">ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา</td></tr>';
              }
              
              // สร้างข้อมูลสถิติ
              const totalOrders = data.length - 1;
              const filteredCount = filteredData.length;
              const pendingCount = filteredData.filter(item => item.data[13] === 'รอการตรวจสอบ').length;
              const completedCount = filteredData.filter(item => item.data[13] === 'การสมัครเสร็จสิ้น').length;
              
              let info = `แสดง ${filteredCount} จาก ${totalOrders} รายการ`;
              if (filteredCount > 0) {
                info += ` (รอตรวจสอบ: ${pendingCount}, เสร็จสิ้น: ${completedCount})`;
              }
              
              return {
                html: html,
                info: info
              };
              
            } catch (error) {
              return {
                html: `<tr><td colspan="13">เกิดข้อผิดพลาด: ${error.message}</td></tr>`,
                info: ''
              };
            }
          }
          
          // ฟังก์ชันช่วยสำหรับแยกวันที่จาก timestamp
          function extractDateFromTimestamp(timestamp) {
            if (!timestamp) {
              return null;
            }
            
            try {
              let date;
              
              // ถ้าเป็น Date object อยู่แล้ว
              if (timestamp instanceof Date) {
                date = timestamp;
              }
              // ถ้าเป็น string ที่มีรูปแบบวันที่
              else if (typeof timestamp === 'string') {
                // รูปแบบ "DD/MM/YYYY"
                const dateMatch = timestamp.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
                if (dateMatch) {
                  const [, day, month, year] = dateMatch;
                  date = new Date(year, month - 1, day);
                } else {
                  date = new Date(timestamp);
                }
              }
              else {
                date = new Date(timestamp);
              }
              
              // ตรวจสอบว่าเป็น valid date หรือไม่
              if (isNaN(date.getTime())) {
                return null;
              }
              
              // คืนค่าในรูปแบบ YYYY-MM-DD
              const result = date.toISOString().split('T')[0];
              return result;
              
            } catch (error) {
              return null;
            }
          }

          function getTotalConfirmedAmount() {
            try {
              const sheet = SpreadsheetApp.openById('1CmLJs8fOu5IFuW4dROJ2xfcVlrwcLZpoQSsqdb0W6UM').getSheetByName('Sheet1');
              if (!sheet) {
                return 'ไม่พบข้อมูล';
              }
              
              const totalValue = sheet.getRange(2, 26).getValue(); // คอลัมน์ Z แถว 2
              
              if (totalValue && typeof totalValue === 'number') {
                return totalValue;
              } else {
                return 0;
              }
            } catch (error) {
              return 'เกิดข้อผิดพลาดในการดึงข้อมูล';
            }
          }