"use client";
import Link from "next/link";
import {useEffect,useState,type ReactNode} from "react";
import "./competition.css";
export function CompetitionShell({title,back="/",children,footer}:{title:string;back?:string;children:ReactNode;footer?:ReactNode}){
 const [theme,setTheme]=useState("light");
 useEffect(()=>{try{const t=localStorage.getItem("go-tournament-theme");if(t==="dark")setTheme(t)}catch{}},[]);
 function toggle(){const t=theme==="light"?"dark":"light";setTheme(t);try{localStorage.setItem("go-tournament-theme",t)}catch{}}
 return <main className="competition" data-theme={theme}><a className="competition-skip" href="#competition-content">ข้ามไปเนื้อหา</a><header className="competition-header"><div><Link href={back} className="circle-control" aria-label="ย้อนกลับ">‹</Link><Link href="/" aria-label="GO TOURNAMENT หน้าหลัก"><img className="competition-logo" src="/brand/go-mark-transparent-v1.png" alt="GO TOURNAMENT" width="1774" height="887"/></Link><button className="circle-control" onClick={toggle} aria-label={theme==="light"?"เปลี่ยนเป็นโหมดมืด":"เปลี่ยนเป็นโหมดสว่าง"}>{theme==="light"?"☾":"☀"}</button></div></header><div id="competition-content" className="competition-content"><h1>{title}</h1>{children}</div>{footer&&<footer className="competition-footer"><div>{footer}</div></footer>}</main>
}
export function Panel({title,children}:{title?:string;children:ReactNode}){return <section className="competition-card">{title&&<h2>{title}</h2>}{children}</section>}
export function Notice({children,error=false}:{children:ReactNode;error?:boolean}){return <p className={"competition-notice"+(error?" error":"")} role={error?"alert":"status"}>{children}</p>}
export function Empty({children}:{children:ReactNode}){return <div className="competition-empty">{children}</div>}
