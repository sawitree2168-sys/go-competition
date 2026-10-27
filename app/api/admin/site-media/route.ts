import {reply,staffAuth} from "../tournament-auth";
export const dynamic="force-dynamic";
const allowedDevices=["desktop","tablet","mobile"] as const;
const allowedStatuses=["draft","approved","published","archived"] as const;
const slotRegex=/^[a-z][a-z0-9_-]{1,63}$/;
const assetRegex=/^[A-Za-z0-9_-]{3,80}$/;
function isSafeImageUrl(value:string,base:string){
 if(value.startsWith("/")&&!value.startsWith("//"))return /^\/(?:banners|images|visual|assets)\/[A-Za-z0-9/_-]+\.(?:svg|png|webp|jpe?g)$/.test(value);
 try{
  const candidate=new URL(value);
  const projectHost=new URL(base).hostname;
  return candidate.protocol==="https:"&&candidate.hostname===projectHost&&/^\/storage\/v1\/object\/public\/[A-Za-z0-9/_-]+\.(?:png|webp|jpe?g|svg)$/.test(candidate.pathname)&&!candidate.username&&!candidate.password&&!candidate.search;
 }catch{return false}
}
function parseBody(raw:unknown,base:string){
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return null;
 const b=raw as Record<string,unknown>;
 const slot=typeof b.slot==="string"?b.slot:"";
 const device=typeof b.device==="string"?b.device:"";
 const asset_id=typeof b.asset_id==="string"?b.asset_id.trim():"";
 const image_url=typeof b.image_url==="string"?b.image_url.trim():"";
 const alt_text=typeof b.alt_text==="string"?b.alt_text.trim():"";
 const status=typeof b.status==="string"?b.status:"draft";
 const drive_file_id=typeof b.drive_file_id==="string"?b.drive_file_id.trim():null;
 const sheet_row_reference=typeof b.sheet_row_reference==="string"?b.sheet_row_reference.trim():null;
 if(!slotRegex.test(slot)||!allowedDevices.some(d=>d===device)||!assetRegex.test(asset_id)||!isSafeImageUrl(image_url,base)||alt_text.length>180||!allowedStatuses.some(v=>v===status)|| (drive_file_id&&drive_file_id.length>128)||(sheet_row_reference&&sheet_row_reference.length>100))return null;
 return {slot,device,asset_id,image_url,alt_text,status,drive_file_id,sheet_row_reference};
}
export async function GET(request:Request){
 const auth=await staffAuth(request);if("error" in auth)return auth.error;
 if(!["owner","admin"].includes(auth.role))return reply({status:"forbidden"},403);
 try{
  const u=new URL("/rest/v1/gt_site_media",auth.base);u.searchParams.set("select","slot,device,asset_id,image_url,alt_text,status,drive_file_id,sheet_row_reference,approved_at,updated_at");
  u.searchParams.set("order","slot.asc,device.asc");u.searchParams.set("limit","500");
  const r=await fetch(u,{headers:auth.headers,cache:"no-store",signal:AbortSignal.timeout(8000)});
  const list:unknown=await r.json();
  if(!r.ok||!Array.isArray(list))throw Error();
  return reply({status:"ok",items:list});
 }catch{return reply({status:"error",message:"โหลดทะเบียนสื่อไม่ได้"},503)}
}
export async function POST(request:Request){
 const auth=await staffAuth(request);if("error" in auth)return auth.error;
 if(!["owner","admin"].includes(auth.role))return reply({status:"forbidden"},403);
 let body:unknown;try{body=await request.json()}catch{return reply({status:"invalid"},400)}
 const v=parseBody(body,auth.base);
 if(!v||v.status!=="draft")return reply({status:"invalid",message:"ข้อมูลภาพไม่ถูกต้อง หรือยังไม่ใช่แบบร่าง"},400);
 try{
  const u=new URL("/rest/v1/gt_site_media",auth.base);u.searchParams.set("select","slot,device,asset_id,image_url,status");
  const r=await fetch(u,{method:"POST",headers:{...auth.headers,Prefer:"return=representation"},body:JSON.stringify({...v,updated_by:auth.userId}),cache:"no-store",signal:AbortSignal.timeout(8000)});
  if(r.status===409)return reply({status:"conflict",message:"มีภาพของหน้านี้และอุปกรณ์นี้อยู่แล้ว กรุณาใช้คำสั่งแก้ไข"},409);
  const rows:unknown=await r.json();if(!r.ok||!Array.isArray(rows)||rows.length!==1)throw Error();
  return reply({status:"ok",item:rows[0]},201);
 }catch{return reply({status:"error",message:"สร้างรายการแบบร่างไม่สำเร็จ"},503)}
}
export async function PUT(request:Request){
 const auth=await staffAuth(request);if("error" in auth)return auth.error;
 if(!["owner","admin"].includes(auth.role))return reply({status:"forbidden"},403);
 let body:unknown;try{body=await request.json()}catch{return reply({status:"invalid"},400)}
 const v=parseBody(body,auth.base);
 if(!v)return reply({status:"invalid",message:"ข้อมูลภาพไม่ถูกต้อง"},400);
 const b=body as Record<string,unknown>;
 if(["approved","published"].includes(v.status)&&b.confirm_publish!==true)return reply({status:"invalid",message:"กรุณายืนยันการอนุมัติภาพด้วยตนเอง"},400);
 try{
  const u=new URL("/rest/v1/gt_site_media",auth.base);
  u.searchParams.set("slot","eq."+v.slot);u.searchParams.set("device","eq."+v.device);u.searchParams.set("select","slot,device,status,updated_at");
  const verified=["approved","published"].includes(v.status);
  const payload={...v,updated_by:auth.userId,updated_at:new Date().toISOString(),approved_by:verified?auth.userId:null,approved_at:verified?new Date().toISOString():null};
  const r=await fetch(u,{method:"PATCH",headers:{...auth.headers,Prefer:"return=representation"},body:JSON.stringify(payload),cache:"no-store",signal:AbortSignal.timeout(8000)});
  const rows:unknown=await r.json();if(!r.ok||!Array.isArray(rows))throw Error();
  if(rows.length!==1)return reply({status:"not_found",message:"ไม่พบภาพที่ต้องการแก้ไข"},404);
  return reply({status:"ok",item:rows[0]});
 }catch{return reply({status:"error",message:"แก้ไขภาพไม่สำเร็จ"},503)}
}
