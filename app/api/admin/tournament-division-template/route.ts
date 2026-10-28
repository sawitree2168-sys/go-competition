import {reply,staffAuth} from "../tournament-auth";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Persisted in one database transaction by gt_create_standard_divisions_v1.
// The endpoint does not create or publish a tournament or auto-open registrations.
export async function POST(request:Request){
 const auth=await staffAuth(request);if("error" in auth)return auth.error;
 if(!["owner","admin"].includes(auth.role))
  return reply({status:"forbidden",message:"เฉพาะ Owner / Admin เท่านั้น"},403);
 let body:unknown;
 try{body=await request.json()}catch{return reply({status:"invalid",message:"รูปแบบข้อมูลไม่ถูกต้อง"},400)}
 if(!body||typeof body!=="object"||Array.isArray(body))
  return reply({status:"invalid",message:"ข้อมูลรายการไม่ถูกต้อง"},400);
 const id=(body as Record<string,unknown>).tournament_id;
 if(typeof id!=="string"||!uuid.test(id))
  return reply({status:"invalid",message:"Tournament ID ไม่ถูกต้อง"},400);
 try{
  const url=new URL("/rest/v1/rpc/gt_create_standard_divisions_v1",auth.base);
  const response=await fetch(url,{
   method:"POST",headers:{...auth.headers,Prefer:"return=representation"},
   body:JSON.stringify({p_tournament_id:id}),cache:"no-store",signal:AbortSignal.timeout(12000)
  });
  const payload:unknown=await response.json();
  if(!response.ok){
   const p=(payload&&typeof payload==="object")?payload as Record<string,unknown>:{};
   if(p.code==="23505")return reply({status:"conflict",message:"รายการนี้มีรุ่นแข่งขันอยู่แล้ว ไม่เพิ่มชุดมาตรฐานซ้ำ"},409);
   if(p.code==="23514")return reply({status:"conflict",message:"ใช้ชุดมาตรฐานได้เฉพาะรายการแบบร่างที่ยังไม่เผยแพร่"},409);
   if(p.code==="42501")return reply({status:"forbidden",message:"บัญชีนี้ไม่มีสิทธิ์เพิ่มรุ่นแข่งขัน"},403);
   return reply({status:"error",message:"ไม่สามารถเพิ่มชุดรุ่นแข่งขันได้ โปรดตรวจข้อมูลรายการ"},503);
  }
  if(!Array.isArray(payload)||payload.length!==8)
   return reply({status:"error",message:"จำนวนรุ่นที่ตอบกลับไม่ตรง กรุณาโหลดรุ่นใหม่และตรวจรายการก่อนลองซ้ำ"},503);
  return reply({status:"ok",divisions:payload,count:8,total_seats:304,
   message:"สร้าง 8 รุ่น รวม 304 ที่เรียบร้อยแล้ว ค่าสมัคร Friendship ยังไม่กำหนดและยังไม่เปิดรับสมัคร"});
 }catch{return reply({status:"error",message:"เชื่อมฐานข้อมูลไม่สำเร็จ โปรดโหลดรุ่นใหม่ก่อนลองบันทึกซ้ำ"},503)}
}
