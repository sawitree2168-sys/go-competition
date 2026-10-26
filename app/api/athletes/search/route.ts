import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  let name: unknown;
  try { ({name} = await request.json()); }
  catch { return NextResponse.json({status:"error",message:"ข้อมูลคำขอไม่ถูกต้อง"},{status:400}); }
  if (typeof name !== "string" || name.trim().length < 2 || name.length > 120) {
    return NextResponse.json({status:"error",message:"กรุณาระบุชื่อที่ถูกต้อง"},{status:400});
  }
  // Intentionally fail closed until authorized server-side data access is wired.
  // NEVER switch to fake/local fallback data; never query another project's sheet.
  // Before enabling: verify GO TOURNAMENT DB project, authenticated identity claim,
  // organization-based RLS, matching normalization and rate limiting.
  return NextResponse.json(
    {status:"error",message:"ระบบตรวจสอบรายชื่อยังไม่เชื่อมฐานข้อมูล GO TOURNAMENT กรุณาลองอีกครั้งภายหลัง"},
    {status:503,headers:{"Cache-Control":"no-store"}}
  );
}
