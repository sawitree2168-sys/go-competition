import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Athlete={id:string;go_id:string;full_name:string;nickname:string|null;current_rank:string|null};
type Match={id:string;tournament_id:string;round_number:number;black_athlete_id:string;white_athlete_id:string;winner_athlete_id:string|null;result_code:string|null;verified_at:string};
function apiHeaders(){const base=process.env.GO_TOURNAMENT_SUPABASE_URL;const key=process.env.GO_TOURNAMENT_SUPABASE_PUBLISHABLE_KEY;return base&&key?{base,key}:null}
async function getRows<T>(base:string,key:string,table:string,params:Record<string,string>):Promise<T[]>{
 const url=new URL("/rest/v1/"+table,base);
 for(const [k,v] of Object.entries(params))url.searchParams.set(k,v);
 const resp=await fetch(url,{headers:{apikey:key,Accept:"application/json"},cache:"no-store",signal:AbortSignal.timeout(8000)});
 if(!resp.ok)throw Error("public data unavailable");
 const data:unknown=await resp.json();
 if(!Array.isArray(data))throw Error("public data malformed");
 return data as T[];
}
export async function GET(request:Request){
 const config=apiHeaders();
 if(!config)return NextResponse.json({status:"error",message:"ระบบยังไม่พร้อมใช้งาน"},{status:503});
 const {base,key}=config;
 const u=new URL(request.url);
 const mode=u.searchParams.get("mode")||"search";
 try{
  if(mode==="search"){
   const q=(u.searchParams.get("q")||"").trim().replace(/\s+/g," ");
   if(q.length<2||q.length>70||!(/^[\p{L}\p{N} \-]+$/u).test(q))
    return NextResponse.json({status:"invalid",message:"พิมพ์ชื่อหรือ GO ID อย่างน้อย 2 ตัวอักษร"},{status:400});
   const isGoId=/^[A-Za-z0-9\-]{3,40}$/.test(q);
   const safeName=q.replace(/ /g,"%");
   const searchFilter=isGoId
    ? "(go_id.eq."+q+",full_name.ilike.*"+safeName+"*)"
    : "(full_name.ilike.*"+safeName+"*)";
   const rows=await getRows<Athlete>(base,key,"gt_athletes",{
    select:"id,go_id,full_name,nickname,current_rank",profile_public:"eq.true",
    or:searchFilter,limit:"20",order:"full_name.asc"
   });
   return NextResponse.json({status:"ok",athletes:rows},{headers:{"Cache-Control":"no-store"}});
  }
  if(mode!=="watch")return NextResponse.json({status:"invalid",message:"รูปแบบการค้นหาไม่ถูกต้อง"},{status:400});
  const raw=(u.searchParams.get("ids")||"").split(",").filter(Boolean);
  if(raw.length>20||raw.some(x=>!uuid.test(x)))
   return NextResponse.json({status:"invalid",message:"เลือกติดตามได้สูงสุด 20 คน"},{status:400});
  const ids=[...new Set(raw)];
  if(ids.length===0)return NextResponse.json({status:"ok",athletes:[],results:[]},{headers:{"Cache-Control":"no-store"}});
  const athleteRows=await getRows<Athlete>(base,key,"gt_athletes",{
   select:"id,go_id,full_name,nickname,current_rank",profile_public:"eq.true",
   id:"in.("+ids.join(",")+")",limit:"20"
  });
  const allowed=new Set(athleteRows.map(x=>x.id));
  if(!allowed.size)return NextResponse.json({status:"ok",athletes:[],results:[]},{headers:{"Cache-Control":"no-store"}});
  const idsForQuery=athleteRows.map(x=>x.id).join(",");
  const matches=await getRows<Match>(base,key,"gt_matches",{
   select:"id,tournament_id,round_number,black_athlete_id,white_athlete_id,winner_athlete_id,result_code,verified_at",
   or:"(black_athlete_id.in.("+idsForQuery+"),white_athlete_id.in.("+idsForQuery+"))",
   state:"eq.verified",verified_at:"not.is.null",order:"verified_at.desc",limit:"500"
  });
  const results=matches.filter(m=>allowed.has(m.black_athlete_id)||allowed.has(m.white_athlete_id)).map(m=>({
   id:m.id,tournament_id:m.tournament_id,round:m.round_number,
   black_id:m.black_athlete_id,white_id:m.white_athlete_id,
   winner_id:m.winner_athlete_id,double_forfeit:m.result_code==="double_forfeit",verified_at:m.verified_at
  }));
  return NextResponse.json({status:"ok",athletes:athleteRows,results},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({status:"error",message:"โหลดข้อมูลสาธารณะไม่ได้ กรุณาลองใหม่"},{status:503,headers:{"Cache-Control":"no-store"}})}
}
