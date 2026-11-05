"""เขียนส่วนคู่มือ/แบบฟอร์ม ลงใน Suppliesweb (ระหว่าง SUPDOCS START/END)
เมนู "คู่มือการจัดซื้อจัดจ้าง" + "แบบฟอร์ม" หน้า Supplies พร้อมรูป (รูปจากโฟลเดอร์ Drive 1DxV_9O2UW-p0S1yHcRCH-r3x31fGiDPk ต้องแชร์ทุกคนที่มีลิงก์)
แก้รายการ/ลิงก์ที่ MANUALS / FORMS แล้วรัน: python3 tools/build_supdocs.py"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(HERE, 'supimg')
OUT = os.path.join(HERE, '..', 'Suppliesweb')
FOLDER = 'https://drive.google.com/drive/folders/1VGsQtBhWQdIXFkXN9ayV1PVO7tqToSqR?usp=sharing'
FOLDER119 = 'https://drive.google.com/drive/folders/1HpR_5SEKs0a236PJB6Kkex8PgrqAiZB8?usp=drive_link'

MANUALS = [
    dict(c='119', img='1rjsskRbUto6gfdWGd3y3-SQspOwsU23W', title='คู่มือการจัดซื้อจัดจ้าง ตามหนังสือเวียน ว119',
         ref='ที่ กค (กวจ) 0405.2/ว119 ลงวันที่ 7 มี.ค. 2561',
         ds='จัดซื้อจัดจ้างค่าใช้จ่ายในการบริหารงาน ฝึกอบรม จัดงาน และประชุม วงเงินครั้งหนึ่งไม่เกิน 10,000 บาท'),
    dict(c='804', img='1z-h2SiAYd3lrQi8F7bpoaSfQ_4Fci9Yh', title='คู่มือการจัดซื้อจัดจ้าง ตามหนังสือเวียน ว804',
         ref='ที่ กค (กวจ) 0405.2/ว804 ลงวันที่ 12 พ.ย. 2568',
         ds='แนวทางปฏิบัติสำหรับการจัดซื้อวงเงินไม่เกิน 50,000 บาท (วิธีเฉพาะเจาะจง)'),
]
FORMS = [
    dict(c='119', img='15UmDimgDTbKyLXucCaOLzQnsznxej4ga', step='ขั้นที่ 1 ก่อนจัดซื้อ', title='บันทึกขออนุมัติจัดซื้อ/จัดจ้าง (แบบ ผง.3/3)',
         url='https://drive.google.com/file/d/1G4oiMCE8IBhk28ly4VsiF7Ijcsz2mqtK/view?usp=sharing'),
    dict(c='119', img='1QbtO6WrMXeRqdg4WYiHaka6-eDK7bsH0', step='ขั้นที่ 2 หลังจัดซื้อ', title='รายงานขอความเห็นชอบการจัดซื้อจัดจ้าง และขออนุมัติเบิกจ่ายเงิน',
         url=FOLDER119),
    dict(c='804', img='1ZU9wjfMzwqLrUOiSP1KUzhwOZKnj_hIC', step='ขั้นที่ 1 ก่อนจัดซื้อ', title='รายงานการขอซื้อพัสดุ โดยวิธีเฉพาะเจาะจง (แบบ ผง.3/3)',
         url='https://drive.google.com/file/d/1PfDny13skElm2ZKXXvqmeolo4zsb7BG2/view?usp=sharing'),
    dict(c='804', img='1z4tdIQhq5kqbyPa0MRpAJOn1EwTwU4LM', step='ขั้นที่ 2 หลังจัดซื้อ', title='รายงานขอความเห็นชอบการจัดซื้อ และขออนุมัติส่งใช้เงินยืม',
         url=FOLDER),
]


def uri(fid, w, q=0):
    return 'https://drive.google.com/thumbnail?id=%s&sz=w%d' % (fid, w)


CSS = """<style>
  .mans { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
  .mc { display: flex; flex-direction: column; background: #fff; border: 1px solid var(--line); border-radius: 18px; overflow: hidden; cursor: pointer; text-align: left; font: inherit; color: inherit; padding: 0; transition: transform .35s var(--ease), box-shadow .35s var(--ease), border-color .35s; }
  .mc:hover { transform: translateY(-4px); border-color: var(--gold); box-shadow: 0 14px 30px rgba(19, 41, 75, .10); }
  .mc img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; display: block; background: var(--soft); }
  .mc .b { padding: 20px 24px 22px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
  .mc .rf { font-family: 'IBM Plex Sans Thai'; font-size: 13.5px; color: var(--gold); font-weight: 600; }
  .mc h3 { font-size: 20px; font-weight: 600; color: var(--navy); line-height: 1.4; }
  .mc p { color: var(--ink-2); font-size: 15px; }
  .mc .go, .fc .go { display: inline-flex; align-items: center; gap: 6px; margin-top: auto; padding-top: 6px; font-family: 'IBM Plex Sans Thai'; font-weight: 500; font-size: 14.5px; color: var(--navy); }
  .mc:hover h3, .fc:hover h3 { color: var(--gold); }
  .tabs2 { display: flex; gap: 8px; flex-wrap: wrap; margin: -12px 0 24px; }
  .tabs2 button { font: 500 14.5px 'IBM Plex Sans Thai'; padding: 8px 18px; border-radius: 999px; border: 1px solid var(--line); background: #fff; color: var(--ink-2); cursor: pointer; }
  .tabs2 button.on { background: var(--navy); border-color: var(--navy); color: #fff; }
  .forms { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
  .fc { display: flex; flex-direction: column; background: #fff; border: 1px solid var(--line); border-radius: 16px; overflow: hidden; transition: transform .35s var(--ease), box-shadow .35s var(--ease), border-color .35s; }
  .fc:hover { transform: translateY(-4px); border-color: var(--gold); box-shadow: 0 14px 30px rgba(19, 41, 75, .10); }
  .fc .pv { position: relative; aspect-ratio: 4 / 4.2; overflow: hidden; background: var(--soft); border-bottom: 1px solid var(--line); }
  .fc .pv img { width: 100%; display: block; }
  .fc .pv span { position: absolute; top: 10px; left: 10px; background: var(--navy); color: #fff; font: 600 12.5px 'IBM Plex Sans Thai'; padding: 3px 10px; border-radius: 999px; }
  .fc .b { padding: 16px 18px 18px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
  .fc .st { font: 500 13px 'IBM Plex Sans Thai'; color: var(--ink-3); }
  .fc h3 { font-size: 16.5px; font-weight: 600; color: var(--navy); line-height: 1.45; transition: color .25s; }
  .fc[hidden] { display: none; }
  .more-h { font: 600 18px 'IBM Plex Sans Thai'; color: var(--navy); margin: 36px 0 16px; }
  .sheet .ph.cv { aspect-ratio: 16 / 9; height: auto; }
  .sheet .mf { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-top: 16px; }
  .sheet .mf a { display: block; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; color: var(--navy); text-decoration: none; }
  .sheet .mf a:hover { border-color: var(--gold); }
  .sheet .mf img { width: 100%; height: 200px; object-fit: cover; object-position: top; display: block; border-bottom: 1px solid var(--line); }
  .sheet .mf b { display: block; padding: 10px 12px; font: 500 14px 'IBM Plex Sans Thai'; line-height: 1.4; }
  @media (max-width: 1080px) { .forms { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 720px) { .mans, .forms, .sheet .mf { grid-template-columns: 1fr; } }
</style>
"""


def main():
    h = [CSS]
    h.append('<section class="svc" id="manual"><div class="wrap">')
    h.append('<div class="sh rv"><h2>คู่มือการจัดซื้อจัดจ้าง</h2><p>เลือกคู่มือตามวงเงิน เพื่อดูขั้นตอนและแบบฟอร์มที่ต้องใช้</p></div>')
    h.append('<div class="mans">')
    for m in MANUALS:
        h.append('<button type="button" class="mc rv" data-man="%s"><img loading="lazy" alt="%s" src="%s">'
                 '<div class="b"><span class="rf">%s</span><h3>%s</h3><p>%s</p>'
                 '<span class="go">ดูแบบฟอร์มที่ใช้<svg class="ic"><use href="#i-arrow"/></svg></span></div></button>'
                 % (m['c'], m['title'], uri(m['img'], 1000), m['ref'], m['title'], m['ds']))
    h.append('</div></div></section>')
    h.append('<section class="svc boxed" id="docs" style="background:#fff"><div class="wrap">')
    h.append('<div class="sh rv"><h2>แบบฟอร์ม</h2><p>คลิกที่แบบฟอร์มเพื่อเปิด/ดาวน์โหลดไฟล์</p></div>')
    h.append('<div class="tabs2" id="formTabs"><button type="button" class="on" data-ft="">ทั้งหมด</button>'
             '<button type="button" data-ft="119">ว119 (ไม่เกิน 10,000 บาท)</button>'
             '<button type="button" data-ft="804">ว804 (ไม่เกิน 50,000 บาท)</button></div>')
    h.append('<div class="forms" id="formGrid">')
    for f in FORMS:
        h.append('<a class="fc rv" data-c="%s" href="%s" target="_blank" rel="noopener">'
                 '<div class="pv"><img loading="lazy" alt="%s" src="%s"><span>ว%s</span></div>'
                 '<div class="b"><span class="st">%s</span><h3>%s</h3>'
                 '<span class="go">เปิดไฟล์<svg class="ic sm"><use href="#i-download"/></svg></span></div></a>'
                 % (f['c'], f['url'], f['title'], uri(f['img'], 600), f['c'], f['step'], f['title']))
    h.append('</div>')
    h.append('<div id="supMore" hidden><div class="more-h">ไฟล์อื่น ๆ</div><div class="svcs c2" id="supGrid" style="gap:20px"></div></div>')
    h.append('</div></section>')
    s = '\n'.join(h) + '\n'
    t = open(OUT, encoding='utf-8').read()
    a, b = t.index('<!-- SUPDOCS START -->'), t.index('<!-- SUPDOCS END')
    t = t[:a] + '<!-- SUPDOCS START -->\n' + s + t[b:]
    open(OUT, 'w', encoding='utf-8').write(t)
    print('Suppliesweb', round(len(t.encode()) / 1024), 'KB')


main()
