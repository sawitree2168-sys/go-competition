import {reply,staffAuth} from "../tournament-auth";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function GET(request:Request){
 const auth=await staffAuth(request);if("error" in auth)return auth.error;
 const id=new URL(request.url).searchParams.get("tournament_id");
 if(!id||!uuid.test(id))return reply({status:"invalid",message:"Tournament ID ไม่ถูกต้อง"},400);
 try{
  const url=new URL("/rest/v1/gt_tournament_news",auth.base);
  url.searchParams.set("select","id,tournament_id,title,body,status,created_at,published_at");
  url.searchParams.set("tournament_id","eq."+id);url.searchParams.set("order","created_at.desc");url.searchParams.set("limit","100");
  const r=await fetch(url,{headers:auth.headers,cache:"no-store",signal:AbortSignal.timeout(8000)});
  const data=await r.json();if(!r.ok||!Array.isArray(data))throw Error();
  return reply({status:"ok",news:data});
 }catch{return reply({status:"error",message:"โหลดข่าวสารไม่ได้"},503)}
}
export async function POST(request:Request){
 const auth=await staffAuth(request);if("error" in auth)return auth.error;
 if(!["owner","admin"].includes(auth.role))return reply({status:"forbidden"},403);
 let b:unknown;try{b=await request.json()}catch{return reply({status:"invalid"},400)}
 if(!b||typeof b!=="object")return reply({status:"invalid"},400);
 const data=b as Record<string,unknown>;
 const id=typeof data.tournament_id==="string"?data.tournament_id:"";
 const title=typeof data.title==="string"?data.title.trim():"";
 const body=typeof data.body==="string"?data.body.trim():"";
 if(!uuid.test(id)||title.length<3||title.length>200||body.length>10000)
 return reply({status:"invalid",message:"กรุณาระบุชื่อข่าวและเนื้อหาให้ถูกต้อง"},400);
 try{
 const u=new URL("/rest/v1/gt_tournament_news",auth.base);u.searchParams.set("select","id,tournament_id,title,status,created_at");
 const r=await fetch(u,{method:"POST",headers:{...auth.headers,Prefer:"return=representation"},body:JSON.stringify({tournament_id:id,title,body,status:"draft",published_at:null}),cache:"no-store",signal:AbortSignal.timeout(8000)});
 const rows=await r.json();if(!r.ok||!Array.isArray(rows)||rows.length!==1)throw Error();
 return reply({status:"ok",news:rows[0]},201);
 }catch{return reply({status:"error",message:"ไม่สามารถบันทึกข่าวแบบร่าง"},503)}
}
