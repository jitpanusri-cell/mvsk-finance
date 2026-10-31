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
    PrintSign: ['PrintSign', 'ระบบพิมพ์ใบลงชื่อค่าอุปกรณ์การเรียนและเครื่องแบบนักเรียน']
  };
  const p = pages[page] || pages.Budget;
  let t;
  try { t = HtmlService.createTemplateFromFile(p[0]); } catch (err) { t = HtmlService.createTemplateFromFile('Budget'); }
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

function getHomeData() {
  let news = [], slides = [];
  try { news = getAnnouncements(); } catch (e) { }
  try { slides = getSlides(); } catch (e) { }
  let staffUrl = '';
  try { staffUrl = getConf_('staffUrl'); } catch (e) { }
  return { news: news, slides: slides, staffUrl: staffUrl };
}
