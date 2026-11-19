'use client';
import {useEffect,useState} from 'react';
import {staffDb} from '../_lib/staff';
import {defaultPresentation,normalizePresentation,safeMedia,type Presentation} from '@/lib/site-presentation';
export default function PresentationAdmin(){
 const [config,setConfig]=useState<Presentation>(defaultPresentation),[revision,setRevision]=useState<number|null>(null),[note,setNote]=useState(''),[busy,setBusy]=useState(false);
 async function load(){const r=await staffDb()!.from('gt_site_presentation_v1').select('config,revision').eq('page','dan').single();if(r.error){setNote(r.error.message);return;}setConfig(normalizePresentation(r.data.config));setRevision(r.data.revision);}
 useEffect(()=>{queueMicrotask(()=>void load());},[]);
 const field='min-h-11 w-full rounded-lg border border-[var(--gt-line)] bg-[var(--gt-surface)] px-3';
 function sponsor(i:number,patch:Partial<Presentation['sponsors'][number]>){setConfig(c=>({...c,sponsors:c.sponsors.map((s,j)=>j===i?{...s,...patch}:s)}));}
 async function save(){
  if(revision===null)return;setBusy(true);setNote('');
  const media=[config.banner.desktop,config.banner.mobile,...config.sponsors.map(s=>s.logo)];
  if(media.some(u=>u&&!safeMedia(u))||config.sponsors.some(s=>s.href&&!safeMedia(s.href))){setNote('ใช้ URL แบบ https:// หรือไฟล์ในเว็บที่ขึ้นต้นด้วย /');setBusy(false);return;}
  const r=await staffDb()!.from('gt_site_presentation_v1').update({config:normalizePresentation(config),revision:revision+1,updated_at:new Date().toISOString()}).eq('page','dan').eq('revision',revision).select('revision').maybeSingle();
  setBusy(false);if(r.error){setNote('บันทึกไม่สำเร็จ: '+r.error.message);return;}if(!r.data){setNote('มีผู้แก้ข้อมูลชุดนี้แล้ว กรุณาโหลดล่าสุดก่อนแก้ต่อ');return;}setRevision(r.data.revision);setNote('บันทึกแล้ว เปิดหน้า /dan ใหม่เพื่อดูผล (อาจใช้เวลาประมาณ 30 วินาที)');
 }
 return <section className="gt-card space-y-4 p-4" id="presentation"><h2 className="text-xl font-bold">แบนเนอร์และสปอนเซอร์ · ทำเนียบดั้ง</h2><p className="text-sm">ภาพแนะนำ: คอม 1800 × 450 px · มือถือ 750 × 600 px · โลโก้ PNG โปร่งใส/WebP ความกว้างอย่างน้อย 500 px เก็บข้อความสำคัญไว้กลางภาพ ตัวหนังสือหัวเรื่องเป็นข้อความบนเว็บ</p>
 <div className="grid gap-3 sm:grid-cols-2">{(['title','subtitle','desktop','mobile'] as const).map((k,i)=><label key={k}>{['หัวเรื่อง','คำอธิบาย','URL ภาพคอมพิวเตอร์','URL ภาพมือถือ'][i]}<input className={field} maxLength={k==='title'?120:k==='subtitle'?240:2000} value={config.banner[k]} onChange={e=>setConfig(c=>({...c,banner:{...c.banner,[k]:e.target.value}}))}/></label>)}</div>
 {config.banner.desktop&&safeMedia(config.banner.desktop)&&<img src={config.banner.desktop} alt="ตัวอย่างภาพแบนเนอร์คอมพิวเตอร์" className="max-h-40 w-full rounded-xl object-cover"/>}
 <h3 className="font-bold">โลโก้เรียงตามลำดับด้านล่าง</h3><div className="space-y-3">{config.sponsors.map((s,i)=><div className="rounded-xl border border-[var(--gt-line)] p-3" key={s.id}><div className="mb-2 flex flex-wrap items-center gap-3"><strong>{i+1}. {s.name||'สปอนเซอร์ใหม่'}</strong><label><input type="checkbox" checked={s.enabled} onChange={e=>sponsor(i,{enabled:e.target.checked})}/> แสดง</label><button disabled={i===0} onClick={()=>setConfig(c=>{const a=[...c.sponsors];[a[i-1],a[i]]=[a[i],a[i-1]];return {...c,sponsors:a};})} className="gt-outline-btn min-h-11 px-3">เลื่อนขึ้น</button><button onClick={()=>setConfig(c=>({...c,sponsors:c.sponsors.filter((_,j)=>j!==i)}))} className="gt-outline-btn min-h-11 px-3">นำออก</button></div><div className="grid gap-2 sm:grid-cols-3">{(['name','logo','href'] as const).map((k,j)=><label key={k}>{['ชื่อ','URL โลโก้','เว็บไซต์ (ถ้ามี)'][j]}<input className={field} value={s[k]} onChange={e=>sponsor(i,{[k]:e.target.value})}/></label>)}</div></div>)}</div>
 <div className="flex flex-wrap gap-3"><button className="gt-outline-btn min-h-11 px-4" disabled={config.sponsors.length>=50} onClick={()=>setConfig(c=>({...c,sponsors:[...c.sponsors,{id:crypto.randomUUID(),name:'',logo:'',href:'',enabled:true}]}))}>เพิ่มสปอนเซอร์</button><button onClick={save} disabled={busy||revision===null} className="gt-gold-btn min-h-11 px-4">{busy?'กำลังบันทึก…':'บันทึกแบนเนอร์และสปอนเซอร์'}</button><button className="gt-outline-btn min-h-11 px-4" onClick={load}>โหลดข้อมูลล่าสุด</button></div><p role="status">{note}</p></section>;
}
