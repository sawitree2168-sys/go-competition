"use client";

import {usePathname} from "next/navigation";
import Link from "next/link";
import ThemeToggle from "../../tournaments/[id]/_ui/ThemeToggle";
import { staffDb, useStaff } from "./staff";

export default function OrganizerBar() {
  const staff = useStaff();
  const pathname=usePathname();
  return (
    <header className="gt-sitebar sticky top-0 z-20 border-b border-[var(--gt-line)] bg-[var(--gt-header)] print:hidden">
      <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2.5">
        <Link href="/organizer" className="flex min-w-0 items-center gap-2 font-bold">
          <span aria-hidden="true" className="h-6 w-6 shrink-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,#5b6170,#14171e_60%)]" />
          <span className="truncate text-white">GO TOURNAMENT</span>
        </Link>
        <span className="hidden text-xs text-white md:block">{pathname.startsWith("/organizer/platform")?"ผู้ดูแลระบบ • เฉพาะเจ้าของ":"จัดการแข่งขัน • เฉพาะงานที่ได้รับสิทธิ์"}</span>
        <div className="ml-auto flex items-center gap-2">
          {staff.status === "staff" || staff.status === "not_staff" ? (
            <>
              <span className="hidden max-w-[14rem] truncate text-sm text-white sm:inline">{staff.email}</span>
              <button type="button" onClick={() => staffDb()?.auth.signOut()} className="gt-outline-btn min-h-11 px-3 text-sm">ออกจากระบบ</button>
            </>
          ) : null}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
