"use client";
import {useState,type FormEvent} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {Panel,Notice} from './CompetitionShell';
type Athlete={go_id:string;full_name:string;dan_number:string|null;has_password:boolean};
export function AthleteLogin({client}:{client:SupabaseClient|null}){
 const [name,setName]=useState(''),[athletes,setAthletes]=useState<Athlete[]|null>(null),[selected,setSelected]=useState(''),[dan,setDan]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[code,setCode]=useState(''),[setup,setSetup]=useState(false),[show,setShow]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const athlete=athletes?.find(a=>a.go_id===selected);
 async function submit(e:FormEvent){e.preventDefault();if(busy||!client)return;setBusy(true);setError('');try{
 if(athlete&&setup&&password!==confirm)throw Error('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
 const r=await fetch('/api/auth/athlete-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(athlete?{action:setup?'set-password':'login',name,go_id:selected,dan_number:dan,password,code:code.trim()}:{action:'search',name}),cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.message||'ดำเนินการไม่สำเร็จ');
 if(!athlete){setAthletes(d.athletes);setSelected(d.athletes.length===1?d.athletes[0].go_id:'');setSetup(false);setDan('');return;}
 const result=await client.auth.setSession(d.session);if(result.error)throw Error('บันทึกการเข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่');
 setPassword('');setConfirm('');setCode('');
 }catch(e){setError(e instanceof Error?e.message:'ดำเนินการไม่สำเร็จ')}finally{setBusy(false)}}
 function restart(){setAthletes(null);setSelected('');setPassword('');setConfirm('');setCode('');setDan('');setError('');}
 return <div className="account-layout"><h2 className="account-welcome">เข้าสู่ระบบนักกีฬา</h2><p className="account-subtitle">ค้นชื่อ–นามสกุล แล้วใส่รหัสผ่าน ไม่ต้องใช้อีเมล</p><Panel><form onSubmit={submit}>
 <label>ชื่อ–นามสกุล<input autoComplete="name" required maxLength={200} value={name} readOnly={athletes!==null} onChange={e=>setName(e.target.value)} placeholder="กรอกชื่อและนามสกุล"/></label>
 {athletes&&<><button type="button" className="account-text-button" disabled={busy} onClick={restart}>เปลี่ยนชื่อที่ค้นหา</button>{athletes.length===0?<Notice>ยังไม่พบชื่อในทะเบียนที่เชื่อมไว้ กรุณาติดต่อแอดมินตรวจข้อมูลก่อน ไม่ต้องสมัครซ้ำ</Notice>:<label>เลือกนักกีฬา<select required value={selected} disabled={busy} onChange={e=>{setSelected(e.target.value);setDan('');setPassword('');setError('')}}><option value="">เลือก ID นักกีฬา</option>{athletes.map(a=><option key={a.go_id} value={a.go_id}>{a.full_name} · {a.go_id}{a.dan_number?' · เลขดั้ง '+a.dan_number:''}</option>)}</select></label>}</>}
 {athlete&&<><Notice><strong>{athlete.full_name}</strong><p>ID: {athlete.go_id}</p></Notice>{athlete.dan_number&&<label>ยืนยันเลขทะเบียนดั้ง<input inputMode="numeric" required value={dan} onChange={e=>setDan(e.target.value)} placeholder="เลขทะเบียนดั้ง ไม่ใช่ระดับฝีมือ" maxLength={20}/></label>}
 {setup&&<label>รหัสชั่วคราวจากแอดมิน<input autoComplete="one-time-code" required value={code} onChange={e=>setCode(e.target.value)} maxLength={24}/></label>}
 <label>{setup?'ตั้งรหัสผ่านของคุณ':'รหัสผ่าน'}<div className="account-password"><input type={show?'text':'password'} required autoComplete={setup?'new-password':'current-password'} minLength={setup?8:1} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} placeholder={setup?'อย่างน้อย 8 ตัวอักษร':'กรอกรหัสผ่าน'}/><button type="button" onClick={()=>setShow(x=>!x)}>{show?'ซ่อน':'แสดง'}</button></div></label>
 {setup&&<label>ยืนยันรหัสผ่านใหม่<input type="password" required autoComplete="new-password" value={confirm} maxLength={128} onChange={e=>setConfirm(e.target.value)}/></label>}
 <button className="account-text-button" type="button" disabled={busy} onClick={()=>{setSetup(x=>!x);setPassword('');setConfirm('');setCode('');setError('')}}>{setup?'กลับไปใส่รหัสผ่านเดิม':'ตั้งรหัสครั้งแรก / ลืมรหัสผ่าน'}</button>
 {setup&&<Notice>ติดต่อแอดมินเพื่อยืนยันตัวตนและรับรหัสชั่วคราว จากนั้นตั้งรหัสผ่านเองได้ที่นี่ รหัสชั่วคราวใช้ได้ครั้งเดียวภายใน 24 ชั่วโมง</Notice>}</>}
 {error&&<Notice error>{error}</Notice>}
 <button className="competition-button primary full" disabled={busy||!client||(athletes!==null&&!athlete)}>{busy?'กำลังดำเนินการ…':!athletes?'ค้นหานักกีฬา':setup?'บันทึกรหัสผ่านและเข้าสู่ระบบ':'เข้าสู่ระบบ'}</button>
 </form></Panel></div>
}
