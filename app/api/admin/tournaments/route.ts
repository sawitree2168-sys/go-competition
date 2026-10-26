import {reply,staffAuth} from "../tournament-auth";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 const auth=await staffAuth(request);if("error" in auth)return auth.error;
 try{
 const url=new URL("/rest/v1/gt_tournaments",auth.base);
 url.searchParams.set("select","id,title,start_at,status,published,created_at");
 url.searchParams.set("order","created_at.desc");url.searchParams.set("limit","500");
 const r=await fetch(url,{headers:auth.headers,cache:"no-store",signal:AbortSignal.timeout(8000)});
 const data=await r.json();if(!r.ok||!Array.isArray(data))throw Error();
 return reply({status:"ok",role:auth.role,tournaments:data});
 }catch{return reply({status:"error",message:"ไม่สามารถอ่านรายการแข่งขัน"},503)}
}
export async function POST(request:Request){
 const auth=await staffAuth(request);if("error" in auth)return auth.error;
 if(!["owner","admin"].includes(auth.role))return reply({status:"forbidden",message:"ไม่มีสิทธิ์สร้างรายการ"},403);
 let body:unknown;try{body=await request.json()}catch{return reply({status:"invalid",message:"รูปแบบข้อมูลไม่ถูกต้อง"},400)}
 if(!body||typeof body!=="object")return reply({status:"invalid"},400);
 const b=body as Record<string,unknown>;
 const title=typeof b.title==="string"?b.title.trim():"";
 const date=typeof b.date==="string"?b.date:"";
 if(title.length<4||title.length>180||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+"T12:00:00+07:00")))
  return reply({status:"invalid",message:"กรุณาระบุชื่อรายการ (4–180 ตัวอักษร) และวันที่ถูกต้อง"},400);
 if(new Date(date+"T12:00:00+07:00").toLocaleDateString("en-CA",{timeZone:"Asia/Bangkok"})!==date)
  return reply({status:"invalid",message:"วันที่ไม่ถูกต้อง"},400);
 try{
  const endpoint=new URL("/rest/v1/gt_tournaments",auth.base);
  endpoint.searchParams.set("select","id,title,start_at,status,published");
  const r=await fetch(endpoint,{method:"POST",headers:{...auth.headers,Prefer:"return=representation"},body:JSON.stringify({title,start_at:date+"T09:00:00+07:00",status:"draft",published:false}),cache:"no-store",signal:AbortSignal.timeout(8000)});
  const data=await r.json();if(!r.ok||!Array.isArray(data)||data.length!==1)throw Error();
  return reply({status:"ok",tournament:data[0]},201);
 }catch{return reply({status:"error",message:"บันทึกรายการแข่งขันไม่สำเร็จ กรุณาลองใหม่"},503)}
}
