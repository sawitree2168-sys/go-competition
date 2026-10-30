import {account,response} from '../../../../lib/competition/auth';
import {linkedHistoryFor} from '../../../../lib/competition/linked-history';
import {ownedLiveMatches,type HistoricalMatch,type EventSummary} from '../../../../lib/competition/live-history';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const a=await account(request);if('error' in a)return a.error;
 const goId=new URL(request.url).searchParams.get('go_id')||'';
 if(!/^GO[-A-Za-z0-9]{1,40}$/.test(goId))return response({message:'กรุณาระบุ GO ID'},400);
 try{
  // Existing RPC validates account ownership before any history is returned.
  const r=await fetch(new URL('/rest/v1/rpc/gt_owned_history_v1',a.base),{method:'POST',headers:a.headers,body:JSON.stringify({p_go_id:goId}),cache:'no-store',signal:AbortSignal.timeout(8000)});
  const d=await r.json();if(!r.ok)return response({message:'ยังไม่มีสิทธิ์อ่านประวัติของ GO ID นี้'},403);
  if(!d||typeof d!=='object'||Array.isArray(d)||d.go_id!==goId)throw Error('Invalid ownership response');
  if(d.read_mode!=='live_database'||!Array.isArray(d.legacy_matches)||!Array.isArray(d.events)||!Array.isArray(d.walllist_events))throw Error('Live history unavailable');
  const matches=ownedLiveMatches(goId,d.legacy_matches as HistoricalMatch[]);
  const summaries=d.events as EventSummary[];
  if(summaries.some(e=>e.go_id!==goId))throw Error('History ID mismatch');
  return response({status:'ok',history:{go_id:goId,coverage:d.coverage,read_mode:d.read_mode,checked_at:d.checked_at,walllist_events:linkedHistoryFor(goId,d.walllist_events),pending_identity_count:typeof d.pending_identity_count==='number'?d.pending_identity_count:0,legacy_matches:matches,events:summaries,pending_match_count:typeof d.pending_match_count==='number'?d.pending_match_count:0}});
 }catch{return response({message:'โหลดประวัติไม่ได้ กรุณาลองใหม่'},503)}
}
