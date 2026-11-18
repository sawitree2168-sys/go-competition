import SiteBar from "@/app/tournaments/[id]/_ui/SiteBar";
import { PageHero, SiteFooter } from "@/components/SiteDesign";
import Link from "next/link";
import { Shell } from "@/app/tournaments/[id]/_ui/chrome";
import "./auth-font.css";

/** Square blue mark with a black and a white stone. */
export function LogoMark({ className = "h-11 w-11" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`relative grid shrink-0 place-items-center rounded-xl bg-[linear-gradient(135deg,#2a6fe0,#0b3b8f)] shadow-md ${className}`}>
      <span className="absolute left-[18%] top-[22%] h-[46%] w-[46%] rounded-full bg-[radial-gradient(circle_at_35%_30%,#5b6170,#0b0d12_65%)]" />
      <span className="absolute bottom-[16%] right-[14%] h-[44%] w-[44%] rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff,#d6dbe4_60%,#9aa3b2)]" />
    </span>
  );
}

/** Login / sign-up / password pages: white top bar, blue photo panel on computers, form card. */
export default function AuthFrame({ children, heroTitle = "ทุกการแข่งขัน\nเริ่มต้นที่นี่" }: { children: React.ReactNode; heroTitle?: string }) {
  return (
    <div className="gt-auth min-h-screen bg-[linear-gradient(160deg,var(--gt-cta-soft),transparent_60%)]">
      <Shell wide>
        <div className="px-3 py-4 sm:px-6 sm:py-8">
          <div className="overflow-hidden rounded-3xl border border-[var(--gt-line)] bg-[var(--gt-surface)] shadow-xl">
            <SiteBar current="/login"/>
            <PageHero title="ยินดีต้อนรับสู่ GO TOURNAMENT" sub="เข้าสู่ระบบเพื่อจัดการข้อมูลของคุณ"/>
            <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="relative hidden min-h-[36rem] overflow-hidden bg-[#0a2fa0] lg:m-4 lg:block lg:rounded-2xl">
                <picture>
                  <source srcSet="/login-hero.webp" type="image/webp" />
                  <img src="/login-hero.jpg" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-bottom" />
                </picture>
                <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1/2 bg-[linear-gradient(180deg,rgba(8,30,120,.45),transparent)]" />
                <div className="relative p-10">
                  <p className="gt-auth-hero whitespace-pre-line text-5xl font-bold leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,.35)]">{heroTitle}</p>
                  <span aria-hidden="true" className="mt-6 block h-1 w-28 rounded-full bg-[#4fb3ff]" />
                </div>
              </div>
              <div className="relative px-4 pb-20 pt-6 sm:px-10 lg:py-12">
                <div className="mx-auto w-full max-w-md">{children}</div>
                <span aria-hidden="true" className="pointer-events-none absolute bottom-3 right-4 flex lg:hidden">
                  <span className="h-10 w-12 rounded-[50%] bg-[radial-gradient(circle_at_35%_30%,#5b6170,#0b0d12_65%)] shadow-lg" />
                  <span className="-ml-4 mt-1 h-10 w-12 rounded-[50%] bg-[radial-gradient(circle_at_35%_30%,#fff,#e2e6ec_65%)] shadow-lg" />
                </span>
              </div>
            </div>
          </div>
        </div>
        <SiteFooter/>
      </Shell>
    </div>
  );
}
