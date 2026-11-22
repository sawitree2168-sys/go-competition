import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PublicPage from '@/components/PublicPage';
import HistoryWallSearch from '@/components/HistoryWallSearch';
import { historySubmitHref } from '@/lib/history-submit';
import { loadHistoryWall, historyWallHref } from '@/lib/history-walllist';
import { thaiDate } from '@/lib/division-display';

function decodeEventId(id: string) {
  try { return decodeURIComponent(id); }
  catch { return id; }
}

export async function generateMetadata({ params }: { params: Promise<{ eventId: string }> }): Promise<Metadata> {
  const wall = await loadHistoryWall(decodeEventId((await params).eventId));
  return { title: wall ? `${wall.event.title} · วอลล์ลิสต์` : 'วอลล์ลิสต์' };
}

export default async function HistoryWallPage({ params, searchParams }: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ division?: string }>;
}) {
  const id = decodeEventId((await params).eventId);
  const { division } = await searchParams;
  const wall = await loadHistoryWall(id, division);
  if (!wall) notFound();

  const date = wall.event.event_date ? thaiDate(wall.event.event_date) : 'ยังไม่ระบุวันแข่งขัน';
  const count = wall.divisions.find(item => item.name === wall.division);
  const organizerStandings = wall.organizer_standings || Boolean(wall.source);
  const sources = wall.source ? [
    { url: wall.source.standings, label: 'ชีตอันดับและคะแนน' },
    { url: wall.source.rounds, label: 'ชีตผลรายรอบ' },
    { url: wall.source.review, label: wall.source.review_label },
  ] : [];

  return (
    <PublicPage icon="results" title={wall.event.title} sub={`${date} · วอลล์ลิสต์ผลรายรอบ`} current="/results">
      <Link href="/results/history" className="inline-flex min-h-11 items-center underline underline-offset-4">วอลล์ลิสต์รายการอื่น</Link>
      <nav aria-label="เลือกรุ่น" className="my-3 flex flex-wrap gap-2">
        {wall.divisions.map(item => {
          const selected = item.name === wall.division;
          return (
            <Link key={item.name} scroll={false} href={historyWallHref(id, item.name)}
              aria-current={selected ? 'page' : undefined}
              className={`${selected ? 'gt-cta-btn' : 'gt-outline-btn'} inline-flex min-h-11 items-center gap-2 px-3 py-2 text-sm font-semibold`}>
              {item.name}
              <span className="opacity-80">({item.players})</span>
            </Link>
          );
        })}
      </nav>
      <section className="space-y-3 rounded-2xl border border-[var(--gt-line,#b7cdeb)] bg-[var(--gt-surface,#fff)] p-3 sm:p-5" aria-labelledby="wall-division">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="wall-division" className="text-2xl font-extrabold">{wall.division}</h2>
            <p className="mt-1 text-sm text-[var(--gt-muted)]">
              {wall.rows.length} คน · {wall.rounds} {wall.has_rounds ? 'รอบ' : 'เกมต่อคนสูงสุด'} · {count?.games ?? 0} เกมที่แข่งจริง
            </p>
          </div>
          {organizerStandings && <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-900">อันดับตามผลผู้จัด</span>}
        </header>
        {wall.ranking_mode === 'calculated' && (
          <p className="rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-950">อันดับต้นทางไม่ครบ ระบบเรียงจากคะแนน ตามด้วย SOS และ SOSOS</p>
        )}
        {!wall.has_rounds && wall.rows.length > 0 && (
          <p className="text-sm text-[var(--gt-muted)]">ต้นทางไม่ระบุรอบแข่งขัน จึงแสดงตามลำดับเกม</p>
        )}
        {!organizerStandings && wall.ranking_mode === 'source' && wall.rows.some((row, i) => i > 0 && row.points > wall.rows[i - 1].points) && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950">อันดับต้นทางกับคะแนนที่คำนวณจากผลรายเกมต่างกัน ตารางนี้คงอันดับต้นทางไว้ค่ะ</p>
        )}
        <p className="text-sm text-[var(--gt-muted)]">เลขคืออันดับของคู่แข่ง · + ชนะ · − แพ้ · = เสมอ · * ชนะหรือแพ้ผ่าน</p>
        {wall.rows.length ? <HistoryWallSearch key={wall.event.id} wall={wall} /> : <p>ยังไม่มีผลที่ตรวจสอบแล้วในรุ่นนี้</p>}
        {wall.division && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--gt-line)] p-3">
            <p className="text-sm">มีรายชื่อหรือผลที่ยังตกหล่นในรุ่นนี้ไหมคะ?</p>
            <Link href={historySubmitHref(wall.event.id, wall.division)} className="gt-cta-btn inline-flex min-h-11 items-center px-4">
              ส่งข้อมูลการแข่งขันเพิ่มเติม
            </Link>
          </div>
        )}
        {sources.length > 0 && (
          <footer className="flex flex-wrap items-baseline gap-x-4 gap-y-2 border-t border-[var(--gt-line,#b7cdeb)] pt-3 text-sm">
            <strong>อ้างอิงต้นทาง</strong>
            {sources.map(source => source.url && (
              <a key={source.url} className="underline underline-offset-4" href={source.url} target="_blank" rel="noreferrer">{source.label}</a>
            ))}
          </footer>
        )}
      </section>
    </PublicPage>
  );
}
