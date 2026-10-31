function doGet(e) {
  // --- ส่วนที่เพิ่ม Favicon ---
  var FAVICON_ID = '1zC_TJwmzziZAPRap48Nr4gxK9_Cjs4-e';
  var faviconUrl = 'https://drive.google.com/uc?id=' + FAVICON_ID + '&export=download&format=png';
  // -------------------------

  var page = '';
  if (e && e.parameter && e.parameter.page) {
    page = e.parameter.page;
  }
  
  var filename = 'Budget'; 
  var title = 'กลุ่มบริหารงานงบประมาณ - โรงเรียนมหาวชิราวุธ';
  
  if (page === 'finan') {
    filename = 'finan';
    title = 'งานการเงินและบัญชี - โรงเรียนมหาวชิราวุธ';
  } else if (page === 'Supplies') {
    filename = 'Supplies';
    title = 'งานพัสดุและสินทรัพย์ - โรงเรียนมหาวชิราวุธ';
  } else if (page === 'Budget') {
    filename = 'Budget';
    title = 'กลุ่มบริหารงานงบประมาณ - โรงเรียนมหาวชิราวุธ';
  } else if (page === 'Sign') {
    filename = 'Sign';
    title = 'เข้าสู่ระบบ - MVSK Finance';
  } else if (page === 'MainTeacher') {
    filename = 'MainTeacher';
    title = 'ระบบสำหรับครู - MVSK';
  } else if (page === 'PrintSign') {
    filename = 'PrintSign';
    title = 'ระบบพิมพ์ใบลงชื่อค่าอุปกรณ์การเรียนและเครื่องแบบนักเรียน';
  }
  
  try {
    var template = HtmlService.createTemplateFromFile(filename);
    return template.evaluate()
      .setTitle(title)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .setFaviconUrl(faviconUrl); // เรียกใช้ Favicon
  } catch (err) {
    var template = HtmlService.createTemplateFromFile('Budget');
    return template.evaluate()
      .setTitle('ไม่พบหน้าเว็บ - กลับสู่หน้าหลัก')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .setFaviconUrl(faviconUrl); // เรียกใช้ Favicon หน้า Error
  }
}

function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}

// =========================================================
// CONFIGURATION
// =========================================================
const SHEET_NAME = "ประชาสัมพันธ์";
const ADMIN_SHEET_NAME = "Admin";
const ADMIN_LOG_SHEET = "AdminLog"; // เพิ่มชีตเก็บประวัติ
const IMAGE_FOLDER_ID = "1HSaggL6ChoYQX1W4HbZS-g-5EHe_oGkA"; 

/**
 * 📝 ฟังก์ชันเก็บประวัติการทำงานของแอดมิน (Admin Log)
 */
function logAdminActivity(adminName, action, details) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(ADMIN_LOG_SHEET);
    
    // ถ้ายังไม่มีชีต AdminLog ให้สร้างใหม่
    if (!sheet) {
      sheet = ss.insertSheet(ADMIN_LOG_SHEET);
      sheet.appendRow(["วัน-เวลา (Timestamp)", "ชื่อแอดมิน (Admin Name)", "การทำงาน (Action)", "รายละเอียด (Details)"]);
      sheet.getRange("A1:D1").setFontWeight("bold").setBackground("#0f172a").setFontColor("#ffffff");
      sheet.setColumnWidth(1, 180);
      sheet.setColumnWidth(2, 200);
      sheet.setColumnWidth(3, 200);
      sheet.setColumnWidth(4, 400);
    }
    
    // บันทึกข้อมูล
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
    sheet.appendRow([timestamp, adminName || "ไม่ทราบชื่อ", action, details]);
  } catch(e) {
    console.error("Log Error: " + e.toString());
  }
}

/**
 * ดึงข้อมูลประชาสัมพันธ์ทั้งหมด
 */
function getAnnouncements() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    
    const rows = data.slice(1);
    
    return rows.map(row => {
      let links = [];
      
      for (let col = 7; col < 19; col += 2) {
        let url = row[col];
        let name = row[col + 1];
        if (url && name && url.toString().trim() !== "" && name.toString().trim() !== "") {
          links.push({ name: name.toString().trim(), url: url.toString().trim() });
        }
      }
      
      if (links.length === 0 && row[6]) {
        try { links = JSON.parse(row[6]); } catch(e) { links = []; }
      }

      return {
        id: row[0] ? row[0].toString().trim() : "ANN-" + new Date().getTime(),
        date: row[1] ? row[1].toString().trim() : "",
        title: row[2] ? row[2].toString().trim() : "ไม่มีหัวข้อ",
        details: row[3] ? row[3].toString().trim() : "",
        imageUrl: row[4] ? row[4].toString().trim() : "",
        type: row[5] ? row[5].toString().trim() : 'alert',
        links: links,
        adminName: row[19] ? row[19].toString().trim() : "ไม่ระบุ", 
        isHidden: row[20] ? (row[20].toString().trim() === "HIDDEN") : false 
      };
    }).reverse(); 
  } catch (err) {
    return [];
  }
}

/**
 * บันทึกหรือแก้ไขข้อมูลประชาสัมพันธ์
 */
function saveAnnouncement(obj) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return { success: false, message: "ไม่พบแท็บแผ่นงานประชาสัมพันธ์" };
    
    const data = sheet.getDataRange().getValues();
    const linksStr = JSON.stringify(obj.links || []);
    
    let discreteLinks = [];
    for (let i = 0; i < 6; i++) {
      if (obj.links && obj.links[i]) {
        discreteLinks.push(obj.links[i].url.toString().trim());
        discreteLinks.push(obj.links[i].name.toString().trim());
      } else {
        discreteLinks.push("");
        discreteLinks.push("");
      }
    }

    if (obj.id && obj.id.toString().trim() !== "") {
      for (let i = 1; i < data.length; i++) {
        if (data[i][0].toString().trim() === obj.id.toString().trim()) {
          let currentHiddenState = data[i][20] ? data[i][20].toString().trim() : "VISIBLE";
          if (obj.hasOwnProperty('isHidden')) {
            currentHiddenState = obj.isHidden ? "HIDDEN" : "VISIBLE";
          }
          
          let updateRow = [obj.date, obj.title, obj.details, obj.imageUrl, obj.type, linksStr].concat(discreteLinks);
          updateRow.push(obj.adminName || "ไม่ระบุ"); 
          updateRow.push(currentHiddenState);         
          
          sheet.getRange(i + 1, 2, 1, updateRow.length).setValues([updateRow]);
          
          logAdminActivity(obj.adminName, "แก้ไขประกาศ", `รหัส: ${obj.id} | หัวข้อ: ${obj.title}`);
          return { success: true, message: "อัปเดตการแก้ไขประกาศเรียบร้อยแล้ว!" };
        }
      }
    }
    
    const newId = "ANN-" + new Date().getTime();
    let newRow = [newId, obj.date, obj.title, obj.details, obj.imageUrl, obj.type, linksStr].concat(discreteLinks);
    newRow.push(obj.adminName || "ไม่ระบุ"); 
    newRow.push("VISIBLE");
    
    sheet.appendRow(newRow);
    
    if (sheet.getRange("T1").getValue() === "") sheet.getRange("T1").setValue("ผู้บันทึก").setFontWeight("bold").setBackground("#0f172a").setFontColor("#ffffff");
    if (sheet.getRange("U1").getValue() === "") sheet.getRange("U1").setValue("สถานะ").setFontWeight("bold").setBackground("#0f172a").setFontColor("#ffffff");
    
    logAdminActivity(obj.adminName, "สร้างประกาศใหม่", `รหัส: ${newId} | หัวข้อ: ${obj.title}`);
    return { success: true, message: "เพิ่มข้อมูลประชาสัมพันธ์ใหม่เข้าระบบสำเร็จ!" };
  } catch(e) {
    return { success: false, message: "เกิดข้อผิดพลาด: " + e.toString() };
  }
}

/**
 * ลบประกาศ
 */
function deleteAnnouncement(id, adminName) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return { success: false, message: "ไม่พบแผ่นงาน" };
    
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString().trim() === id.toString().trim()) {
        const title = data[i][2]; 
        sheet.deleteRow(i + 1);
        
        logAdminActivity(adminName, "ลบประกาศ", `รหัส: ${id} | หัวข้อ: ${title}`);
        return { success: true, message: "ลบประกาศออกจากระบบแล้ว" };
      }
    }
    return { success: false, message: "ไม่พบข้อมูล" };
  } catch (e) {
    return { success: false, message: "ลบข้อมูลล้มเหลว: " + e.toString() };
  }
}

/**
 * เปลี่ยนสถานะ ซ่อน/แสดง ประกาศ
 */
function toggleVisibility(id, setHidden, adminName) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString().trim() === id.toString().trim()) {
        sheet.getRange(i + 1, 21).setValue(setHidden ? "HIDDEN" : "VISIBLE");
        const title = data[i][2];
        
        logAdminActivity(adminName, setHidden ? "ซ่อนประกาศ" : "เปิดแสดงประกาศ", `รหัส: ${id} | หัวข้อ: ${title}`);
        return { success: true, message: setHidden ? "ซ่อนประกาศเรียบร้อย" : "เปิดแสดงประกาศเรียบร้อย" };
      }
    }
    return { success: false, message: "ไม่พบประกาศ" };
  } catch(e) {
    return { success: false, message: "เปลี่ยนสถานะล้มเหลว: " + e.toString() };
  }
}

/**
 * บันทึกลำดับใหม่
 */
function updateAnnouncementOrder(orderedIds, adminName) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    const fullData = sheet.getDataRange().getValues();
    if (fullData.length <= 1) return { success: true };

    const headers = fullData[0];
    let rows = fullData.slice(1);

    orderedIds.reverse();
    const idIndexMap = {};
    orderedIds.forEach((id, index) => { idIndexMap[id.toString().trim()] = index; });

    rows.sort((a, b) => {
      const idA = a[0] ? a[0].toString().trim() : "";
      const idB = b[0] ? b[0].toString().trim() : "";
      let indexA = idIndexMap.hasOwnProperty(idA) ? idIndexMap[idA] : 999999;
      let indexB = idIndexMap.hasOwnProperty(idB) ? idIndexMap[idB] : 999999;
      return indexA - indexB;
    });

    const sortedData = [headers, ...rows];
    sheet.getRange(1, 1, sortedData.length, sortedData[0].length).setValues(sortedData);

    logAdminActivity(adminName, "จัดเรียงลำดับใหม่", "จัดลำดับประกาศหน้าเว็บไซต์ใหม่");
    return { success: true, message: "บันทึกการจัดเรียงลำดับใหม่สำเร็จ!" };
  } catch (e) {
    return { success: false, message: "จัดเรียงผิดพลาด: " + e.toString() };
  }
}

/**
 * ล็อกอิน
 */
function verifyAdminLogin(username, password) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(ADMIN_SHEET_NAME);
    
    if (!sheet) {
      sheet = ss.insertSheet(ADMIN_SHEET_NAME);
      sheet.appendRow(["Username", "Password", "ชื่อแอดมิน"]);
      sheet.appendRow(["admin", "123456", "ผู้ดูแลระบบสูงสุด"]);
      sheet.getRange("A1:C1").setFontWeight("bold").setBackground("#0f172a").setFontColor("#ffffff");
    }
    
    const data = sheet.getDataRange().getValues();
    let inputUser = username.toString().trim().toLowerCase();
    let inputPass = password.toString().trim();
    
    for (let i = 1; i < data.length; i++) {
      let u = data[i][0].toString().trim().toLowerCase();
      let p = data[i][1].toString().trim();
      if (u === inputUser && p === inputPass) {
        let adminName = data[i][2] ? data[i][2].toString().trim() : data[i][0].toString();
        logAdminActivity(adminName, "เข้าสู่ระบบ", `Username: ${inputUser}`);
        return { success: true, username: data[i][0].toString(), name: adminName };
      }
    }
    return { success: false, message: "รหัสผ่านหรือชื่อผู้ใช้งานไม่ถูกต้อง!" };
  } catch(e) {
    return { success: false, message: "ข้อผิดพลาดระบบล็อกอิน: " + e.toString() };
  }
}

/**
 * เขียน Log ตอนออกจากระบบ
 */
function logLogout(adminName) {
  logAdminActivity(adminName, "ออกจากระบบ", "แอดมินกดออกจากระบบอย่างถูกต้อง");
  return { success: true };
}

/**
 * เปลี่ยนรหัสผ่านและชื่อของเจ้าหน้าที่
 */
function updateAdminPassword(username, newPassword, newName, adminName) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(ADMIN_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    let targetUser = username.toString().trim().toLowerCase();
    
    for (let i = 1; i < data.length; i++) {
      let u = data[i][0].toString().trim().toLowerCase();
      if (u === targetUser) {
        sheet.getRange(i + 1, 2).setValue(newPassword.toString().trim());
        sheet.getRange(i + 1, 3).setValue(newName.toString().trim());
        
        logAdminActivity(adminName, "เปลี่ยนรหัสผ่านบัญชีตัวเอง", `เปลี่ยนชื่อเป็น: ${newName}`);
        return { success: true, message: "เปลี่ยนรหัสผ่านและอัปเดตชื่อสำเร็จ!" };
      }
    }
    return { success: false, message: "ไม่พบบัญชีชื่อผู้ใช้งานนี้ในระบบ" };
  } catch(e) {
    return { success: false, message: "บันทึกล้มเหลว: " + e.toString() };
  }
}

/**
 * เพิ่มเจ้าหน้าที่คนใหม่ลงในชีต Admin
 */
function addAdminUser(newUsername, newPassword, newName, adminName) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(ADMIN_SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(ADMIN_SHEET_NAME);
      sheet.appendRow(["Username", "Password", "ชื่อแอดมิน"]);
      sheet.getRange("A1:C1").setFontWeight("bold").setBackground("#0f172a").setFontColor("#ffffff");
    }
    
    const data = sheet.getDataRange().getValues();
    let inputUser = newUsername.toString().trim().toLowerCase();
    
    for (let i = 1; i < data.length; i++) {
      let u = data[i][0].toString().trim().toLowerCase();
      if (u === inputUser) {
        return { success: false, message: "ไม่สามารถเพิ่มได้ มีชื่อผู้ใช้งาน (Username) นี้ในระบบแล้ว!" };
      }
    }
    
    sheet.appendRow([
      newUsername.toString().trim(), 
      newPassword.toString().trim(), 
      newName.toString().trim()
    ]);
    
    logAdminActivity(adminName, "เพิ่มเจ้าหน้าที่ใหม่", `Username ใหม่: ${newUsername} | ชื่อ: ${newName}`);
    return { success: true, message: "เพิ่มเจ้าหน้าที่ใหม่ลงระบบสำเร็จ!" };
  } catch(e) {
    return { success: false, message: "การเพิ่มเจ้าหน้าที่ขัดข้อง: " + e.toString() };
  }
}

/**
 * อัปโหลดรูปลง Google Drive
 */
function uploadImageToDrive(base64Data, fileName) {
  try {
    var splitData = base64Data.split(',');
    var contentType = splitData[0].match(/:(.*?);/)[1];
    var rawData = splitData[1];
    var decoded = Utilities.base64Decode(rawData);
    var blob = Utilities.newBlob(decoded, contentType, fileName);
    
    var folder;
    if (IMAGE_FOLDER_ID && IMAGE_FOLDER_ID.trim() !== "") {
      try { folder = DriveApp.getFolderById(IMAGE_FOLDER_ID.trim()); } 
      catch (err) { folder = DriveApp.getRootFolder(); }
    } else {
      folder = DriveApp.getRootFolder();
    }
    
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return { success: true, url: "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1000" };
  } catch (e) {
    return { success: false, message: "อัปโหลดภาพล้มเหลว: " + e.toString() };
  }
}
