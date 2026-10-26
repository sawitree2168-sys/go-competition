import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
const respond=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
export async function GET(request:Request){
 const base=process.env.GO_TOURNAMENT_SUPABASE_URL;
 const key=process.env.GO_TOURNAMENT_SUPABASE_PUBLISHABLE_KEY;
 if(!base||!key)return respond({status:"error",message:"ระบบยังไม่พร้อม"},503);
 const bearer=request.headers.get("authorization")||"";
 const token=/^Bearer ([A-Za-z0-9._~-]+)$/.exec(bearer)?.[1];
 if(!token)return respond({status:"unauthorized",message:"กรุณาเข้าสู่ระบบ"},401);
 const common={apikey:key,Authorization:`Bearer ${token}`,Accept:"application/json"};
 try{
  const identity=await fetch(new URL("/auth/v1/user",base),{headers:common,cache:"no-store",signal:AbortSignal.timeout(8000)});
  if(!identity.ok)return respond({status:"unauthorized",message:"เซสชันหมดอายุ"},401);
  const user:unknown=await identity.json();
  const id=user&&typeof user==="object"&&"id" in user ? (user as {id:unknown}).id : undefined;
  if(typeof id!=="string"||!id)return respond({status:"unauthorized",message:"ไม่สามารถระบุตัวตน"},401);
  const staffUrl=new URL("/rest/v1/gt_staff_members",base);
  staffUrl.searchParams.set("select","role,active");
  staffUrl.searchParams.set("user_id",`eq.${id}`);
  staffUrl.searchParams.set("limit","1");
  const staffRes=await fetch(staffUrl,{headers:common,cache:"no-store",signal:AbortSignal.timeout(8000)});
  if(!staffRes.ok)throw new Error("Staff lookup");
  const staff:unknown=await staffRes.json();
  if(!Array.isArray(staff)||staff.length!==1||staff[0]?.active!==true||!["owner","admin","reviewer"].includes(staff[0]?.role))
   return respond({status:"forbidden",message:"บัญชีนี้ยังไม่ได้รับสิทธิ์ตรวจคำขอ"},403);
  const claimsUrl=new URL("/rest/v1/gt_athlete_claim_requests",base);
  claimsUrl.searchParams.set("select","id,go_id,relationship,status,created_at");
  claimsUrl.searchParams.set("order","created_at.desc");
  claimsUrl.searchParams.set("limit","100");
  const claimRes=await fetch(claimsUrl,{headers:common,cache:"no-store",signal:AbortSignal.timeout(8000)});
  if(!claimRes.ok)throw new Error("Claim lookup");
  const claims:unknown=await claimRes.json();
  if(!Array.isArray(claims))throw new Error("Invalid claim response");
  return respond({status:"ok",role:staff[0].role,requests:claims});
 }catch{
  return respond({status:"error",message:"ตรวจสอบคำขอไม่สำเร็จ กรุณาลองใหม่"},503);
 }
}