import {reply} from "../admin/tournament-auth";
export const dynamic="force-dynamic";
const validSlot=/^[a-z][a-z0-9_-]{1,63}$/;
export async function GET(request:Request){
 const base=process.env.GO_TOURNAMENT_SUPABASE_URL;
 const key=process.env.GO_TOURNAMENT_SUPABASE_PUBLISHABLE_KEY;
 if(!base||!key)return reply({status:"error",message:"ยังไม่พร้อมเชื่อมข้อมูลภาพ"},503);
 const slot=new URL(request.url).searchParams.get("slot")||"home";
 if(!validSlot.test(slot))return reply({status:"invalid"},400);
 try{
  const u=new URL("/rest/v1/gt_site_media",base);
  u.searchParams.set("select","slot,device,image_url,alt_text,asset_id,updated_at");
  u.searchParams.set("slot","eq."+slot);
  u.searchParams.set("status","eq.published");
  u.searchParams.set("limit","3");
  const r=await fetch(u,{headers:{apikey:key,Accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(8000)});
  const data:unknown=await r.json();
  if(!r.ok||!Array.isArray(data))throw Error();
  return reply({status:"ok",slot,images:data});
 }catch{return reply({status:"error",message:"ไม่สามารถโหลดภาพที่เผยแพร่ได้"},503)}
}
