import {reply,staffAuth} from "../tournament-auth";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Athlete={id:string;full_name:string;go_id:string};
type Match={id:string;state:string;winner_athlete_id:string|null;result_code:string|null;black_athlete_id:string;white_athlete_id:string};
type Division={id:string;name:string;award_scheme:string;friendship_gold_min_wins:number;friendship_silver_min_wins:number;friendship_bronze_min_wins:number;friendship_certificate_with_medal:boolean};
async function getData<T>(base:string,headers:Record<string,string>,table:string,query:Record<string,string>):Promise<T[]>{
 const url=new URL("/rest/v1/"+table,base);
 for(const [k,v] of Object.entries(query))url.searchParams.set(k,v);
 const res=await fetch(url,{headers,cache:"no-store",signal:AbortSignal.timeout(8000)});
 const data:unknown=await res.json();
 if(!res.ok||!Array.isArray(data))throw Error("ไม่สามารถอ่านข้อมูลการแข่งขันได้");
 return data as T[];
}
export async function GET(request:Request){
 const auth=await staffAuth(request);if("error" in auth)return auth.error;
 const u=new URL(request.url),id=u.searchParams.get("division_id")||"",tournamentId=u.searchParams.get("tournament_id")||"";
 if(!uuid.test(id)||!uuid.test(tournamentId))return reply({status:"invalid",message:"รหัสรุ่นหรือรายการไม่ถูกต้อง"},400);
 try{
 const divisions=await getData<Division>(auth.base,auth.headers,"gt_divisions",{
  select:"id,name,award_scheme,friendship_gold_min_wins,friendship_silver_min_wins,friendship_bronze_min_wins,friendship_certificate_with_medal",
  id:"eq."+id,tournament_id:"eq."+tournamentId,limit:"1"
 });
 if(divisions.length!==1||divisions[0].award_scheme!=="friendship_wins")
  return reply({status:"invalid",message:"รุ่นนี้ไม่ได้ใช้ระบบเหรียญ Friendship"},400);
 const matches=await getData<Match>(auth.base,auth.headers,"gt_matches",{
  select:"id,state,winner_athlete_id,result_code,black_athlete_id,white_athlete_id",
  tournament_id:"eq."+tournamentId,division_id:"eq."+id,limit:"1000"
 });
 if(matches.length===1000)return reply({status:"error",message:"มีแมตช์จำนวนมาก ต้องแบ่งหน้าก่อนคำนวณ"},503);
 const participants=[...new Set(matches.flatMap(m=>[m.black_athlete_id,m.white_athlete_id]))].filter(uuid.test.bind(uuid));
 const athletes:Athlete[]=[];
 for(let i=0;i<participants.length;i+=50){
  athletes.push(...await getData<Athlete>(auth.base,auth.headers,"gt_athletes",{
   select:"id,go_id,full_name",id:"in.("+participants.slice(i,i+50).join(",")+")",limit:"50"
  }));
 }
 const d=divisions[0],unresolved=matches.filter(m=>m.state!=="verified"&&m.state!=="void").length;
 const verified=matches.filter(m=>m.state==="verified");
 const rows=athletes.map(a=>{
  const wins=verified.filter(m=>m.winner_athlete_id===a.id).length;
  const medal=wins>=d.friendship_gold_min_wins?"gold":wins>=d.friendship_silver_min_wins?"silver":wins>=d.friendship_bronze_min_wins?"bronze":null;
  return {athlete_id:a.id,go_id:a.go_id,full_name:a.full_name,verified_wins:wins,medal_preview:medal,certificate_preview:medal!==null&&d.friendship_certificate_with_medal};
 }).sort((a,b)=>b.verified_wins-a.verified_wins||a.full_name.localeCompare(b.full_name,"th"));
 return reply({status:"ok",division:d,participants:rows,verified_matches:verified.length,unresolved_matches:unresolved,finalized:false,note:"ตัวอย่างการคำนวณจากผลที่ยืนยันแล้ว ไม่ใช่การประกาศรางวัลอย่างเป็นทางการ"});
 }catch{return reply({status:"error",message:"คำนวณเหรียญตัวอย่างไม่ได้ กรุณาตรวจฐานข้อมูล"},503)}
}
