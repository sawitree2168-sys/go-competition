import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ status: "error", message: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ status:"error",message:"รูปแบบข้อมูลไม่ถูกต้อง" },{status:400});
  const input = body as Record<string, unknown>;
  const a = input.athleteA, b = input.athleteB;
  if (typeof a !== "string" || typeof b !== "string" || !a.trim() || !b.trim() || a.trim() === b.trim() || a.length > 80 || b.length > 80)
    return NextResponse.json({status:"error",message:"กรุณาระบุ GO ID สองคนที่แตกต่างกัน"},{status:400});
  // Fail-closed until Supabase is healthy and authorized data queries are wired.
  // Never return fabricated history or reveal private results through public service credentials.
  return NextResponse.json({status:"error",message:"ฐานข้อมูล GO TOURNAMENT ยังไม่พร้อม จึงยังตรวจสอบผลการแข่งขันจริงไม่ได้"},{status:503,headers:{"Cache-Control":"no-store"}});
}