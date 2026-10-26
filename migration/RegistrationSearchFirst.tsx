import React, { useState } from 'react';

/** Search-first registration gate. Search must be backed by a secured server endpoint.
 * Never expose phone numbers, birthdates, or private identifiers in search results.
 */
export type AthleteSearchHit = {
  athleteId: string;
  displayName: string;
  nickname?: string;
  level?: string;
  institution?: string;
};
export type SearchFn = (term: string) => Promise<AthleteSearchHit[]>;

export function RegistrationSearchFirst({
  onSearch, onChoose, onCreate,
}: {
  onSearch: SearchFn;
  onChoose: (athlete: AthleteSearchHit) => void;
  onCreate: (searchedName: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<AthleteSearchHit[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = query.trim();
    if (name.length < 2) return;
    setState('loading'); setError(''); setHits([]);
    try {
      const result = await onSearch(name);
      setHits(result); setState('done');
    } catch {
      setError('ค้นหาข้อมูลไม่ได้ กรุณาลองอีกครั้ง');
      setState('error');
    }
  };
  return <section className="mx-auto max-w-xl rounded-2xl bg-white p-5 shadow-sm">
    <h1 className="text-2xl font-bold text-blue-950">ค้นหานักกีฬาก่อนสมัคร</h1>
    <p className="my-2 text-slate-600">พิมพ์ชื่อ-นามสกุล เพื่อเช็กว่ามีโปรไฟล์อยู่แล้วหรือไม่</p>
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label htmlFor="athlete-search" className="font-medium">ชื่อ-นามสกุลนักกีฬา</label>
      <input id="athlete-search" className="rounded-xl border p-4 text-base" value={query}
        onChange={e => {setQuery(e.target.value);setState('idle');setHits([]);}}
        placeholder="ชื่อ-นามสกุล" autoComplete="name"/>
      <button type="submit" disabled={query.trim().length < 2 || state === 'loading'}
        className="rounded-xl bg-blue-700 p-4 font-semibold text-white disabled:opacity-40">
        {state === 'loading' ? 'กำลังค้นหา...' : 'ค้นหานักกีฬา'}
      </button>
    </form>
    {state === 'error' && <p role="alert" className="mt-3 text-red-700">{error}</p>}
    {state === 'done' && <div aria-live="polite" className="mt-5">
      {hits.length ? <>
        <h2 className="mb-3 font-semibold">พบรายชื่อที่อาจตรงกัน</h2>
        <ul className="space-y-2">{hits.map(a => <li key={a.athleteId}>
          <button className="w-full rounded-xl border p-3 text-left" onClick={() => onChoose(a)}>
            <strong>{a.displayName}</strong>
            <p className="text-sm text-slate-600">{[a.nickname,a.level,a.institution].filter(Boolean).join(' • ')}</p>
          </button>
        </li>)}</ul>
        <p className="mt-2 text-sm text-slate-500">เลือกชื่อแล้วต้องยืนยันตัวตนก่อนเข้าถึงหรือแก้ไขข้อมูล</p>
      </> : <p>ไม่พบรายชื่อที่ตรงกันในฐานข้อมูลที่เชื่อมต่อ</p>}
      <button className="mt-4 w-full rounded-xl border border-blue-700 p-4 font-semibold text-blue-800"
        onClick={() => onCreate(query.trim())}>ไม่มีชื่อของฉัน — สมัครสมาชิกใหม่</button>
    </div>}
  </section>;
}
