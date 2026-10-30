"use client";
import {useRef} from "react";

export function EventPoster({src,title}:{src:string;title:string}) {
 const dialog=useRef<HTMLDialogElement>(null);
 return <>
  <button type="button" className="event-poster-trigger" onClick={()=>dialog.current?.showModal()} aria-label={"ดูโปสเตอร์เต็ม "+title}>
   <img className="competition-poster" src={src} alt={"โปสเตอร์ "+title}/>
   <span>ดูโปสเตอร์เต็ม ↗</span>
  </button>
  <dialog ref={dialog} className="event-poster-dialog" aria-label={"โปสเตอร์ "+title} onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close()}}>
   <div className="event-poster-toolbar"><strong>{title}</strong><button type="button" className="competition-button" autoFocus onClick={()=>dialog.current?.close()}>ปิด ✕</button></div>
   <img src={src} alt={"โปสเตอร์ฉบับเต็ม "+title}/>
   <a className="competition-button" href={src} target="_blank" rel="noreferrer">เปิดภาพต้นฉบับ ↗</a>
  </dialog>
 </>;
}
