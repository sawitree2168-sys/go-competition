import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
const TOURNAMENT_ID = "ce1382d9-1e1f-4697-8fe4-6a1a347d91eb";
type Row = { source_row:number;title:string;full_name:string;institution:string;division_name:string;payment_status:string };
const permitted = new Set(["1-2 Kyu","3-4 Kyu","5-6 Kyu","7-8 Kyu","9-12 Kyu","OPEN Friendship 9×9","OPEN Friendship 13×13"]);
export async function POST(req:NextRequest){
 const secret=process.env.GT_SHEETS_SYNC_SECRET;
 if(!secret || req.headers.get("x-sync-secret")!==secret)return NextResponse.json({error:"Unauthorized"},{status:401});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,serviceKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!serviceKey)return NextResponse.json({error:"Sync service not configured"},{status:503});
 let body:{rows?:unknown};
 try{body=await req.json();}catch{return NextResponse.json({error:"Invalid JSON"},{status:400});}
 if(!Array.isArray(body.rows)||body.rows.length>1000)return NextResponse.json({error:"Invalid row count"},{status:400});
 const rows:Row[]=[];
 for(const raw of body.rows){
  if(!raw||typeof raw!=="object")return NextResponse.json({error:"Invalid row"},{status:400});
  const r=raw as Record<string,unknown>;
  const source_row=Number(r.source_row);
  const full_name=String(r.full_name??"").trim(),division_name=String(r.division_name??"").trim();
  if(!Number.isSafeInteger(source_row)||source_row<2||!full_name||full_name.length>200||!permitted.has(division_name))return NextResponse.json({error:"Invalid row values"},{status:400});
  rows.push({source_row,title:String(r.title??"").slice(0,30),full_name,institution:String(r.institution??"").slice(0,200),division_name,payment_status:String(r.payment_status??"รออัปเดต").slice(0,60)});
 }
 if(rows.length===0)return NextResponse.json({error:"Empty sheet: no changes made"},{status:400});
 const db=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {error:writeError}=await db.from("gt_public_entrants").upsert(rows.map(r=>({...r,tournament_id:TOURNAMENT_ID})),{onConflict:"tournament_id,source_row"});
 if(writeError)return NextResponse.json({error:"Database sync failed"},{status:500});
 const ids=new Set(rows.map(r=>r.source_row));
 const {data:existing,error:readError}=await db.from("gt_public_entrants").select("source_row").eq("tournament_id",TOURNAMENT_ID).limit(1000);
 if(readError)return NextResponse.json({error:"Sync wrote rows but cleanup failed"},{status:500});
 const removed=(existing??[]).map(x=>x.source_row).filter(x=>!ids.has(x));
 if(removed.length){const {error}=await db.from("gt_public_entrants").delete().eq("tournament_id",TOURNAMENT_ID).in("source_row",removed);if(error)return NextResponse.json({error:"Sync wrote rows but cleanup failed"},{status:500});}
 return NextResponse.json({ok:true,imported:rows.length,removed:removed.length});
}
