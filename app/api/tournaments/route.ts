import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  const url = process.env.GO_TOURNAMENT_SUPABASE_URL;
  const key = process.env.GO_TOURNAMENT_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.json({ status:"error",message:"ยังไม่ได้ตั้งค่าการเชื่อมต่อฐานข้อมูล" },{status:503,headers:{"Cache-Control":"no-store"}});
  try {
    const endpoint = new URL("/rest/v1/gt_tournaments",url);
    endpoint.searchParams.set("select","id,title,start_at,event_date,registration_open_date,registration_close_date,status,poster_url");
    endpoint.searchParams.set("published","eq.true");
    endpoint.searchParams.set("order","event_date.asc.nullslast");
    endpoint.searchParams.set("limit","100");
    const response=await fetch(endpoint,{headers:{"apikey":key,"Accept":"application/json"},cache:"no-store",signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw new Error("Database query failed");
    const rows=await response.json();
    if(!Array.isArray(rows))throw new Error("Invalid database response");
    return NextResponse.json({status:"ok",tournaments:rows},{headers:{"Cache-Control":"no-store"}});
  }catch{
    return NextResponse.json({status:"error",message:"ไม่สามารถอ่านรายการแข่งขันจากฐานข้อมูลในขณะนี้"},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
