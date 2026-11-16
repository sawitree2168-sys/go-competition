import type { Metadata } from "next";
import PublicPage, { ComingSoon } from "@/components/PublicPage";

export const metadata: Metadata = { title: "GO FAN" };

export default function Page() {
  return <PublicPage icon="fan" title="GO FAN" sub="ติดตามนักกีฬาที่ชื่นชอบ"><ComingSoon what="ระบบติดตามนักกีฬา" /></PublicPage>;
}
