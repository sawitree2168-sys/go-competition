"use client";
import Link from "next/link";
import { useState } from "react";
import { staffDb, setRemember } from "@/app/organizer/_lib/staff";

export default function InstituteLogin({onSuccess}:{onSuccess:()=>Promise<void>}){
  const [user,setUser]=useState("");
  const [password,setPassword]=useState("");
  const [visible,setVisible]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(busy)return;
    setError("");
    const db=staffDb();
    if(!db){setError("ระบบยังไม่พร้อมใช้งาน กรุณาลองใหม่");return;}
    if(!user.trim()||!password){setError("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");return;}
    setBusy(true);
    try{
      setRemember(true);
      const name=/^go\s*master$/i.test(user.trim())?"gomaster":user.trim().toLowerCase();
      if(name.includes("@")){
        const {error:err}=await db.auth.signInWithPassword({email:name,password});
        if(err)throw Error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      }else{
        if(name.length<2||name.length>160){setError("กรุณากรอกชื่อสถาบัน ชื่อผู้ใช้ หรืออีเมล");return;}
        const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if(!url||!key)throw Error("ระบบยังไม่พร้อมใช้งาน");
        const response=await fetch(`${url}/functions/v1/staff-username-login`,{
          method:"POST",headers:{"content-type":"application/json",apikey:key},
          body:JSON.stringify({username:name,password})
        });
        const data=await response.json();
        if(!response.ok||!data.session)throw Error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
        const {error:err}=await db.auth.setSession(data.session);
        if(err)throw Error("เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่");
      }
      await onSuccess();
    }catch(err){setError(err instanceof Error?err.message:"เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่");}
    finally{setBusy(false);}
  };
  return <section className="mx-auto max-w-xl overflow-hidden rounded-2xl border-2 border-[#b8cde8] bg-white shadow-lg">
    <div className="border-b-4 border-[#efc663] bg-[linear-gradient(120deg,#0b69d1,#08336f)] px-6 py-6 text-white">
      <p className="text-sm text-[#ffdf8c]">GO TOURNAMENT · สถาบัน</p>
      <h1 className="mt-1 text-3xl font-bold">เข้าสู่ระบบสถาบัน</h1>
      <p className="mt-2 text-sm">ติดตามนักกีฬาและผลงานทั้งสังกัดในหน้าจอเดียว</p>
    </div>
    <form onSubmit={submit} className="space-y-4 p-5 sm:p-7">
      <label className="block text-base font-semibold">ชื่อผู้ใช้
        <input autoComplete="username" autoCapitalize="none" spellCheck={false} value={user} onChange={e=>setUser(e.target.value)}
          placeholder="ชื่อสถาบัน เช่น GO MASTER" className="mt-2 min-h-14 w-full rounded-xl border-2 border-[#acc5e7] bg-white px-4 text-lg text-[#133b70] focus:border-[#1e72d4]" />
      </label>
      <label className="block text-base font-semibold">รหัสผ่าน
        <span className="mt-2 flex overflow-hidden rounded-xl border-2 border-[#acc5e7] bg-white focus-within:border-[#1e72d4]">
          <input type={visible?"text":"password"} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}
            className="min-h-14 min-w-0 flex-1 px-4 text-lg text-[#133b70]" placeholder="กรอกรหัสผ่าน" />
          <button type="button" onClick={()=>setVisible(v=>!v)} className="min-w-20 px-3 text-sm text-[#155eae]">{visible?"ซ่อน":"แสดง"}</button>
        </span>
      </label>
      {error&&<p role="alert" className="rounded-lg border border-[#f0a8a8] bg-[#fff0f0] p-3 text-sm text-[#a32121]">{error}</p>}
      <button type="submit" disabled={busy} className="min-h-14 w-full rounded-xl border-b-4 border-[#e6b651] bg-[#0a62cf] px-5 text-lg font-bold text-white disabled:opacity-60">{busy?"กำลังตรวจสอบ…":"เข้าสู่ระบบ"}</button>
      <p className="text-center text-sm text-[#4e6282]">ใช้ชื่อสถาบัน ชื่อผู้ใช้ หรืออีเมลของบัญชีได้</p>
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-[#d9e5f4] pt-4 text-sm">
        <Link href="/login/forgot" className="font-semibold text-[#145db5] underline">ลืมรหัสผ่าน?</Link>
        <Link href="/signup?type=institution" className="font-semibold text-[#145db5] underline">ยังไม่มีบัญชี</Link>
      </div>
    </form>
  </section>;
}
