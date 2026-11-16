import type { Metadata } from "next";
import PublicPage, { ComingSoon } from "@/components/PublicPage";

export const metadata: Metadata = { title: "แกลเลอรี" };

export default function Page() {
  return <PublicPage icon="gallery" title="แกลเลอรี" sub="ภาพกิจกรรมการแข่งขัน"><ComingSoon what="แกลเลอรีภาพ" /></PublicPage>;
}
