import Link from 'next/link';
import AthleteAvatar from './AthleteAvatar';
import type {HistoryWall} from '@/lib/history-walllist';
const medal=['bg-amber-400 text-amber-950','bg-slate-300 text-slate-900','bg-orange-300 text-orange-950'];
const num=(n:number)=>Number.isInteger(n)?String(n):n.toLocaleString('th-TH',{maximumFractionDigits:1});
export default function HistoryWallTable({wall:w}:{wall:HistoryWall}){
 const rounds=Array.from({length:w.rounds},(_,i)=>i+1);
 return <div className="overflow-x-auto gt-card">
  <table className="w-full min-w-[640px] text-sm">
   <thead><tr className="bg-slate-50 text-xs uppercase text-slate-600"><th className="p-2">ที่</th><th className="p-2 text-left">ชื่อ</th><th className="p-2">คะแนน</th>{rounds.map(r=><th key={r} className="p-2">{w.has_rounds?`รอบ ${r}`:`เกม ${r}`}</th>)}<th className="p-2">ชนะ</th><th className="p-2">SOS</th><th className="p-2">SOSOS</th></tr></thead>
   <tbody>{w.rows.map(r=><tr key={`${r.place}-${r.full_name}`} className="border-t">
    <td className="p-2 text-center">{r.place<=3?<span className={`inline-flex h-8 w-8 items-center justify-center rounded-full font-bold ${medal[r.place-1]}`}>{r.place}</span>:r.place}</td>
    <td className="p-2 text-left font-bold"><div className="portrait-report-identity"><AthleteAvatar name={r.full_name} variant="portrait" zoom/><div>{r.go_id?<Link className="text-blue-900 underline-offset-2 hover:underline" href={`/athletes/history/${r.go_id}`}>{r.full_name}</Link>:r.full_name}</div></div></td>
    <td className="p-2 text-center"><span className="inline-block min-w-8 rounded-full bg-emerald-50 px-2 py-1 font-bold text-emerald-800">{num(r.points)}</span></td>
    {rounds.map(i=>{const t=r.rounds?.[i-1];return <td key={i} title={t?.opponent?`${t.opponent}${t.walkover?' (ชนะ/แพ้ผ่าน)':''}`:undefined} className={`p-2 text-center font-semibold ${t?.outcome==='win'||t?.outcome==='bye'?'text-emerald-700':t?.outcome==='loss'?'text-rose-600':'text-slate-500'}`}>{t?t.token+(t.walkover?'*':''):''}</td>;})}
    <td className="p-2 text-center">{r.wins}</td><td className="p-2 text-center">{num(r.sos)}</td><td className="p-2 text-center">{num(r.sosos)}</td>
   </tr>)}</tbody>
  </table>
 </div>;
}
