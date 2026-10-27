import {reply,staffAuth} from "../tournament-auth";
export const dynamic="force-dynamic";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function lookup(auth:Extract<Awaited<ReturnType<typeof staffAuth>>,{base:string}>,table:string,select:string,filter:string,value:string){
 const u=new URL("/rest/v1/"+table,auth.base);u.searchParams.set("select",select);u.searchParams.set(filter,"eq."+value);u.searchParams.set("limit","501");
 const r=await fetch(u,{headers:auth.headers,cache:"no-store",signal:AbortSignal.timeout(8000)});
 const d:unknown=await r.json();if(!r.ok||!Array.isArray(d))throw Error("lookup");return d as Record<string,unknown>[];
}
export async function GET(request:Request){
 const auth=await staffAuth(request);if("error" in auth)return auth.error;
 if(!["owner","admin"].includes(auth.role))return reply({status:"forbidden"},403);
 const id=new URL(request.url).searchParams.get("academy_id")||"";
 if(!UUID.test(id))return reply({status:"invalid",message:"รหัสสถาบันไม่ถูกต้อง"},400);
 try{
  const members=await lookup(auth,"gt_academy_memberships","id,academy_id,athlete_id,membership_status,created_at,verified_at","academy_id",id);
  if(members.length===501)return reply({status:"too_many",message:"จำนวนสมาชิกเกิน 500 รายการ ต้องใช้การแบ่งหน้า"},413);
  const athleteIds=members.map(m=>m.athlete_id).filter((x):x is string=>typeof x==="string"&&UUID.test(x));
  const athletes:Record<string,unknown>[]=[];
  for(let i=0;i<athleteIds.length;i+=60){
   const u=new URL("/rest/v1/gt_athletes",auth.base);u.searchParams.set("select","id,go_id,full_name,nickname,current_rank");
   u.searchParams.set("id","in.("+athleteIds.slice(i,i+60).join(",")+")");u.searchParams.set("limit","100");
   const r=await fetch(u,{headers:auth.headers,cache:"no-store",signal:AbortSignal.timeout(8000)});
   const d:unknown=await r.json();if(!r.ok||!Array.isArray(d))throw Error("athletes");athletes.push(...d);
  }
  const map=new Map(athletes.map(a=>[a.id,a]));
  return reply({status:"ok",memberships:members.map(m=>({...m,athlete:map.get(m.athlete_id)||null}))});
 }catch{return reply({status:"error",message:"อ่านข้อมูลสมาชิกสถาบันไม่สำเร็จ"},503)}
}
export async function POST(request:Request){
 const auth=await staffAuth(request);if("error" in auth)return auth.error;
 if(!["owner","admin"].includes(auth.role))return reply({status:"forbidden"},403);
 let body:unknown;try{body=await request.json()}catch{return reply({status:"invalid"},400)}
 const obj=body&&typeof body==="object"?body as Record<string,unknown>:{};
 const academyId=typeof obj.academy_id==="string"?obj.academy_id:"";
 const goId=typeof obj.go_id==="string"?obj.go_id.trim():"";
 if(!UUID.test(academyId)||goId.length<1||goId.length>40||/[,%()*]/.test(goId))return reply({status:"invalid",message:"ระบุสถาบันและ GO ID ที่ถูกต้อง"},400);
 try{
  const [academies,athletes]=await Promise.all([
   lookup(auth,"gt_academies","id,status","id",academyId),
   lookup(auth,"gt_athletes","id,go_id,full_name","go_id",goId)
  ]);
  if(academies.length!==1)return reply({status:"not_found",message:"ไม่พบสถาบัน"},404);
  if(athletes.length!==1)return reply({status:"not_found",message:"ไม่พบนักกีฬา GO ID นี้ หรือพบข้อมูลซ้ำ โปรดตรวจสอบข้อมูลเดิม"},404);
  const athleteId=athletes[0].id;
  if(typeof athleteId!=="string")throw Error("invalid athlete");
  const duplicate=await lookup(auth,"gt_academy_memberships","id,academy_id,athlete_id,membership_status","academy_id",academyId);
  if(duplicate.some(m=>m.athlete_id===athleteId))return reply({status:"conflict",message:"นักกีฬาคนนี้อยู่ในทะเบียนของสถาบันแล้ว กรุณาตรวจรายการเดิม"},409);
  const u=new URL("/rest/v1/gt_academy_memberships",auth.base);u.searchParams.set("select","id,academy_id,athlete_id,membership_status,created_at");
  const r=await fetch(u,{method:"POST",headers:{...auth.headers,Prefer:"return=representation"},body:JSON.stringify({academy_id:academyId,athlete_id:athleteId,membership_status:"pending"}),cache:"no-store",signal:AbortSignal.timeout(8000)});
  if(r.status===409)return reply({status:"conflict",message:"รายการสมาชิกนี้มีอยู่แล้ว"},409);
  const d:unknown=await r.json();if(!r.ok||!Array.isArray(d)||d.length!==1)throw Error("insert");
  return reply({status:"ok",membership:d[0],athlete:athletes[0]},201);
 }catch{return reply({status:"error",message:"เพิ่มสมาชิกแบบร่างไม่สำเร็จ"},503)}
}
