import {reply,staffAuth} from "../tournament-auth";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function PATCH(request:Request){
 const auth=await staffAuth(request);if("error" in auth)return auth.error;
 if(!["owner","admin"].includes(auth.role))return reply({status:"forbidden",message:"เฉพาะ Owner/Admin สามารถเปลี่ยนโปสเตอร์ได้"},403);
 let payload:unknown;try{payload=await request.json()}catch{return reply({status:"invalid"},400)}
 if(!payload||typeof payload!=="object"||Array.isArray(payload))return reply({status:"invalid"},400);
 const body=payload as Record<string,unknown>;
 const id=typeof body.tournament_id==="string"?body.tournament_id:"";
 const image=typeof body.poster_url==="string"?body.poster_url:"";
 if(!uuid.test(id))return reply({status:"invalid",message:"Tournament ID ไม่ถูกต้อง"},400);
 let root:URL,actual:URL;
 try{root=new URL(auth.base);actual=new URL(image)}catch{return reply({status:"invalid",message:"URL โปสเตอร์ไม่ถูกต้อง"},400)}
 const prefix="/storage/v1/object/public/gt-site-assets/banners/tournaments/"+id+"/";
 if(actual.origin!==root.origin||!actual.pathname.startsWith(prefix)||!actual.pathname.endsWith(".webp")||actual.search||actual.hash)
  return reply({status:"invalid",message:"ต้องเป็นไฟล์ WebP ที่อัปโหลดเข้าคลังภาพของรายการนี้เท่านั้น"},400);
 try{
  const url=new URL("/rest/v1/gt_tournaments",auth.base);
  url.searchParams.set("id","eq."+id);url.searchParams.set("select","id,poster_url");
  const response=await fetch(url,{method:"PATCH",headers:{...auth.headers,Prefer:"return=representation"},body:JSON.stringify({poster_url:image}),cache:"no-store",signal:AbortSignal.timeout(8000)});
  const data:unknown=await response.json();
  if(!response.ok||!Array.isArray(data)||data.length!==1)throw Error();
  return reply({status:"ok",tournament:data[0],message:"บันทึกโปสเตอร์ของรายการแข่งขันแล้ว"});
 }catch{return reply({status:"error",message:"บันทึก URL โปสเตอร์ไม่สำเร็จ"},503)}
}