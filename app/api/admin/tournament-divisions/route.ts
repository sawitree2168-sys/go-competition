import {reply,staffAuth} from "../tournament-auth";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function GET(request:Request){
 const auth=await staffAuth(request);if("error" in auth)return auth.error;
 const id=new URL(request.url).searchParams.get("tournament_id");
 if(!id||!uuid.test(id))return reply({status:"invalid",message:"Tournament ID ไม่ถูกต้อง"},400);
 try{
  const endpoint=new URL("/rest/v1/gt_divisions",auth.base);
  endpoint.searchParams.set("select","id,tournament_id,name,pairing_enabled,seats_limit,entry_fee_thb,friendship_board_size,award_scheme,friendship_gold_min_wins,friendship_silver_min_wins,friendship_bronze_min_wins,friendship_certificate_with_medal");
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
 if(!b||typeof b!=="object"||Array.isArray(b))return reply({status:"invalid"},400);
 const d=b as Record<string,unknown>;const id=typeof d.tournament_id==="string"?d.tournament_id:"";
 // Existing database column `name` stores the competition level, not a separate display name.
 const name=typeof d.name==="string"?d.name.trim():"";
 const seats=d.seats_limit===""||d.seats_limit==null?null:Number(d.seats_limit);
 const rawFee=d.entry_fee_thb==null?"":String(d.entry_fee_thb).trim();
 const fee=rawFee===""?null:Number(rawFee);
 const friendshipBoard=d.friendship_board_size==null||d.friendship_board_size===""?null:Number(d.friendship_board_size);
 if(friendshipBoard!==null&&(![9,13].includes(friendshipBoard)||!/friendship|เฟรนชิพ|เฟรนด์ชิพ/i.test(name)))
  return reply({status:"invalid",message:"ขนาดกระดาน 9×9 หรือ 13×13 ใช้สำหรับรุ่น Friendship เท่านั้น"},400);
 if(!uuid.test(id)||name.length<2||name.length>100||seats!==null&&(!Number.isInteger(seats)||seats<=0||seats>10000)||fee!==null&&(!/^\d{1,7}(?:\.\d{1,2})?$/.test(rawFee)||!Number.isFinite(fee)||fee<0||fee>1000000))
  return reply({status:"invalid",message:"ระบุระดับการแข่งขัน เช่น 1–2 คิว หรือ 1 ดั้ง"},400);
 try{
  const url=new URL("/rest/v1/gt_divisions",auth.base);url.searchParams.set("select","id,tournament_id,name,pairing_enabled,seats_limit,entry_fee_thb,friendship_board_size,award_scheme,friendship_gold_min_wins,friendship_silver_min_wins,friendship_bronze_min_wins,friendship_certificate_with_medal");
  let effectiveFee=fee;
  if(effectiveFee===null){
   const kind=/friendship|เฟรนชิพ|เฟรนด์ชิพ/i.test(name)?"friendship":/ดั้ง|\bdan\b/i.test(name)?"dan":/คิว|\bkyu\b/i.test(name)?"kyu":null;
   if(kind){
    const t=new URL("/rest/v1/gt_tournaments",auth.base);
    t.searchParams.set("select","default_kyu_fee_thb,default_dan_fee_thb,default_friendship_fee_thb");t.searchParams.set("id","eq."+id);t.searchParams.set("limit","1");
    const check=await fetch(t,{headers:auth.headers,cache:"no-store",signal:AbortSignal.timeout(8000)});
    const values=await check.json();
    if(!check.ok||!Array.isArray(values)||values.length!==1)throw Error("default fee unavailable");
    effectiveFee=Number(values[0][kind==="dan"?"default_dan_fee_thb":kind==="friendship"?"default_friendship_fee_thb":"default_kyu_fee_thb"]);
   }
  }
  const r=await fetch(url,{method:"POST",headers:{...auth.headers,Prefer:"return=representation"},body:JSON.stringify({tournament_id:id,name,seats_limit:seats,entry_fee_thb:effectiveFee,friendship_board_size:friendshipBoard,award_scheme:/friendship|เฟรนชิพ|เฟรนด์ชิพ/i.test(name)?"friendship_wins":"ranking",pairing_enabled:false}),cache:"no-store",signal:AbortSignal.timeout(8000)});
  const data=await r.json();if(!r.ok||!Array.isArray(data)||data.length!==1)throw Error();
  return reply({status:"ok",division:data[0]},201);
 }catch{return reply({status:"error",message:"เพิ่มรุ่นไม่ได้ ตรวจสอบว่ารายการยังเป็นแบบร่าง"},503)}
}

export async function PATCH(request:Request){
 const auth=await staffAuth(request);if("error" in auth)return auth.error;
 if(!["owner","admin"].includes(auth.role))return reply({status:"forbidden",message:"ไม่มีสิทธิ์แก้ไขค่าสมัครรุ่น"},403);
 let body:unknown;try{body=await request.json()}catch{return reply({status:"invalid"},400)}
 if(!body||typeof body!=="object"||Array.isArray(body))return reply({status:"invalid"},400);
 const b=body as Record<string,unknown>;
 const id=typeof b.division_id==="string"?b.division_id:"";
 const tid=typeof b.tournament_id==="string"?b.tournament_id:"";
 const raw=typeof b.entry_fee_thb==="number"?String(b.entry_fee_thb):typeof b.entry_fee_thb==="string"?b.entry_fee_thb.trim():"";
 if(!uuid.test(id)||!uuid.test(tid)||!/^\d{1,7}(?:\.\d{1,2})?$/.test(raw)||Number(raw)>1000000)
  return reply({status:"invalid",message:"ระบุค่าสมัครเป็นเงินบาท 0–1,000,000 ทศนิยมไม่เกิน 2 ตำแหน่ง"},400);
 try{
  const url=new URL("/rest/v1/gt_divisions",auth.base);
  url.searchParams.set("id","eq."+id);url.searchParams.set("tournament_id","eq."+tid);url.searchParams.set("select","id,tournament_id,name,entry_fee_thb");
  const response=await fetch(url,{method:"PATCH",headers:{...auth.headers,Prefer:"return=representation"},body:JSON.stringify({entry_fee_thb:Number(raw)}),cache:"no-store",signal:AbortSignal.timeout(8000)});
  const rows:unknown=await response.json();
  if(!response.ok||!Array.isArray(rows)||rows.length!==1)throw Error();
  return reply({status:"ok",division:rows[0],message:"แก้ราคาเฉพาะรุ่นแล้ว ใบสมัครที่บันทึกไว้ก่อนหน้ายังใช้ราคาเดิม"});
 }catch{return reply({status:"error",message:"ไม่สามารถแก้ไขค่าสมัครรุ่นนี้ได้"},503)}
}
