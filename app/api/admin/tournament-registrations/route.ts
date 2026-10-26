import {reply,staffAuth} from "../tournament-auth";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Row=Record<string,unknown>;
export async function GET(request:Request){
 const auth=await staffAuth(request);if("error" in auth)return auth.error;
 const id=new URL(request.url).searchParams.get("tournament_id");
 if(!id||!uuid.test(id))return reply({status:"invalid",message:"Tournament ID ไม่ถูกต้อง"},400);
 const get=async(table:string,select:string,filter:string)=>{
  const u=new URL("/rest/v1/"+table,auth.base);
  u.searchParams.set("select",select);u.searchParams.set(filter,"eq."+id);
  u.searchParams.set("limit","1000");u.searchParams.set("order",table==="gt_registrations"?"created_at.asc":"name.asc");
  const r=await fetch(u,{headers:auth.headers,cache:"no-store",signal:AbortSignal.timeout(8000)});
  const rows:unknown=await r.json();if(!r.ok||!Array.isArray(rows))throw Error();
  if(rows.length===1000)throw Error("too many records; pagination required");
  return rows as Row[];
 };
 try{
 const [registrations,divisions]=await Promise.all([
  get("gt_registrations","id,athlete_id,division_id,registration_status,payment_status,created_at","tournament_id"),
  get("gt_divisions","id,name","tournament_id")
 ]);
 const dnames=new Map(divisions.map(d=>[d.id,d.name]));
 const aIds=[...new Set(registrations.map(r=>r.athlete_id).filter((x):x is string=>typeof x==="string"&&uuid.test(x)))];
 const athletes:Row[]=[];
 for(let i=0;i<aIds.length;i+=70){
  const u=new URL("/rest/v1/gt_athletes",auth.base);u.searchParams.set("select","id,go_id,full_name,current_rank");
  u.searchParams.set("id","in.("+aIds.slice(i,i+70).join(",")+")");u.searchParams.set("limit","100");
  const r=await fetch(u,{headers:auth.headers,cache:"no-store",signal:AbortSignal.timeout(8000)});
  const found:unknown=await r.json();if(!r.ok||!Array.isArray(found))throw Error();athletes.push(...found);
 }
 const amap=new Map(athletes.map(a=>[a.id,a]));
 const list=registrations.map(r=>({id:r.id,created_at:r.created_at,
  athlete_id:r.athlete_id,go_id:amap.get(r.athlete_id)?.go_id||null,
  athlete_name:amap.get(r.athlete_id)?.full_name||"ไม่พบข้อมูลนักกีฬา",
  rank:amap.get(r.athlete_id)?.current_rank||null,
  division_name:dnames.get(r.division_id)||"ไม่พบชื่อรุ่น",
  registration_status:r.registration_status,payment_status:r.payment_status
 }));
 return reply({status:"ok",tournament_id:id,registrations:list});
 }catch{return reply({status:"error",message:"ไม่สามารถอ่านรายชื่อผู้สมัครได้ โปรดตรวจฐานข้อมูลหรือแบ่งหน้ารายการ"},503)}
}
