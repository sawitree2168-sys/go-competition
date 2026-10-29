# แบบการเชื่อมข้อมูลและแผนปรับโครงสร้าง GO TOURNAMENT
วันที่ 30 ตุลาคม 2569 — ผู้ใช้อนุญาตจัดระเบียบ เพิ่มสูตร/ส่วนเชื่อม และสร้างไฟล์ใหม่ได้
สถานะ: ออกแบบและตรวจแหล่งเพิ่มเติมแล้ว ยังไม่ได้ย้ายข้อมูลจริงหรือเชื่อมโปรไฟล์สำเร็จ

## สิ่งที่ตรวจพบเพิ่มเติม
ฐานหลัก: https://docs.google.com/spreadsheets/d/1jDFQJkG-FD2265ZnTjXjXesTe_cu6P6p2hnep_MpmnI/edit
DATA MAP มีแบบ Source → Staging → Master → History → Public Cache อยู่แล้ว ควรต่อยอด ไม่ออกแบบขัดกัน
ทะเบียนไฟล์ต้นฉบับมี:
- SRCFILE-TGA-2563-001: https://docs.google.com/spreadsheets/d/190DLGmNWqP3S5_yl1rbJp1DYIWsAcFre/edit
  ชื่อไฟล์ ข้อมูลทำเนียบดั้งปี63 (1).xlsx; สถานะ INDEXED_DATES; ต้องตรวจ MIME/metadata ก่อนอ่านไฟล์นี้
- SRCFILE-TGA-2564-001: https://docs.google.com/spreadsheets/d/1sSat4J9t3JdtNabIpDHJuGcFtbdBFb7r/edit
  ชื่อ ทำเนียบดั้งไทยปี64 (1).xlsx; ทะเบียนระบุ MATCH_DETAIL_EXTRACTED 6 งาน 1,103 แมตช์ และไม่รวมแท็บ 010164 ที่ซ้ำปี63
  ตัวเลขนี้เป็นข้อความในทะเบียน ยังไม่ได้ตรวจนับผลต้นฉบับใหม่ ห้ามใช้เป็นสถิติยืนยัน
ข้อมูลย้อนหลังมีรายการงานปี2563และวันที่รอตรวจ ห้ามใช้วันที่อ้างอิงในไฟล์แทนวันแข่งจริง
Runtime Tournaments/Divisions A1:L6 ยังมีแต่หัวตาราง จึงยังระบุ event_id ของผลตัวอย่างไม่ได้
รายการแข่งขัน A1:L6 พบ EVT-TEST-0001 งานทดสอบ ห้ามรวมสถิติจริง

## แบบการทำงาน
1. Source registry: เก็บ file_id/url, tab/gid, ประเภทข้อมูล, ช่วงข้อมูล, เวลาอ่าน, batch_id และแหล่งอ้างอิง
2. Staging: สำเนาค่าจากแหล่ง ไม่แก้ต้นฉบับทันที เก็บ raw row และตำแหน่งอ้างอิงสำหรับย้อนตรวจ
3. Identity crosswalk: source_file_id + event_id + source_player_id → GO ID
   เลขดั้ง/รหัสเดิมช่วยจับคู่ ชื่อเป็นหลักฐานประกอบ กรณีขัดแย้งส่ง review ไม่รวมอัตโนมัติ
   รักษา GO41250826 ของชยพล พันธเสน เลขดั้ง41 ไม่สร้าง GO ID ใหม่
4. Canonical events: event_id, division_id, ชื่องาน, วันแข่งจริง, สถานะยืนยัน, source
5. Match facts: event/division/round/table, go_id_A/B, ผล, BYE/W-O/double-forfeit, สถานะยืนยัน, version, source
6. Event summaries: อันดับ/ชนะ/แพ้/บาย/คะแนน/SOS/SOSOS ตามข้อมูลจริง ตรวจเทียบผลรายรอบ
7. Account link: account_user_id ↔ GO ID ผ่านการยืนยันสิทธิ์ แยกจากการจับคู่ตัวตนในทะเบียน
8. Public cache: เปิดเฉพาะข้อมูลที่อนุญาต มีเวลาปรับปรุงล่าสุด ไม่คำนวณ IMPORTRANGE หลายชั้นตอนเปิดเว็บ

## โครงสร้างส่วนเชื่อมที่ควรสร้าง
source_registry, import_batches, staging_rows, identity_crosswalk, review_queue,
canonical_events, match_facts, athlete_event_summaries, account_athlete_links
ตารางเหล่านี้เป็นแบบเสนอ ยังไม่ได้สร้างในฐานจริง
เก็บชั้น staging/review เป็น private; เปิดข้อมูลผ่าน API และสิทธิ์ที่กำหนด ไม่เผย PIN/session/อีเมล/โทรศัพท์
ใช้ฐานเว็บเป็นค่าที่ตรวจแล้ว อ่าน Google Sheets แบบ batch สำหรับนำเข้า/ปรับปรุง
ใช้สูตรในชีตเฉพาะช่วยตรวจหรือสรุป ไม่ใช้สูตรเป็นตัวกำหนดสิทธิ์และไม่ใช้ชื่อเป็นรหัสหลัก

## ป้องกันนับซ้ำและแก้ข้อมูลผิด
Unique import key: source_file_id + source_tab + source_row + source_version
Unique match identity: event_id + division_id + round + table/pairing_id พร้อมตรวจผู้เล่น
ผลแก้ไขเก็บ version/audit ไม่บวกชนะเพิ่ม
ไฟล์ archive/snapshot และผลสรุปอาจสำเนาข้อมูลเดียวกัน ต้องระบุ canonical source ก่อนรวม
BYE ไม่ใช่คู่แข่งขันจริง ผลไม่ครบหรือไม่ยืนยันไม่ใช้เป็นผลครบงาน
อ่านซ้ำต้องได้ยอดเดิม; การเขียน batch ล้มเหลวต้อง retry ได้โดยไม่สร้างคน/ผลซ้ำ

## แผนลงมือถัดไปและเกณฑ์ผ่าน
A. ตรวจไฟล์ปี63/64 และดัชนีรายการย้อนหลังตามลิงก์ที่พบ เพื่อค้นชยพลเลข41และระบุตำแหน่งผลจริง
B. สร้าง staging/crosswalk จากตัวอย่างหนึ่งงาน ตรวจ mapping และผลด้วย source row
C. จำลอง import แล้วเทียบจำนวนแมตช์/ชนะแพ้/บายกับต้นฉบับ ตรวจการนำเข้าซ้ำ
D. นำเข้าเฉพาะชุดยืนยันแล้ว ผูกโปรไฟล์บัญชีที่ยืนยันสิทธิ์ เปิดประวัติได้จริง
E. ทดสอบ end-to-end ก่อนส่งให้ผู้ใช้ลองอีกครั้ง
งานที่ทำในรอบนี้: ตรวจ DATA MAP/ทะเบียนไฟล์/ข้อมูลย้อนหลัง/หัวตาราง runtime และบันทึกแบบนี้
ยังไม่ได้: เปิดไฟล์ต้นฉบับปี63/64, สร้าง staging, นำเข้าผล, เชื่อมบัญชีนักกีฬา, ทดสอบเข้าโปรไฟล์พร้อมสถิติ
