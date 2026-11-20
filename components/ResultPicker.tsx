"use client";
export const RESULT_CHOICES = [
 {id:"black_win",winner:"black",method:"normal",label:"ดำชนะ",score:"1–0"},
 {id:"white_win",winner:"white",method:"normal",label:"ขาวชนะ",score:"0–1"},
 {id:"black_forfeit",winner:"black",method:"forfeit",label:"ดำชนะ • ฝ่ายขาวไม่มา",score:"1–0"},
 {id:"white_forfeit",winner:"white",method:"forfeit",label:"ขาวชนะ • ฝ่ายดำไม่มา",score:"0–1"},
 {id:"black_R",winner:"black",method:"R",label:"ดำชนะ • ฝ่ายขาวยอมแพ้",score:"1–0"},
 {id:"white_R",winner:"white",method:"R",label:"ขาวชนะ • ฝ่ายดำยอมแพ้",score:"0–1"},
 {id:"double_loss",winner:null,method:"double_loss",label:"แพ้คู่",score:"0–0"},
 {id:"double_forfeit",winner:null,method:"double_forfeit",label:"ไม่มาทั้งคู่",score:"0–0"},
] as const;

const WIN_METHODS = [
 {method:"normal",label:"ชนะปกติ"},
 {method:"forfeit",label:"คู่ไม่มา"},
 {method:"R",label:"คู่ยอมแพ้"},
];

/**
 * Compact result entry (fits a phone screen): 1) who won — two big buttons, 2) how — three small chips,
 * plus "แพ้คู่" / "ไม่มาทั้งคู่" on their own row. Same values as RESULT_CHOICES.
 */
export default function ResultPicker({winner,method,onChange,disabled=false}:{winner:string|null;method:string;onChange:(winner:"black"|"white"|null,method:string)=>void;disabled?:boolean}){
 const winMethod=WIN_METHODS.some(x=>x.method===method)?method:"normal";
 const chosen=RESULT_CHOICES.find(x=>x.winner===winner&&x.method===method);
 return <fieldset className="gt-result-picker" disabled={disabled}>
  <legend>เลือกผลการแข่งขัน</legend>
  <div className="gt-rp-winners" role="group" aria-label="ใครชนะ">
   {(["black","white"] as const).map(side=><button key={side} type="button" aria-pressed={winner===side} className={`gt-rp-win ${side}`} onClick={()=>onChange(side,winMethod)}>
    <span className={`gt-rp-stone ${side}`} aria-hidden="true"/>{side==="black"?"ดำชนะ":"ขาวชนะ"}<small>{side==="black"?"1–0":"0–1"}</small>
   </button>)}
  </div>
  <div className="gt-rp-methods" role="group" aria-label="ชนะแบบไหน">
   {WIN_METHODS.map(x=><button key={x.method} type="button" disabled={!winner} aria-pressed={!!winner&&method===x.method} onClick={()=>winner&&onChange(winner as "black"|"white",x.method)}>{x.label}</button>)}
  </div>
  <div className="gt-rp-others" role="group" aria-label="ผลอื่น">
   {RESULT_CHOICES.filter(x=>x.winner===null).map(x=><button key={x.id} type="button" aria-pressed={winner===null&&method===x.method} onClick={()=>onChange(null,x.method)}>{x.label} <small>{x.score}</small></button>)}
  </div>
  <p className="gt-rp-summary" aria-live="polite">{chosen?<>ผลที่เลือก: <strong>{chosen.label}</strong> ({chosen.score})</>:"ยังไม่ได้เลือกผล"}</p>
 </fieldset>;
}
