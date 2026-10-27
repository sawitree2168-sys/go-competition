import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!uuid.test(id))return NextResponse.json({status:"invalid",message:"รหัสรายการแข่งขันไม่ถูกต้อง"},{status:400});
 const base=process.env.GO_TOURNAMENT_SUPABASE_URL;
 const key=process.env.GO_TOURNAMENT_SUPABASE_PUBLISHABLE_KEY;
 if(!base||!key)return NextResponse.json({status:"error",message:"ระบบยังไม่พร้อม"},{status:503});
 const headers={apikey:key,Accept:"application/json"};
 try{
  const eventUrl=new URL("/rest/v1/gt_tournaments",base);
  eventUrl.searchParams.set("select","id,title,start_at,status");
  eventUrl.searchParams.set("id","eq."+id);
  eventUrl.searchParams.set("published","eq.true");
  eventUrl.searchParams.set("limit","1");
  const divisionUrl=new URL("/rest/v1/gt_divisions",base);
  divisionUrl.searchParams.set("select","id,name,seats_limit,pairing_enabled,entry_fee_thb");
  divisionUrl.searchParams.set("tournament_id","eq."+id);
  divisionUrl.searchParams.set("order","name.asc");
  divisionUrl.searchParams.set("limit","100");
  const [e,d]=await Promise.all([
   fetch(eventUrl,{headers,cache:"no-store",signal:AbortSignal.timeout(8000)}),
   fetch(divisionUrl,{headers,cache:"no-store",signal:AbortSignal.timeout(8000)})
  ]);
  if(!e.ok||!d.ok)throw Error("db");
  const events:unknown=await e.json();
  const divisions:unknown=await d.json();
  if(!Array.isArray(events)||!Array.isArray(divisions))throw Error("shape");
  if(events.length===0)return NextResponse.json({status:"not_found",message:"ไม่พบรายการแข่งขันที่เผยแพร่"},{status:404,headers:{"Cache-Control":"no-store"}});
  return NextResponse.json({status:"ok",tournament:events[0],divisions},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({status:"error",message:"ไม่สามารถโหลดรายละเอียดการแข่งขันได้"},{status:503,headers:{"Cache-Control":"no-store"}})}
}
