"use client";
import {useState} from "react";
import {METHODS,buildResult,summaryLine} from "@/lib/referee-result.mjs";
export default function SimulationResultDialog({board,black,white,onClose,onConfirm}:{board:number|null;black:string;white:string;onClose:()=>void;onConfirm:(code:string,margin:string|null,winner:"black"|"white"|null,method:string)=>void}){
 const [winner,setWinner]=useState<"black"|"white"|null>("black");
 const [method,setMethod]=useState("normal");
 const [margin,setMargin]=useState("");
 const result=buildResult({winner,method,margin});
 return <div className="gt-reference-modal" role="dialog" aria-modal="true" aria-label={`ลงผลโต๊ะ ${board}`}>
  <div className="gt-reference-modal-card">
   <header><strong>ลงผลการแข่งขัน · โต๊ะ {board}</strong><button type="button" onClick={onClose}>✕ ปิด</button></header>
   <div className="gt-reference-modal-content">
    <p className="gt-reference-players">⚫ {black}<span>พบกับ</span>⚪ {white}</p>
    <p className="text-sm">เลือก “ชนะ” เพียงแบบเดียว หากทราบผลต่างแต้มค่อยกรอกเพิ่มได้ (จำลอง)</p>
    <fieldset className="gt-reference-winners"><legend>ผู้ชนะ</legend>
     <button type="button" aria-pressed={winner==="black"} onClick={()=>{setWinner("black");if(["draw","double_loss","double_forfeit"].includes(method))setMethod("normal")}}>● ดำชนะ</button>
     <button type="button" aria-pressed={winner==="white"} onClick={()=>{setWinner("white");if(["draw","double_loss","double_forfeit"].includes(method))setMethod("R")}}>○ ขาวชนะ</button>
    </fieldset>
    <fieldset className="gt-reference-methods"><legend>วิธีจบเกม</legend>{METHODS.map((m:{v:string;label:string;winner:boolean;margin?:boolean})=><button type="button" key={m.v} aria-pressed={method===m.v} onClick={()=>{setMethod(m.v);if(!m.winner)setWinner(null);else if(!winner)setWinner("black")}}>{m.label}</button>)}</fieldset>
    {method==="normal"&&<label className="block font-semibold">ชนะกี่แต้ม (ถ้ามี · เว้นว่างได้)<input type="text" inputMode="decimal" value={margin} onChange={e=>setMargin(e.target.value)} className="gt-reference-margin" placeholder="เช่น 6.5 หรือเว้นว่าง"/></label>}
    <p className="gt-reference-summary">{summaryLine({board,winner,method,margin,names:{black,white}})}</p>
    {!result.ok&&<p className="text-sm text-red-700">{result.error}</p>}
    <div className="gt-reference-modal-actions"><button type="button" className="gt-reference-secondary" onClick={onClose}>ยกเลิก</button><button type="button" className="gt-reference-gold" disabled={!result.ok} onClick={()=>{if(result.ok&&window.confirm("ยืนยันผลจำลองตามรายละเอียดนี้?"))onConfirm(result.code,result.margin,winner,method)}}>✓ ยืนยันผล</button></div>
   </div>
  </div>
 </div>;
}
