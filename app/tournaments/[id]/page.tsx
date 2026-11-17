import Link from "next/link";
import { Header, Icon, Shell } from "./_ui/chrome";
import SiteBar from "./_ui/SiteBar";
import ShareButton from "./_ui/ShareButton";
import DivisionSeats, { type SeatRow } from "./_ui/DivisionSeats";
import PosterViewer from "@/components/PosterViewer";
import { PolicyText, type Policy } from "@/app/my-applications/MyApplications";
import { loadEventPage, publicDb } from "./_ui/data";
import { divisionKey, divisionLabel, thaiDate } from "@/lib/division-display";
import { seatStatus, seatSummary, registrationWindow } from "@/lib/event-dashboard.mjs";
import { thaiShort } from "@/lib/application-changes.mjs";

// Served from cache and refreshed in the background at most every 30 s (see PUBLIC_CACHE_SECONDS).
export const revalidate = 30;

/** "รุ่น 1-2 Kyu" → "1–2 คิว", "OPEN Friendship 9×9" → "เฟรนชิพ 9×9" (table cells). */
const shortLabel = (name: string) => divisionLabel(name).replace(/^รุ่น\s*/, "").replace(/\bkyu\b/gi, "คิว").replace(/\bdan\b/gi, "ดั้ง")
  .replace(/(\d+)\s*-\s*(\d+)/, "$1–$2").replace(/(\d+)\s*[x×]\s*(\d+)/i, "$1×$2");
const weekdayDate = (iso: string | null) =>
  iso ? new Date(iso + "T12:00:00").toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : null;

function Accordion({ icon, title, sub, id, children }: { icon: Parameters<typeof Icon>[0]["name"]; title: string; sub?: string | null; id?: string; children: React.ReactNode }) {
  return (
    <details id={id} className="gt-dash-panel scroll-mt-4">
      <summary className="flex min-h-14 items-center gap-3 px-4 py-2.5 sm:px-6">
        <Icon name={icon} className="h-6 w-6 shrink-0 text-[var(--gt-brand)]" />
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold sm:text-lg">{title}</span>
          {sub && <span className="block text-sm text-[var(--gt-muted)]">{sub}</span>}
        </span>
        <Icon name="chevron" className="gt-acc-chev h-5 w-5 shrink-0 rotate-90 text-[var(--gt-muted)] transition-transform" />
      </summary>
      <div className="border-t border-[var(--gt-dash-row-line)] px-4 pb-4 pt-1 text-sm leading-relaxed sm:px-6 sm:text-[15px]">{children}</div>
    </details>
  );
}

// หน้า 2 · ภาพรวมการสมัคร: hero, seat totals, divisions with seats left, conditions.
export default async function TournamentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = publicDb();
  const [{ event, divisions, entrants }, pol, refund] = await Promise.all([
    loadEventPage(db, id),
    db ? db.rpc("gt_event_change_policy_v1", { p_tournament: id }).then((r) => (r.error ? null : (r.data as Policy | null)), () => null) : null,
    db ? db.from("gt_tournaments").select("full_refund_through_date,refund_policy_text").eq("id", id).maybeSingle()
      .then((r) => (r.error ? null : (r.data as { full_refund_through_date: string | null; refund_policy_text: string | null } | null)), () => null) : null,
  ]);

  if (!event) {
    return (
      <Shell>
        <Header backHref="/tournaments" backLabel="กลับรายการแข่งขัน" />
        <div className="gt-card mx-4 mt-6 p-8 text-center">
          <h1 className="text-xl font-bold">ยังไม่พบรายการแข่งขันที่เผยแพร่</h1>
          <p className="mt-2 text-sm text-[var(--gt-muted)]">รายการนี้อาจยังไม่เปิดเผยข้อมูล หรือยังไม่พร้อมให้เข้าชม</p>
          <Link href="/tournaments" className="gt-gold-btn mt-5 inline-block px-5 py-3 text-sm">ดูรายการแข่งขันทั้งหมด</Link>
        </div>
      </Shell>
    );
  }

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
  const win = registrationWindow(event.registration_open_date, event.registration_close_date, today);
  const rows: SeatRow[] = divisions.map((d) => {
    const count = entrants.filter((e) => divisionKey(e.division_name) === divisionKey(d.name)).length;
    const s = seatStatus(count, d.seats_limit);
    return { id: d.id, label: shortLabel(d.name), count, limit: d.seats_limit, tone: s.tone, status: s.label, left: s.left, waitlist: s.waitlist };
  });
  const sum = seatSummary(rows);
  const anyLimit = rows.some((r) => r.limit);
  const policy = pol && typeof pol === "object" ? pol : null;
  const refundUntil = policy?.allow_withdraw ? policy.withdraw_until : refund?.full_refund_through_date ?? null;
  const tabs = [
    { href: `/tournaments/${id}`, label: "ภาพรวม", current: true },
    { href: `/tournaments/${id}/register`, label: "สมัครแข่งขัน" },
    { href: `/tournaments/${id}/entrants`, label: "รายชื่อผู้สมัคร" },
    { href: "#info", label: "ข้อมูลการแข่งขัน" },
    { href: "#contact", label: "ติดต่อ" },
  ];
  const stats = [
    { icon: "users" as const, n: sum.entrants, label: "สิทธิ์สมัคร" },
    { icon: "seat" as const, n: anyLimit ? sum.left : "–", label: "ที่ว่าง" },
    { icon: "trophy" as const, n: anyLimit ? sum.seats : "–", label: "รับสูงสุด" },
    { icon: "layers" as const, n: anyLimit ? sum.waitlist : "–", label: "สำรอง" },
  ];

  return (
    <Shell wide>
      <div className="gt-dash relative left-1/2 -mb-10 min-h-screen w-screen -translate-x-1/2 overflow-hidden pb-28 md:pb-12">
        <SiteBar current="/tournaments" />
        <nav aria-label="เมนูงานแข่งขัน" className="relative border-b border-[var(--gt-line)] bg-[var(--gt-surface)]">
          <ul className="mx-auto flex max-w-6xl overflow-x-auto px-1 sm:px-2">
            {tabs.map((t) => (
              <li key={t.label} className="shrink-0">
                <Link href={t.href} aria-current={t.current ? "page" : undefined}
                  className={`relative inline-flex min-h-14 items-center px-4 text-[15px] font-semibold sm:px-5 sm:text-base ${t.current ? "text-[var(--gt-cta)] after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-full after:bg-[var(--gt-cta)]" : "hover:text-[var(--gt-cta)]"}`}>{t.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Hero: same dark photo in both themes */}
        <section className="relative overflow-hidden bg-[#061537] text-white">
          <picture>
            <source media="(min-width: 768px)" srcSet="/event-hero-wide.webp" />
            <img src="/event-hero-m.webp" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-right" />
          </picture>
          <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,14,40,.92)_0%,rgba(4,14,40,.7)_45%,rgba(4,14,40,0)_75%)]" />
          <div className="relative mx-auto max-w-6xl px-4 pb-7 pt-6 sm:px-6 sm:pb-10 sm:pt-10">
            <div className="flex items-start justify-between gap-3">
              <p className="flex items-center gap-3 pt-1 text-xs font-bold tracking-[.18em] text-[#e9c46a] sm:text-sm">THAI GO TOURNAMENT<span aria-hidden="true" className="h-px w-10 bg-current sm:w-16" /></p>
              <span className="flex shrink-0 items-center gap-2">
                <span className={`rounded-full px-3.5 py-1 text-sm font-bold ${win.tone === "open" ? "bg-[#c9f2cf] text-[#126b2c]" : win.tone === "soon" ? "bg-[#dbe8ff] text-[#1550b0]" : "bg-white/20 text-white"}`}>
                  {win.tone === "open" ? "เปิดรับสมัคร" : win.tone === "soon" ? "รอเปิดรับสมัคร" : "ปิดรับสมัครแล้ว"}
                </span>
                <span className="hidden sm:block [&_button]:border-white/40 [&_button]:bg-white/10 [&_button]:text-white"><ShareButton title={event.title} /></span>
              </span>
            </div>
            <h1 className="mt-3 max-w-[78%] text-[34px] font-extrabold leading-[1.08] tracking-tight sm:max-w-[60%] sm:text-5xl lg:text-6xl">{event.title}</h1>
            <span aria-hidden="true" className="mt-4 block h-[3px] w-40 rounded-full bg-[#e9c46a] sm:w-52" />
            <p className="mt-4 flex items-center gap-3 text-lg sm:text-xl"><Icon name="calendar" className="h-6 w-6 shrink-0 sm:h-7 sm:w-7" />{weekdayDate(event.event_date) ?? "รอประกาศวันแข่งขัน"}</p>
            <p className="mt-2 flex items-center gap-3 text-lg text-[#b9cdf3] sm:text-xl"><Icon name="pin" className="h-6 w-6 shrink-0 sm:h-7 sm:w-7" />{event.venue ?? "สถานที่รอยืนยัน"}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="inline-flex min-h-12 items-center gap-3 rounded-xl bg-white px-4 text-base font-semibold text-[#0b1f45] shadow-lg sm:text-lg">
                <Icon name="calendar" className="h-6 w-6 text-[#1f9a4b]" /><span aria-hidden="true" className="h-6 w-px bg-[#cfd8e6]" />
                {win.text}{win.date ? ` ${thaiShort(win.date)}` : ""}
              </span>
              {win.tone !== "closed" && event.registration_mode !== "closed" && (
                <Link href={`/tournaments/${id}/register`} className="gt-cta-btn hidden min-h-12 items-center gap-2 px-6 text-lg md:inline-flex">สมัครแข่งขัน <Icon name="chevron" className="h-4 w-4" /></Link>
              )}
            </div>
          </div>
        </section>

        <main className="relative mx-auto max-w-6xl px-3 sm:px-4">
          {/* Totals */}
          <div className="mt-6 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-3 text-2xl font-bold">ภาพรวมการสมัคร<span aria-hidden="true" className="h-[3px] w-10 rounded-full bg-[#e9c46a]" /></h2>
            <span className="text-sm text-[var(--gt-muted)]">อัปเดตล่าสุด</span>
          </div>
          <ul className="gt-dash-panel mt-3 grid grid-cols-2 overflow-hidden md:grid-cols-4">
            {stats.map((s, i) => (
              <li key={s.label} className={`flex items-center gap-3 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5 ${i % 2 ? "border-l border-[var(--gt-dash-row-line)]" : ""} ${i > 1 ? "border-t border-[var(--gt-dash-row-line)] md:border-t-0" : ""} ${i === 2 ? "md:border-l" : ""}`}>
                <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--gt-cta-soft)] text-[var(--gt-brand)] sm:h-14 sm:w-14"><Icon name={s.icon} className="h-6 w-6 sm:h-7 sm:w-7" /></span>
                <span className="min-w-0"><span className="gt-num relative inline-block text-3xl font-extrabold leading-none sm:text-4xl">{s.n}{s.label === "ที่ว่าง" && typeof s.n === "number" && s.n > 0 && <span aria-hidden="true" className="absolute -right-3 top-0 h-2 w-2 rounded-full bg-[var(--gt-ok)]" />}</span>
                  <span className="mt-1 block text-[15px] text-[var(--gt-muted)] sm:text-base">{s.label}</span></span>
              </li>
            ))}
          </ul>
          {anyLimit && sum.seats > 0 && (
            <div className="mt-5">
              <div className="flex justify-between text-[15px] font-semibold"><span>สมัครแล้ว <span className="gt-num">{sum.seats - sum.left}</span></span><span>คงเหลือ <span className="gt-num">{sum.left}</span></span></div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-[var(--gt-cta-soft)]" role="progressbar" aria-label="ที่นั่งที่สมัครแล้ว" aria-valuemin={0} aria-valuemax={sum.seats} aria-valuenow={sum.seats - sum.left}>
                <div className="h-full rounded-full bg-[var(--gt-cta)]" style={{ width: `${Math.min(100, Math.round(((sum.seats - sum.left) / sum.seats) * 100))}%` }} />
              </div>
            </div>
          )}
          <p className="mt-4 flex items-center gap-3 rounded-xl bg-[var(--gt-cta-soft)] px-4 py-3 text-sm text-[var(--gt-muted)] sm:text-[15px]">
            <Icon name="info" className="h-6 w-6 shrink-0 text-[var(--gt-brand)]" /><span aria-hidden="true" className="h-8 w-px bg-[var(--gt-dash-panel-line)]" />นับเป็นจำนวนสิทธิ์สมัคร ผู้สมัคร 1 คนอาจลงหลายรุ่น
          </p>
          <p className="mt-6 border-t border-[var(--gt-line)] pt-4 text-center text-[var(--gt-muted)]">เลือกดูรุ่นและสมัครเข้าร่วมการแข่งขัน</p>

          <DivisionSeats eventId={id} rows={rows} />

          {/* Conditions and event info */}
          <div className="mt-4 grid gap-2.5">
            <Accordion icon="layers" title="เงื่อนไขเปิดสายเพิ่ม">
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>แต่ละรุ่นรับตามจำนวนในตาราง เมื่อเต็มแล้ว ผู้สมัครเพิ่มจะอยู่ในรายชื่อสำรองตามลำดับการสมัคร</li>
                <li>ถ้ามีผู้สมัครสำรองมากพอ ผู้จัดอาจเปิดสายเพิ่ม และจะแจ้งในหน้านี้</li>
              </ul>
            </Accordion>
            <Accordion icon="user" title="เงื่อนไขการเลือกรุ่น">
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>เลือกรุ่นตามระดับฝีมือปัจจุบัน (คิว / ดั้ง) ผู้จัดตรวจระดับก่อนอนุมัติใบสมัคร</li>
                <li>{policy?.allow_division ? `ขอเปลี่ยนรุ่นได้${policy.division_until ? `ถึง ${thaiShort(policy.division_until)}` : ""} ที่หน้า "สถานะการสมัคร"` : "การเปลี่ยนรุ่นหลังสมัคร ติดต่อผู้จัด"}</li>
              </ul>
            </Accordion>
            <Accordion icon="undo" title="การยกเลิกและคืนเงิน" sub={refundUntil ? `แจ้งก่อน ${thaiShort(refundUntil)} เวลา 23.59 น.` : null}>
              {policy ? <PolicyText policy={policy} /> : refund?.refund_policy_text
                ? <p className="mt-2 whitespace-pre-line">{refund.refund_policy_text}</p>
                : <p className="mt-2 text-[var(--gt-muted)]">ผู้จัดยังไม่ได้ประกาศเงื่อนไข กรุณาติดต่อผู้จัด</p>}
              <Link href="/my-applications" className="mt-3 inline-flex min-h-11 items-center font-semibold text-[var(--gt-cta)] underline">ขอถอนตัว เปลี่ยนคน เปลี่ยนรุ่น →</Link>
            </Accordion>
            <Accordion id="info" icon="calendar" title="ข้อมูลการแข่งขัน" sub="กำหนดการ กติกา โปสเตอร์">
              <div className="mt-2 grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
                {event.poster_url && <PosterViewer src={event.poster_url} alt={`โปสเตอร์ ${event.title}`} sizes="160px" className="h-52 w-36 rounded-lg" />}
                <div className="min-w-0">
                  <dl className="grid gap-2">
                    <div className="flex justify-between gap-4 border-b border-[var(--gt-dash-row-line)] pb-2"><dt className="text-[var(--gt-muted)]">เปิดรับสมัคร</dt><dd className="font-semibold">{thaiDate(event.registration_open_date) ?? "รอประกาศ"}</dd></div>
                    <div className="flex justify-between gap-4 border-b border-[var(--gt-dash-row-line)] pb-2"><dt className="text-[var(--gt-muted)]">ปิดรับสมัคร</dt><dd className="font-semibold">{thaiDate(event.registration_close_date) ?? "รอประกาศ"}</dd></div>
                    <div className="flex justify-between gap-4"><dt className="text-[var(--gt-muted)]">วันแข่งขัน</dt><dd className="font-semibold">{thaiDate(event.event_date) ?? "รอประกาศ"}</dd></div>
                  </dl>
                  <p className="mt-4 font-semibold">กติกาการแข่งขัน</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    <li>จับคู่แบบสวิส: รอบแรกจับตามลำดับ รอบถัดไปจับคนคะแนนเท่ากัน ไม่เจอคู่เดิมซ้ำ</li>
                    <li>ชนะได้ 1 คะแนน ผู้ได้บาย (ไม่มีคู่ในรอบนั้น) ได้ 1 คะแนน</li>
                    <li>คะแนนเท่ากัน ตัดสินด้วย SOS แล้วจึง SOSOS</li>
                  </ul>
                  <p className="mt-2 text-xs text-[var(--gt-muted)]">เวลาแข่ง โคมิ และรายละเอียดอื่นรอผู้จัดประกาศ</p>
                </div>
              </div>
            </Accordion>
            <Accordion id="contact" icon="chat" title="ติดต่อผู้จัด และร่วมสนับสนุน">
              <p className="mt-2 text-[var(--gt-muted)]">รอผู้จัดยืนยันชื่อผู้ติดต่อ เบอร์โทรศัพท์ และ LINE สำหรับงานนี้</p>
            </Accordion>
          </div>
          <span aria-hidden="true" className="pointer-events-none mt-6 flex justify-end">
            <span className="h-10 w-10 rounded-full bg-[radial-gradient(circle_at_35%_30%,#5b6170,#0b0d12_65%)] shadow-lg" />
            <span className="-ml-2 -mt-2 h-10 w-10 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff,#d6dbe4_60%,#9aa3b2)] shadow-lg" />
          </span>
        </main>

      </div>
      {win.tone !== "closed" && event.registration_mode !== "closed" && (
        <div className="gt-mobile-bottom-action fixed inset-x-0 bottom-0 z-30 border-t border-[var(--gt-dash-panel-line)] bg-[var(--gt-surface)] px-3 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3 md:hidden">
          <Link href={`/tournaments/${id}/register`} className="gt-cta-btn flex min-h-12 items-center justify-center gap-2 text-lg">สมัครแข่งขัน <Icon name="chevron" className="h-4 w-4" /></Link>
        </div>
      )}
    </Shell>
  );
}
