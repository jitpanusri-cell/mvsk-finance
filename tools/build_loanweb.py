#!/usr/bin/env python3
"""
สร้างไฟล์ Loanweb (หน้า "ยืม ส่งคืน เบิก" สาธารณะ กรอกแล้วพิมพ์ ไม่บันทึกเข้าระบบ)
จาก Index + CSS + JS ของระบบการเงิน — แบบฟอร์มราชการจึงตรงกับระบบการเงินทุกอย่าง
ไม่แก้ไฟล์ของระบบการเงินเลย (แพตช์เฉพาะในไฟล์ผลลัพธ์)

ใช้:  python3 tools/build_loanweb.py      → เขียนไฟล์ Loanweb
นำไปใช้: วาง Loanweb เป็นไฟล์ HTML ชื่อ "Loan" ในโปรเจกต์หน้าเว็บ (Budget)
เมื่อระบบการเงินแก้แบบฟอร์ม (JS/CSS/Index) ให้รันสคริปต์นี้ใหม่
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rd = lambda n: open(os.path.join(ROOT, n), encoding='utf-8').read()

index, css, js = rd('Index'), rd('CSS'), rd('JS')


def sub1(s, old, new, label):
    if s.count(old) != 1:
        sys.exit('แพตช์ไม่ได้ (%s): พบ %d ครั้ง' % (label, s.count(old)))
    return s.replace(old, new)


# 1) ไม่ให้หน้าเริ่มทำงานแบบระบบการเงิน (แดชบอร์ด/เมนู) — หน้าสาธารณะเริ่มเอง
js = sub1(js, "document.addEventListener('DOMContentLoaded', async () => {",
          "if (!window.__PUBLIC_DOCS) document.addEventListener('DOMContentLoaded', async () => {", 'init')
# 2) เรียกเซิร์ฟเวอร์ → ข้อมูลจำลองในหน้า (ไม่บันทึก)
js = sub1(js, "const api = (fn, ...args) => {",
          "const api = (fn, ...args) => {\n  if (window.__PUBLIC_API) return window.__PUBLIC_API(fn, args);", 'api')

js = sub1(js, "'ไม่มีสิทธิ์บันทึก — ดูและพิมพ์ได้อย่างเดียว'", "'กรอกแล้วพิมพ์ได้เลย (ไม่บันทึกเข้าระบบ)'", 'hint')

# 3) ประกอบหน้า: ตัดไฟล์ UI ของเมนูอื่น
index = sub1(index, "<?!= include('CSS'); ?>", css, 'css')
pre = """<script>
window.__PUBLIC_DOCS = true;
window.__LOAN_CONF = <?!= loanConfJson_(); ?>;
window.__LOAN_T = <?!= JSON.stringify(String(loanTab || '')); ?>;
window.__PUBLIC_API = function (fn, args) {
  var C = window.__LOAN_CONF || {};
  if (fn === 'getDocsPageData') {
    var fy = Number(args[0]) || S.fy;
    return Promise.resolve({
      form: { fy: fy, kinds: C.kinds || {}, teachers: [], activities: [], funds: S.boot.funds,
        rates: { perdiem: Number(C.perdiemRate) || 240, lodge: Number(C.lodgeRate) || 800 }, pendingLoans: [], canEdit: false },
      data: { fy: fy, me: '', myName: '', role: 'public', seeAll: false, list: [],
        signers: { director: C.director || '', deputy: C.deputy || '', finOfficer: C.finOfficer || '', accOfficer: C.accOfficer || '' },
        school: { name: C.schoolName || '', area: C.area || '', garudaUrl: C.garudaUrl || '', docPrefix: C.docPrefix || '' },
        canEdit: false }
    });
  }
  return Promise.reject(new Error('หน้านี้ใช้กรอกและพิมพ์เอกสารเท่านั้น ไม่บันทึกเข้าระบบ'));
};
</script>
<style>
  .sidebar, .backdrop, .topbar, #page-docs .dc2-list, #dcFy, #printSaveBar { display: none !important; }
  .main { margin-left: 0 !important; max-width: 1180px; margin: 0 auto !important; }
  .pub-bar { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; font-size: 14px; }
  .pub-bar a { color: inherit; text-decoration: none; display: inline-flex; gap: 6px; align-items: center; }
  .pub-note { background: #FFF7E0; border: 1px solid #F0D58A; color: #7A5A00; border-radius: 10px; padding: 6px 12px; }
  @media print { .pub-bar { display: none !important; } }
</style>
"""
post = """<script>
(function () {
  var C = window.__LOAN_CONF || {};
  var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
  var today = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  var fy = d.getFullYear() + 543 + (d.getMonth() >= 9 ? 1 : 0);
  S.boot = { today: today, currentFy: fy, fyList: [fy - 1, fy, fy + 1], funds: C.funds || [],
    user: { email: '', name: '', role: 'public', roleLabel: '', pages: ['docs'] }, school: { name: C.schoolName || '', area: C.area || '' } };
  S.fy = fy; S.page = 'docs';
  document.querySelectorAll('.page').forEach(function (x) { x.classList.toggle('on', x.id === 'page-docs'); });
  var bar = document.createElement('div');
  bar.className = 'pub-bar';
  bar.innerHTML = '<a href="' + (C.backUrl || '#') + '" target="_top">&larr; กลับหน้างานการเงินและบัญชี</a><span class="pub-note">กรอกแล้วพิมพ์ได้ทันที · ไม่บันทึกข้อมูลเข้าระบบ</span>';
  var pg = document.getElementById('page-docs'); pg.insertBefore(bar, pg.firstChild);
  loadDocs().then(function () {
    var t = window.__LOAN_T, b = t && document.querySelector('#dcCards [data-go="' + t + '"]');
    if (b) b.click();
  });
})();
</script>
"""
index = sub1(index, "<?!= include('JS'); ?>", pre + js + post, 'js')
for n in ('LedgerUI', 'ElectricUI', 'IncomingUI', 'PrWebUI'):
    index = sub1(index, "  <?!= include('%s'); ?>\n" % n, '', n)
index = re.sub(r'<title>.*?</title>', '<title>ยืม ส่งคืน เบิก - งานการเงินและบัญชี</title>', index, count=1)

left = [m for m in re.findall(r'<\?[^\n]{0,60}', index)
        if 'loanConfJson_' not in m and 'loanTab' not in m]
if left:
    sys.exit('ยังมีสคริปต์เล็ตอื่นค้าง: %r' % left[:3])

hdr = '<!-- สร้างอัตโนมัติจาก Index/CSS/JS ของระบบการเงินด้วย tools/build_loanweb.py — อย่าแก้ไฟล์นี้ตรง ๆ -->\n'
index = sub1(index, '<!DOCTYPE html>\n', '<!DOCTYPE html>\n' + hdr, 'doctype')
open(os.path.join(ROOT, 'Loanweb'), 'w', encoding='utf-8').write(index)
print('Loanweb: %d KB' % (len(index.encode('utf-8')) // 1024))
