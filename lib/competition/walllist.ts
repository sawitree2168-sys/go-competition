export type WalllistRow={sourceRow:number;place:string;name:string;club:string;score:string;rounds:string[];points:string;sos:string;sosos:string;placeholder:boolean};
export type WalllistGroup={title:string;afterRound:number;rows:WalllistRow[]};
export function parseWalllist(sheet:string,rows:unknown):WalllistGroup[]{
 if(sheet!=="Walllist")throw Error("อนุญาตเฉพาะแท็บ Walllist");
 if(!Array.isArray(rows))throw Error("รูปแบบข้อมูลไม่ถูกต้อง");
 const groups:WalllistGroup[]=[];let current:WalllistGroup|undefined;let header:string[]=[];
 rows.forEach((raw,index)=>{
  if(!Array.isArray(raw))throw Error("แถวข้อมูลไม่ถูกต้อง");
  const row=raw.map(v=>v==null?"":String(v));if(row.every(v=>!v.trim()))return;
  const heading=row[0]?.match(/^(.+?)\s*-\s*After Round (\d+)\s*$/i);
  if(heading){current={title:heading[1].trim(),afterRound:Number(heading[2]),rows:[]};groups.push(current);header=[];return;}
  if(row[0]==="Place"){header=row;return;}
  if(!current||!header.length)throw Error("ข้อมูลไม่มีหัวรุ่นหรือหัวคอลัมน์ที่รองรับ แถว "+(index+1));
  const value=(label:string)=>{const col=header.indexOf(label);if(col<0)throw Error("ไม่พบคอลัมน์ "+label);return row[col]||"";};
  const place=value("Place"),name=value("Name");if(!place||!name)throw Error("อันดับหรือชื่อขาด แถว "+(index+1));
  current.rows.push({sourceRow:index+1,place,name,club:value("Club"),score:value("Score"),rounds:Array.from({length:current.afterRound},(_,i)=>value(String(i+1))),points:value("Points"),sos:value("SOS"),sosos:value("SOSOS"),placeholder:/ไม่มีผู้เข้าร่วมการแข่งขัน/.test(name)});
 });
 if(!groups.length)throw Error("ไม่พบผล Walllist ที่รองรับ");return groups;
}
