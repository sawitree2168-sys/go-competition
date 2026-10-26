import {reply,staffAuth} from "../tournament-auth";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Item=Record<string,unknown>;
export async function GET(request:Request){
 const auth=await staffAuth(request);if("error" in auth)return auth.error;
 const id=new URL(request.url).searchParams.get("tournament_id");
 if(!id||!uuid.test(id))return reply({status:"invalid",message:"Tournament ID ไม่ถูกต้อง"},400);
 const finance=auth.role==="owner"||auth.role==="admin";
 const query=async(table:string,columns:string)=>{
  const url=new URL("/rest/v1/"+table,auth.base);url.searchParams.set("select",columns);url.searchParams.set("tournament_id","eq."+id);url.searchParams.set("limit","10000");
  const r=await fetch(url,{headers:auth.headers,cache:"no-store",signal:AbortSignal.timeout(9000)});
  if(!r.ok)throw new Error(table+" status "+r.status);
  const list:unknown=await r.json();if(!Array.isArray(list))throw new Error("Unexpected "+table);
  if(list.length===10000)throw new Error("Record limit reached: "+table);
  return list as Item[];
 };
 try{
 const eventUrl=new URL("/rest/v1/gt_tournaments",auth.base);
 eventUrl.searchParams.set("select","id,title,status,published");eventUrl.searchParams.set("id","eq."+id);eventUrl.searchParams.set("limit","1");
 const r=await fetch(eventUrl,{headers:auth.headers,cache:"no-store",signal:AbortSignal.timeout(9000)});
 const list:unknown=await r.json();
 if(!r.ok||!Array.isArray(list))throw Error();
 if(list.length!==1)return reply({status:"not_found",message:"ไม่พบรายการหรือไม่มีสิทธิ์เข้าถึง"},404);
 const names:[string,string][]=[["gt_divisions","id"],["gt_registrations","id,registration_status,payment_status"],["gt_matches","id,state"],["gt_tournament_news","id,status"],["gt_tournament_media","id,public_approved"],["gt_certificates","id,issued_at"]];
 if(finance){names.push(["gt_payments","id,amount_received,payment_status"],["gt_tournament_expenses","id,amount"])}
 const entries=await Promise.all(names.map(async([name,cols])=>[name,await query(name,cols)] as const));
 const records=Object.fromEntries(entries) as Record<string,Item[]>;
 const registration=records.gt_registrations;
 const payment=records.gt_payments||[];
 const total=(rows:Item[],key:string)=>Math.round(rows.reduce((n,x)=>n+(typeof x[key]==="number"?x[key] as number:0),0)*100)/100;
 const verified=payment.filter(p=>p.payment_status==="verified");
 const result={status:"ok",tournament:list[0],role:auth.role,
 counts:{divisions:records.gt_divisions.length,registrations:registration.length,confirmedRegistrations:registration.filter(x=>x.registration_status==="confirmed").length,paymentVerifiedRegistrations:registration.filter(x=>x.payment_status==="verified").length,matches:records.gt_matches.length,verifiedMatches:records.gt_matches.filter(x=>x.state==="verified").length,news:records.gt_tournament_news.length,media:records.gt_tournament_media.length,certificates:records.gt_certificates.length},
 finance:finance?{payments:payment.length,verifiedPayments:verified.length,verifiedAmount:total(verified,"amount_received"),expenses:total(records.gt_tournament_expenses,"amount")} : null};
 return reply(result);
 }catch{return reply({status:"error",message:"โหลดภาพรวมรายการแข่งขันไม่สำเร็จ กรุณาลองอีกครั้ง"},503)}
}
