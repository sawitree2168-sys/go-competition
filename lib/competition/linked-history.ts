export type LinkedHistoryRow={go_id:string;source_key:string;event_title:string;event_date:string|null;event_date_status:string;division:string;after_round:number;placing_raw:string;rounds:string[];points:string;sos:string;sosos:string;source_file_id:string;source_tab:string;source_row:number;link_status:string;athlete_name:string};
export function linkedHistoryFor(goId:string,items:LinkedHistoryRow[]){
 const seen=new Set<string>();
 for(const row of items){
  if(row.source_tab!=="Walllist"||row.link_status!=="matched_name_and_id")throw Error("Unverified history source");
  if(seen.has(row.source_key))throw Error("Duplicate history source row");
  seen.add(row.source_key);
 }
 return items.filter(row=>row.go_id===goId);
}
