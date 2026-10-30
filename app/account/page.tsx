"use client";
import Link from 'next/link';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {CompetitionShell,Notice} from '../components/competition/CompetitionShell';
import {AccountGate} from '../components/competition/AccountGate';
import {useAccount} from '../components/competition/useAccount';
export default function AccountPage(){const auth=useAccount(),router=useRouter();useEffect(()=>{if(!auth.token)return;const c=new AbortController();void fetch('/api/me/athletes',{headers:{Authorization:'Bearer '+auth.token},cache:'no-store',signal:c.signal}).then(async r=>{if(!r.ok)return;const d=await r.json();let name='';try{name=sessionStorage.getItem('gt-checked-athlete-name')||''}catch{}const a=d.athletes.find((x:{full_name:string})=>x.full_name.trim()===name.trim());if(a||d.athletes.length){try{sessionStorage.removeItem('gt-checked-athlete-name')}catch{}router.replace('/')}else router.replace('/athletes/connect'+(name?'?name='+encodeURIComponent(name):''))}).catch(()=>{});return()=>c.abort()},[auth.token,router]);return <CompetitionShell title="เข้าสู่ระบบ / สร้างบัญชี"><AccountGate {...auth}><div className="account-layout"><Notice>เข้าสู่ระบบแล้ว</Notice><Link className="competition-button primary full" href="/athletes/connect">เชื่อมข้อมูลนักกีฬา ›</Link><Link className="competition-button full" href="/profile">โปรไฟล์นักกีฬา</Link><button type="button" className="competition-button full" onClick={()=>void auth.client?.auth.signOut()}>ออกจากระบบ</button></div></AccountGate></CompetitionShell>}
