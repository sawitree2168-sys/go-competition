import { NextResponse } from "next/server";
export const dynamic="force-dynamic";
const response=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
async function authorize(request:Request){
 const url=process.env.GO_TOURNAMENT_SUPABASE_URL;
 const key=process.env.GO_TOURNAMENT_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return {error:response({status:"error",message:"ยังไม่ได้ตั้งค่าฐานข้อมูล"},503)};
 const token=/^Bearer ([A-Za-z0-9._~-]+)$/.exec(request.headers.get("authorization")||"")?.[1];
 if(!token)return {error:response({status:"unauthorized",message:"กรุณาเข้าสู่ระบบ"},401)};
 const h={apikey:key,Authorization:`Bearer ${token}`,Accept:"application/json"};
 const user=await fetch(new URL("/auth/v1/user",url),{headers:h,cache:"no-store",signal:AbortSignal.timeout(8000)});
 if(!user.ok)return {error:response({status:"unauthorized",message:"กรุณาเข้าสู่ระบบอีกครั้ง"},401)};
 const identity:unknown=await user.json();
 const uid=identity&&typeof identity==="object"&&"id" in identity?(identity as {id:unknown}).id:null;
 if(typeof uid!=="string"||!uid)return {error:response({status:"unauthorized",message:"ไม่มีข้อมูลบัญชี"},401)};
 const staffUrl=new URL("/rest/v1/gt_staff_members",url);
 staffUrl.searchParams.set("select","role,active");staffUrl.searchParams.set("user_id",`eq.${uid}`);staffUrl.searchParams.set("limit","1");
 const staff=await fetch(staffUrl,{headers:h,cache:"no-store",signal:AbortSignal.timeout(8000)});
 if(!staff.ok)throw new Error("Staff lookup failed");
 const rows:unknown=await staff.json();
 if(!Array.isArray(rows)||rows.length!==1||rows[0]?.active!==true||!["owner","admin","reviewer"].includes(rows[0]?.role))
   return {error:response({status:"forbidden",message:"ไม่มีสิทธิ์บันทึกผลตรวจ"},403)};
 return {url,headers:h};
}
export async function GET(request:Request){
 try{
  const auth=await authorize(request);
  if(auth.error)return auth.error;
  const url=new URL("/rest/v1/gt_claim_review_checks",auth.url);
  url.searchParams.set("select","id,claim_id,identity_checked,relationship_checked,go_id_checked,duplicate_checked,note,created_at");
  url.searchParams.set("order","created_at.desc");url.searchParams.set("limit","100");
  const result=await fetch(url,{headers:auth.headers,cache:"no-store",signal:AbortSignal.timeout(8000)});
  if(!result.ok)throw new Error("Cannot load reviews");
  const reviews:unknown=await result.json();
  if(!Array.isArray(reviews))throw new Error("Invalid reviews");
  return response({status:"ok",reviews});
 }catch{return response({status:"error",message:"อ่านบันทึกตรวจสอบไม่ได้"},503);}
}
export async function POST(request:Request){
 try{
  const auth=await authorize(request);
  if(auth.error)return auth.error;
  let body:unknown;
  try{body=await request.json();}catch{return response({status:"error",message:"ข้อมูลไม่ถูกต้อง"},400);}
  if(!body||typeof body!=="object")return response({status:"error",message:"ข้อมูลไม่ถูกต้อง"},400);
  const x=body as Record<string,unknown>;
  const id=x.claimId, note=x.note;
  const flags=["identityChecked","relationshipChecked","goIdChecked","duplicateChecked"] as const;
  if(typeof id!=="string"|| !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
     ||typeof note!=="string"||note.trim().length<12||note.trim().length>500
     ||flags.some(k=>typeof x[k]!=="boolean"))
    return response({status:"error",message:"ตรวจข้อมูลและหมายเหตุอย่างน้อย 12 ตัวอักษร"},400);
  // Never accept document identifiers, photos or sensitive evidence uploads here.
  const payload={
   claim_id:id,identity_checked:x.identityChecked,
   relationship_checked:x.relationshipChecked,go_id_checked:x.goIdChecked,
   duplicate_checked:x.duplicateChecked,note:note.trim()
  };
  const url=new URL("/rest/v1/gt_claim_review_checks",auth.url);
  const result=await fetch(url,{method:"POST",headers:{...auth.headers,"Content-Type":"application/json","Prefer":"return=minimal"},body:JSON.stringify(payload),cache:"no-store",signal:AbortSignal.timeout(8000)});
  if(result.status===409)return response({status:"error",message:"บัญชีนี้ได้บันทึกผลตรวจของคำขอนี้แล้ว ไม่ควรบันทึกซ้ำ"},409);
  if(!result.ok)return response({status:"error",message:"บันทึกไม่ได้ กรุณาตรวจสถานะคำขอและสิทธิ์ก่อน"},400);
  return response({status:"saved",message:"บันทึกผลตรวจแล้ว ยังไม่ได้อนุมัติหรือผูก GO ID"},201);
 }catch{return response({status:"error",message:"บันทึกผลตรวจไม่สำเร็จ"},503);}
}