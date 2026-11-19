import records from '@/data/athlete-portraits.json';
type Portrait={name:string;photo:string;source_file_id:string};
const portraits=records as Record<string,Portrait>;
const key=(name:string)=>name.trim().replace(/^(ด\.ช\.|ด\.ญ\.|นาย\s|นางสาว\s|นาง\s)/,'').replace(/[\s\u200b-\u200d\ufeff]+/g,'').toLowerCase();
/** Only exact, unambiguous names or validated GO IDs; never fuzzy face matching. */
export function athletePortrait(name:string,goId?:string|null):string|null{
 if(goId){const p=portraits[goId];return p&&key(p.name)===key(name)?p.photo:null;}
 const found=Object.values(portraits).filter(p=>key(p.name)===key(name));
 return found.length===1?found[0].photo:null;
}
