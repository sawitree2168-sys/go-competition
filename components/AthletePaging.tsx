'use client';
import Link from 'next/link';
import {useRouter,useSearchParams} from 'next/navigation';
import './AthletePaging.css';
export function AthletePageSize({size,total,start,end}:{size:number;total:number;start:number;end:number}){
 const router=useRouter(),params=useSearchParams();
 return <div className="athlete-page-size"><p>แสดง {total?`${start.toLocaleString('th-TH')}–${end.toLocaleString('th-TH')}`:'0'} จาก {total.toLocaleString('th-TH')} คน</p><label>แสดงต่อหน้า<select aria-label="จำนวนนักกีฬาต่อหน้า" value={size} onChange={e=>{const q=new URLSearchParams(params?.toString());q.set('size',e.target.value);q.delete('page');router.push(`/athletes?${q}`);}}>{[30,50,100].map(n=><option key={n} value={n}>{n} คน</option>)}</select></label></div>;
}
export default function AthletePaging({page,pages}:{page:number;pages:number}){
 const params=useSearchParams(),router=useRouter();
 const href=(n:number)=>{const q=new URLSearchParams(params?.toString());q.set('page',String(n));return `/athletes?${q}`;};
 const numbers=Array.from(new Set([1,pages,...Array.from({length:5},(_,i)=>page+i-2).filter(n=>n>=1&&n<=pages)])).sort((a,b)=>a-b);
 const items:(number|string)[]=[];numbers.forEach((n,i)=>{const prev=numbers[i-1];if(i&&n-prev===2)items.push(prev+1);else if(i&&n-prev>2)items.push(`gap-${n}`);items.push(n);});
 return <nav className="athlete-pagination" aria-label="หน้ารายชื่อนักกีฬา"><div className="athlete-pagination-caption"><p>หน้า {page} จาก {pages}</p><label>ไปหน้า <select aria-label="ไปหน้ารายชื่อนักกีฬา" value={page} onChange={e=>router.push(href(Number(e.target.value)))}>{Array.from({length:pages},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select></label></div><div>{page>1?<Link href={href(page-1)} aria-label="หน้าก่อน">‹</Link>:<span aria-disabled="true">‹</span>}{items.map(n=>typeof n==='number'?<Link key={n} href={href(n)} aria-label={`หน้า ${n}`} aria-current={n===page?'page':undefined}>{n}</Link>:<span className="athlete-pagination-gap" key={n} aria-hidden="true">…</span>)}{page<pages?<Link href={href(page+1)} aria-label="หน้าถัดไป">›</Link>:<span aria-disabled="true">›</span>}</div></nav>;
}
