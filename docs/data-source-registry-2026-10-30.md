# แหล่งข้อมูลเชื่อม GO TOURNAMENT
ตรวจเมื่อ 30 ตุลาคม 2569 (Asia/Bangkok)
สถานะ: ตรวจ metadata หัวตารางและตัวอย่างข้อมูลแล้ว ยังไม่ได้เชื่อม runtime หรือนำเข้าผลสู่เว็บใหม่ ไม่ได้แก้ไขชีตต้นฉบับ

## 1. ฐานหลัก: 1go Master / Platform Database
https://docs.google.com/spreadsheets/d/1jDFQJkG-FD2265ZnTjXjXesTe_cu6P6p2hnep_MpmnI/edit
บัญชีนักกีฬา (gid 1565715789): GO ID, source_athlete_id, เลขดั้ง, person_id, ชื่อ, ระดับ
ยืนยันแถว 42: ชยพล พันธเสน / 41 / GO41250826 / DAN69-0041 / P-DAN69-0041 / 4 ดั้ง
ใช้ GO ID เดิม ห้ามสร้างทับหรือออกเลขใหม่สำหรับคนเดิม
ผลงานการแข่งขัน (gid 1938749950) และสรุปผลการแข่งขันรายบุคคล (gid 2026082615) มีผลระดับงานจริง เช่น ธรรมศาสตร์โอเพ่น 2026
สองแท็บอาจเป็นข้อมูลเดียวกัน ห้ามนำมานับรวมซ้ำ
ค้นชื่อชยพลในผลงานการแข่งขัน A1:M2000 ยังไม่พบ ไม่ใช่หลักฐานว่าไม่มีประวัติในแหล่งอื่น

## 2. ระบบวันแข่ง: 2go Event Runtime Template
https://docs.google.com/spreadsheets/d/1Zpiforp1UHaAd5NWr9s69PxLmL9FkPvYAQdFnVDcNO0/edit
Players gid 2001: playerId, athleteId, fullName, division, rank, school, checkin/payment และข้อมูลส่วนตัว
Pairings gid 2003: pairingId, division, round, tableNo, playerAId/playerBId, resultCode, lockStatus
Results gid 2004: timestamp, pairingId, คู่แข่ง, resultCode, winnerId, refereeName
Standings gid 2005: rankNo, win/loss/bye, points, sos/sosos, opponents
พบแถวข้อมูลจริงพร้อมหมายเหตุแหล่งธรรมศาสตร์ และผลรายรอบ แต่ยังต้องตรวจว่าเป็นผลสุดท้ายหรือ snapshot ระหว่างงาน
ตัวอย่าง Standings ชนะ 2 นัด จึงห้ามสมมติว่าเป็นผลครบงาน
Settings ที่อ่าน A1:F12 มีแต่หัวตาราง ยังไม่พบ event identity ในช่วงนี้ ต้องตรวจ Tournaments/Divisions และแหล่งงานก่อนนำเข้า
timestamp บันทึกผลไม่ใช่วันที่แข่งขันโดยอัตโนมัติ
playerId เช่น P001 ไม่ใช่ GO ID และอาจซ้ำระหว่างงาน
athleteId บางแถวเป็นเวลา|ชื่อ ไม่ใช่ GO ID ต้อง crosswalk ก่อน
BYE ตัวอย่างใช้ A_WIN พร้อม note BYE จึงต้องแยกชนะบายออกจากการชนะคู่แข่งจริง
ประโยชน์: ตรวจประวัติคู่แข่ง ผลรายรอบ และใช้เป็น reference โปรแกรมวันแข่ง

## 3. เว็บอ่านข้อมูล: 3go Public Snapshot / Cache
https://docs.google.com/spreadsheets/d/1yyPjZT741Brv5VIHnqJ5Ew-Fxs8bA2rtSpd-Zt2saKM/edit
Public_Results gid 3003, Public_Standings gid 3004, Public_Search gid 3005
ช่วง A1:Z4 ที่ตรวจพบเฉพาะหัวตาราง ไม่ได้ตรวจยืนยันว่าทุกแถวว่าง
Settings: cache_ttl_seconds=30
ประโยชน์: ลดการอ่านฐานจริงถี่ รองรับหน้าเว็บสาธารณะ
ยังขาด GO ID ในหัวตารางที่ตรวจ ต้องเพิ่ม mapping ในชั้นเชื่อม ไม่จับตัวตนด้วยชื่อเพียงอย่างเดียว
Public_Results มี winnerName/resultText แต่ไม่มีคู่แข่งสองคนครบ จึงไม่ควรเป็นฐานหลักสำหรับคำนวณ head-to-head

## 4. เก็บประวัติ: 4go Archive / Backup
https://docs.google.com/spreadsheets/d/1-4pULkohBAzkiFN01N3D4eOqG9q_HifBIl7s8P2Z0bE/edit
Archive_Players gid 4002; Archive_Results gid 4004; Archive_Standings gid 4005; Backup_Files gid 4006
Settings: archive_policy=close_event_only
ช่วงหัวตารางและ 3 แถวถัดไปที่ตรวจยังไม่พบข้อมูล ไม่สรุปว่าทั้งไฟล์ว่าง
ประโยชน์: เก็บผลที่ปิดงานแล้ว พร้อม event_id/archive_id และไฟล์ต้นฉบับ ใช้ตรวจสอบย้อนหลัง
ยังต้องทำให้ทุก playerId/athleteId เทียบ GO ID ได้แน่นอน

## รูปแบบเชื่อมที่เสนอ (ยังไม่ได้ลงระบบ)
ฐานหลัก GO ID → ตารางเทียบ (source_file_id,event_id,division,playerId,source_athlete_id,go_id,สถานะตรวจสอบ)
→ Pairings/Results ของงาน → ผลยืนยัน/Archive → สถิติรายคน → public snapshot
ไม่อ่านข้อมูลลับ เช่น PIN hash/session/เบอร์ติดต่อ ไปเผยแพร่
ชื่อใช้ค้นหาผู้สมัครการจับคู่เท่านั้น ชื่อซ้ำหรือสะกดต่างต้องตรวจ ไม่ผูกบัญชีเจ้าของจากชื่อหรือเลขดั้งสาธารณะเพียงอย่างเดียว
idempotency: (source_file_id,event_id,division,pairingId) พร้อม version ของผล ไม่บวกซ้ำเมื่อ import ใหม่
แยกคู่จริง/BYE/W-O/double-forfeit และผลที่ยังไม่ยืนยัน ก่อนคำนวณ
เปรียบเทียบ aggregate กับ Standings แต่ห้ามสร้างผลรายรอบจากยอดชนะรวม

## ขั้นตอนถัดไป
1. ตรวจ DATA MAP/ทะเบียนไฟล์ต้นฉบับ/รายการแข่งขันในฐานหลัก และ Tournaments ของ runtime เพื่อระบุ event_id และแหล่งผลสุดท้าย
2. อ่านเฉพาะคอลัมน์ระบุตัวตนเพื่อ crosswalk โดยรักษา GO ID เดิม
3. ตรวจนับรอบ ผล BYE และรายการซ้ำจากตัวอย่างหนึ่งงาน ก่อนนำเข้าสถิติ
4. เชื่อมบัญชีกับ GO ID หลังยืนยันสิทธิ์ แสดงสถานะ pending ชัดเจน ไม่วนสมัครใหม่
5. ทดสอบนำเข้า/นำเข้าซ้ำ/เปิดโปรไฟล์/คำนวณสถิติ แล้วจึงระบุว่าเชื่อมระบบจริงแล้ว
