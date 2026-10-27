import {reply,staffAuth} from "../tournament-auth";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 const auth=await staffAuth(request);if("error" in auth)return auth.error;
 if(!["owner","admin"].includes(auth.role))return reply({status:"forbidden"},403);
 try{
  const u=new URL("/rest/v1/gt_academies",auth.base);
  u.searchParams.set("select","id,name,status,created_at");u.searchParams.set("order","name.asc");u.searchParams.set("limit","500");
  const r=await fetch(u,{headers:auth.headers,cache:"no-store",signal:AbortSignal.timeout(8000)});
  const data=await r.json();if(!r.ok||!Array.isArray(data))throw Error();
  return reply({status:"ok",academies:data});
 }catch{return reply({status:"error",message:"ไม่สามารถโหลดรายชื่อสถาบัน"},503)}
}
export async function POST(request:Request){
 const auth=await staffAuth(request);if("error" in auth)return auth.error;
 if(!["owner","admin"].includes(auth.role))return reply({status:"forbidden"},403);
 let body:unknown;try{body=await request.json()}catch{return reply({status:"invalid"},400)}
 const obj=body&&typeof body==="object"?body as Record<string,unknown>:{};
 const name=typeof obj.name==="string"?obj.name.trim().replace(/\s+/g," "):"";
 if(name.length<2||name.length>160)return reply({status:"invalid",message:"ชื่อสถาบันต้องมีความยาว 2–160 ตัวอักษร"},400);
 try{
  const u=new URL("/rest/v1/gt_academies",auth.base);u.searchParams.set("select","id,name,status,created_at");
  const r=await fetch(u,{method:"POST",headers:{...auth.headers,Prefer:"return=representation"},body:JSON.stringify({name,status:"draft",created_by:auth.userId}),cache:"no-store",signal:AbortSignal.timeout(8000)});
  const data=await r.json();
  if(r.status===409)return reply({status:"conflict",message:"พบชื่อสถาบันนี้ในระบบแล้ว กรุณาตรวจรายการเดิมก่อนสร้างซ้ำ"},409);
  if(!r.ok||!Array.isArray(data)||data.length!==1)throw Error();
  return reply({status:"ok",academy:data[0]},201);
 }catch{return reply({status:"error",message:"สร้างสถาบันแบบร่างไม่สำเร็จ"},503)}
}
