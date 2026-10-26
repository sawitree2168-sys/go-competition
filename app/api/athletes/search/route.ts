import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: noStore });
}
export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return json({status:"error", message:"รูปแบบข้อมูลไม่ถูกต้อง"},400); }
  const name = body && typeof body === "object" ? (body as {name?:unknown}).name : null;
  if (typeof name !== "string" || name.length > 120 || name.trim().length < 2) {
    return json({status:"error",message:"กรุณาระบุชื่อที่ถูกต้อง"},400);
  }
  const normalized = name.trim().normalize("NFC").replace(/\s+/g," ");
  if (normalized.length < 2) return json({status:"error",message:"กรุณาระบุชื่อที่ถูกต้อง"},400);
  const rawAuth=request.headers.get("authorization") || "";
  const jwt = /^Bearer ([A-Za-z0-9._~-]+)$/.exec(rawAuth)?.[1];
  if (!jwt) return json({status:"verification_required",message:"ต้องเข้าสู่ระบบและยืนยันตัวตนก่อนดูรายชื่อที่ผูกกับบัญชี"},401);
  const base=process.env.GO_TOURNAMENT_SUPABASE_URL;
  const key=process.env.GO_TOURNAMENT_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) return json({status:"error",message:"ระบบตรวจสอบรายชื่อยังไม่พร้อม"},503);
  try {
    const userRes=await fetch(new URL("/auth/v1/user",base),{
      headers:{apikey:key,Authorization:`Bearer ${jwt}`},
      cache:"no-store",signal:AbortSignal.timeout(8000)
    });
    if(!userRes.ok) return json({status:"verification_required",message:"กรุณาเข้าสู่ระบบอีกครั้ง"},401);
    const identity:unknown=await userRes.json();
    const uid=identity && typeof identity==="object" && "id" in identity ? (identity as {id:unknown}).id : null;
    if(typeof uid!=="string" || !uid) return json({status:"verification_required",message:"ยังไม่ยืนยันตัวตน"},401);
    const endpoint=new URL("/rest/v1/gt_athletes",base);
    endpoint.searchParams.set("select","id,go_id,full_name,nickname,current_rank");
    endpoint.searchParams.set("claimed_by",`eq.${uid}`);
    endpoint.searchParams.set("limit","100");
    const athleteRes=await fetch(endpoint,{headers:{apikey:key,Authorization:`Bearer ${jwt}`,Accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(8000)});
    if(!athleteRes.ok) throw new Error("Athlete lookup unavailable");
    const records:unknown=await athleteRes.json();
    if(!Array.isArray(records))throw new Error("Invalid data");
    const hits=records.filter((x): x is {id:string;go_id:string;full_name:string;nickname?:string;current_rank?:string}=>Boolean(x&&typeof x==="object"&&typeof x.full_name==="string"&&typeof x.go_id==="string"&&typeof x.id==="string"))
      .filter(x=>x.full_name.normalize("NFC").replace(/\s+/g," ").trim().includes(normalized))
      .slice(0,10)
      .map(x=>({athleteId:x.go_id,displayName:x.full_name,nickname:x.nickname||undefined,level:x.current_rank||undefined}));
    return json({status:hits.length?"found":"not_linked",athletes:hits},200);
  }catch{
    return json({status:"error",message:"ตรวจสอบรายชื่อไม่สำเร็จ กรุณาลองใหม่ ไม่ควรสมัครข้อมูลซ้ำ"},503);
  }
}
