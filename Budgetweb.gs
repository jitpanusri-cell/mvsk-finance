/**
 * เว็บไซต์กลุ่มบริหารงานงบประมาณ โรงเรียนมหาวชิราวุธ จังหวัดสงขลา
 * - หน้าแรก (Budget)         : ?page=Budget หรือไม่ใส่ page
 * - หน้าเจ้าหน้าที่ (Staff)    : ?page=Staff  (ล็อกอินด้วยชื่อผู้ใช้/รหัสผ่าน จากชีต Admin)
 * - ลิงก์ข่าวเฉพาะเรื่อง       : ?news=ANN-xxxxxxxx
 *
 * ชีต "ประชาสัมพันธ์" (แถว 1 = หัวตาราง)
 *  A id | B วันที่ (ข้อความ) | C หัวข้อ | D รายละเอียด (HTML) | E รูป | F ประเภท | G ลิงก์ (JSON)
 *  H–S ลิงก์ 6 คู่ (url, ชื่อ) | T ผู้บันทึก | U สถานะ (VISIBLE/HIDDEN)
 *  V ปักหมุด (PIN) | W แสดงถึงวันที่ (yyyy-MM-dd) | X แก้ไขล่าสุด
 */
const SHEET_NAME = 'ประชาสัมพันธ์';
const ADMIN_SHEET_NAME = 'Admin';
const ADMIN_LOG_SHEET = 'AdminLog';
const IMAGE_FOLDER_ID = '1HSaggL6ChoYQX1W4HbZS-g-5EHe_oGkA';
const FAVICON_ID = '1zC_TJwmzziZAPRap48Nr4gxK9_Cjs4-e';
const SESSION_HOURS = 6;
const ANN_COLS = 24;
const ANN_TYPES = ['alert', 'finance-alert', 'supplies-alert', 'general', 'document'];

function defaultStaffLinks_() {
  const base = getScriptUrl();
  return [
    { name: 'เว็บไซต์งานการเงินและบัญชี', desc: 'หน้าบริการข้อมูลงานการเงินสำหรับครูและบุคลากร', url: base + '?page=finan', icon: 'wallet' },
    { name: 'เว็บไซต์งานพัสดุและสินทรัพย์', desc: 'หน้าบริการข้อมูลงานพัสดุ', url: base + '?page=Supplies', icon: 'box' }
  ];
}
function doGet(e) {
  const faviconUrl = 'https://drive.google.com/uc?id=' + FAVICON_ID + '&export=download&format=png';
  const page = (e && e.parameter && e.parameter.page) ? String(e.parameter.page) : '';
  const pages = {
    finan: ['finan', 'งานการเงินและบัญชี - โรงเรียนมหาวชิราวุธ'],
    Supplies: ['Supplies', 'งานพัสดุและสินทรัพย์ - โรงเรียนมหาวชิราวุธ'],
    Budget: ['Budget', 'กลุ่มบริหารงานงบประมาณ - โรงเรียนมหาวชิราวุธ'],
    Staff: ['Staff', 'เจ้าหน้าที่ - กลุ่มบริหารงานงบประมาณ'],
    Sign: ['Sign', 'เข้าสู่ระบบ - MVSK Finance'],
    MainTeacher: ['MainTeacher', 'ระบบสำหรับครู - MVSK'],
    PrintSign: ['PrintSign', 'ระบบพิมพ์ใบลงชื่อค่าอุปกรณ์การเรียนและเครื่องแบบนักเรียน']
  };
  const p = pages[page] || pages.Budget;
  let out;
  try {
    out = HtmlService.createTemplateFromFile(p[0]).evaluate().setTitle(p[1]);
  } catch (err) {
    out = HtmlService.createTemplateFromFile('Budget').evaluate().setTitle(pages.Budget[1]);
  }
  return out
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setFaviconUrl(faviconUrl);
}

function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}

function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function str_(v) { return v == null ? '' : String(v).trim(); }
function tz_() { return Session.getScriptTimeZone() || 'Asia/Bangkok'; }
function today_() { return Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd'); }
function ymd_(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, tz_(), 'yyyy-MM-dd');
  const s = str_(v);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}
function ok_(message, extra) { return Object.assign({ success: true, message: message || '' }, extra || {}); }
function fail_(e) { return { success: false, message: (e && e.message) ? e.message : String(e) }; }

function annSheet_() {
  let sh = ss_().getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss_().insertSheet(SHEET_NAME);
    const head = ['รหัส', 'วันที่', 'หัวข้อ', 'รายละเอียด', 'รูปภาพ', 'ประเภท', 'ลิงก์ (JSON)'];
    for (let i = 1; i <= 6; i++) head.push('ลิงก์ ' + i, 'ชื่อปุ่ม ' + i);
    head.push('ผู้บันทึก', 'สถานะ', 'ปักหมุด', 'แสดงถึงวันที่', 'แก้ไขล่าสุด');
    sh.appendRow(head);
    sh.getRange(1, 1, 1, head.length).setFontWeight('bold').setBackground('#13294b').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  const extra = { 20: 'ผู้บันทึก', 21: 'สถานะ', 22: 'ปักหมุด', 23: 'แสดงถึงวันที่', 24: 'แก้ไขล่าสุด' };
  Object.keys(extra).forEach(c => {
    const cell = sh.getRange(1, Number(c));
    if (str_(cell.getValue()) === '') cell.setValue(extra[c]).setFontWeight('bold').setBackground('#13294b').setFontColor('#ffffff');
  });
  return sh;
}

function rowToAnn_(row) {
  let links = [];
  for (let col = 7; col < 19; col += 2) {
    const url = str_(row[col]), name = str_(row[col + 1]);
    if (url && name) links.push({ name: name, url: url });
  }
  if (!links.length && row[6]) { try { links = JSON.parse(row[6]) || []; } catch (e) { links = []; } }
  const id = str_(row[0]);
  const m = id.match(/^ANN-(\d{10,})/);
  return {
    id: id,
    date: str_(row[1]),
    title: str_(row[2]) || 'ไม่มีหัวข้อ',
    details: str_(row[3]),
    imageUrl: str_(row[4]),
    type: ANN_TYPES.indexOf(str_(row[5])) >= 0 ? str_(row[5]) : 'alert',
    links: links,
    adminName: str_(row[19]) || 'ไม่ระบุ',
    isHidden: str_(row[20]) === 'HIDDEN',
    pinned: str_(row[21]) === 'PIN',
    expire: ymd_(row[22]),
    updatedAt: str_(row[23]),
    createdAt: m ? Number(m[1]) : 0
  };
}

function readAnns_() {
  const sh = annSheet_();
  const last = sh.getLastRow();
  if (last < 2) return [];
  const data = sh.getRange(2, 1, last - 1, Math.max(ANN_COLS, sh.getLastColumn())).getValues();
  return data.filter(r => str_(r[0]) || str_(r[2])).map(rowToAnn_).reverse();
}

function findAnnRow_(sh, id) {
  const ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
  for (let i = 1; i < ids.length; i++) if (str_(ids[i][0]) === str_(id)) return i + 1;
  return 0;
}

function nowText_() { return Utilities.formatDate(new Date(), tz_(), 'dd/MM/yyyy HH:mm'); }
function logAdminActivity(adminName, action, details) {
  try {
    let sheet = ss_().getSheetByName(ADMIN_LOG_SHEET);
    if (!sheet) {
      sheet = ss_().insertSheet(ADMIN_LOG_SHEET);
      sheet.appendRow(['วัน-เวลา', 'ชื่อเจ้าหน้าที่', 'การทำงาน', 'รายละเอียด']);
      sheet.getRange('A1:D1').setFontWeight('bold').setBackground('#13294b').setFontColor('#ffffff');
    }
    sheet.appendRow([Utilities.formatDate(new Date(), tz_(), 'dd/MM/yyyy HH:mm:ss'), adminName || 'ไม่ทราบชื่อ', action, details]);
  } catch (e) {
    console.error('Log Error: ' + e);
  }
}
function newSession_(user) {
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  CacheService.getScriptCache().put('stf_' + token, JSON.stringify(user), SESSION_HOURS * 3600);
  return token;
}
function requireStaff_(token) {
  const raw = token ? CacheService.getScriptCache().get('stf_' + token) : null;
  if (!raw) throw new Error('หมดเวลาการใช้งาน กรุณาเข้าสู่ระบบอีกครั้ง');
  CacheService.getScriptCache().put('stf_' + token, raw, SESSION_HOURS * 3600);
  return JSON.parse(raw);
}
function checkSession(token) {
  try { const u = requireStaff_(token); return ok_('', { username: u.username, name: u.name }); }
  catch (e) { return fail_(e); }
}
function hashPwd_(pwd, salt) {
  salt = salt || Utilities.getUuid().slice(0, 12);
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + '|' + pwd, Utilities.Charset.UTF_8);
  const hex = bytes.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
  return 'sha256$' + salt + '$' + hex;
}
function checkPwd_(stored, pwd) {
  stored = str_(stored);
  if (stored.indexOf('sha256$') === 0) return hashPwd_(pwd, stored.split('$')[1]) === stored;
  return stored === pwd;
}
function adminSheet_() {
  let sh = ss_().getSheetByName(ADMIN_SHEET_NAME);
  if (!sh) {
    sh = ss_().insertSheet(ADMIN_SHEET_NAME);
    sh.appendRow(['Username', 'Password', 'ชื่อเจ้าหน้าที่']);
    sh.appendRow(['admin', '123456', 'ผู้ดูแลระบบ']);
    sh.getRange('A1:C1').setFontWeight('bold').setBackground('#13294b').setFontColor('#ffffff');
  }
  return sh;
}
function getAnnouncements() {
  try {
    const t = today_();
    return readAnns_()
      .filter(a => !a.isHidden && (!a.expire || a.expire >= t))
      .map(a => ({ id: a.id, date: a.date, title: a.title, details: a.details, imageUrl: a.imageUrl,
        type: a.type, links: a.links, pinned: a.pinned, createdAt: a.createdAt }));
  } catch (e) {
    return [];
  }
}

function verifyAdminLogin(username, password) {
  try {
    const u0 = str_(username).toLowerCase(), p0 = str_(password);
    if (!u0 || !p0) return { success: false, message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' };
    const sh = adminSheet_();
    const data = sh.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (str_(data[i][0]).toLowerCase() !== u0) continue;
      if (!checkPwd_(data[i][1], p0)) break;
      if (str_(data[i][1]).indexOf('sha256$') !== 0) sh.getRange(i + 1, 2).setValue(hashPwd_(p0));
      const user = { username: str_(data[i][0]), name: str_(data[i][2]) || str_(data[i][0]) };
      logAdminActivity(user.name, 'เข้าสู่ระบบ', 'Username: ' + user.username);
      return ok_('เข้าสู่ระบบสำเร็จ', { token: newSession_(user), username: user.username, name: user.name,
        weakPassword: p0 === '123456' });
    }
    Utilities.sleep(800);
    return { success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
  } catch (e) {
    return fail_(e);
  }
}

function logLogout(token) {
  try {
    const u = requireStaff_(token);
    CacheService.getScriptCache().remove('stf_' + token);
    logAdminActivity(u.name, 'ออกจากระบบ', '');
  } catch (e) {  }
  return { success: true };
}
function getStaffData(token) {
  try {
    const u = requireStaff_(token);
    return ok_('', { user: u, items: readAnns_(), today: today_(), links: getStaffLinks_() });
  } catch (e) { return fail_(e); }
}

function saveAnnouncement(token, obj) {
  try {
    const u = requireStaff_(token);
    obj = obj || {};
    const title = str_(obj.title);
    if (!title) throw new Error('กรุณากรอกหัวข้อประกาศ');
    const links = (obj.links || []).filter(l => l && str_(l.url) && str_(l.name)).slice(0, 6)
      .map(l => ({ name: str_(l.name), url: str_(l.url) }));
    const flat = [];
    for (let i = 0; i < 6; i++) flat.push(links[i] ? links[i].url : '', links[i] ? links[i].name : '');
    const type = ANN_TYPES.indexOf(obj.type) >= 0 ? obj.type : 'general';
    return withLock_(() => {
      const sh = annSheet_();
      const body = [str_(obj.date), title, String(obj.details || ''), str_(obj.imageUrl), type, JSON.stringify(links)].concat(flat);
      const rowNo = obj.id ? findAnnRow_(sh, obj.id) : 0;
      if (rowNo) {
        const cur = sh.getRange(rowNo, 21, 1, 1).getValue();
        const state = obj.hasOwnProperty('isHidden') ? (obj.isHidden ? 'HIDDEN' : 'VISIBLE') : (str_(cur) || 'VISIBLE');
        sh.getRange(rowNo, 2, 1, 23).setValues([body.concat([u.name, state, obj.pinned ? 'PIN' : '', ymd_(obj.expire), nowText_()])]);
        logAdminActivity(u.name, 'แก้ไขประกาศ', obj.id + ' | ' + title);
        return ok_('บันทึกการแก้ไขแล้ว', { id: obj.id });
      }
      const id = 'ANN-' + Date.now();
      sh.appendRow([id].concat(body, [u.name, obj.isHidden ? 'HIDDEN' : 'VISIBLE', obj.pinned ? 'PIN' : '', ymd_(obj.expire), nowText_()]));
      logAdminActivity(u.name, 'สร้างประกาศใหม่', id + ' | ' + title);
      return ok_('เพิ่มประกาศใหม่แล้ว', { id: id });
    });
  } catch (e) { return fail_(e); }
}

function deleteAnnouncement(token, id) {
  try {
    const u = requireStaff_(token);
    return withLock_(() => {
      const sh = annSheet_();
      const rowNo = findAnnRow_(sh, id);
      if (!rowNo) throw new Error('ไม่พบประกาศนี้ อาจถูกลบไปแล้ว');
      const title = sh.getRange(rowNo, 3).getValue();
      sh.deleteRow(rowNo);
      logAdminActivity(u.name, 'ลบประกาศ', id + ' | ' + title);
      return ok_('ลบประกาศแล้ว');
    });
  } catch (e) { return fail_(e); }
}

function setAnnouncementFlag(token, id, field, value) {
  try {
    const u = requireStaff_(token);
    return withLock_(() => {
      const sh = annSheet_();
      const rowNo = findAnnRow_(sh, id);
      if (!rowNo) throw new Error('ไม่พบประกาศนี้');
      const title = sh.getRange(rowNo, 3).getValue();
      if (field === 'hidden') {
        sh.getRange(rowNo, 21).setValue(value ? 'HIDDEN' : 'VISIBLE');
        logAdminActivity(u.name, value ? 'ซ่อนประกาศ' : 'แสดงประกาศ', id + ' | ' + title);
        return ok_(value ? 'ซ่อนประกาศแล้ว' : 'แสดงประกาศแล้ว');
      }
      if (field === 'pinned') {
        sh.getRange(rowNo, 22).setValue(value ? 'PIN' : '');
        logAdminActivity(u.name, value ? 'ปักหมุดประกาศ' : 'เลิกปักหมุด', id + ' | ' + title);
        return ok_(value ? 'ปักหมุดแล้ว' : 'เลิกปักหมุดแล้ว');
      }
      throw new Error('คำสั่งไม่ถูกต้อง');
    });
  } catch (e) { return fail_(e); }
}

function duplicateAnnouncement(token, id) {
  try {
    const u = requireStaff_(token);
    return withLock_(() => {
      const sh = annSheet_();
      const rowNo = findAnnRow_(sh, id);
      if (!rowNo) throw new Error('ไม่พบประกาศนี้');
      const row = sh.getRange(rowNo, 1, 1, ANN_COLS).getValues()[0];
      const newId = 'ANN-' + Date.now();
      row[0] = newId; row[2] = 'สำเนา - ' + str_(row[2]); row[19] = u.name; row[20] = 'HIDDEN'; row[21] = ''; row[23] = nowText_();
      sh.appendRow(row);
      logAdminActivity(u.name, 'คัดลอกประกาศ', id + ' → ' + newId);
      return ok_('คัดลอกแล้ว (ซ่อนไว้ก่อน แก้ไขแล้วค่อยเปิดแสดง)', { id: newId });
    });
  } catch (e) { return fail_(e); }
}

function updateAnnouncementOrder(token, orderedIds) {
  try {
    const u = requireStaff_(token);
    return withLock_(() => {
      const sh = annSheet_();
      const last = sh.getLastRow();
      if (last < 3) return ok_('');
      const width = Math.max(ANN_COLS, sh.getLastColumn());
      const rows = sh.getRange(2, 1, last - 1, width).getValues();
      const pos = {};
      orderedIds.slice().reverse().forEach((id, i) => { pos[str_(id)] = i; });
      rows.sort((a, b) => {
        const ia = pos.hasOwnProperty(str_(a[0])) ? pos[str_(a[0])] : -1;
        const ib = pos.hasOwnProperty(str_(b[0])) ? pos[str_(b[0])] : -1;
        return ia - ib;
      });
      sh.getRange(2, 1, rows.length, width).setValues(rows);
      logAdminActivity(u.name, 'จัดลำดับประกาศ', orderedIds.length + ' รายการ');
      return ok_('บันทึกลำดับแล้ว');
    });
  } catch (e) { return fail_(e); }
}

function uploadImageToDrive(token, base64Data, fileName) {
  try {
    requireStaff_(token);
    const parts = String(base64Data).split(',');
    const contentType = parts[0].match(/:(.*?);/)[1];
    if (!/^image\//.test(contentType)) throw new Error('รองรับเฉพาะไฟล์รูปภาพ');
    const blob = Utilities.newBlob(Utilities.base64Decode(parts[1]), contentType, fileName || 'image');
    let folder;
    try { folder = DriveApp.getFolderById(IMAGE_FOLDER_ID); } catch (err) { folder = DriveApp.getRootFolder(); }
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return ok_('อัปโหลดรูปแล้ว', { url: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1200' });
  } catch (e) { return fail_('อัปโหลดรูปไม่สำเร็จ: ' + (e.message || e)); }
}
function updateAdminPassword(token, currentPassword, newPassword, newName) {
  try {
    const u = requireStaff_(token);
    if (str_(newPassword) && str_(newPassword).length < 6) throw new Error('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
    return withLock_(() => {
      const sh = adminSheet_();
      const data = sh.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (str_(data[i][0]).toLowerCase() !== u.username.toLowerCase()) continue;
        if (!checkPwd_(data[i][1], str_(currentPassword))) throw new Error('รหัสผ่านปัจจุบันไม่ถูกต้อง');
        if (str_(newPassword)) sh.getRange(i + 1, 2).setValue(hashPwd_(str_(newPassword)));
        const name = str_(newName) || u.name;
        sh.getRange(i + 1, 3).setValue(name);
        u.name = name;
        CacheService.getScriptCache().put('stf_' + token, JSON.stringify(u), SESSION_HOURS * 3600);
        logAdminActivity(name, 'แก้ไขบัญชีตนเอง', str_(newPassword) ? 'เปลี่ยนรหัสผ่าน' : 'เปลี่ยนชื่อ');
        return ok_('บันทึกบัญชีแล้ว', { name: name });
      }
      throw new Error('ไม่พบบัญชีผู้ใช้');
    });
  } catch (e) { return fail_(e); }
}

function listAdminUsers(token) {
  try {
    requireStaff_(token);
    const data = adminSheet_().getDataRange().getValues();
    return ok_('', { users: data.slice(1).filter(r => str_(r[0])).map(r => ({ username: str_(r[0]), name: str_(r[2]) })) });
  } catch (e) { return fail_(e); }
}

function addAdminUser(token, newUsername, newPassword, newName) {
  try {
    const u = requireStaff_(token);
    const un = str_(newUsername), pw = str_(newPassword), nm = str_(newName);
    if (!/^[A-Za-z0-9._-]{3,30}$/.test(un)) throw new Error('ชื่อผู้ใช้ใช้ได้เฉพาะ a-z 0-9 . _ - ยาว 3–30 ตัว');
    if (pw.length < 6) throw new Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
    if (!nm) throw new Error('กรุณากรอกชื่อ-นามสกุล');
    return withLock_(() => {
      const sh = adminSheet_();
      const exists = sh.getDataRange().getValues().slice(1).some(r => str_(r[0]).toLowerCase() === un.toLowerCase());
      if (exists) throw new Error('มีชื่อผู้ใช้นี้ในระบบแล้ว');
      sh.appendRow([un, hashPwd_(pw), nm]);
      logAdminActivity(u.name, 'เพิ่มเจ้าหน้าที่', un + ' | ' + nm);
      return ok_('เพิ่มเจ้าหน้าที่แล้ว');
    });
  } catch (e) { return fail_(e); }
}

function removeAdminUser(token, username) {
  try {
    const u = requireStaff_(token);
    if (str_(username).toLowerCase() === u.username.toLowerCase()) throw new Error('ลบบัญชีของตัวเองไม่ได้');
    return withLock_(() => {
      const sh = adminSheet_();
      const data = sh.getDataRange().getValues();
      for (let i = data.length - 1; i >= 1; i--) {
        if (str_(data[i][0]).toLowerCase() === str_(username).toLowerCase()) {
          sh.deleteRow(i + 1);
          logAdminActivity(u.name, 'ลบเจ้าหน้าที่', username);
          return ok_('ลบบัญชีแล้ว');
        }
      }
      throw new Error('ไม่พบบัญชีนี้');
    });
  } catch (e) { return fail_(e); }
}

function getAdminLog(token, limit) {
  try {
    requireStaff_(token);
    const sh = ss_().getSheetByName(ADMIN_LOG_SHEET);
    if (!sh || sh.getLastRow() < 2) return ok_('', { rows: [] });
    const n = Math.min(Number(limit) || 100, sh.getLastRow() - 1);
    const rows = sh.getRange(sh.getLastRow() - n + 1, 1, n, 4).getDisplayValues().reverse();
    return ok_('', { rows: rows });
  } catch (e) { return fail_(e); }
}
function getStaffLinks_() {
  const raw = PropertiesService.getScriptProperties().getProperty('STAFF_LINKS');
  if (raw) { try { return JSON.parse(raw); } catch (e) {  } }
  return defaultStaffLinks_();
}

function saveStaffLinks(token, links) {
  try {
    const u = requireStaff_(token);
    const clean = (links || []).filter(l => l && str_(l.name) && /^https?:/.test(str_(l.url))).slice(0, 20)
      .map(l => ({ name: str_(l.name), desc: str_(l.desc), url: str_(l.url), icon: str_(l.icon) || 'link' }));
    PropertiesService.getScriptProperties().setProperty('STAFF_LINKS', JSON.stringify(clean));
    logAdminActivity(u.name, 'แก้ไขลิงก์ระบบงาน', clean.length + ' ลิงก์');
    return ok_('บันทึกลิงก์ระบบงานแล้ว', { links: clean });
  } catch (e) { return fail_(e); }
}
