"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import AthletePhotoUpload from "@/components/AthletePhotoUpload";

type Props = { params: Promise<{ id: string }> };
type Athlete = { id: string; full_name: string; photo_path: string | null; claimed_by: string | null };

export default function AthletePhotoPage({ params }: Props) {
  const [athleteId,setAthleteId] = useState("");
  const [athlete,setAthlete] = useState<Athlete|null>(null);
  const [photoUrl,setPhotoUrl] = useState<string|null>(null);
  const [error,setError] = useState("");
  const [userId,setUserId] = useState<string|null>(null);
  const [refresh,setRefresh] = useState(0);

  useEffect(() => {
    let active=true;
    params.then(p=>{ if(active) setAthleteId(p.id); }).catch(()=>{if(active)setError("ไม่พบโปรไฟล์นักกีฬา");});
    return ()=>{active=false;};
  },[params]);

  useEffect(()=>{
    if(!athleteId)return;
    let active=true;
    async function load(){
      const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if(!url||!key){if(active)setError("ยังไม่ได้ตั้งค่าการเชื่อมต่อฐานข้อมูล");return;}
      const db=createClient(url,key);
      const {data:auth}=await db.auth.getUser();
      const {data,error:readError}=await db.from("gt_athletes")
        .select("id,full_name,photo_path,claimed_by").eq("id",athleteId).maybeSingle();
      if(!active)return;
      setUserId(auth.user?.id??null);
      if(readError||!data){setError("ไม่สามารถเปิดโปรไฟล์นี้ได้ หรือเจ้าของยังไม่อนุญาตให้แสดง");return;}
      setAthlete(data);
      setError("");
      if(!data.photo_path){setPhotoUrl(null);return;}
      const {data:signed,error:signError}=await db.storage.from("gt-athlete-photos")
        .createSignedUrl(data.photo_path,60*10);
      if(active){setPhotoUrl(signError?null:signed?.signedUrl??null);}
    }
    load().catch(()=>{if(active)setError("โหลดข้อมูลไม่สำเร็จ");});
    return ()=>{active=false;};
  },[athleteId,refresh]);

  return <main className="min-h-screen bg-gray-50 px-4 py-6 text-gray-900">
    <div className="mx-auto max-w-2xl space-y-6">
      <a href="/" className="inline-block rounded-lg border bg-white px-4 py-3 text-base">กลับหน้าแรก</a>
      <h1 className="text-2xl font-bold">รูปโปรไฟล์นักกีฬา</h1>
      {error && <p role="alert" className="rounded-lg bg-white p-4">{error}</p>}
      {athlete && <>
        <h2 className="text-xl font-semibold">{athlete.full_name}</h2>
        <div className="mx-auto h-56 w-56 overflow-hidden rounded-full border-2 bg-gray-200 flex items-center justify-center">
          {photoUrl ? <img src={photoUrl} alt={`รูปโปรไฟล์ของ ${athlete.full_name}`} className="h-full w-full object-cover"/> :
            <span className="p-4 text-center text-sm">ยังไม่มีรูปโปรไฟล์ที่เปิดดูได้</span>}
        </div>
        {userId===athlete.claimed_by
          ? <AthletePhotoUpload athleteId={athlete.id} onSaved={()=>setRefresh(v=>v+1)} />
          : <p className="rounded-lg bg-white p-4">เฉพาะเจ้าของบัญชีที่เข้าสู่ระบบเท่านั้นที่เปลี่ยนรูปได้</p>}
      </>}
    </div>
  </main>;
}
