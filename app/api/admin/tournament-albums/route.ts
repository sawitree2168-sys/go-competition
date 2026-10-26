import {reply,staffAuth} from "../tournament-auth";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function folderUrl(raw:string){
 try{
  const u=new URL(raw.trim());
  if(u.protocol!=="https:"||u.hostname!=="drive.google.com"||u.username||u.password||u.port||u.search||u.hash)return null;
  if(!/^\/drive\/folders\/[A-Za-z0-9_-]{10,150}\/?$/.test(u.pathname))return null;
  return u.origin+u.pathname.replace(/\/$/,"");
 }catch{return null}
}
export async function GET(request:Request){
 const auth=await staffAuth(request);if("error" in auth)return auth.error;
 const id=new URL(request.url).searchParams.get("tournament_id");
 if(!id||!uuid.test(id))return reply({status:"invalid"},400);
 try{
 const url=new URL("/rest/v1/gt_tournament_albums",auth.base);
 url.searchParams.set("select","tournament_id,drive_folder_url,published,consent_checked");
 url.searchParams.set("tournament_id","eq."+id);
 const r=await fetch(url,{headers:auth.headers,cache:"no-store",signal:AbortSignal.timeout(8000)});
 const items=await r.json();
 if(!r.ok||!Array.isArray(items))throw Error();
 return reply({status:"ok",album:items[0]||null});
 }catch{return reply({status:"error",message:"ไม่สามารถโหลดอัลบั้ม"},503)}
}
export async function PUT(request:Request){
 const auth=await staffAuth(request);if("error" in auth)return auth.error;
 if(!["owner","admin"].includes(auth.role))return reply({status:"forbidden",message:"ไม่มีสิทธิ์แก้ไขอัลบั้ม"},403);
 let body:unknown;try{body=await request.json()}catch{return reply({status:"invalid"},400)}
 if(!body||typeof body!=="object")return reply({status:"invalid"},400);
 const b=body as Record<string,unknown>;
 const id=typeof b.tournament_id==="string"?b.tournament_id:"";
 const link=typeof b.drive_folder_url==="string"?folderUrl(b.drive_folder_url):null;
 if(!uuid.test(id)||!link)return reply({status:"invalid",message:"กรุณาใส่ลิงก์โฟลเดอร์ Google Drive ที่ถูกต้อง"},400);
 try{
 const url=new URL("/rest/v1/gt_tournament_albums",auth.base);url.searchParams.set("on_conflict","tournament_id");
 const r=await fetch(url,{method:"POST",headers:{...auth.headers,Prefer:"resolution=merge-duplicates,return=representation"},body:JSON.stringify({tournament_id:id,drive_folder_url:link,published:false,consent_checked:false,updated_at:new Date().toISOString()}),cache:"no-store",signal:AbortSignal.timeout(8000)});
 const items=await r.json();if(!r.ok||!Array.isArray(items)||items.length!==1)throw Error();
 return reply({status:"ok",album:items[0]});
 }catch{return reply({status:"error",message:"บันทึกลิงก์อัลบั้มไม่สำเร็จ"},503)}
}
