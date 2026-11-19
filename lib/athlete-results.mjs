export const athleteNameKey=s=>String(s??'').replace(/^(ด\.ช\.|ด\.ญ\.|นาย\s|นางสาว\s|นาง\s)/,'').replace(/[\s\u200b-\u200d\ufeff]+/g,'').toLowerCase();
export const athleteResultsHref=a=>`/results?${new URLSearchParams({go_id:a.go_id,q:a.full_name})}`;
/** Exact IDs take precedence; legacy standings without linked GO IDs use the full name. */
export function filterAthleteResults(events,{goId='',name=''}) {
 if(!goId&&!name)return events;
 const key=athleteNameKey(name);
 return events.map(e=>({...e,divisions:e.divisions.map(d=>({...d,people:d.people.filter(p=>
  goId&&p.go_id===goId || key&&athleteNameKey(p.full_name)===key&&(!goId||!/^GO/i.test(p.go_id||''))
 )})).filter(d=>d.people.length)})).filter(e=>e.divisions.length);
}
export function recordedStats(events,athlete){
 const rows=filterAthleteResults(events,{goId:athlete.go_id,name:athlete.full_name});
 const people=rows.flatMap(e=>e.divisions.flatMap(d=>d.people));
 return {events:rows.length,wins:people.reduce((n,p)=>n+p.wins,0),losses:people.reduce((n,p)=>n+p.losses,0),institution:athlete.institution||people.find(p=>p.institution)?.institution||null};
}
