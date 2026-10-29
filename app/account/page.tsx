"use client";
import Link from 'next/link';
import {CompetitionShell,Notice} from '../components/competition/CompetitionShell';
import {AccountGate} from '../components/competition/AccountGate';
import {useAccount} from '../components/competition/useAccount';
export default function AccountPage(){const auth=useAccount();return <CompetitionShell title="เข้าสู่ระบบ / สร้างบัญชี"><AccountGate {...auth}><div className="account-layout"><Notice>เข้าสู่ระบบแล้ว</Notice><Link className="competition-button primary full" href="/athletes/connect">เชื่อมข้อมูลนักกีฬา ›</Link><Link className="competition-button full" href="/profile">โปรไฟล์นักกีฬา</Link><button type="button" className="competition-button full" onClick={()=>void auth.client?.auth.signOut()}>ออกจากระบบ</button></div></AccountGate></CompetitionShell>}
