'use client';

import { useState } from 'react';
import type { LevelHistory } from '@/lib/central-history';

const views = [
  { id: 'timeline', label: 'ไทม์ไลน์' },
  { id: 'cards', label: 'การ์ด' },
] as const;

function formatHistoryDate(date: string | null, year: number) {
  return date
    ? new Date(`${date}T00:00:00+07:00`).toLocaleDateString('th-TH', {
        timeZone: 'Asia/Bangkok',
        dateStyle: 'medium',
      })
    : `ปี ${year + 543} · ยังไม่ยืนยันวันแข่งขัน`;
}

export default function LevelTimeline({ history }: { history?: LevelHistory }) {
  const [view, setView] = useState<(typeof views)[number]['id']>('timeline');
  if (!history) return null;

  const firstLevel = history.items.findIndex(item => item.level_at_time);
  if (firstLevel === -1) return null;

  const steps = history.items.filter((item, index) => item.level_changed || index === firstLevel);
  const showCards = view === 'cards';

  return (
    <section className="gt-card p-4" aria-labelledby="level-history-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="level-history-title" className="text-lg font-bold">พัฒนาการระดับฝีมือ</h2>
          {history.current?.label && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-900">
              ปัจจุบัน {history.current.label} · เลขดั้ง {history.current.dan_number}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="มุมมองพัฒนาการระดับฝีมือ">
          {views.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-controls="level-history-items"
              aria-pressed={view === id}
              className={`${view === id ? 'gt-gold-btn' : 'gt-outline-btn'} min-h-11 cursor-pointer px-4 text-sm`}
              onClick={() => setView(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ol className="mt-3 flex flex-wrap items-center gap-2" aria-label="ลำดับระดับฝีมือ">
        {steps.map((step, index) => (
          <li key={`${step.kind}-${step.event_id ?? step.dan_number}-${index}`} className="flex items-center gap-2">
            {index > 0 && <span aria-hidden="true" className="text-(--gt-muted)">→</span>}
            <span className={`rounded-full px-3 py-1 font-bold ${step.kind === 'dan' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'}`}>
              {step.level_at_time}
            </span>
          </li>
        ))}
      </ol>

      <ol
        id="level-history-items"
        className={showCards
          ? 'mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'
          : 'mt-4 space-y-2 border-l-2 border-blue-200 pl-4'}
      >
        {history.items.map((item, index) => (
          <li
            key={`${item.kind}-${item.event_id ?? item.dan_number}-${index}`}
            className={showCards
              ? `min-w-0 space-y-2 rounded-xl border border-l-4 bg-(--gt-surface-2) p-4 ${item.kind === 'dan' || item.level_changed ? 'border-amber-400' : 'border-(--gt-line) border-l-blue-500'}`
              : 'relative'}
          >
            {!showCards && (
              <span
                aria-hidden="true"
                className={`absolute -left-[1.4rem] top-1.5 h-3 w-3 rounded-full ${item.level_changed ? 'bg-amber-500' : 'bg-blue-300'}`}
              />
            )}
            <div className={showCards ? 'flex flex-col gap-1' : 'flex flex-wrap items-baseline gap-x-3 gap-y-1'}>
              <strong className={item.kind === 'dan' ? 'text-(--gt-gold-ink)' : undefined}>{item.title}</strong>
              <small className="text-sm text-(--gt-muted)">{formatHistoryDate(item.event_date, item.event_year)}</small>
            </div>
            {item.placings?.map(placing => (
              <p key={placing.division} className="text-sm font-bold">
                {placing.place <= 3 ? ['🥇', '🥈', '🥉'][placing.place - 1] + ' ' : ''}
                ได้ที่ {placing.place} จาก {placing.players} คน
                {item.placings && item.placings.length > 1 ? ` · ${placing.division}` : ''}
              </p>
            ))}
            <p className="text-sm">
              {item.divisions?.length ? `รุ่น ${item.divisions.join(' / ')} · ` : ''}
              ระดับ <strong>{item.level_at_time ?? 'ยังไม่ทราบ'}</strong>
              {item.level_changed && (
                <span className="ml-2 inline-block rounded bg-amber-100 px-2 text-xs font-bold text-amber-900">ขึ้นระดับ</span>
              )}
              {item.kind === 'event' && !item.level && item.level_at_time && (
                <small className="ml-2 text-(--gt-muted)">(รุ่นนี้ไม่ได้แบ่งตามระดับ ใช้ระดับล่าสุดก่อนหน้า)</small>
              )}
            </p>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-(--gt-muted)">{history.note}</p>
    </section>
  );
}
