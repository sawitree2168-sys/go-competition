"use client";
export const RESULT_CHOICES = [
 {id:"black_win",winner:"black",method:"normal",label:"ดำชนะ",score:"1–0"},
 {id:"white_win",winner:"white",method:"normal",label:"ขาวชนะ",score:"0–1"},
 {id:"black_forfeit",winner:"black",method:"forfeit",label:"ดำชนะ • ฝ่ายขาวไม่มา",score:"1–0"},
 {id:"white_forfeit",winner:"white",method:"forfeit",label:"ขาวชนะ • ฝ่ายดำไม่มา",score:"0–1"},
 {id:"black_R",winner:"black",method:"R",label:"ดำชนะ • ฝ่ายขาวยอมแพ้",score:"1–0"},
 {id:"white_R",winner:"white",method:"R",label:"ขาวชนะ • ฝ่ายดำยอมแพ้",score:"0–1"},
 {id:"draw",winner:null,method:"draw",label:"เสมอ",score:"0.5–0.5"},
 {id:"double_loss",winner:null,method:"double_loss",label:"แพ้คู่",score:"0–0"},
 {id:"double_forfeit",winner:null,method:"double_forfeit",label:"ไม่มาทั้งคู่",score:"0–0"},
] as const;
export default function ResultPicker({winner,method,onChange,disabled=false}:{winner:string|null;method:string;onChange:(winner:"black"|"white"|null,method:string)=>void;disabled?:boolean}){
 return <fieldset className="site-result-options"><legend className="mb-2 font-bold">เลือกผลการแข่งขัน</legend>{RESULT_CHOICES.map(x=><label className="site-result-option" key={x.id}><input type="radio" name="match-result" checked={winner===x.winner && method===x.method} disabled={disabled} onChange={()=>onChange(x.winner,x.method)}/><span>{x.label}</span><span>{x.score}</span></label>)}</fieldset>;
}
