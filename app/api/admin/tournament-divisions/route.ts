import {reply,staffAuth} from "../tournament-auth";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function GET(request:Request){
 const auth=await staffAuth(request);if("error" in auth)return auth.error;
 const id=new URL(request.url).searchParams.get("tournament_id");
 if(!id||!uuid.test(id))return reply({status:"invalid",message:"Tournament ID ไม่ถูกต้อง"},400);
 try{
  const endpoint=new URL("/rest/v1/gt_divisions",auth.base);
  endpoint.searchParams.set("select","id,tournament_id,name,pairing_enabled,seats_limit,entry_fee_thb");
  endpoint.searchParams.set("tournament_id",`eq.${id}`);endpoint.searchParams.set("order","name.asc");
  const r=await fetch(endpoint,{headers:auth.headers,cache:"no-store",signal:AbortSignal.timeout(8000)});
  const data=await r.json();if(!r.ok||!Array.isArray(data))throw Error();
  return reply({status:"ok",divisions:data});
 }catch{return reply({status:"error",message:"โหลดรุ่นแข่งขันไม่สำเร็จ"},503)}
}
export async function POST(request:Request){
 const auth=await staffAuth(request);if("error" in auth)return auth.error;
 if(!["owner","admin"].includes(auth.role))return reply({status:"forbidden",message:"ไม่มีสิทธิ์แก้ไขรุ่นแข่งขัน"},403);
 let b:unknown;try{b=await request.json()}catch{return reply({status:"invalid"},400)}
 if(!b||typeof b!=="object")return reply({status:"invalid"},400);
 const d=b as Record<string,unknown>;const id=typeof d.tournament_id==="string"?d.tournament_id:"";
 const name=typeof d.name==="string"?d.name.trim():"";
 const seats=d.seats_limit===""||d.seats_limit==null?null:Number(d.seats_limit);
 const rawFee=d.entry_fee_thb==null?"":String(d.entry_fee_thb).trim();
 const fee=rawFee===""?null:Number(rawFee);
 if(!uuid.test(id)||name.length<2||name.length>100||seats!==null&&(!Number.isInteger(seats)||seats<=0||seats>10000)||fee!==null&&(!/^\\d{1,7}(?:\\.\\d{1,2})?$/.test(rawFee)||!Number.isFinite(fee)||fee<0||fee>1000000))
  return reply({status:"invalid",message:"ข้อมูลรุ่นแข่งขันไม่ถูกต้อง"},400);
 try{
  const url=new URL("/rest/v1/gt_divisions",auth.base);url.searchParams.set("select","id,tournament_id,name,pairing_enabled,seats_limit,entry_fee_thb");
  const r=await fetch(url,{method:"POST",headers:{...auth.headers,Prefer:"return=representation"},body:JSON.stringify({tournament_id:id,name,seats_limit:seats,entry_fee_thb:fee,pairing_enabled:false}),cache:"no-store",signal:AbortSignal.timeout(8000)});
  const data=await r.json();if(!r.ok||!Array.isArray(data)||data.length!==1)throw Error();
  return reply({status:"ok",division:data[0]},201);
 }catch{return reply({status:"error",message:"เพิ่มรุ่นไม่ได้ ตรวจสอบว่ารายการยังเป็นแบบร่าง"},503)}
}
