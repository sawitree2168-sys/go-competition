import {reply,staffAuth} from "../tournament-auth";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Row=Record<string,unknown>;
export async function GET(request:Request){
 const auth=await staffAuth(request);if("error" in auth)return auth.error;
 const id=new URL(request.url).searchParams.get("tournament_id");
 if(!id||!uuid.test(id))return reply({status:"invalid",message:"Tournament ID ไม่ถูกต้อง"},400);
 const get=async(table:string,select:string,filter:string)=>{
  const u=new URL("/rest/v1/"+table,auth.base);
  u.searchParams.set("select",select);u.searchParams.set(filter,"eq."+id);
  u.searchParams.set("limit","1000");u.searchParams.set("order",table==="gt_registrations"?"created_at.asc":"name.asc");
  const r=await fetch(u,{headers:auth.headers,cache:"no-store",signal:AbortSignal.timeout(8000)});
  const rows:unknown=await r.json();if(!r.ok||!Array.isArray(rows))throw Error();
  if(rows.length===1000)throw Error("too many records; pagination required");
  return rows as Row[];
 };
 try{
 const [registrations,divisions]=await Promise.all([
  get("gt_registrations","id,athlete_id,division_id,registration_status,payment_status,fee_snapshot_thb,competition_rank_reference,rank_reference_source,created_at","tournament_id"),
  get("gt_divisions","id,name","tournament_id")
 ]);
 const dnames=new Map(divisions.map(d=>[d.id,d.name]));
 const aIds=[...new Set(registrations.map(r=>r.athlete_id).filter((x):x is string=>typeof x==="string"&&uuid.test(x)))];
 const athletes:Row[]=[];
 for(let i=0;i<aIds.length;i+=70){
  const u=new URL("/rest/v1/gt_athletes",auth.base);u.searchParams.set("select","id,go_id,full_name,current_rank");
  u.searchParams.set("id","in.("+aIds.slice(i,i+70).join(",")+")");u.searchParams.set("limit","100");
  const r=await fetch(u,{headers:auth.headers,cache:"no-store",signal:AbortSignal.timeout(8000)});
  const found:unknown=await r.json();if(!r.ok||!Array.isArray(found))throw Error();athletes.push(...found);
 }
 const amap=new Map(athletes.map(a=>[a.id,a]));
 const list=registrations.map(r=>({id:r.id,created_at:r.created_at,
  athlete_id:r.athlete_id,go_id:amap.get(r.athlete_id)?.go_id||null,
  athlete_name:amap.get(r.athlete_id)?.full_name||"ไม่พบข้อมูลนักกีฬา",
  rank:amap.get(r.athlete_id)?.current_rank||null,
  competition_rank_reference:r.competition_rank_reference||null,
  rank_reference_source:r.rank_reference_source||null,
  division_name:dnames.get(r.division_id)||"ไม่พบชื่อรุ่น",
  registration_status:r.registration_status,payment_status:r.payment_status,fee_snapshot_thb:r.fee_snapshot_thb
 }));
 return reply({status:"ok",tournament_id:id,role:auth.role,registrations:list});
 }catch{return reply({status:"error",message:"ไม่สามารถอ่านรายชื่อผู้สมัครได้ โปรดตรวจฐานข้อมูลหรือแบ่งหน้ารายการ"},503)}
}

export async function POST(request:Request){
 const auth=await staffAuth(request);
 if("error" in auth)return auth.error;
 if(auth.role!=="owner"&&auth.role!=="admin")return reply({status:"forbidden",message:"เฉพาะ Owner / Admin เท่านั้น"},403);
 let body:unknown;
 try{body=await request.json()}catch{return reply({status:"invalid",message:"ข้อมูล JSON ไม่ถูกต้อง"},400)}
 if(!body||typeof body!=="object"||Array.isArray(body))return reply({status:"invalid"},400);
 const b=body as Record<string,unknown>;
 const tournamentId=typeof b.tournament_id==="string"?b.tournament_id:"";
 const divisionId=typeof b.division_id==="string"?b.division_id:"";
 const goId=typeof b.go_id==="string"?b.go_id.trim():"";
 if(!uuid.test(tournamentId)||!uuid.test(divisionId)||!/^[^\s]{3,40}$/.test(goId))
  return reply({status:"invalid",message:"กรุณาระบุรายการแข่งขัน รุ่น และ GO ID ให้ถูกต้อง"},400);
 async function list(table:string,select:string,filters:Record<string,string>){
  const u=new URL("/rest/v1/"+table,auth.base);
  u.searchParams.set("select",select);
  for(const [key,value] of Object.entries(filters))u.searchParams.set(key,"eq."+value);
  u.searchParams.set("limit","2");
  const response=await fetch(u,{headers:auth.headers,cache:"no-store",signal:AbortSignal.timeout(8000)});
  const values:unknown=await response.json();
  if(!response.ok||!Array.isArray(values))throw Error("database");
  return values as Record<string,unknown>[];
 }
 try{
  // No athlete creation, payment verification, or confirmed registration is permitted here.
  const [events,divisions,athletes]=await Promise.all([
   list("gt_tournaments","id,status",{"id":tournamentId}),
   list("gt_divisions","id,tournament_id",{"id":divisionId,"tournament_id":tournamentId}),
   list("gt_athletes","id,go_id,full_name",{"go_id":goId})
  ]);
  if(events.length!==1)return reply({status:"not_found",message:"ไม่พบรายการแข่งขัน"},404);
  if(events[0].status==="cancelled"||events[0].status==="completed")
   return reply({status:"invalid",message:"รายการนี้ปิดการเพิ่มผู้สมัครแล้ว"},409);
  if(divisions.length!==1)return reply({status:"invalid",message:"รุ่นแข่งขันไม่ตรงกับรายการ"},400);
  if(athletes.length!==1)return reply({status:"not_found",message:"ไม่พบ GO ID เดิม กรุณาตรวจข้อมูลนักกีฬาก่อน"},404);
  const athleteId=String(athletes[0].id);
  const duplicates=await list("gt_registrations","id,division_id,registration_status",{"tournament_id":tournamentId,"athlete_id":athleteId});
  if(duplicates.length>0)
   return reply({status:"conflict",message:"นักกีฬาคนนี้มีใบสมัครในรายการแข่งขันนี้อยู่แล้ว ห้ามเพิ่มซ้ำ",registration:duplicates[0]},409);
  const endpoint=new URL("/rest/v1/gt_registrations",auth.base);
  endpoint.searchParams.set("select","id,tournament_id,division_id,athlete_id,registration_status,payment_status,fee_snapshot_thb,competition_rank_reference,rank_reference_source,created_at");
  const inserted=await fetch(endpoint,{method:"POST",headers:{...auth.headers,Prefer:"return=representation"},body:JSON.stringify({
   tournament_id:tournamentId,division_id:divisionId,athlete_id:athleteId,
   registration_status:"pending",payment_status:"pending"
  }),cache:"no-store",signal:AbortSignal.timeout(8000)});
  if(inserted.status===409)return reply({status:"conflict",message:"พบการสมัครซ้ำจากการบันทึกพร้อมกัน กรุณาโหลดข้อมูลใหม่"},409);
  const saved:unknown=await inserted.json();
  if(!inserted.ok||!Array.isArray(saved)||saved.length!==1)
    return reply({status:"error",message:"ไม่สามารถบันทึกใบสมัครได้ โปรดตรวจข้อมูลและสิทธิ์"},503);
  return reply({status:"ok",registration:saved[0],athlete_name:athletes[0].full_name,go_id:goId,message:"บันทึกใบสมัครรอตรวจสอบแล้ว ยังไม่ยืนยันสิทธิ์หรือรับชำระเงิน"},201);
 }catch{return reply({status:"error",message:"การเชื่อมข้อมูลผู้สมัครขัดข้อง ไม่ได้ยืนยันการบันทึก"},503)}
}
