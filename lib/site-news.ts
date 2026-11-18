import {publicDb} from '@/app/tournaments/[id]/_ui/data';
import {loadResults,loadNews,type ResultPerson} from './public-site';
import {eventPoster} from './event-organizers';
export type Story={id:string;title:string;event:string;division:string|null;date:string|null;body:string;complete:boolean;kind:'results'|'announcement'|'registration';href:string;poster:string;people:ResultPerson[]};
export async function loadStories():Promise<Story[]>{
 const db=publicDb();const [results,news]=await Promise.all([loadResults(db),loadNews(db)]);const stories:Story[]=[];
 for(const e of results)for(const d of e.divisions){const id=e.title+'::'+d.division;stories.push({id,title:`${e.complete?'สรุปผล':'อัปเดตผล'} ${d.division}`,event:e.title,division:d.division,date:e.date,body:e.complete?`สรุปอันดับจากผลที่บันทึกครบ ${d.people.length} คน`:`ผลที่ตรวจสอบแล้ว ${d.people.length} คน • ยังไม่ครบทั้งรุ่น ไม่สรุปอันดับ`,complete:!!e.complete,kind:'results',href:`/news/${encodeURIComponent(id)}`,poster:eventPoster(e.title)||'/event-hero-wide.webp',people:d.people});}
 for(const n of news.filter(n=>n.kind!=='results'))stories.push({id:n.id,title:n.title,event:n.body||'',division:null,date:n.date,body:n.body||'',complete:false,kind:n.kind,href:n.href,poster:'/event-hero-wide.webp',people:[]});
 return stories.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
}
