import {reply,staffAuth} from "../tournament-auth";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function GET(request:Request){
 const auth=await staffAuth(request);if("error" in auth)return auth.error;
 const id=new URL(request.url).searchParams.get("tournament_id")||"";
 if(!uuid.test(id))return reply({status:"invalid",message:"รหัสการแข่งขันไม่ถูกต้อง"},400);
 try{
  const u=new URL("/rest/v1/gt_checkins",auth.base);
  u.searchParams.set("select","id,registration_id,checked_in_at,gt_registrations!inner(tournament_id)");
  u.searchParams.set("gt_registrations.tournament_id","eq."+id);
  u.searchParams.set("limit","1000");u.searchParams.set("order","checked_in_at.desc");
  const r=await fetch(u,{headers:auth.headers,cache:"no-store",signal:AbortSignal.timeout(8000)});
  const value:unknown=await r.json();if(!r.ok||!Array.isArray(value)||value.length===1000)throw Error();
  const entries=value as {id:string;registration_id:string;checked_in_at:string}[];
  return reply({status:"ok",checkins:entries.map(x=>({id:x.id,registration_id:x.registration_id,checked_in_at:x.checked_in_at}))});
 }catch{return reply({status:"error",message:"ไม่สามารถอ่านข้อมูลเช็กอินได้ หรือมีรายการเกินขีดจำกัดหน้าปัจจุบัน"},503)}
}
export async function POST(request:Request){
 const auth=await staffAuth(request);if("error" in auth)return auth.error;
 if(auth.role!=="owner"&&auth.role!=="admin")return reply({status:"forbidden",message:"เฉพาะ Owner/Admin มีสิทธิ์เช็กอิน"},403);
 let body:unknown;try{body=await request.json()}catch{return reply({status:"invalid"},400)}
 if(!body||typeof body!=="object"||Array.isArray(body))return reply({status:"invalid"},400);
 const b=body as Record<string,unknown>;
 const registrationId=typeof b.registration_id==="string"?b.registration_id:"";
 const tournamentId=typeof b.tournament_id==="string"?b.tournament_id:"";
 if(!uuid.test(registrationId)||!uuid.test(tournamentId))return reply({status:"invalid",message:"รหัสผู้สมัครไม่ถูกต้อง"},400);
 try{
  const lookup=new URL("/rest/v1/gt_registrations",auth.base);
  lookup.searchParams.set("select","id,registration_status,payment_status");
  lookup.searchParams.set("id","eq."+registrationId);
  lookup.searchParams.set("tournament_id","eq."+tournamentId);
  lookup.searchParams.set("limit","1");
  const check=await fetch(lookup,{headers:auth.headers,cache:"no-store",signal:AbortSignal.timeout(8000)});
  const data:unknown=await check.json();
  if(!check.ok||!Array.isArray(data))throw Error();
  if(data.length!==1)return reply({status:"not_found",message:"ไม่พบใบสมัครในรายการนี้"},404);
  const row=data[0] as {registration_status:string;payment_status:string};
  if(row.registration_status!=="confirmed"||!["verified","waived"].includes(row.payment_status))
   return reply({status:"not_ready",message:"ยังเช็กอินไม่ได้ ต้องยืนยันสมัครและตรวจชำระเงินหรือยกเว้นก่อน"},409);
  const u=new URL("/rest/v1/gt_checkins",auth.base);
  u.searchParams.set("select","id,registration_id,checked_in_at");
  const result=await fetch(u,{method:"POST",headers:{...auth.headers,Prefer:"return=representation"},body:JSON.stringify({registration_id:registrationId}),cache:"no-store",signal:AbortSignal.timeout(8000)});
  if(result.status===409)return reply({status:"duplicate",message:"นักกีฬารายนี้เช็กอินไปแล้ว กรุณาโหลดข้อมูลใหม่"},409);
  const saved:unknown=await result.json();
  if(!result.ok||!Array.isArray(saved)||saved.length!==1)
   return reply({status:"error",message:"ไม่สามารถบันทึกเช็กอินได้ กรุณาตรวจสิทธิ์และสถานะใบสมัคร"},503);
  return reply({status:"ok",checkin:saved[0],message:"เช็กอินสำเร็จ"},201);
 }catch{return reply({status:"error",message:"เชื่อมระบบเช็กอินไม่สำเร็จ ไม่ได้ยืนยันว่าบันทึกแล้ว"},503)}
}
