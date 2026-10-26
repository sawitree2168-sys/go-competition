import {reply,staffAuth} from "../tournament-auth";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const allowed=["featured","cover","poster","news"];
export async function GET(request:Request){
 const auth=await staffAuth(request);if("error" in auth)return auth.error;
 const id=new URL(request.url).searchParams.get("tournament_id");
 if(!id||!uuid.test(id))return reply({status:"invalid",message:"Tournament ID ไม่ถูกต้อง"},400);
 try{
 const endpoint=new URL("/rest/v1/gt_tournament_media",auth.base);
 endpoint.searchParams.set("select","id,tournament_id,storage_path,media_kind,caption,public_approved,sort_order,created_at");
 endpoint.searchParams.set("tournament_id","eq."+id);endpoint.searchParams.set("order","sort_order.asc,created_at.desc");endpoint.searchParams.set("limit","200");
 const result=await fetch(endpoint,{headers:auth.headers,cache:"no-store",signal:AbortSignal.timeout(8000)});
 const rows=await result.json();if(!result.ok||!Array.isArray(rows))throw Error();
 return reply({status:"ok",media:rows});
 }catch{return reply({status:"error",message:"ไม่สามารถโหลดข้อมูลรูปภาพ"},503)}
}
export async function POST(request:Request){
 const auth=await staffAuth(request);if("error" in auth)return auth.error;
 if(!["owner","admin"].includes(auth.role))return reply({status:"forbidden",message:"ไม่มีสิทธิ์เพิ่มภาพ"},403);
 let data:unknown;try{data=await request.json()}catch{return reply({status:"invalid"},400)}
 if(!data||typeof data!=="object")return reply({status:"invalid"},400);
 const body=data as Record<string,unknown>;
 const tournament=typeof body.tournament_id==="string"?body.tournament_id:"";
 const storage=typeof body.storage_path==="string"?body.storage_path:"";
 const kind=typeof body.media_kind==="string"?body.media_kind:"";
 const caption=typeof body.caption==="string"?body.caption.trim():"";
 if(!uuid.test(tournament)||!allowed.includes(kind)||caption.length>280||!new RegExp("^"+tournament+"/[0-9a-f-]{36}\\.(jpg|png|webp)$","i").test(storage))
 return reply({status:"invalid",message:"ชื่อไฟล์หรือรายการแข่งขันไม่ถูกต้อง"},400);
 try{
 const endpoint=new URL("/rest/v1/gt_tournament_media",auth.base);endpoint.searchParams.set("select","id,tournament_id,storage_path,media_kind,caption,public_approved");
 const result=await fetch(endpoint,{method:"POST",headers:{...auth.headers,Prefer:"return=representation"},body:JSON.stringify({tournament_id:tournament,storage_path:storage,media_kind:kind,caption,public_approved:false,sort_order:0}),cache:"no-store",signal:AbortSignal.timeout(8000)});
 const rows=await result.json();if(!result.ok||!Array.isArray(rows)||rows.length!==1)throw Error();
 return reply({status:"ok",media:rows[0]},201);
 }catch{return reply({status:"error",message:"บันทึกภาพไม่สำเร็จ"},503)}
}
