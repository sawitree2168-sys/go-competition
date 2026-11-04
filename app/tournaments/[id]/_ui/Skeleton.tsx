import { Header, Shell } from "./chrome";

/** Shown the instant a link is tapped, while the page's data arrives. Mirrors the real layout. */
export function EventSkeleton() {
  return (
    <Shell>
      <Header backHref="/tournaments" backLabel="กลับรายการแข่งขัน" />
      <div className="px-4" aria-busy="true" aria-label="กำลังโหลด">
        <div className="gt-skel mt-2 h-7 w-56" />
        <div className="gt-card mt-3 flex gap-3 p-3"><div className="gt-skel h-36 w-32 shrink-0" /><div className="flex-1 space-y-3"><div className="gt-skel h-6 w-4/5" /><div className="gt-skel h-6 w-1/2" /><div className="gt-skel h-4 w-2/3" /></div></div>
        <div className="mt-3 grid grid-cols-2 gap-3"><div className="gt-skel h-12" /><div className="gt-skel h-12" /></div>
        <div className="gt-skel mt-6 h-7 w-48" />
        <div className="mt-3 grid gap-2">{Array.from({ length: 6 }, (_, i) => <div key={i} className="gt-card flex items-center gap-3 p-1.5"><div className="gt-skel h-14 w-24 shrink-0" /><div className="flex-1 space-y-2"><div className="gt-skel h-5 w-1/2" /><div className="gt-skel h-3 w-2/3" /></div></div>)}</div>
      </div>
    </Shell>
  );
}

export function DivisionSkeleton() {
  return (
    <Shell>
      <Header backHref="/tournaments" backLabel="กลับรายละเอียดงาน" />
      <div className="px-4" aria-busy="true" aria-label="กำลังโหลด">
        <div className="gt-skel mt-1 h-5 w-52" />
        <div className="gt-card mt-2 flex items-center gap-3 p-2.5"><div className="gt-skel h-16 w-28 shrink-0" /><div className="flex-1 space-y-2"><div className="gt-skel h-5 w-3/4" /><div className="gt-skel h-4 w-1/2" /></div></div>
        <div className="gt-card mt-3 p-3"><div className="flex items-center gap-3"><div className="gt-skel h-14 w-24 shrink-0" /><div className="gt-skel h-7 w-32" /></div><div className="mt-3 grid grid-cols-3 gap-2"><div className="gt-skel h-12" /><div className="gt-skel h-12" /><div className="gt-skel h-12" /></div></div>
        <div className="gt-skel mt-4 h-12" />
        <div className="mt-4 grid gap-1.5">{Array.from({ length: 6 }, (_, i) => <div key={i} className="gt-card flex items-center gap-3 px-3 py-2"><div className="gt-skel h-8 w-8 shrink-0" /><div className="flex-1 space-y-2"><div className="gt-skel h-4 w-2/3" /><div className="gt-skel h-3 w-1/3" /></div></div>)}</div>
      </div>
    </Shell>
  );
}
