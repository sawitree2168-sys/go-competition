"use client";
import {useId,useState} from "react";

export default function InstitutionNameSettings({name,onSave}:{name:string;onSave:(name:string)=>Promise<void>}) {
 const id=useId();const [draft,setDraft]=useState(name);const [busy,setBusy]=useState(false);const [note,setNote]=useState("");const [error,setError]=useState("");
 return <form className="space-y-3 rounded-2xl border-2 border-[#b7cfee] bg-[#f6faff] p-4" aria-busy={busy} onSubmit={async e=>{e.preventDefault();if(busy)return;const value=draft.trim().replace(/\s+/g," ");setNote("");setError("");if(value.length<2||value.length>160){setError("กรุณาระบุชื่อสถาบัน 2–160 ตัวอักษร");return;}setBusy(true);try{await onSave(value);setDraft(value);setNote("บันทึกชื่อสถาบันแล้ว");}catch(e){setError(e instanceof Error?e.message:"บันทึกไม่สำเร็จ กรุณาลองใหม่");}finally{setBusy(false);}}}>
  <h3 className="text-lg font-semibold text-[#123f82]">ข้อมูลสถาบัน</h3><label htmlFor={id} className="block text-sm font-semibold">ชื่อสถาบัน</label>
  <input id={id} value={draft} onChange={e=>setDraft(e.target.value)} required minLength={2} maxLength={160} disabled={busy} aria-invalid={Boolean(error)} aria-describedby={error?`${id}-error`:undefined} className="min-h-11 w-full rounded-xl border-2 border-[#adc9e9] bg-white px-3 text-base text-[#123f82]"/>
  <div className="flex flex-wrap gap-2"><button type="submit" disabled={busy} className="min-h-11 rounded-xl bg-[#0c60c4] px-4 font-semibold text-white disabled:opacity-50">{busy?"กำลังบันทึก…":"บันทึกชื่อสถาบัน"}</button><button type="button" disabled={busy} onClick={()=>{setDraft(name);setNote("");setError("");}} className="min-h-11 rounded-xl border border-[#aac5e7] bg-white px-4 text-[#174778]">ยกเลิก</button></div>
  {error&&<p id={`${id}-error`} role="alert" className="text-sm text-[#a1243c]">{error}</p>}{note&&<p role="status" className="text-sm text-[#216b3b]">{note}</p>}
 </form>;
}
