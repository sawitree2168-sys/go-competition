# ติดตั้งระบบรับไฟล์ผลแข่ง (ทำครั้งเดียว ~5 นาที)

ไฟล์ที่ผู้ปกครองส่งจากหน้า "ส่งผลการแข่งขัน" จะไปเก็บใน Google Drive ของเจ้าของเว็บ
ในโฟลเดอร์ **ผลแข่งจากผู้ปกครอง (GO TOURNAMENT)**

1. เข้า https://script.google.com ด้วยบัญชี sawitree.2168@gmail.com → กด **New project**
2. ลบโค้ดเดิมในหน้าแก้ไข แล้ววางโค้ดทั้งหมดจากไฟล์ `result-upload.gs` → กดรูปแผ่นดิสก์ (Save) ตั้งชื่อโปรเจกต์ เช่น "GO รับผลแข่ง"
3. ที่แถบด้านบน เลือกฟังก์ชัน **setup** → กด **Run**
   - Google จะถามสิทธิ์ → Review permissions → เลือกบัญชี → ถ้าขึ้น "Google hasn't verified this app" กด Advanced → Go to (ชื่อโปรเจกต์) → Allow
4. กด **Deploy → New deployment** → รูปเฟือง เลือก **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - กด Deploy แล้วคัดลอก **Web app URL** (ลงท้ายด้วย `/exec`)
5. เข้าเว็บ → หน้าเจ้าของระบบ (จัดการผู้จัดงาน) → กล่อง **ผลแข่งจากผู้ปกครอง** → วาง URL → บันทึก
   ขึ้น "● เปิดรับไฟล์แล้ว" คือพร้อมใช้งาน

ถ้าแก้โค้ดภายหลัง ให้ Deploy → Manage deployments → แก้ deployment เดิม (Version: New version) เพื่อให้ URL เดิมใช้ต่อได้
