"use client";
import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import {useParams} from "next/navigation";
import {createClient,type SupabaseClient} from "@supabase/supabase-js";
type Division={id:string;name:string;award_scheme:string;friendship_gold_min_wins:number;friendship_silver_min_wins:number;friendship_bronze_min_wins:number;friendship_certificate_with_medal:boolean};
type Participant={athlete_id:string;go_id:string;full_name:string;verified_wins:number;medal_preview:"gold"|"silver"|"bronze"|null;certificate_preview:boolean};
type Preview={status:"ok";division:Division;participants:Participant[];verified_matches:number;unresolved_matches:number;finalized:boolean;note:string};
const names={gold:"เหรียญทอง",silver:"เหรียญเงิน",bronze:"เหรียญทองแดง"};
export default function FriendshipMedals(){
 const params=useParams<{id:string}>(),id=typeof params.id==="string"?params.id:"";
 const client=useRef<SupabaseClient|null>(null);
 const [ready,setReady]=useState(false),[divisions,setDivisions]=useState<Division[]>([]),[selected,setSelected]=useState(""),[preview,setPreview]=useState<Preview|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(false);
 useEffect(()=>{let active=true;(async()=>{try{
  const r=await fetch("/api/auth/public-config",{cache:"no-store"}),config=await r.json();
  if(!r.ok||config.status!=="ok")throw Error("ไม่สามารถเข้าสู่ระบบเจ้าหน้าที่ได้");
  const c=createClient(config.url,config.key,{auth:{persistSession:true,autoRefreshToken:true}});
  client.current=c;const session=await c.auth.getSession();if(!session.data.session)throw Error("กรุณาเข้าสู่ระบบ Admin ก่อน");
  const token=session.data.session.access_token;
  const res=await fetch("/api/admin/tournament-divisions?tournament_id="+encodeURIComponent(id),{headers:{Authorization:"Bearer "+token},cache:"no-store"});
  const d=await res.json();if(!res.ok||d.status!=="ok"||!Array.isArray(d.divisions))throw Error(d.message||"อ่านรุ่นแข่งขันไม่ได้");
  if(active){const list=(d.divisions as Division[]).filter(v=>v.award_scheme==="friendship_wins");setDivisions(list);setSelected(list[0]?.id||"");setReady(true)}
 }catch(e){if(active){setError(e instanceof Error?e.message:"เกิดข้อผิดพลาด");setReady(true)}}})();return()=>{active=false};},[id]);
 async function load(){
  if(!selected||!client.current)return;setLoading(true);setError("");setPreview(null);
  try{const token=(await client.current.auth.getSession()).data.session?.access_token;
   if(!token)throw Error("เซสชันหมดอายุ");
   const url="/api/admin/friendship-medals?tournament_id="+encodeURIComponent(id)+"&division_id="+encodeURIComponent(selected);
   const r=await fetch(url,{headers:{Authorization:"Bearer "+token},cache:"no-store"}),data=await r.json();
   if(!r.ok||data.status!=="ok")throw Error(data.message||"คำนวณตัวอย่างไม่ได้");
   setPreview(data as Preview);
  }catch(e){setError(e instanceof Error?e.message:"เกิดข้อผิดพลาด")}finally{setLoading(false)}
 }
 return <main className="min-h-screen bg-[#f0f5fc] text-[#112f5a]">
  <header className="bg-[#092957] p-5 text-white"><div className="mx-auto max-w-5xl"><Link href="/admin/tournaments" className="font-bold text-amber-200">‹ ศูนย์จัดการแข่งขัน</Link><h1 className="mt-3 text-2xl font-black sm:text-3xl">ระบบเหรียญรางวัล Friendship</h1><p className="mt-1 text-sm text-blue-100">ตัวอย่างคะแนนจากผลที่กรรมการยืนยันแล้ว ยังไม่ออกใบประกาศหรือประกาศเหรียญอัตโนมัติ</p></div></header>
  <div className="mx-auto max-w-5xl space-y-5 px-4 py-6">
   <section className="grid gap-3 sm:grid-cols-3">
    {([{min:"ชนะ 4 กระดานขึ้นไป",label:"เหรียญทอง",style:"border-amber-300 bg-amber-50"},{min:"ชนะ 3 กระดาน",label:"เหรียญเงิน",style:"border-slate-300 bg-slate-50"},{min:"ชนะ 2 กระดาน",label:"เหรียญทองแดง",style:"border-orange-300 bg-orange-50"}]).map(item=><div key={item.label} className={"rounded-xl border p-4 "+item.style}><p className="text-xl font-black">{item.label}</p><p className="mt-2 font-semibold">{item.min}</p><p className="mt-1 text-sm">พร้อมใบประกาศ</p></div>)}
   </section>
   {!ready&&<p role="status">กำลังตรวจสอบสิทธิ์...</p>}
   {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>}
   {ready&&divisions.length===0&&!error&&<p className="rounded-xl bg-white p-5">ยังไม่มีรุ่นที่ตั้งประเภทเหรียญเป็น Friendship ในรายการนี้</p>}
   {divisions.length>0&&<section className="rounded-2xl bg-white p-5">
    <label className="font-bold">เลือกรุ่น Friendship<select value={selected} onChange={e=>{setSelected(e.target.value);setPreview(null)}} className="mt-2 block min-h-12 w-full rounded-xl border p-3">{divisions.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
    <button type="button" disabled={loading} onClick={()=>void load()} className="mt-4 min-h-12 rounded-xl bg-blue-800 px-5 py-3 font-black text-white disabled:opacity-40">{loading?"กำลังคำนวณ...":"ดูตัวอย่างเหรียญจากผลที่ยืนยัน"}</button>
   </section>}
   {preview&&<section className="overflow-hidden rounded-2xl bg-white shadow-sm">
    <div className="space-y-2 p-5"><h2 className="text-xl font-black">{preview.division.name}</h2><p className="text-sm">ผลที่ยืนยันแล้ว {preview.verified_matches} กระดาน · ค้างตรวจ {preview.unresolved_matches} กระดาน</p><p className="rounded-xl bg-amber-50 p-3 font-bold text-amber-900">ยังไม่ใช่ผลรางวัลอย่างเป็นทางการ ต้องตรวจความครบถ้วนและอนุมัติจากผู้จัดก่อน</p></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[550px] text-sm"><thead className="bg-[#0a316a] text-left text-white"><tr><th className="p-4">นักกีฬา / GO ID</th><th className="p-4">ชนะ (ยืนยัน)</th><th className="p-4">เกณฑ์เหรียญ</th><th className="p-4">ใบประกาศ</th></tr></thead>
     <tbody>{preview.participants.map(p=><tr key={p.athlete_id} className="border-b even:bg-blue-50/50"><td className="p-4 font-bold">{p.full_name}<p className="font-normal text-slate-600">{p.go_id}</p></td><td className="p-4 text-lg font-black">{p.verified_wins}</td><td className="p-4 font-bold">{p.medal_preview?names[p.medal_preview]:"ยังไม่เข้าเกณฑ์"}</td><td className="p-4">{p.certificate_preview?"ตามเกณฑ์":"ยังไม่ระบุสิทธิ์"}</td></tr>)}</tbody>
    </table></div>
    {!preview.participants.length&&<p className="p-5 text-slate-500">ยังไม่มีผลการแข่งขันที่บันทึกสำหรับรุ่นนี้</p>}
   </section>}
  </div>
 </main>
}
