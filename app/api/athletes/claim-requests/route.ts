import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const fail = (message:string,status:number) => NextResponse.json({status:"error",message},{status,headers});
const endpointBase = () => {
 const url=process.env.GO_TOURNAMENT_SUPABASE_URL, key=process.env.GO_TOURNAMENT_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key) return null;
 return {url,key};
};
async function principal(request:Request, config:{url:string;key:string}){
 const raw=request.headers.get("authorization") || "";
 const token=/^Bearer ([A-Za-z0-9._~-]+)$/.exec(raw)?.[1];
 if(!token)return null;
 const result=await fetch(new URL("/auth/v1/user",config.url),{
  headers:{apikey:config.key,Authorization:`Bearer ${token}`},
  cache:"no-store",signal:AbortSignal.timeout(8000)
 });
 if(!result.ok)return null;
 const user:unknown=await result.json();
 if(!user||typeof user!=="object"||!("id" in user)||typeof (user as {id:unknown}).id!=="string")return null;
 return token;
}
export async function POST(request:Request){
 const config=endpointBase();
 if(!config)return fail("ระบบส่งคำขอยังไม่พร้อม",503);
 let token:string|null;
 try{token=await principal(request,config);}catch{return fail("ตรวจสอบตัวตนไม่สำเร็จ",503);}
 if(!token)return fail("กรุณาเข้าสู่ระบบก่อนส่งคำขอ",401);
 let body:unknown;
 try{body=await request.json();}catch{return fail("รูปแบบคำขอไม่ถูกต้อง",400);}
 if(!body||typeof body!=="object")return fail("รูปแบบคำขอไม่ถูกต้อง",400);
 const {goId,relationship,consentConfirmed}=body as Record<string,unknown>;
 if(typeof goId!=="string"||goId.trim().length<3||goId.trim().length>200||
  !/^[\p{L}\p{M}\p{N}\s_\-\u200B-\u200D\uFEFF]+$/u.test(goId.trim())||
  !["self","parent_guardian","teacher_authorized"].includes(String(relationship))||consentConfirmed!==true)
  return fail("กรุณาตรวจสอบ GO ID ความสัมพันธ์ และการยืนยันสิทธิ์",400);
 try{
  const endpoint=new URL("/rest/v1/rpc/gt_submit_legacy_claim_v2",config.url);
  const response=await fetch(endpoint,{
   method:"POST",
   headers:{"apikey":config.key,"Authorization":`Bearer ${token}`,"Content-Type":"application/json","Prefer":"return=minimal"},
   body:JSON.stringify({p_query:goId.trim(),p_relationship:relationship,p_consent:true}),
   signal:AbortSignal.timeout(8000),cache:"no-store"
  });
  if(response.status===409)return fail("มีคำขอสำหรับ GO ID นี้ค้างตรวจสอบอยู่แล้ว",409);
  if(!response.ok){
    // Only map known safe database rule names. Do not expose internal SQL messages.
    let code:unknown=null;
    try{const details:unknown=await response.json();
      if(details&&typeof details==="object"&&"message" in details)code=(details as {message:unknown}).message;
    }catch{}
    if(code==="IDENTITY_REVIEW_REQUIRED")return fail("ยังระบุนักกีฬาไม่ได้ชัดเจน กรุณาระบุ GO ID เดิมหรือติดต่อผู้จัด ไม่ต้องสมัครนักกีฬาซ้ำ",409);
    if(code==="CLAIM_DAILY_LIMIT")return NextResponse.json({status:"rate_limited",message:"ส่งคำขอครบ 5 ครั้งในรอบ 24 ชั่วโมงแล้ว กรุณาลองใหม่ภายหลัง"},{status:429,headers:{"Cache-Control":"no-store","Retry-After":"3600"}});
    if(code==="CLAIM_PENDING_LIMIT")return NextResponse.json({status:"rate_limited",message:"มีคำขอรอตรวจสอบครบ 3 รายการแล้ว กรุณารอผู้จัดตรวจสอบก่อน"},{status:429,headers:{"Cache-Control":"no-store"}});
    throw new Error("Database rejected request");
  }
  return NextResponse.json({status:"submitted",message:"ส่งคำขอแล้ว รอผู้จัดตรวจสอบและยืนยันสิทธิ์"},{status:201,headers});
 }catch{return fail("ส่งคำขอไม่สำเร็จ กรุณาลองใหม่",503);}
}
export async function GET(request:Request){
 const config=endpointBase();
 if(!config)return fail("ระบบยังไม่พร้อม",503);
 let token:string|null;
 try{token=await principal(request,config);}catch{return fail("ตรวจสอบตัวตนไม่สำเร็จ",503);}
 if(!token)return fail("กรุณาเข้าสู่ระบบก่อนดูคำขอ",401);
 try{
  const endpoint=new URL("/rest/v1/gt_athlete_claim_requests",config.url);
  endpoint.searchParams.set("select","id,go_id,relationship,status,created_at");
  endpoint.searchParams.set("order","created_at.desc");endpoint.searchParams.set("limit","20");
  const response=await fetch(endpoint,{
   headers:{apikey:config.key,Authorization:`Bearer ${token}`,Accept:"application/json"},
   cache:"no-store",signal:AbortSignal.timeout(8000)
  });
  if(!response.ok)throw new Error("Cannot read claims");
  const requests:unknown=await response.json();
  if(!Array.isArray(requests))throw new Error("Invalid result");
  return NextResponse.json({status:"ok",requests},{headers});
 }catch{return fail("อ่านสถานะคำขอไม่สำเร็จ",503);}
}