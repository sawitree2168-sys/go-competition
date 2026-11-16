import type { Metadata } from "next";
import PublicPage, { ComingSoon } from "@/components/PublicPage";

export const metadata: Metadata = { title: "เอกสารดาวน์โหลด" };

export default function Page() {
  return <PublicPage icon="documents" title="เอกสารดาวน์โหลด" sub="ระเบียบและเอกสาร"><ComingSoon what="เอกสารดาวน์โหลด" /></PublicPage>;
}
