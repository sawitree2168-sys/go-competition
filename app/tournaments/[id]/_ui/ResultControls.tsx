"use client";
import { useState } from "react";
import ResultPicker from "@/components/ResultPicker";
import { buildResult, summaryLine } from "@/lib/referee-result.mjs";
export default function ResultControls({busy,onRecord,onCancel}:{busy:boolean;onRecord:(code:string,margin:string|null)=>void;onCancel?:()=>void}){
 const [winner,setWinner]=useState<"black"|"white"|null>(null),[method,setMethod]=useState("normal");
 const result=buildResult({winner,method,margin:""});
 return <div className="space-y-3"><ResultPicker winner={winner} method={method} disabled={busy} onChange={(w,m)=>{setWinner(w);setMethod(m);}}/><button type="button" disabled={busy||!result.ok} className="gt-cta-btn min-h-12 w-full disabled:opacity-50" onClick={()=>{if(result.ok && window.confirm(`ยืนยันผล: ${summaryLine({board:"",winner,method,margin:"",names:undefined}).replace(/^โต๊ะ.*? · /,"")}?`))onRecord(result.code,result.margin);}}>บันทึกผล</button>{onCancel&&<button type="button" onClick={onCancel} className="gt-outline-btn min-h-11 w-full">ยกเลิก</button>}</div>;
}
