import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { loadFanData } from "@/lib/go-fan-data";
export async function GET(request: Request) {
  const event = new URL(request.url).searchParams.get("event") ?? undefined;
  if (event && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(event)) return NextResponse.json({error:"รายการแข่งขันไม่ถูกต้อง"},{status:400});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url || !key) return NextResponse.json({error:"ยังเชื่อมต่อข้อมูลไม่ได้"},{status:503});
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:"no-store"})}});
  try { const data=await loadFanData(event,db); return NextResponse.json(data,{status:data.error ? 503 : 200,headers:{"Cache-Control":data.error ? "no-store" : "public, s-maxage=10, stale-while-revalidate=10"}}); }
  catch { return NextResponse.json({error:"โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่"},{status:503}); }
}
