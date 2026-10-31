const SHEET_NAME = 'ประชาสัมพันธ์';
const SLIDE_SHEET = 'สไลด์';
const CONF_SHEET = 'ตั้งค่าเว็บ';
const FAVICON_ID = '1zC_TJwmzziZAPRap48Nr4gxK9_Cjs4-e';
const ANN_TYPES = ['alert', 'finance-alert', 'supplies-alert', 'general', 'document'];

function doGet(e) {
  const faviconUrl = 'https://drive.google.com/uc?id=' + FAVICON_ID + '&export=download&format=png';
  const page = (e && e.parameter && e.parameter.page) ? String(e.parameter.page) : '';
  const pages = {
    finan: ['finan', 'งานการเงินและบัญชี - โรงเรียนมหาวชิราวุธ'],
    Supplies: ['Supplies', 'งานพัสดุและสินทรัพย์ - โรงเรียนมหาวชิราวุธ'],
    Budget: ['Budget', 'กลุ่มบริหารงานงบประมาณ - โรงเรียนมหาวชิราวุธ'],
    Sign: ['Sign', 'เข้าสู่ระบบ - MVSK Finance'],
    MainTeacher: ['MainTeacher', 'ระบบสำหรับครู - MVSK'],
    Loan: ['Loan', 'ยืม ส่งคืน เบิก - งานการเงินและบัญชี'],
    PrintSign: ['PrintSign', 'ระบบพิมพ์ใบลงชื่อค่าอุปกรณ์การเรียนและเครื่องแบบนักเรียน']
  };
  const p = pages[page] || pages.Budget;
  let t;
  try { t = HtmlService.createTemplateFromFile(p[0]); } catch (err) { t = HtmlService.createTemplateFromFile('Budget'); }
  t.loanTab = (e && e.parameter && e.parameter.t) ? String(e.parameter.t) : '';
  return t.evaluate().setTitle(p[1])
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setFaviconUrl(faviconUrl);
}

function getScriptUrl() { return ScriptApp.getService().getUrl(); }
function include(name) { return HtmlService.createHtmlOutputFromFile(name).getContent(); }

function str_(v) { return v == null ? '' : String(v).trim(); }
function ymd_(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const s = str_(v);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}
function sheet_(name) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name); }

function getConf_(key) {
  const sh = sheet_(CONF_SHEET);
  if (!sh) return '';
  const v = sh.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) if (str_(v[i][0]) === key) return str_(v[i][1]);
  return '';
}

function getAnnouncements() {
  const sh = sheet_(SHEET_NAME);
  if (!sh || sh.getLastRow() < 2) return [];
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return sh.getRange(2, 1, sh.getLastRow() - 1, Math.max(24, sh.getLastColumn())).getValues()
    .filter(r => (str_(r[0]) || str_(r[2])) && str_(r[20]) !== 'HIDDEN' && (!ymd_(r[22]) || ymd_(r[22]) >= today))
    .map(r => {
      let links = [];
      for (let c = 7; c < 19; c += 2) if (str_(r[c]) && str_(r[c + 1])) links.push({ url: str_(r[c]), name: str_(r[c + 1]) });
      if (!links.length && r[6]) { try { links = JSON.parse(r[6]) || []; } catch (e) { links = []; } }
      const m = str_(r[0]).match(/^ANN-(\d{10,})/);
      return {
        id: str_(r[0]), date: str_(r[1]), title: str_(r[2]), details: str_(r[3]), imageUrl: str_(r[4]).split(/\s*\n\s*/)[0] || '',
        images: str_(r[4]).split(/\s*\n\s*/).filter(String),
        type: ANN_TYPES.indexOf(str_(r[5])) >= 0 ? str_(r[5]) : 'alert', links: links,
        pinned: str_(r[21]) === 'PIN', createdAt: m ? Number(m[1]) : 0
      };
    }).reverse();
}

function getSlides() {
  const sh = sheet_(SLIDE_SHEET);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 9).getValues()
    .filter(r => str_(r[1]) && str_(r[6]) !== 'HIDDEN')
    .map(r => ({ imageUrl: str_(r[1]), title: str_(r[2]), subtitle: str_(r[3]), link: str_(r[4]), linkText: str_(r[5]) }));
}

/* ส่วน "งานการเงินและบัญชี" (ชีต งานการเงิน — จัดการได้ที่ระบบการเงิน > เว็บไซต์ หรือแก้ในชีตตรง)
 * คืน null ถ้ายังไม่มีชีต (หน้าเว็บใช้รายการเดิม) */
function embedUrl_(u) {
  u = str_(u);
  const d = u.match(/\/d\/([\w-]{20,})/) || u.match(/[?&]id=([\w-]{20,})/);
  if (/drive\.google\.com|docs\.google\.com/.test(u) && d) return 'https://drive.google.com/file/d/' + d[1] + '/preview';
  const y = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  if (y) return 'https://www.youtube.com/embed/' + y[1];
  return u;
}
function getFinItems() {
  const sh = sheet_('งานการเงิน');
  if (!sh) return null;
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 10).getValues()
    .filter(r => str_(r[0]) && str_(r[3]) && str_(r[6]) !== 'HIDDEN')
    .map(r => ({ type: str_(r[1]) === 'pdf' ? 'pdf' : 'video', title: str_(r[2]), date: str_(r[9]), embed: embedUrl_(r[3]), linkText: str_(r[4]), link: str_(r[5]) }));
}

function getHomeData() {
  let news = [], slides = [];
  try { news = getAnnouncements(); } catch (e) { }
  try { slides = getSlides(); } catch (e) { }
  let staffUrl = '';
  try { staffUrl = getConf_('staffUrl'); } catch (e) { }
  let fin = null;
  try { fin = getFinItems(); } catch (e) { }
  return { news: news, slides: slides, staffUrl: staffUrl, fin: fin };
}

/* ---------- หน้า "ยืม ส่งคืน เบิก" สาธารณะ (ไฟล์ Loan สร้างจาก tools/build_loanweb.py) ----------
 * กรอกแล้วพิมพ์อย่างเดียว ไม่บันทึกข้อมูล ชื่อผู้ลงนาม/เลขที่หนังสือ แก้ได้ในชีต "ตั้งค่าเว็บ"
 * คีย์: schoolName, area, docPrefix, director, deputy, finOfficer, accOfficer, garudaUrl, perdiemRate, lodgeRate */
const LOAN_FUNDS_ = [
  { code: 'TEACH', name: 'ค่าจัดการเรียนการสอน', short: 'จัดการเรียนการสอน', order: 1 },
  { code: 'ACT', name: 'ค่ากิจกรรมพัฒนาคุณภาพผู้เรียน', short: 'กิจกรรมพัฒนาผู้เรียน', order: 2 },
  { code: 'EQUIP', name: 'ค่าอุปกรณ์การเรียน', short: 'อุปกรณ์การเรียน', order: 3 },
  { code: 'UNIFORM', name: 'ค่าเครื่องแบบนักเรียน', short: 'เครื่องแบบนักเรียน', order: 4 },
  { code: 'BOOK', name: 'ค่าหนังสือเรียน', short: 'หนังสือเรียน', order: 5 }
];
function loanConfJson_() {
  const c = { schoolName: 'โรงเรียนมหาวชิราวุธ จังหวัดสงขลา', area: '', docPrefix: 'ศธ ', director: '', deputy: '', finOfficer: '', accOfficer: '',
    garudaUrl: '', perdiemRate: 240, lodgeRate: 800 };
  Object.keys(c).forEach(k => { try { const v = getConf_(k); if (v) c[k] = v; } catch (e) { } });
  c.funds = LOAN_FUNDS_;
  c.kinds = { travel: 'ยืมเงิน (เดินทางไปราชการ)', loanAct: 'ยืมเงิน (จัดกิจกรรม/โครงการ)',
    advance: 'ขอเบิกเงิน (จัดกิจกรรม/จัดซื้อ ไม่ยืม)', advTravel: 'ขอเบิกค่าเดินทางไปราชการ (ไม่ยืม)' };
  c.backUrl = getScriptUrl() + '?page=finan';
  return JSON.stringify(c).replace(/</g, '\\u003c');
}
