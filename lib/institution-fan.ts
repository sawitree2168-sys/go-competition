import type {FanData} from "./go-fan-data";
import {fanName} from "./go-fan.mjs";
export type InstitutionFanScope={id:string;name:string;students:{id:string;name:string}[]};
/** Only the selectable athlete list is scoped. Opponents and the full division ranking stay intact. */
export function scopeFanData(data:FanData,scope?:InstitutionFanScope):FanData {
 if(!scope)return data;
 const ids=new Set(scope.students.map(s=>s.id));
 const rosterNames=new Map<string,number>();const eventNames=new Map<string,number>();
 for(const s of scope.students){const n=fanName(s.name);rosterNames.set(n,(rosterNames.get(n)??0)+1);}
 for(const p of data.participants){const n=fanName(p.name);eventNames.set(n,(eventNames.get(n)??0)+1);}
 return {...data,participants:data.participants.filter(p=>p.athleteId?ids.has(p.athleteId):rosterNames.get(fanName(p.name))===1&&eventNames.get(fanName(p.name))===1)};
}
