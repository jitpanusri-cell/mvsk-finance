/*******************************************************************
 * ระบบงบประมาณ สพฐ. (โครงการสนับสนุนค่าใช้จ่ายในการจัดการศึกษา)
 * โรงเรียนมหาวชิราวุธ จังหวัดสงขลา — Google Apps Script Web App
 *
 * Code.gs : ค่าคงที่ โครงสร้างชีต ผู้ใช้/สิทธิ์ ฟังก์ชันกลาง และแดชบอร์ด
 * ไฟล์อื่น : Allocation.gs (หนังสือจัดสรร + นำเข้าตารางเดิม), Activity.gs, Student.gs,
 *           Account.gs (ข้อมูลฝ่ายบัญชี), Reconcile.gs (กระทบยอด), Refund.gs, Report.gs, Finance.gs,
 *           Balance25.gs (ยอดคงเหลือ 25 รายการ), KTB.gs (แจ้งโอนเงิน KTB รายวัน),
 *           Documents.gs (ขอยืม/ขอเบิก + พิมพ์เอกสารราชการ 10 แบบฟอร์ม),
 *           Print.gs (ศูนย์รวมพิมพ์/ส่งออกเอกสาร + บันทึก PDF ลง Drive อัตโนมัติ)
 *           Index.html / CSS.html / JS.html (หน้าเว็บ)
 *******************************************************************/

const APP_VERSION = '3.2.0';
const SCHEMA_VERSION = '15';

/* ---------- รายการเงิน 5 รายการ (ค่าเริ่มต้น — แก้ไขได้ในชีต FundTypes) ---------- */
const DEFAULT_FUNDS = [
  { code: 'TEACH',   name: 'ค่าจัดการเรียนการสอน',        short: 'จัดการเรียนการสอน', color: '#1F3A5F', target: 'school',   term1Only: false, order: 1 },
  { code: 'ACT',     name: 'ค่ากิจกรรมพัฒนาคุณภาพผู้เรียน', short: 'กิจกรรมพัฒนาผู้เรียน', color: '#4A7FB5', target: 'school',   term1Only: false, order: 2 },
  { code: 'EQUIP',   name: 'ค่าอุปกรณ์การเรียน',           short: 'อุปกรณ์การเรียน',    color: '#C99A3E', target: 'student',  term1Only: false, order: 3 },
  { code: 'UNIFORM', name: 'ค่าเครื่องแบบนักเรียน',        short: 'เครื่องแบบนักเรียน',  color: '#6F8F45', target: 'student',  term1Only: true,  order: 4 },
  { code: 'BOOK',    name: 'ค่าหนังสือเรียน',              short: 'หนังสือเรียน',       color: '#8E4F7E', target: 'purchase', term1Only: true,  order: 5 }
];
const FUND_CODES = DEFAULT_FUNDS.map(f => f.code);

/* ---------- โครงสร้างชีตทั้งหมด (ชื่อชีต → หัวคอลัมน์) ---------- */
const SCHEMA = {
  Settings:         ['key', 'label', 'value'],
  FundTypes:        ['code', 'name', 'short', 'color', 'target', 'term1Only', 'order', 'active'],
  Users:            ['email', 'name', 'role', 'active', 'note', 'rooms'],
  Allocations:      ['id', 'docNo', 'docDate', 'fy', 'term', 'round', 'countDate', 'studentsLower', 'studentsUpper',
                     'TEACH', 'ACT', 'EQUIP', 'UNIFORM', 'BOOK', 'total', 'pdfUrl', 'status', 'note', 'source', 'createdBy', 'createdAt', 'tranche'],
  Receipts_Finance: ['id', 'date', 'fy', 'term', 'allocId', 'fund', 'amount', 'refNo', 'note', 'source', 'createdBy', 'createdAt'],
  Expenses_Finance: ['id', 'date', 'fy', 'term', 'fund', 'voucherNo', 'chequeNo', 'project', 'payee', 'description', 'amount',
                     'note', 'source', 'createdBy', 'createdAt', 'activityId'],
  Activities:       ['id', 'fy', 'code', 'name', 'dept', 'owner', 'TEACH', 'ACT', 'EQUIP', 'UNIFORM', 'BOOK', 'budget',
                     'status', 'note', 'createdBy', 'createdAt', 'updatedAt'],
  Receipts_Account: ['id', 'date', 'fy', 'fund', 'amount', 'refNo', 'note', 'createdBy', 'createdAt'],
  Expenses_Account: ['id', 'date', 'fy', 'fund', 'amount', 'refNo', 'note', 'createdBy', 'createdAt'],
  Reconcile_Log:    ['id', 'fy', 'fund', 'month', 'side', 'finance', 'account', 'diff', 'reason', 'by', 'at'],
  AuditLog:         ['at', 'user', 'action', 'sheet', 'recordId', 'detail'],
  Students:         ['studentId', 'prefix', 'firstName', 'lastName', 'grade', 'room', 'level', 'status', 'updatedAt', 'acadYear', 'no', 'citizenId', 'bankAccount', 'bank'],
  StudentPayments:  ['id', 'studentId', 'term', 'fund', 'amount', 'paidDate', 'by', 'note', 'createdAt', 'batch'],
  /* เหตุผลที่นักเรียนต้องโอนในครั้งที่ 2 เป็นต้นไป (ต่อภาคเรียน): returned = ตีกลับ/โอนไม่สำเร็จ (ค่าเริ่มต้น ไม่ต้องบันทึก),
     new = นักเรียนเข้าใหม่, wrong = โอนผิดบัญชี */
  StudentRetry:     ['id', 'term', 'studentId', 'reason', 'updatedBy', 'updatedAt'],
  Refunds:          ['id', 'fy', 'fund', 'source', 'amount', 'docNo', 'status', 'refundDate', 'evidenceUrl', 'note', 'createdBy', 'createdAt'],
  RefundRules:      ['fy', 'fund', 'condition', 'docNo', 'note'],
  Balance25_Items:  ['id', 'category', 'name', 'mode', 'fundCode'],
  Balance25_Tx:     ['id', 'itemId', 'fy', 'date', 'direction', 'amount', 'note', 'createdBy', 'createdAt'],
  Balance25_Manual: ['id', 'fy', 'itemId', 'value', 'updatedAt', 'updatedBy'],
  KTB_Batches:      ['id', 'fy', 'date', 'bankAccount', 'fundSource', 'createdBy', 'createdAt'],
  KTB_Items:        ['id', 'batchId', 'no', 'expenseCat', 'activityId', 'itemId', 'name', 'isGroup', 'groupCount',
                     'groupNames', 'amount', 'loanFlag', 'loanDueDate', 'loanStatus', 'note', 'createdBy', 'createdAt', 'customName'],
  Doc_Requests:     ['id', 'fy', 'kind', 'teacherName', 'teacherPos', 'teacherDept', 'activityId', 'activityName',
                     'purpose', 'province', 'dateFrom', 'dateTo', 'people', 'perdiemRate', 'perdiemDays', 'lodgeRate', 'lodgeDays',
                     'transportRoutes', 'transportAmount', 'otherDesc', 'otherAmount', 'total', 'loanContractNo', 'loanDate',
                     'loanDueDate', 'fund', 'amount', 'status', 'transferredAt', 'ktbItemId', 'note', 'createdBy', 'createdAt',
                     'teacherLevel', 'orderRef', 'departPlace', 'departAt', 'returnPlace', 'returnAt', 'address', 'itemsText', 'attachCount', 'docDate'],
  Doc_LoanReturns:  ['id', 'requestId', 'seq', 'date', 'kind', 'amount', 'remain', 'receiptNo', 'note', 'createdBy', 'createdAt'],
  PrintLog:         ['id', 'title', 'page', 'fileUrl', 'createdBy', 'createdAt']
};

/* ---------- สิทธิ์ผู้ใช้ ---------- */
const ROLES = {
  admin:   { label: 'ผู้ดูแลระบบ',       pages: '*' },
  exec:    { label: 'ผู้บริหาร',         pages: ['dashboard', 'allocation', 'activity', 'reconcile', 'balance', 'refund', 'students', 'ktb', 'docs', 'print'] },
  finance: { label: 'เจ้าหน้าที่การเงิน', pages: ['dashboard', 'allocation', 'receipt', 'expense', 'activity', 'reconcile', 'balance', 'refund', 'students', 'ktb', 'docs', 'print'] },
  account: { label: 'เจ้าหน้าที่บัญชี',   pages: ['dashboard', 'allocation', 'activity', 'account', 'reconcile', 'balance', 'ktb', 'docs', 'print'] },
  teacher: { label: 'ครูที่ปรึกษา',       pages: ['students', 'docs'] }
};
/* บทบาทที่บันทึก/แก้ไขข้อมูลได้ แยกตามกลุ่มงาน */
const WRITE_ROLES = {
  allocation: ['admin', 'finance'],
  finance:    ['admin', 'finance'],
  account:    ['admin', 'account'],
  reconcile:  ['admin', 'finance', 'account'],
  student:    ['admin', 'finance', 'teacher'],
  settings:   ['admin'],
  ktb:        ['admin', 'finance'],
  docs:       ['admin', 'finance', 'teacher']
};

/* ================================================================
 * Web App
 * ================================================================ */
function doGet() {
  ensureSchema_();
  const user = currentUser_();
  if (!user.role) {
    return HtmlService.createHtmlOutput(
      '<div style="font-family:sans-serif;padding:40px;text-align:center">' +
      '<h2>ไม่มีสิทธิ์เข้าใช้งาน</h2><p>บัญชี ' + escHtml_(user.email || '(ไม่ทราบอีเมล)') +
      ' ยังไม่ได้รับสิทธิ์ กรุณาติดต่อผู้ดูแลระบบให้เพิ่มในชีต Users</p>' +
      (user.email ? '' : '<p style="color:#666">ระบบอ่านอีเมลผู้ใช้ไม่ได้ — ให้ Deploy แบบ "เรียกใช้ในฐานะ: ผู้ใช้ที่เข้าถึงเว็บแอป" และแชร์ไฟล์ชีตให้ผู้ใช้</p>') +
      '</div>')
      .setTitle('งบประมาณ สพฐ.');
  }
  return withBoot_(HtmlService.createTemplateFromFile('Index').evaluate())
    .setTitle('งบประมาณ สพฐ. — ' + (getSetting_('schoolName') || ''))
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** แทรกไฟล์ HTML ย่อย (CSS.html / JS.html) ใน Index.html */
function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

/** เมนูใน Google Sheet */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('ระบบงบประมาณ สพฐ.')
    .addItem('1) สร้าง/ตรวจสอบโครงสร้างชีต', 'setup')
    .addItem('2) นำเข้าตารางเดิม (ปีงบ68, ปีงบ69)', 'menuImportLegacy_')
    .addItem('แสดงลิงก์เว็บแอป', 'menuShowUrl_')
    .addToUi();
}
function menuShowUrl_() {
  SpreadsheetApp.getUi().alert(ScriptApp.getService().getUrl() || 'ยังไม่ได้ Deploy เป็น Web App');
}
function menuImportLegacy_() {
  const r = importLegacySheets(['ปีงบ68', 'ปีงบ69']);
  SpreadsheetApp.getUi().alert(r.messages.join('\n'));
}

/** ข้อมูลเริ่มต้นที่หน้าเว็บต้องใช้ (เรียกครั้งแรกตอนเปิดหน้า) */
function getBootstrap() {
  const user = currentUser_();
  if (!user.role) throw new Error('ไม่มีสิทธิ์เข้าใช้งาน');
  const s = getSettingsMap_();
  const fyNow = fyOf_(todayIso_());
  const fys = {};
  fys[fyNow] = 1;
  if (s.currentFy) fys[Number(s.currentFy)] = 1;
  readObjects_('Allocations').forEach(a => { if (a.fy) fys[Number(a.fy)] = 1; });
  return {
    version: APP_VERSION,
    user: user,
    school: { name: s.schoolName || '', area: s.area || '' },
    funds: getFunds_(),
    fyList: Object.keys(fys).map(Number).sort((a, b) => b - a),
    currentFy: Number(s.currentFy) || fyNow,
    today: todayIso_()
  };
}

/**
 * รวม getDashboard + getBalance25 เป็นการเรียกเซิร์ฟเวอร์ครั้งเดียว (ใช้ตอนโหลด/รีเฟรชแดชบอร์ด)
 * หมายเหตุ: ไม่รวม getBootstrap เข้าไปด้วย เพราะ getBootstrap ข้อมูลเล็กและเร็วมาก (แค่ผู้ใช้/รายชื่อ
 * ปีงบ) ควรให้เมนูซ้าย+ส่วนหัวของเว็บแสดงผลได้ทันทีก่อน ไม่ต้องรอให้แดชบอร์ด (คำนวณหนักกว่ามาก เพราะ
 * อ่านชีต Allocations/Receipts/Expenses หลายพันแถว) คำนวณเสร็จก่อน — ถ้ารวมเป็นคำสั่งเดียวกันหมด ผู้ใช้
 * จะเห็นหน้าจอว่างเปล่านานขึ้นกว่าเดิม ขัดกับเป้าหมายที่อยากให้คลิกแล้วเห็นผลไว
 */
function getDashboardFull(fy, term) {
  const dashboard = getDashboard(fy, term);
  let balance25 = null;
  try { balance25 = getBalance25(fy); } catch (e) { /* ไม่ให้ error ของ Balance25 บังหน้าแดชบอร์ดหลัก */ }
  return { dashboard: dashboard, balance25: balance25 };
}

/* ================================================================
 * แดชบอร์ด
 * ================================================================ */
/**
 * สรุปข้อมูลแดชบอร์ด
 * @param {number} fy   ปีงบประมาณ (พ.ศ.) เช่น 2569
 * @param {string} term 'ALL' = ทั้งปีงบ หรือ '2/2568' / '1/2569'
 */
function getDashboard(fy, term) {
  requirePage_('dashboard');
  fy = Number(fy) || fyOf_(todayIso_());
  term = term || 'ALL';
  const all = term === 'ALL';
  const inScope = r => Number(r.fy) === fy && (all || String(r.term) === term);

  const funds = getFunds_();
  const s = getSettingsMap_();
  const allocs = readObjects_('Allocations').filter(inScope);
  const rec = readObjects_('Receipts_Finance').filter(inScope);
  const exp = readExpenses_().filter(inScope);
  // ฝ่ายบัญชีบันทึกตามปีงบ (ไม่แยกภาคเรียน) → เทียบยอดทั้งปีงบเสมอ
  const recFyAll = readObjects_('Receipts_Finance').filter(r => Number(r.fy) === fy);
  const expFyAll = readExpenses_().filter(r => Number(r.fy) === fy);
  const accR = readObjects_('Receipts_Account').filter(r => Number(r.fy) === fy);
  const accE = readObjects_('Expenses_Account').filter(r => Number(r.fy) === fy);

  const sumBy = (rows, code, key) => rows.filter(r => r.fund === code).reduce((a, r) => a + num_(r[key || 'amount']), 0);

  // % ของภาคเรียนที่ได้รับแล้ว (เช่น ภาค 1/69 ได้งวด 70% แล้ว รองวด 30%)
  const allAllocsFy = readObjects_('Allocations').filter(a => Number(a.fy) === fy);
  const scopeTerms = all ? termsOfFy_(fy).map(t => t.key) : [term];
  const termPct = {};
  scopeTerms.forEach(t => termPct[t] = termPctOf_(t, allAllocsFy, s));

  const rows = funds.map(f => {
    const allocated = allocs.reduce((a, r) => a + num_(r[f.code]), 0);
    // ยอดที่คาดว่าจะได้ทั้งภาค = ยอดที่ได้แล้ว ÷ % ที่ได้แล้ว (ประมาณการ)
    const expected = scopeTerms.reduce((a, t) => {
      const got = allocs.filter(r => String(r.term) === t).reduce((x, r) => x + num_(r[f.code]), 0);
      return a + (termPct[t] > 0 ? got * 100 / termPct[t] : got);
    }, 0);
    const opening = all ? num_(s['open_' + fy + '_' + f.code]) : 0;
    const received = sumBy(rec, f.code);
    const spent = sumBy(exp, f.code);
    const balance = opening + received - spent;
    const base = opening + allocated;
    // เทียบการเงิน vs บัญชี (ทั้งปีงบ)
    const finIn = sumBy(recFyAll, f.code), finOut = sumBy(expFyAll, f.code);
    const accIn = sumBy(accR, f.code), accOut = sumBy(accE, f.code);
    const hasAcc = accR.some(r => r.fund === f.code) || accE.some(r => r.fund === f.code);
    const hasFin = finIn !== 0 || finOut !== 0;
    let match = 'nodata';
    if (hasAcc) match = (same_(finIn, accIn) && same_(finOut, accOut)) ? 'match' : 'diff';
    return {
      code: f.code, name: f.name, short: f.short, color: f.color, target: f.target,
      opening: round2_(opening), allocated: round2_(allocated), received: round2_(received),
      expected: Math.round(expected), pending: Math.max(0, Math.round(expected) - round2_(allocated)),
      spent: round2_(spent), balance: round2_(balance),
      pctSpent: base > 0 ? round2_(spent / base * 100) : 0,
      pctReceived: allocated > 0 ? round2_(received / allocated * 100) : 0,
      fin: { in: round2_(finIn), out: round2_(finOut) },
      acc: { in: round2_(accIn), out: round2_(accOut) },
      hasFin: hasFin, match: match
    };
  });

  const T = k => round2_(rows.reduce((a, r) => a + r[k], 0));
  const total = {
    opening: T('opening'), allocated: T('allocated'), received: T('received'), spent: T('spent'), balance: T('balance'),
    expected: T('expected'), pending: T('pending')
  };
  total.pctSpent = (total.opening + total.allocated) > 0 ? round2_(total.spent / (total.opening + total.allocated) * 100) : 0;
  total.pctReceived = total.allocated > 0 ? round2_(total.received / total.allocated * 100) : 0;
  total.matchCount = rows.filter(r => r.match === 'match').length;
  total.diffCount = rows.filter(r => r.match === 'diff').length;

  // รายจ่ายรายเดือน ต.ค.–ก.ย.
  const months = [];
  for (let i = 0; i < 12; i++) {
    const m = (9 + i) % 12 + 1;                       // 10,11,12,1..9
    const y = (m >= 10 ? fy - 544 : fy - 543);        // ค.ศ.
    months.push({ ym: y + '-' + pad2_(m), month: m, yearBE: y + 543, total: 0, byFund: {} });
  }
  exp.forEach(r => {
    const mm = months.find(x => String(r.date).slice(0, 7) === x.ym);
    if (!mm) return;
    const a = num_(r.amount);
    mm.total += a;
    mm.byFund[r.fund] = (mm.byFund[r.fund] || 0) + a;
  });
  months.forEach(m => { m.total = round2_(m.total); });

  const rounds = calcRoundPercent(fy, term);
  // ใช้ยอดรองวดระดับภาคเรียน (ปัดครั้งเดียว) ให้ตรงกับการ์ดงวดเงิน
  total.pending = rounds.reduce((a, t) => a + t.pending, 0);
  total.expected = round2_(total.allocated + total.pending);
  const alerts = buildAlerts_(fy, term, rows, allocs, readObjects_('Receipts_Finance'), exp);
  rounds.filter(t => t.rounds.length && t.pctReceived < 100).forEach(t => alerts.push({ level: 'info', page: 'allocation',
    title: 'ภาค ' + t.label + ' ได้รับแล้ว ' + t.pctReceived + '% รองวดที่เหลือ ' + (100 - t.pctReceived) + '%',
    detail: 'คาดว่าจะได้อีกประมาณ ' + money_(t.pending) + ' บาท (ประมาณจากสัดส่วน)' }));

  return {
    fy: fy, term: term, terms: termsOfFy_(fy), asOf: todayIso_(),
    rows: rows, total: total, months: months, rounds: rounds, alerts: alerts,
    empty: allocs.length === 0 && rec.length === 0 && exp.length === 0
  };
}

/**
 * คำนวณสัดส่วน (%) ของแต่ละงวดเงินในภาคเรียน จากยอดจริง (ไม่บังคับ 70/30)
 * เทียบกับยอดทั้งภาคที่คาดว่าจะได้ (ยอดที่ได้แล้ว ÷ % ที่ได้รับแล้ว)
 * @return {Array<{term,label,total,pctReceived,expected,pending,rounds:[]}>}
 */
function calcRoundPercent(fy, term) {
  fy = Number(fy);
  const s = getSettingsMap_();
  const allocs = readObjects_('Allocations').filter(a => Number(a.fy) === fy);
  const receipts = readObjects_('Receipts_Finance');
  const terms = (!term || term === 'ALL') ? termsOfFy_(fy).map(t => t.key) : [term];
  return terms.map(t => {
    const list = allocs.filter(a => String(a.term) === t)
      .sort((a, b) => num_(a.round) - num_(b.round));
    const termTotal = list.reduce((x, a) => x + num_(a.total), 0);
    const pct = termPctOf_(t, allocs, s);
    const expected = pct > 0 ? termTotal * 100 / pct : termTotal;
    return {
      term: t, label: termLabel_(t), total: round2_(termTotal),
      pctReceived: pct, pctSource: String(s['termPct_' + t] || '') !== '' ? 'setting' : (list.some(a => a.tranche) ? 'sheet' : 'default'),
      expected: Math.round(expected), pending: Math.max(0, Math.round(expected - termTotal)),
      rounds: list.map(a => {
        const received = receipts.filter(r => r.allocId === a.id).reduce((x, r) => x + num_(r.amount), 0);
        return {
          id: a.id, round: num_(a.round), docNo: a.docNo, docDate: a.docDate, tranche: a.tranche || '',
          countDate: a.countDate, studentsLower: num_(a.studentsLower), studentsUpper: num_(a.studentsUpper),
          total: round2_(num_(a.total)), received: round2_(received),
          pct: expected > 0 ? round2_(num_(a.total) / expected * 100) : 0,
          status: a.status || 'รอตรวจ', estimated: /ประมาณ/.test(String(a.note || ''))
        };
      })
    };
  });
}

/**
 * % ของภาคเรียนที่ได้รับแล้ว
 * 1) ตั้งค่าไว้ใน Settings: termPct_1/2569 = 70
 * 2) คอลัมน์ "เปอร์เซนต์" ในตารางเดิม (70(1), 70(2), 30 → 100)
 * 3) ไม่มีข้อมูล → ถือว่าได้ครบ 100%
 */
function termPctOf_(t, allocs, s) {
  const v = String((s || {})['termPct_' + t] == null ? '' : s['termPct_' + t]).trim();
  if (v !== '' && num_(v) > 0) return Math.min(100, num_(v));
  const tr = {};
  allocs.filter(a => String(a.term) === t && a.tranche !== '' && a.tranche != null)
    .forEach(a => tr[String(a.tranche).replace(/\(.*$/, '')] = 1);
  const sum = Object.keys(tr).reduce((x, k) => x + num_(k), 0);
  return sum > 0 ? Math.min(100, sum) : 100;
}

/** บันทึก % ที่ได้รับแล้วของภาคเรียน (เช่น 70 เมื่อยังไม่ได้งวด 30%) */
function saveTermPct(term, pct) {
  requireWrite_('allocation');
  if (!/^[12]\/\d{4}$/.test(String(term))) throw new Error('ภาคเรียนไม่ถูกต้อง');
  pct = num_(pct);
  if (!(pct > 0 && pct <= 100)) throw new Error('เปอร์เซ็นต์ต้องอยู่ระหว่าง 1–100');
  const key = 'termPct_' + term;
  withLock_(() => {
    if (!updateObject_('Settings', key, { value: pct }))
      appendObject_('Settings', { key: key, label: '% ที่ได้รับแล้วของภาค ' + term, value: pct });
  });
  audit_('update', 'Settings', key, { value: pct });
  return pct;
}

/** รวบรวม "เรื่องที่ต้องติดตาม" (level: danger | warn | info) */
function buildAlerts_(fy, term, rows, allocs, allReceipts, exp) {
  const out = [];
  const money = n => money_(n) + ' บาท';
  rows.forEach(r => {
    if (r.balance < -0.004) out.push({ level: 'danger', page: 'expense',
      title: r.short + ' จ่ายเกินเงินที่มี', detail: 'ติดลบ ' + money(-r.balance) });
    if (r.match === 'diff') out.push({ level: 'danger', page: 'reconcile',
      title: r.short + ' ยอดการเงินกับบัญชีไม่ตรงกัน',
      detail: 'รับต่าง ' + money(r.fin.in - r.acc.in) + ' · จ่ายต่าง ' + money(r.fin.out - r.acc.out) });
    if (r.target === 'student' && r.received > r.spent + 0.004) out.push({ level: 'warn', page: 'students',
      title: r.short + ' ยังจ่ายให้นักเรียนไม่ครบ', detail: 'คงค้าง ' + money(r.received - r.spent) });
  });
  const noAcc = rows.filter(r => r.match === 'nodata' && r.hasFin);
  if (noAcc.length) out.push({ level: 'info', page: 'account',
    title: 'ฝ่ายบัญชียังไม่บันทึกยอด ' + noAcc.length + ' รายการเงิน',
    detail: noAcc.map(r => r.short).join(', ') + ' — บันทึกยอดทะเบียนคุมเงินเพื่อกระทบยอด' });
  const pending = [];
  allocs.forEach(a => {
    const rec = allReceipts.filter(x => x.allocId === a.id).reduce((s, x) => s + num_(x.amount), 0);
    const label = 'ภาค ' + termLabel_(a.term) + ' ครั้งที่ ' + a.round;
    if (rec + 0.004 < num_(a.total)) out.push({ level: 'warn', page: 'receipt',
      title: 'เงินเข้าบัญชียังไม่ครบ ' + label, detail: 'ขาด ' + money(num_(a.total) - rec) });
    else if (rec > num_(a.total) + 0.004) out.push({ level: 'danger', page: 'receipt',
      title: 'เงินเข้าบัญชีเกินหนังสือจัดสรร ' + label, detail: 'เกิน ' + money(rec - num_(a.total)) });
    if (a.status !== 'ok') pending.push(a);
  });
  if (pending.length) {
    const noDoc = pending.filter(a => !a.docNo).length;
    out.push({ level: 'warn', page: 'allocation',
      title: 'หนังสือจัดสรร ' + pending.length + ' งวดรอตรวจ',
      detail: pending.map(a => termLabel_(a.term) + ' ครั้งที่ ' + a.round).join(', ') +
        (noDoc ? ' · ยังไม่มีเลขที่หนังสือ ' + noDoc + ' งวด' : '') });
  }
  const est = exp.filter(e => /ประมาณ/.test(String(e.note || ''))).length;
  if (est) out.push({ level: 'warn', page: 'expense',
    title: 'รายจ่าย ' + est + ' รายการใช้วันที่ประมาณ', detail: 'แก้เป็นวันที่ตามฎีกาจริง' });
  const rank = { danger: 0, warn: 1, info: 2 };
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}

/* ================================================================
 * โครงสร้างชีต (Setup)
 * ================================================================ */
/** สร้างชีตทั้งหมด + ข้อมูลตั้งต้น (เรียกซ้ำได้ ไม่ลบข้อมูลเดิม) */
function setup() {
  const ss = ss_();
  Object.keys(SCHEMA).forEach(name => {
    const head = SCHEMA[name];
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const lastCol = Math.max(sh.getLastColumn(), 1);
    const cur = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
    // เพิ่มหัวคอลัมน์ที่ยังไม่มี (รองรับการอัปเดตเวอร์ชัน)
    const missing = head.filter(h => cur.indexOf(h) < 0);
    if (cur.join('') === '') {
      sh.getRange(1, 1, 1, head.length).setValues([head]);
    } else if (missing.length) {
      sh.getRange(1, cur.length + 1, 1, missing.length).setValues([missing]);
    }
    sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#16263D').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  });
  seedFunds_();
  seedSettings_();
  seedUsers_();
  seedBalance25_();
  PropertiesService.getScriptProperties().setProperty('SCHEMA_VERSION', SCHEMA_VERSION);
  return 'ok';
}

function ensureSchema_() {
  if (PropertiesService.getScriptProperties().getProperty('SCHEMA_VERSION') !== SCHEMA_VERSION) setup();
}

function seedFunds_() {
  if (readObjects_('FundTypes').length) return;
  DEFAULT_FUNDS.forEach(f => appendObject_('FundTypes', Object.assign({ active: true }, f)));
}

function seedSettings_() {
  const fy = fyOf_(todayIso_());
  const defs = [
    ['schoolName', 'ชื่อโรงเรียน', 'โรงเรียนมหาวชิราวุธ จังหวัดสงขลา'],
    ['area', 'สังกัด', 'สำนักงานเขตพื้นที่การศึกษามัธยมศึกษาสงขลา สตูล'],
    ['docPrefix', 'เลขที่หนังสือ (ที่)', 'ศธ '],
    ['currentFy', 'ปีงบประมาณปัจจุบัน (พ.ศ.)', fy],
    ['director', 'ชื่อผู้อำนวยการ', ''],
    ['deputy', 'ชื่อรองผู้อำนวยการ (กลุ่มบริหารงบประมาณ)', ''],
    ['finOfficer', 'ชื่อเจ้าหน้าที่การเงิน', ''],
    ['accOfficer', 'ชื่อเจ้าหน้าที่บัญชี', ''],
    ['driveFolderId', 'ID โฟลเดอร์ Drive เก็บเอกสาร', ''],
    ['garudaUrl', 'ลิงก์รูปตราครุฑ (สำหรับบันทึกข้อความ, ว่าง = ไม่แสดง)', ''],
    ['legacySpreadsheetId', 'ID สเปรดชีตตารางเดิม (ว่าง = ไฟล์นี้)', ''],
    ['rateEquipLower', 'อัตราค่าอุปกรณ์ ม.ต้น (บาท/คน/ภาค)', 260],
    ['rateEquipUpper', 'อัตราค่าอุปกรณ์ ม.ปลาย (บาท/คน/ภาค)', 260],
    ['rateUniformLower', 'อัตราค่าเครื่องแบบ ม.ต้น (บาท/คน/ปี)', 500],
    ['rateUniformUpper', 'อัตราค่าเครื่องแบบ ม.ปลาย (บาท/คน/ปี)', 550],
    ['payDeadline_EQUIP', 'วันสุดท้ายให้นักเรียนรับค่าอุปกรณ์ (yyyy-mm-dd, ว่าง = ไม่กำหนด)', ''],
    ['payDeadline_UNIFORM', 'วันสุดท้ายให้นักเรียนรับค่าเครื่องแบบ (yyyy-mm-dd, ว่าง = ไม่กำหนด)', ''],
    ['perdiemRate', 'อัตราค่าเบี้ยเลี้ยงเดินทาง (บาท/วัน/คน)', 240],
    ['lodgeRate', 'อัตราค่าที่พักเดินทาง (บาท/วัน/คน)', 800]
  ];
  [fy - 1, fy].forEach(y => FUND_CODES.forEach(c => {
    defs.push(['open_' + y + '_' + c, 'ยอดยกมาต้นปีงบ ' + y + ' – ' + fundName_(c), 0]);
  }));
  // แก้อัตราต่อหัวตัวอย่างรุ่นแรก (420/460/450/500) เป็นอัตราที่คำนวณจากยอดจัดสรรจริง
  const OLD = { rateEquipLower: [420, 260], rateEquipUpper: [460, 260], rateUniformLower: [450, 500], rateUniformUpper: [500, 550] };
  readObjects_('Settings').forEach(r => {
    if (OLD[r.key] && num_(r.value) === OLD[r.key][0] && !isTrue_(getScriptFlag_('ratesFixed'))) updateObject_('Settings', r.key, { value: OLD[r.key][1] });
  });
  setScriptFlag_('ratesFixed', 'true');
  const have = readObjects_('Settings').map(r => r.key);
  defs.filter(d => have.indexOf(d[0]) < 0)
    .forEach(d => appendObject_('Settings', { key: d[0], label: d[1], value: d[2] }));
}

function seedUsers_() {
  if (readObjects_('Users').length) return;
  const email = Session.getEffectiveUser().getEmail();
  if (email) appendObject_('Users', { email: email, name: 'ผู้ติดตั้งระบบ', role: 'admin', active: true, note: 'สร้างอัตโนมัติ' });
}

/* ================================================================
 * ผู้ใช้และสิทธิ์
 * ================================================================ */
let _curUserCache_ = null;
function currentUser_() {
  if (_curUserCache_) return _curUserCache_;    // อีเมลผู้ใช้ไม่เปลี่ยนระหว่างการรัน 1 ครั้ง — แคชไว้กันอ่านชีต Users ซ้ำ
  // ใช้อีเมลผู้เปิดหน้าเว็บเท่านั้น (ไม่ fallback เป็นเจ้าของสคริปต์ เพื่อไม่ให้ทุกคนได้สิทธิ์ admin)
  const email = (Session.getActiveUser().getEmail() || '').toLowerCase();
  const u = readObjects_('Users').find(r => String(r.email).toLowerCase() === email && isTrue_(r.active));
  if (!u || !ROLES[u.role]) return (_curUserCache_ = { email: email, name: '', role: '', roleLabel: '', pages: [] });
  const pages = ROLES[u.role].pages === '*'
    ? ['dashboard', 'allocation', 'receipt', 'expense', 'activity', 'account', 'students', 'reconcile', 'balance', 'refund', 'ktb', 'docs', 'print', 'settings', 'users']
    : ROLES[u.role].pages;
  // ครูที่ปรึกษา: ห้องที่รับผิดชอบ เช่น "ม.1/1, ม.1/2" (ว่าง = ทุกห้อง)
  const rooms = String(u.rooms || '').split(/[,\s]+/).map(x => x.replace(/^ม\.?/, 'ม.')).filter(x => /^ม\.\d\/\d+$/.test(x));
  return (_curUserCache_ = { email: email, name: u.name || email, role: u.role, roleLabel: ROLES[u.role].label, pages: pages, rooms: rooms });
}
function requirePage_(page) {
  const u = currentUser_();
  if (u.pages.indexOf(page) < 0) throw new Error('ไม่มีสิทธิ์เข้าถึงเมนูนี้');
  return u;
}
function requireWrite_(group) {
  const u = currentUser_();
  if ((WRITE_ROLES[group] || []).indexOf(u.role) < 0) throw new Error('บทบาท "' + (u.roleLabel || '-') + '" ไม่มีสิทธิ์บันทึกข้อมูลส่วนนี้');
  return u;
}

/* ================================================================
 * ชั้นข้อมูล (อ่าน/เขียนชีตแบบ object)
 * ----------------------------------------------------------------
 * แคชระดับ "1 ครั้งที่รันสคริปต์" (1 ครั้งของ google.script.run จากหน้าเว็บ) เพื่อลด
 * จำนวนรอบเรียก Sheets API — หน้าเว็บหนึ่งครั้งมักอ่านชีตเดียวกันซ้ำหลายรอบในการเรียก
 * เดียวกัน (เช่น currentUser_ อ่านชีต Users ทุกครั้งที่ requirePage_/requireWrite_ ถูกเรียก,
 * getDashboard อ่าน Receipts_Finance/Expenses_Finance ซ้ำหลายรอบ) การแคชนี้ปลอดภัยเพราะ
 * ตัวแปรระดับไฟล์จะถูกล้างเองเมื่อเริ่มรันสคริปต์ครั้งถัดไปอยู่แล้ว — เมื่อมีการเขียน
 * (append/update/delete) จะล้างแคชของชีตนั้นทันทีกันอ่านข้อมูลเก่าซ้ำในการเรียกเดียวกัน
 * ================================================================ */
let _ss_ = null;
function ss_() { return _ss_ || (_ss_ = SpreadsheetApp.getActiveSpreadsheet()); }

const _shCache_ = {};
/** หาชีต (cache) — คืน null ถ้าไม่พบ */
function _findSheet_(name) {
  if (_shCache_[name]) return _shCache_[name];
  const sh = ss_().getSheetByName(name);
  if (sh) _shCache_[name] = sh;
  return sh || null;
}
function sh_(name) {
  const sh = _findSheet_(name);
  if (!sh) throw new Error('ไม่พบชีต ' + name + ' — กรุณารัน setup()');
  return sh;
}

/*
 * คอลัมน์ที่ต้องเก็บเป็นข้อความเสมอ — ไม่อย่างนั้น Google Sheets จะแปลงเอง
 * เช่น ภาคเรียน "1/2569" กลายเป็นวันที่ ม.ค. 2569, ห้อง "1/2" กลายเป็นวันที่
 */
const TEXT_COLS = ['code', 'term', 'tranche', 'countDate', 'docNo', 'refNo', 'voucherNo', 'chequeNo', 'studentId', 'grade', 'room', 'citizenId', 'bankAccount', 'bankAccount', 'loanContractNo', 'departAt', 'returnAt', 'orderRef'];

const _rowCache_ = {};

/*
 * ออฟเซตเวลา (มิลลิวินาที) ระหว่าง timezone ของสเปรดชีตกับ UTC — คำนวณครั้งเดียวต่อการรัน
 * สคริปต์ 1 ครั้ง แล้วใช้เลขคณิตธรรมดา (getUTCFullYear/getUTCMonth/getUTCDate) แปลงเซลล์
 * วันที่ทุกเซลล์แทนการเรียก Utilities.formatDate ซึ่งเป็นการเรียกบริการของ Google ที่ช้ากว่า
 * เลขคณิต JS ล้วนๆ หลายเท่า — ชีตที่มีวันที่หลายพันแถว (เช่น Expenses_Finance, Receipts_Finance)
 * จะเร็วขึ้นมากเพราะไม่ต้องเรียก Utilities ซ้ำทีละเซลล์อีกต่อไป
 */
let _tzOffsetMs_ = null;
function tzOffsetMs_(tz) {
  if (_tzOffsetMs_ !== null) return _tzOffsetMs_;
  try {
    const now = new Date();
    const asUtc = new Date(Utilities.formatDate(now, 'UTC', "yyyy-MM-dd'T'HH:mm:ss'Z'"));
    const asTz = new Date(Utilities.formatDate(now, tz, "yyyy-MM-dd'T'HH:mm:ss'Z'"));
    _tzOffsetMs_ = asTz.getTime() - asUtc.getTime();
  } catch (e) { _tzOffsetMs_ = 0; }
  return _tzOffsetMs_;
}

/* แคชข้ามการรัน (ข้ามผู้ใช้/ข้าม google.script.run แต่ละครั้ง) ด้วย CacheService — อายุสั้นๆ
 * เพื่อลดรอบเรียก Sheets API ทุกครั้งที่คลิกเปลี่ยนหน้า (เช่น currentUser_ อ่าน Users,
 * getFunds_ อ่าน FundTypes, getSettingsMap_ อ่าน Settings แทบทุกหน้า) ข้อมูลที่ใหญ่กว่า 100KB
 * (ขีดจำกัดต่อ 1 คีย์ของ CacheService) จะถูกตัดเป็นหลายชิ้น (chunk) แล้วเก็บเป็นหลายคีย์
 * แทนที่จะข้ามการแคชไปทั้งหมดแบบเดิม — แก้ปัญหาชีตใหญ่ (เช่น Students/StudentPayments
 * ที่มีนักเรียนหลายพันคน) ไม่เคยถูกแคชเลยเพราะข้อมูล JSON ยาวเกิน 90KB */
const _CACHE_TTL_SEC_ = 45;
const _CACHE_CHUNK_LEN_ = 90000;   // ต่ำกว่าขีดจำกัด ~100KB ต่อคีย์ของ CacheService
const _CACHE_MAX_CHUNKS_ = 40;     // เก็บได้สูงสุด ~3.6MB ต่อชีต กันชีตใหญ่เกินจนแคชไม่คุ้ม
function _cacheGet_(name) {
  try {
    const cache = CacheService.getScriptCache();
    const meta = cache.get('rometa_' + name);
    if (!meta) return null;
    const n = Number(meta);
    if (!n) return null;
    const keys = [];
    for (let i = 0; i < n; i++) keys.push('rochunk_' + name + '_' + i);
    const map = cache.getAll(keys);
    let raw = '';
    for (let i = 0; i < n; i++) {
      const part = map[keys[i]];
      if (part == null) return null;   // ชิ้นใดชิ้นหนึ่งหมดอายุ/หาย → ถือว่าแคชใช้ไม่ได้
      raw += part;
    }
    return JSON.parse(raw);
  } catch (e) { return null; }
}
function _cachePut_(name, rows) {
  try {
    const raw = JSON.stringify(rows);
    const n = Math.max(1, Math.ceil(raw.length / _CACHE_CHUNK_LEN_));
    if (n > _CACHE_MAX_CHUNKS_) { _cacheClear_(name); return; }
    const obj = {};
    for (let i = 0; i < n; i++) obj['rochunk_' + name + '_' + i] = raw.slice(i * _CACHE_CHUNK_LEN_, (i + 1) * _CACHE_CHUNK_LEN_);
    obj['rometa_' + name] = String(n);
    CacheService.getScriptCache().putAll(obj, _CACHE_TTL_SEC_);
  } catch (e) { /* ข้อมูลแปลกเกินแคชได้ — ข้ามไป ไม่กระทบการทำงาน */ }
}
function _cacheClear_(name) {
  try {
    const cache = CacheService.getScriptCache();
    const meta = cache.get('rometa_' + name);
    const n = meta ? Number(meta) : 0;
    const keys = ['rometa_' + name];
    for (let i = 0; i < Math.max(n, _CACHE_MAX_CHUNKS_); i++) keys.push('rochunk_' + name + '_' + i);
    cache.removeAll(keys);
  } catch (e) { /* ignore */ }
}

/** ล้างแคชแถวของชีตนี้ (เรียกทุกครั้งหลังเขียนข้อมูล) — ล้างทั้งแคชในรันนี้และแคชข้ามรัน */
function _clearRowCache_(name) { delete _rowCache_[name]; _cacheClear_(name); }

/** อ่านชีตเป็น array ของ object (วันที่แปลงเป็น 'yyyy-MM-dd') — มีแคชในรันเดียวกัน + แคชข้ามรันสั้นๆ */
function readObjects_(name) {
  if (_rowCache_[name]) return _rowCache_[name].map(o => Object.assign({}, o));   // คืนสำเนา กันโค้ดที่เรียกแก้ทับแคช

  const cached = _cacheGet_(name);
  if (cached) { _rowCache_[name] = cached; return cached.map(o => Object.assign({}, o)); }

  const sh = _findSheet_(name);
  if (!sh || sh.getLastRow() < 2) { _rowCache_[name] = []; _cachePut_(name, []); return []; }
  const data = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
  const head = data.shift().map(String);
  const tz = Session.getScriptTimeZone();
  const offMs = tzOffsetMs_(tz);
  const rows = data.filter(r => r.some(v => v !== '' && v !== null)).map(r => {
    const o = {};
    head.forEach((h, i) => {
      const v = r[i];
      if (v instanceof Date) {
        // แปลงวันที่ด้วยเลขคณิตธรรมดา แทนการเรียก Utilities.formatDate ทีละเซลล์ (ดูหมายเหตุที่ tzOffsetMs_)
        const s = new Date(v.getTime() + offMs);
        const Y = s.getUTCFullYear(), M = s.getUTCMonth() + 1, D = s.getUTCDate();
        // ภาคเรียน "1/2569" ที่ Sheets แปลงเป็นวันที่ 1 ม.ค. 2569 → ปีในเซลล์เป็นเลข พ.ศ. อยู่แล้ว ห้ามบวก 543 ซ้ำ
        // (เหมือน dateToTerm_ เดิม: บวก 543 เฉพาะเมื่อปีเป็น ค.ศ. คือต่ำกว่า 2400)
        if (h === 'term') o[h] = M + '/' + (Y < 2400 ? Y + 543 : Y);
        else if (h === 'countDate') o[h] = D + ' ' + TH_MONTHS[M - 1] + ' ' + (Y + 543);
        else if (h === 'room' || h === 'grade') o[h] = M + '/' + D;
        else o[h] = Y + '-' + pad2_(M) + '-' + pad2_(D);
      } else {
        o[h] = v;
      }
    });
    return o;
  });
  _rowCache_[name] = rows;
  _cachePut_(name, rows);
  return rows.map(o => Object.assign({}, o));
}

/** เพิ่มแถวจาก object ตามลำดับหัวคอลัมน์ */
function appendObject_(name, obj) {
  const sh = sh_(name);
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  sh.appendRow(head.map(h => toCell_(h, obj[h])));
  _clearRowCache_(name);
  return obj;
}

/** เพิ่มหลายแถวในครั้งเดียว (เร็วกว่า appendRow ทีละแถว) */
function appendObjects_(name, list) {
  if (!list.length) return;
  const sh = sh_(name);
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  sh.getRange(sh.getLastRow() + 1, 1, list.length, head.length)
    .setValues(list.map(o => head.map(h => toCell_(h, o[h]))));
  _clearRowCache_(name);
}

/** แก้ไขแถวตาม id (คอลัมน์แรก) */
function updateObject_(name, id, obj) {
  const sh = sh_(name);
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const ids = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues() : [];
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      const rng = sh.getRange(i + 2, 1, 1, head.length);
      const cur = rng.getValues()[0];
      rng.setValues([head.map((h, k) => Object.prototype.hasOwnProperty.call(obj, h) ? toCell_(h, obj[h]) : cur[k])]);
      _clearRowCache_(name);
      return true;
    }
  }
  return false;
}

/** ลบทุกแถวที่ตรงเงื่อนไข (คืนจำนวนที่ลบ) */
function deleteWhere_(name, pred) {
  const sh = sh_(name);
  if (sh.getLastRow() < 2) return 0;
  const lastCol = sh.getLastColumn();
  const head = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  const data = sh.getRange(2, 1, sh.getLastRow() - 1, lastCol).getValues();
  const keep = data.filter(r => {
    const o = {}; head.forEach((h, i) => o[h] = r[i]);
    return !pred(o);
  });
  const removed = data.length - keep.length;
  if (!removed) return 0;
  sh.getRange(2, 1, data.length, lastCol).clearContent();
  if (keep.length) sh.getRange(2, 1, keep.length, lastCol).setValues(keep);
  _clearRowCache_(name);
  return removed;
}

/** เซลล์ภาคเรียนที่ Sheets แปลงเป็นวันที่ (เดือน = ภาค, ปี = ปีการศึกษา) → '1/2569' */
function dateToTerm_(d, tz) {
  const m = Number(Utilities.formatDate(d, tz, 'M'));
  let y = Number(Utilities.formatDate(d, tz, 'yyyy'));
  if (y < 2400) y += 543;
  return m + '/' + y;
}

/**
 * รายจ่ายฝ่ายการเงินที่ใช้คำนวณ
 * ถ้าภาคเรียน+รายการเงินใดเริ่มบันทึกรับเงินรายคนแล้ว (source = studentpay)
 * จะใช้ยอดจากรายชื่อแทนยอดรวมที่นำเข้าจากตารางเดิม เพื่อไม่ให้นับซ้ำ
 */
function readExpenses_() {
  const all = readObjects_('Expenses_Finance');
  const sp = {};
  all.filter(e => e.source === 'studentpay').forEach(e => sp[e.term + '|' + e.fund] = 1);
  return all.filter(e => !(String(e.source || '').indexOf('legacy:') === 0 && sp[e.term + '|' + e.fund]));
}
function getScriptFlag_(k) { return PropertiesService.getScriptProperties().getProperty('FLAG_' + k); }
function setScriptFlag_(k, v) { PropertiesService.getScriptProperties().setProperty('FLAG_' + k, v); }

/** แปลงค่าก่อนเขียนลงเซลล์: คอลัมน์วันที่ 'yyyy-MM-dd' → Date, คอลัมน์ข้อความใส่ ' นำหน้า */
function toCell_(h, v) {
  if (v === undefined || v === null) return '';
  if (TEXT_COLS.indexOf(h) >= 0 && v !== '') return "'" + String(v).replace(/^'/, '');
  if (/^(date|docDate|paidDate|refundDate)$/.test(h) && /^\d{4}-\d{2}-\d{2}$/.test(String(v))) return isoToDate_(v);
  return v;
}

function audit_(action, sheet, id, detail) {
  try {
    appendObject_('AuditLog', { at: new Date(), user: currentUser_().email, action: action, sheet: sheet,
      recordId: id || '', detail: typeof detail === 'string' ? detail : JSON.stringify(detail || {}) });
  } catch (e) { /* ไม่ให้ log ล้มงานหลัก */ }
}

/* ---------- Settings / FundTypes ---------- */
function getSettingsMap_() {
  const m = {};
  readObjects_('Settings').forEach(r => m[r.key] = r.value);
  return m;
}
function getSetting_(k) { return getSettingsMap_()[k]; }

function getFunds_() {
  const rows = readObjects_('FundTypes').filter(r => r.active === '' || isTrue_(r.active));
  const list = rows.length ? rows : DEFAULT_FUNDS;
  return list.map(r => ({
    code: String(r.code), name: String(r.name), short: String(r.short || r.name), color: String(r.color || '#5B6678'),
    target: String(r.target || 'school'), term1Only: isTrue_(r.term1Only), order: num_(r.order)
  })).sort((a, b) => a.order - b.order);
}
function fundName_(code) { const f = DEFAULT_FUNDS.find(x => x.code === code); return f ? f.name : code; }

/* ================================================================
 * ปีงบประมาณ / ภาคเรียน
 * ================================================================ */
/** ปีงบ พ.ศ. ของวันที่ ('yyyy-MM-dd'): ต.ค.–ธ.ค. นับเป็นปีงบถัดไป */
function fyOf_(iso) {
  const p = String(iso).split('-').map(Number);
  return p[0] + 543 + (p[1] >= 10 ? 1 : 0);
}
/** ปีงบ 2569 = ภาค 2/2568 + ภาค 1/2569 */
function termsOfFy_(fy) {
  fy = Number(fy);
  return [
    { key: '2/' + (fy - 1), label: termLabel_('2/' + (fy - 1)), semester: 2, acadYear: fy - 1 },
    { key: '1/' + fy, label: termLabel_('1/' + fy), semester: 1, acadYear: fy }
  ];
}
function termLabel_(t) { const p = String(t).split('/'); return p[0] + '/' + String(p[1] || '').slice(-2); }
function fyRange_(fy) { const ce = Number(fy) - 543; return { from: (ce - 1) + '-10-01', to: ce + '-09-30' }; }

/** เดือน ต.ค.–ก.ย. ของปีงบ พ.ศ. (fy) → [{month, yearBE, ym:'yyyy-MM' (ค.ศ.), label:'ต.ค. 68'}] เรียงตามปฏิทินงบ */
function fyMonths_(fy) {
  fy = Number(fy);
  const out = [];
  for (let i = 0; i < 12; i++) {
    const m = (9 + i) % 12 + 1;                       // 10,11,12,1..9
    const y = (m >= 10 ? fy - 544 : fy - 543);        // ค.ศ.
    out.push({ month: m, yearBE: y + 543, ym: y + '-' + pad2_(m), label: TH_MONTHS_SHORT[m - 1] + ' ' + String(y + 543).slice(-2) });
  }
  return out;
}

/* ================================================================
 * ยูทิลิตีภาษาไทย
 * ================================================================ */
const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const TH_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

/** วันที่ไทย เช่น toThaiDate('2026-09-25') → '25 กันยายน 2569' (short=true → '25 ก.ย. 69') */
function toThaiDate(d, short) {
  let iso = d instanceof Date ? Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(d || '');
  const p = iso.split('-').map(Number);
  if (p.length < 3 || !p[0]) return '';
  return short
    ? p[2] + ' ' + TH_MONTHS_SHORT[p[1] - 1] + ' ' + String(p[0] + 543).slice(-2)
    : p[2] + ' ' + TH_MONTHS[p[1] - 1] + ' ' + (p[0] + 543);
}

/** จำนวนเงินเป็นตัวอักษรไทย เช่น 1250.50 → 'หนึ่งพันสองร้อยห้าสิบบาทห้าสิบสตางค์' */
function thaiBahtText(n) {
  n = round2_(Number(n) || 0);
  if (n === 0) return 'ศูนย์บาทถ้วน';
  const neg = n < 0; n = Math.abs(n);
  const baht = Math.floor(n), satang = Math.round((n - baht) * 100);
  return (neg ? 'ลบ' : '') + (baht ? readThaiNum_(baht, false) + 'บาท' : '') +
    (satang ? readThaiNum_(satang, false) + 'สตางค์' : 'ถ้วน');
}
function readThaiNum_(n, hasHigher) {
  const d = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const p = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];
  if (n >= 1e6) {
    const rest = n % 1e6;
    return readThaiNum_(Math.floor(n / 1e6), hasHigher) + 'ล้าน' + (rest ? readThaiNum_(rest, true) : '');
  }
  const s = String(n), L = s.length;
  let r = '';
  for (let i = 0; i < L; i++) {
    const x = +s[i], pos = L - i - 1;
    if (!x) continue;
    if (pos === 1 && x === 1) r += 'สิบ';
    else if (pos === 1 && x === 2) r += 'ยี่สิบ';
    else if (pos === 0 && x === 1 && (L > 1 || hasHigher)) r += 'เอ็ด';
    else r += d[x] + p[pos];
  }
  return r;
}

/* ---------- ยูทิลิตีทั่วไป ---------- */
function num_(v) {
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  const n = Number(String(v == null ? '' : v).replace(/[,\s฿]/g, ''));
  return isNaN(n) ? 0 : n;
}
function round2_(n) { return Math.round((Number(n) || 0) * 100) / 100; }
function same_(a, b) { return Math.abs(a - b) < 0.005; }
function pad2_(n) { return (n < 10 ? '0' : '') + n; }
function isTrue_(v) { return v === true || /^(true|1|y|yes|ใช่|ใช้งาน)$/i.test(String(v).trim()); }
function money_(n) {
  n = round2_(n);
  return (n < 0 ? '-' : '') + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function todayIso_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function isoToDate_(iso) { const p = String(iso).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
function newId_(prefix) { return (prefix || 'ID') + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 10); }
function escHtml_(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}
