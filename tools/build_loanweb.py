#!/usr/bin/env python3
"""
สร้างไฟล์ Loanweb (หน้า "ยืม ส่งคืน เบิก" สาธารณะ กรอกแล้วพิมพ์ ไม่บันทึกเข้าระบบ)
จาก Index + CSS + JS ของระบบการเงิน — แบบฟอร์มราชการจึงตรงกับระบบการเงินทุกอย่าง
ไม่แก้ไฟล์ของระบบการเงินเลย (แพตช์เฉพาะในไฟล์ผลลัพธ์)

ใช้:  python3 tools/build_loanweb.py      → เขียนไฟล์ Loanweb
นำไปใช้: วาง Loanweb เป็นไฟล์ HTML ชื่อ "Loan" ในโปรเจกต์หน้าเว็บ (Budget)
เมื่อระบบการเงินแก้แบบฟอร์ม (JS/CSS/Index) ให้รันสคริปต์นี้ใหม่
"""
import os, re, sys, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rd = lambda n: open(os.path.join(ROOT, n), encoding='utf-8').read()

index, css, js = rd('Index'), rd('CSS'), rd('JS')


def sub1(s, old, new, label):
    if s.count(old) != 1:
        sys.exit('แพตช์ไม่ได้ (%s): พบ %d ครั้ง' % (label, s.count(old)))
    return s.replace(old, new)


# 1) ตัด JS ให้เหลือเฉพาะเมนู สัญญายืม ส่งคืน เบิก + ฟังก์ชันที่ใช้จริง (วิเคราะห์ด้วย acorn: tools/slim_js.js)
#    ช่วงเมนู = หัวข้อ "ขอยืม-ขอเบิก" ถึงก่อนหัวข้อ "ศูนย์รวมพิมพ์" ใน JS
L = js.split('\n')
def head_line(word):
    for k, l in enumerate(L):
        if word in l and k > 0 and L[k - 1].startswith('/* ==='):
            return k          # บรรทัดของ "/* ===" (นับจาก 1 = k)
    sys.exit('ไม่พบหัวข้อ ' + word)
lo, hi = head_line('ขอยืม-ขอเบิก'), head_line('ศูนย์รวมพิมพ์') - 1
tmp = os.path.join(ROOT, 'tools', '.slim.js')
r = subprocess.run(['node', os.path.join(ROOT, 'tools', 'slim_js.js'), os.path.join(ROOT, 'JS'), str(lo), str(hi),
                    'S,loading,toast,modal', tmp, 'go,api,showPrintSaveBar,loadPageIfStale'], capture_output=True, text=True)
if r.returncode:
    sys.exit('slim_js ล้มเหลว (รัน npm i ในโฟลเดอร์ tools ก่อน): ' + r.stderr[-500:])
js = open(tmp, encoding='utf-8').read(); os.remove(tmp)
js = ('function go() {}\nfunction showPrintSaveBar() {}\nfunction loadPageIfStale() {}\n'
      'const api = (fn, ...args) => window.__PUBLIC_API(fn, args);\n' + js)
js = '<script>\n' + js + '\n</script>'
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
  .pub-direct #page-docs { display: none !important; }
  .pub-direct .main { min-height: 0; padding: 0; }
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
  /* เปิดจากการ์ดหน้างานการเงิน (?t=) → เด้งเข้าหน้ากรอกทันที ไม่แวะหน้ารวม ปิดหน้ากรอกแล้วกลับหน้างานการเงิน */
  var t = window.__LOAN_T, card = t && document.querySelector('#dcCards [data-go="' + t + '"]');
  if (card) document.body.classList.add('pub-direct');
  function goBack() {
    var a = document.createElement('a'); a.href = C.backUrl || '#'; a.target = '_top';
    document.body.appendChild(a); a.click();
  }
  /* กลับเมื่อไม่มีหน้ากรอกและไม่ได้อยู่ในหน้าพิมพ์ (กดพิมพ์ = ปิดหน้ากรอกแล้วเข้าโหมดพิมพ์ ต้องไม่เด้งกลับ) */
  function maybeBack() {
    if (!card) return;
    setTimeout(function () {
      if (!document.querySelector('.modal.show') && !document.body.classList.contains('doc-mode')) goBack();
    }, 400);
  }
  /* หลังพิมพ์: ออกจากโหมดพิมพ์ (ระบบการเงินทำใน DOMContentLoaded ซึ่งไม่ได้ติดมาด้วย) → กลับหน้างานการเงิน */
  window.addEventListener('afterprint', function () {
    document.body.classList.remove('doc-mode');
    var st = document.getElementById('docPageStyle'); if (st) st.textContent = '';
  });
  document.addEventListener('hidden.bs.modal', maybeBack);
  new MutationObserver(maybeBack).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  loadDocs().then(function () { if (card) card.click(); });
})();
</script>
"""
index = sub1(index, "<?!= include('JS'); ?>", pre + js + post, 'js')
index = re.sub(r'    <section class="page[^"]*" id="page-(?!docs")[\w-]+">.*?\n    </section>\n', '', index, flags=re.S)
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
