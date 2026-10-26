import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  const url = process.env.GO_TOURNAMENT_SUPABASE_URL;
  const key = process.env.GO_TOURNAMENT_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.json({status:"error",message:"ยังไม่พร้อมสำหรับเข้าสู่ระบบ"},{status:503,headers:{"Cache-Control":"no-store"}});
  // Supabase publishable keys are designed for browser use. Never expose service_role keys.
  return NextResponse.json({status:"ok",url,key},{headers:{"Cache-Control":"no-store"}});
}
