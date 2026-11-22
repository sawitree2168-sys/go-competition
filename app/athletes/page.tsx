import Link from 'next/link';
import type { Metadata } from 'next';
import PublicPage from '@/components/PublicPage';
import AthleteDirectory, { type DirectoryAthlete } from '@/components/AthleteDirectory';
import { publicDb } from '@/app/tournaments/[id]/_ui/data';
import AthletePaging, { AthletePageSize } from '@/components/AthletePaging';
import { loadHistoryStats } from '@/lib/central-history';
import { ATHLETE_GRADES, athleteGradeLabel } from '@/lib/athlete-directory-ranks';
import AthleteLevelFilter from '@/components/AthleteLevelFilter';

export const metadata: Metadata = { title: 'นักกีฬา' };

const LEVELS = [
  { value: 'all', label: 'ทุกระดับ' },
  { value: 'dan', label: 'ดั้ง' },
  { value: 'kyu', label: 'คิว' },
] as const;

export default async function AthletesPage({ searchParams }: {
  searchParams: Promise<{ q?: string; page?: string; view?: string; size?: string; level?: string }>;
}) {
  const params = await searchParams;
  const q = (typeof params.q === 'string' ? params.q : '').trim().slice(0, 80);
  const requested = Number(params.page);
  const page = Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested, 2147483647) : 1;
  const size = [30, 50, 100].includes(Number(params.size)) ? Number(params.size) : 30;
  const levelParam = typeof params.level === 'string' ? params.level : '';
  const level = LEVELS.find(filter => levelParam.startsWith(filter.value)) ?? LEVELS[0];
  const family = level.value === 'all' ? null : level.value;
  const grade = family
    ? ATHLETE_GRADES[family].find(value => levelParam === `${family}${value}`) ?? null
    : null;
  const skillFilter = grade === null ? level.value : levelParam;
  const grouped = family !== null && grade === null;
  const view = params.view === 'table' ? 'table' : 'cards';
  const db = publicDb();
  const result = await db?.rpc('gt_public_athlete_directory_v2', {
    p_query: q, p_page: page, p_size: size, p_level: grouped ? `${family}-overview` : skillFilter,
  });
  const data = result?.data as { total: number; page: number; page_size: number; rows: DirectoryAthlete[] } | null;
  const stats = await loadHistoryStats((data?.rows ?? []).map(athlete => athlete.go_id));
  const rows = (data?.rows ?? []).map(athlete => ({
    ...athlete,
    events: stats?.[athlete.go_id]?.events ?? 0,
    wins: stats?.[athlete.go_id]?.wins ?? 0,
    losses: stats?.[athlete.go_id]?.losses ?? 0,
  }));
  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;
  const levelLabel = family && grade !== null ? athleteGradeLabel(family, grade) : level.label;
  const heading = q ? 'ผลการค้นหา' : family ? `นักกีฬาระดับ${levelLabel}` : 'นักกีฬาทั้งหมด';

  return (
    <PublicPage icon="athlete" title="นักกีฬา" sub="รายชื่อนักกีฬาทั้งหมดจากทะเบียน พร้อมผลงานการแข่งขันที่เผยแพร่แล้ว" current="/athletes">
      <Link href="/head-to-head" className="gt-outline-btn mb-4 inline-flex min-h-12 items-center px-5">สถิติการพบกัน →</Link>
      <form key={q} action="/athletes" className="space-y-3">
        <input type="hidden" name="size" value={size} />
        <input type="hidden" name="view" value={view} />
        <div className="flex gap-2">
          <label className="gt-card flex min-h-12 min-w-0 flex-1 items-center px-3">
            <span className="sr-only">ชื่อนักกีฬาหรือรหัส GO</span>
            <input type="search" name="q" defaultValue={q} maxLength={80} placeholder="ค้นหาชื่อ นามสกุล หรือรหัส GO"
              className="min-w-0 flex-1 bg-transparent text-base outline-none" />
          </label>
          <button type="submit" name="level" value={skillFilter} className="gt-cta-btn min-h-12 shrink-0 px-5">ค้นหา</button>
        </div>
      </form>
      <div className="mt-3"><AthleteLevelFilter selected={skillFilter} q={q} size={size} view={view} /></div>
      {data && !result?.error ? (
        <>
          <div className="mt-5 flex flex-wrap justify-between gap-3">
            <h2 className="text-xl font-bold">{heading} {data.total.toLocaleString('th-TH')} คน</h2>
            {q && <Link href="/athletes" className="text-[var(--gt-brand)] underline">ดูนักกีฬาทั้งหมด</Link>}
          </div>
          <p className="mt-2 text-sm text-[var(--gt-muted)]">สถิติปี 2569 จากแมตช์ที่ตรวจสอบแล้วในประวัติกลาง • อยู่ระหว่างนำเข้าข้อมูลเพิ่มเติม ยังไม่ใช่ประวัติทั้งหมด</p>
          {!grouped && <AthletePageSize size={data.page_size} total={data.total} start={(data.page - 1) * data.page_size + 1} end={Math.min(data.page * data.page_size, data.total)} />}
          {rows.length ? <AthleteDirectory rows={rows} initialView={view} rankFamily={family} grouped={grouped} /> : <p className="gt-card mt-4 p-6">ไม่พบรายชื่อที่ตรงกับคำค้นหรือระดับที่เลือก</p>}
          {!grouped && <AthletePaging page={data.page} pages={pages} />}
        </>
      ) : (
        <p role="alert" className="gt-card mt-4 p-6">โหลดรายชื่อนักกีฬาไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>
      )}
    </PublicPage>
  );
}
