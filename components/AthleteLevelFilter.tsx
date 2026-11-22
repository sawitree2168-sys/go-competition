'use client';
import Link, { useLinkStatus } from 'next/link';
import { useState } from 'react';
import { ATHLETE_GRADES, athleteGradeLabel, type AthleteRankFamily } from '@/lib/athlete-directory-ranks';

const LEVELS = [
  { value: 'all', label: 'ทุกระดับ' },
  { value: 'dan', label: 'ดั้ง' },
  { value: 'kyu', label: 'คิว' },
] as const;

type Props = { selected: string; q: string; size: number; view: 'cards' | 'table' };

// ปุ่มเลือกระดับ: ใช้ลิงก์ฝั่งเว็บ (ไม่โหลดหน้าใหม่ทั้งหน้าเหมือนส่งฟอร์ม)
// + โหลดข้อมูลทุกตัวเลือกไว้ล่วงหน้า (prefetch) กดแล้วเปลี่ยนรายชื่อได้ทันที
// + ไฮไลต์ปุ่มที่กดทันที แม้ข้อมูลยังมาไม่ถึง
export default function AthleteLevelFilter({ selected, q, size, view }: Props) {
  const [picked, setPicked] = useState(selected);
  const [synced, setSynced] = useState(selected);
  if (synced !== selected) { setSynced(selected); setPicked(selected); }

  const familyOf = (value: string): AthleteRankFamily | null =>
    value.startsWith('dan') ? 'dan' : value.startsWith('kyu') ? 'kyu' : null;
  const family = familyOf(picked);

  const href = (level: string) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (level !== 'all') params.set('level', level);
    if (size !== 30) params.set('size', String(size));
    if (view === 'table') params.set('view', 'table');
    const query = params.toString();
    return query ? `/athletes?${query}` : '/athletes';
  };

  return (
    <div className="space-y-3">
      <div role="group" aria-label="ระดับฝีมือนักกีฬา" className="flex flex-wrap gap-2">
        {LEVELS.map(l => (
          <Btn key={l.value} href={href(l.value)} onPick={() => setPicked(l.value)} label={l.label} wide
            active={l.value === 'all' ? family === null : family === l.value} />
        ))}
      </div>
      {family && (
        <div role="group" aria-label={`เลือกระดับ${family === 'dan' ? 'ดั้ง' : 'คิว'}`} className="flex flex-wrap gap-2">
          <Btn href={href(family)} onPick={() => setPicked(family)} label={`ทุก${family === 'dan' ? 'ดั้ง' : 'คิว'}`} active={picked === family} />
          {ATHLETE_GRADES[family].map(value => (
            <Btn key={value} href={href(`${family}${value}`)} onPick={() => setPicked(`${family}${value}`)} label={athleteGradeLabel(family, value)} active={picked === `${family}${value}`} />
          ))}
        </div>
      )}
    </div>
  );
}

function Btn({ href, onPick, label, active, wide }: { href: string; onPick: () => void; label: string; active: boolean; wide?: boolean }) {
  return (
    <Link href={href} prefetch scroll={false} aria-pressed={active} onClick={onPick}
      className={`${active ? 'gt-cta-btn' : 'gt-outline-btn'} inline-flex min-h-11 items-center justify-center ${wide ? 'px-4' : 'px-3'} text-sm`}>
      {label}<Pending />
    </Link>
  );
}

function Pending() {
  const { pending } = useLinkStatus();
  return pending ? (
    <span aria-hidden="true" className="ml-1.5 inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
  ) : null;
}
