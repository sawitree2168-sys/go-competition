/* eslint-disable @next/next/no-img-element -- decorative illustrations in /public */
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
    { icon: "users" as const, n: sum.entrants, label: "สมัคร" },
    { icon: "seat" as const, n: anyLimit ? sum.left : "–", label: "ที่ว่าง" },
    { icon: "trophy" as const, n: anyLimit ? sum.seats : "–", label: "รับสูงสุด" },
    { icon: "layers" as const, n: anyLimit ? sum.waitlist : "–", label: "สำรอง" },
  ];

  return (
    <Shell wide>
      <div className="gt-dash relative left-1/2 -mb-10 min-h-screen w-screen -translate-x-1/2 overflow-hidden pb-28 md:pb-12">
        <SiteBar current="/tournaments" />
        <img src="/event-hero-glow.webp" alt="" aria-hidden="true" className="gt-dash-glow pointer-events-none absolute -right-24 top-10 w-[640px] max-w-none sm:w-[900px]" />

        <nav aria-label="เมนูงานแข่งขัน" className="relative mx-auto max-w-6xl overflow-x-auto px-3 pt-3 sm:px-4">
          <ul className="flex w-max gap-1.5">
            {tabs.map((t) => (
              <li key={t.label}>
                <Link href={t.href} aria-current={t.current ? "page" : undefined}
                  className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold ${t.current ? "bg-[var(--gt-cta)] text-white" : "border border-[var(--gt-dash-panel-line)] bg-[var(--gt-dash-panel)] hover:border-[var(--gt-cta)]"}`}>{t.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <main className="relative mx-auto max-w-6xl px-3 sm:px-4">
          {/* Hero */}
          <section className="relative grid min-h-[220px] items-center gap-2 pt-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:pt-8">
            <img src="/event-hero-board.webp" alt="" aria-hidden="true"
              className="pointer-events-none absolute -right-8 top-0 w-[60%] max-w-[340px] drop-shadow-[0_18px_30px_rgba(0,0,0,.35)] sm:max-w-[420px] md:static md:order-2 md:w-[118%] md:max-w-none md:justify-self-end" />
            <div className="relative z-[1] min-w-0">
              <p className="flex items-center gap-3 text-[11px] font-bold tracking-[.12em] text-[var(--gt-dash-eyebrow)] sm:text-sm">
                THAI GO TOURNAMENT<span aria-hidden="true" className="h-px w-10 bg-current opacity-60 sm:w-24" />
              </p>
              <div className="mt-1 flex items-start gap-2">
                <h1 className="max-w-[62%] text-[28px] font-extrabold leading-[1.05] tracking-tight text-[var(--gt-dash-title)] sm:max-w-none sm:text-5xl lg:text-[56px]">{event.title}</h1>
                <span className="ml-auto hidden sm:block"><ShareButton title={event.title} /></span>
              </div>
              <p className="mt-3 flex items-center gap-2 text-sm sm:text-xl"><Icon name="calendar" className="h-5 w-5 shrink-0 sm:h-7 sm:w-7" />{weekdayDate(event.event_date) ?? "รอประกาศวันแข่งขัน"}</p>
              <p className="mt-1.5 flex items-center gap-2 text-sm sm:text-xl"><Icon name="pin" className="h-5 w-5 shrink-0 sm:h-7 sm:w-7" />{event.venue ?? "สถานที่รอยืนยัน"}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className={`gt-close-chip inline-flex min-h-10 items-center gap-2 px-3 text-sm font-semibold sm:min-h-12 sm:px-4 sm:text-lg ${win.tone === "closed" ? "opacity-70" : ""}`}>
                  <Icon name="calendar" className="h-5 w-5" />{win.text}{win.date ? ` ${thaiShort(win.date)}` : ""}
                </span>
                {win.tone !== "closed" && event.registration_mode !== "closed" && (
                  <Link href={`/tournaments/${id}/register`} className="gt-cta-btn hidden min-h-12 items-center gap-2 px-6 text-lg md:inline-flex">สมัครแข่งขัน <Icon name="chevron" className="h-4 w-4" /></Link>
                )}
              </div>
            </div>
          </section>

          {/* Totals */}
          <h2 className="mt-6 flex items-center gap-2.5 text-xl font-bold sm:text-2xl"><span aria-hidden="true" className="h-6 w-1.5 rounded-full bg-[var(--gt-cta)]" />ภาพรวมการสมัคร</h2>
          <ul className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-4">
            {stats.map((s) => (
              <li key={s.label} className="gt-dash-panel flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
                <Icon name={s.icon} className="h-8 w-8 shrink-0 text-[var(--gt-brand)] sm:h-10 sm:w-10" />
                <span><span className="gt-num block text-2xl font-bold leading-none sm:text-3xl">{s.n}</span><span className="text-sm text-[var(--gt-muted)] sm:text-base">{s.label}</span></span>
              </li>
            ))}
          </ul>
          <p className="mt-2 flex items-center gap-2 text-xs text-[var(--gt-muted)] sm:text-sm"><Icon name="info" className="h-4 w-4 shrink-0" />นับเป็นจำนวนสิทธิ์สมัคร ผู้สมัคร 1 คนอาจลงหลายรุ่น</p>

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
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--gt-dash-panel-line)] bg-[var(--gt-surface)] px-3 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3 md:hidden">
          <Link href={`/tournaments/${id}/register`} className="gt-cta-btn flex min-h-12 items-center justify-center gap-2 text-lg">สมัครแข่งขัน <Icon name="chevron" className="h-4 w-4" /></Link>
        </div>
      )}
    </Shell>
  );
}
