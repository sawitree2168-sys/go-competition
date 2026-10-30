export type HistoricalMatch={source_key:string;go_id:string;athlete_name:string;event_title:string|null;event_date:string|null;source_file_year:string;source_tab:string;source_header_row:string;source_rows:number[];round_no:string;opponent_name:string;opponent_dan:string;result:'win'|'loss';review_status:string;imported_at:string};
export type EventSummary={source_key:string;go_id:string;event_title:string;event_date_raw:string|null;division:string|null;placing_raw:string|null;wins:number|null;losses:number|null;byes:number|null;source_label:string|null;source_row:number;status:string};
export function ownedLiveMatches(goId:string,rows:HistoricalMatch[]){
 const seen=new Set<string>();
 for(const row of rows){
  if(row.go_id!==goId||row.review_status!=='metadata_pending'||!['win','loss'].includes(row.result)||!/^[1-9][0-9]*$/.test(row.round_no)||seen.has(row.source_key))throw Error('Invalid live history');
  seen.add(row.source_key);
 }
 return rows;
}
const sourceFiles:Record<string,string>={
 '2563':'1vGkq_p1IVTfC9JWkWRhZ0TiLV09jVaDrZy9ppFDTTBI',
 '2564':'1HHzl5mOx9m14XozWJ5jQUvNxSv2iyxU8fUvsDS7BmFU',
 '2565':'1PtCUEhb8lqRF51J2ZjFNa_jj-fA9t_W_GbieHjJaVME',
 '2566':'171-rBhFU7TKvU4cwy5yLWw5VbW0I_At3U6WkAYE1ivw',
 '2567':'1IBZwqRwedtLr6dat5kpMFyoV2CiaQbBlNfZZ-XHk79c',
 '2568':'1wvB04CbPELYhb_jYOVhJznf1vsO52TUgnR0RxGiXotk',
 '2569':'185MPKXsS2MmOpP7dufQ8O9ozI-8vQ7LqdisKoYehWbM'
};
export function historicalSourceUrl(row:HistoricalMatch){
 const id=sourceFiles[row.source_file_year];
 if(!id||!row.source_tab)return null;
 const rows=row.source_rows.filter(n=>Number.isSafeInteger(n)&&n>0);
 const range="'"+row.source_tab.replace(/'/g,"''")+"'!A"+(rows.length?Math.min(...rows):1)+':Z'+(rows.length?Math.max(...rows):1);
 return 'https://docs.google.com/spreadsheets/d/'+id+'/edit#range='+encodeURIComponent(range);
}
export function groupHistoricalMatches(rows:HistoricalMatch[]){
 const groups=new Map<string,HistoricalMatch[]>();
 for(const row of rows){const key=JSON.stringify([row.source_file_year,row.source_tab,row.source_header_row,row.event_title]);const g=groups.get(key)||[];g.push(row);groups.set(key,g);}
 return [...groups].map(([key,items])=>({key,items:items.sort((a,b)=>Number(a.round_no)-Number(b.round_no))}));
}
