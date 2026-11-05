const SHEET_NAME = 'ประชาสัมพันธ์';
const SLIDE_SHEET = 'สไลด์';
const CONF_SHEET = 'ตั้งค่าเว็บ';
const FAVICON_ID = '1zC_TJwmzziZAPRap48Nr4gxK9_Cjs4-e';
const ANN_TYPES = ['alert', 'finance-alert', 'supplies-alert', 'plan-alert', 'bank-alert', 'control-alert', 'office-alert', 'student-alert', 'teacher-alert', 'general', 'document'];

/* กลุ่มงานที่ใช้หน้าต้นแบบ Group (?page=plan|bank|control|office) — เอกสารจากชีต sheet, ข่าวประเภท type
 * บทบาทหน้าที่ อ้างอิงสไลด์ "ต้อนรับ รร.ระโนดวิทยา" กลุ่มบริหารงบประมาณ */
const GROUPS = {
  plan: { title: 'งานแผนงานและนโยบาย', en: 'PLANNING AND POLICY', sheet: 'งานแผนงาน', type: 'plan-alert', label: 'งานแผนงาน',
    links: [{ name: 'ระบบแผนปฏิบัติงาน', en: 'Planning', url: 'https://planning.mvsk.ac.th/' }],
    scope: ['ควบคุมดูแลการจัดทำแผนพัฒนาการศึกษาของสถานศึกษา', 'จัดทำแผนปฏิบัติการประจำปี', 'ควบคุม ติดตาม รายงาน และประเมินผลการใช้งบประมาณ', 'จัดทำรายงานการคำนวณต้นทุนผลผลิต'] },
  bank: { title: 'งานธนาคารโรงเรียน', en: 'SCHOOL BANKING', sheet: 'งานธนาคารโรงเรียน', type: 'bank-alert', label: 'ธนาคารโรงเรียน',
    scope: ['เปิด - ปิดบัญชีเงินฝาก', 'รับฝาก - ถอนเงินจากผู้ใช้บริการ', 'ประสานงานกับธนาคารออมสิน', 'ส่งเสริมและสนับสนุนกิจกรรมธนาคารโรงเรียนให้เป็นไปด้วยความเรียบร้อย'] },
  control: { title: 'งานควบคุมภายใน', en: 'INTERNAL CONTROL', sheet: 'งานควบคุมภายใน', type: 'control-alert', label: 'ควบคุมภายใน',
    scope: ['จัดวางระบบการควบคุมภายในที่ดำเนินการประจำปีงบประมาณ', 'ติดตามการปฏิบัติตามระบบควบคุมภายในอย่างต่อเนื่อง',
      'ประเมินประสิทธิผลตามมาตรฐานการควบคุมภายใน 5 องค์ประกอบ: สภาพแวดล้อมการควบคุม การประเมินความเสี่ยง กิจกรรมการควบคุม สารสนเทศและการสื่อสาร กิจกรรมการติดตามผล',
      'จัดทำรายงานการควบคุมภายใน แบบ ปค.1 ปค.4 ปค.5 และแบบติดตาม ปค.5'] },
  office: { title: 'งานสำนักงาน', en: 'OFFICE WORK', sheet: 'งานสำนักงาน', type: 'office-alert', label: 'งานสำนักงาน',
    scope: ['งานบริหารสำนักงานกลุ่มบริหารงบประมาณ', 'งานสารสนเทศ', 'งานแผนงาน', 'งานจัดซื้อวัสดุ ครุภัณฑ์'] },
  /* หน้ารวมบริการ (ไม่มีบทบาทหน้าที่) — links: page = หน้าในเว็บนี้, url = เว็บภายนอก; pay = แสดงขั้นตอนชำระเงิน */
  student: { title: 'นักเรียนและผู้ปกครอง', en: 'STUDENTS AND PARENTS', sheet: 'งานนักเรียน', type: 'student-alert', types: ['student-alert', 'finance-alert', 'bank-alert'], label: 'นักเรียน', pay: true, linksTitle: 'บริการสำหรับนักเรียนและผู้ปกครอง',
    links: [{ name: 'ชำระเงินบำรุงการศึกษา', en: 'School Billing', url: 'https://schoolbillingdev31.com/SBMVSK/Pages/PrintReportPayInForStudent.aspx' },
      { name: 'งานธนาคารโรงเรียน', en: 'ธนาคารโรงเรียน', page: 'bank' },
      { name: 'งานการเงินและบัญชี', en: 'การเงิน', page: 'finan' }] },
  teacher: { title: 'ครูและบุคลากร', en: 'TEACHERS AND STAFF', sheet: 'งานครู', type: 'teacher-alert', types: ['teacher-alert', 'finance-alert', 'supplies-alert', 'plan-alert', 'document'], label: 'ครู', linksTitle: 'บริการสำหรับครูและบุคลากร',
    links: [{ name: 'สัญญายืมเงิน', en: 'ขั้นที่ 1', page: 'Loan&t=loan' }, { name: 'ส่งคืนเงินยืม', en: 'ขั้นที่ 2', page: 'Loan&t=return' },
      { name: 'ขอเบิกเงิน', en: 'สำรองจ่าย', page: 'Loan&t=adv' }, { name: 'ระบบ e-money', en: 'e-Money', url: 'https://mvsk.ksom2.net/money/index_desktop.php' },
      { name: 'ระบบแผนปฏิบัติงาน', en: 'Planning', url: 'https://planning.mvsk.ac.th/' }, { name: 'แบบฟอร์มต่างๆ สำหรับครูและบุคลากร', en: 'แบบฟอร์ม', url: 'https://drive.google.com/drive/folders/1MAVZSuX1EqYbylITkW2Agn09qH5XHEIA?usp=sharing' },
      { name: 'ตัวอย่างการกรอกแบบฟอร์ม', en: 'ตัวอย่าง', url: 'https://drive.google.com/drive/folders/15tkyyaOcauqCc4JJLilAJgmJBd_7ROIN?usp=sharing' }] }
};

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
    plan: ['Group', GROUPS.plan.title + ' - โรงเรียนมหาวชิราวุธ'],
    bank: ['Group', GROUPS.bank.title + ' - โรงเรียนมหาวชิราวุธ'],
    control: ['Group', GROUPS.control.title + ' - โรงเรียนมหาวชิราวุธ'],
    office: ['Group', GROUPS.office.title + ' - โรงเรียนมหาวชิราวุธ'],
    student: ['Group', GROUPS.student.title + ' - กลุ่มบริหารงานงบประมาณ'],
    teacher: ['Group', GROUPS.teacher.title + ' - กลุ่มบริหารงานงบประมาณ'],
    PrintSign: ['PrintSign', 'ระบบพิมพ์ใบลงชื่อค่าอุปกรณ์การเรียนและเครื่องแบบนักเรียน']
  };
  const p = pages[page] || pages.Budget;
  let t;
  try { t = HtmlService.createTemplateFromFile(p[0]); } catch (err) { t = HtmlService.createTemplateFromFile('Budget'); }
  t.loanTab = (e && e.parameter && e.parameter.t) ? String(e.parameter.t) : '';
  t.gkey = GROUPS[page] ? page : 'plan';
  t.G = GROUPS[t.gkey];
  return t.evaluate().setTitle(p[1])
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setFaviconUrl(faviconUrl);
}

function getScriptUrl() { return ScriptApp.getService().getUrl(); }
function include(name) { return HtmlService.createHtmlOutputFromFile(name).getContent(); }
/** แถบเมนูลอย (ไฟล์ Island) ใช้ร่วมกันทุกหน้า: <?!= island('finan'); ?> */
function island(page) {
  const t = HtmlService.createTemplateFromFile('Island');
  t.page = page || ''; t.url = getScriptUrl();
  let staff = ''; try { staff = getConf_('staffUrl'); } catch (e) { }
  t.staffUrl = staff;
  return t.evaluate().getContent();
}

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
        types: annTypes_(r[5]), type: annTypes_(r[5])[0], links: links,
        pinned: str_(r[21]) === 'PIN', createdAt: m ? Number(m[1]) : 0
      };
    }).reverse();
}

function annTypes_(v) {
  const t = String(v || '').split(/\s*,\s*/).filter(x => ANN_TYPES.indexOf(x) >= 0);
  return t.length ? t : ['alert'];
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
function getFinItems(name) {
  const sh = sheet_(name || 'งานการเงิน');
  if (!sh) return null;
  if (sh.getLastRow() < 2) return [];
  const w = Math.min(14, sh.getMaxColumns());
  return sh.getRange(2, 1, sh.getLastRow() - 1, w).getValues()
    .filter(r => str_(r[0]) && str_(r[3]) && str_(r[6]) !== 'HIDDEN')
    .map(r => {
      const ty = str_(r[1]), o = { type: ['pdf', 'link', 'manual', 'form'].indexOf(ty) >= 0 ? ty : 'video', title: str_(r[2]), date: str_(r[9]), url: str_(r[3]).replace(/\\n/g, '\n'), embed: embedUrl_(r[3]), linkText: str_(r[4]), link: str_(r[5]) };
      if (w > 10) {   // งานพัสดุ: คู่มือ/แบบฟอร์ม มีรูป หมวด บรรทัดเล็ก คำอธิบาย
        const im = str_(r[10]), d = im.match(/\/d\/([\w-]{20,})/) || im.match(/[?&]id=([\w-]{20,})/);
        o.img = d ? 'https://drive.google.com/thumbnail?id=' + d[1] + '&sz=w1000' : im;
        o.cat = str_(r[11]); o.sub = str_(r[12]); o.desc = str_(r[13]);
      }
      return o;
    });
}

/* ข้อมูลหน้าเว็บ (ข่าว สไลด์ งานการเงิน งานพัสดุ) — แคช 5 นาที ล้างอัตโนมัติเมื่อแก้ผ่านระบบการเงิน (webRev เปลี่ยน)
 * ถ้าแก้ในชีตตรง ๆ หน้าเว็บจะเปลี่ยนภายใน 5 นาที */
function getHomeData() {
  let rev = '';
  try { rev = getConf_('webRev'); } catch (e) { }
  const cache = CacheService.getScriptCache(), key = 'home_' + rev;
  try { const c = cache.get(key); if (c) return JSON.parse(c); } catch (e) { }
  const out = buildHomeData_();
  try {
    const j = JSON.stringify(out);
    if (Utilities.newBlob(j).getBytes().length < 100000) cache.put(key, j, 300);
  } catch (e) { }
  return out;
}
function buildHomeData_() {
  let news = [], slides = [];
  try { news = getAnnouncements(); } catch (e) { }
  try { slides = getSlides(); } catch (e) { }
  let staffUrl = '';
  try { staffUrl = getConf_('staffUrl'); } catch (e) { }
  let fin = null;
  try { fin = getFinItems(); } catch (e) { }
  let sup = null;
  try { sup = getFinItems('งานพัสดุ'); } catch (e) { }
  let pay = null;
  try { pay = getFinItems('ขั้นตอนชำระเงิน'); } catch (e) { }
  const groups = {};
  Object.keys(GROUPS).forEach(k => { try { groups[k] = getFinItems(GROUPS[k].sheet); } catch (e) { groups[k] = null; } });
  return { news: news, slides: slides, staffUrl: staffUrl, fin: fin, sup: sup, pay: pay, groups: groups };
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
