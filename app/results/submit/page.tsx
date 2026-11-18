import PublicPage from "@/components/PublicPage";
import ResultSubmit from "./ResultSubmit";
export const metadata={title:"ส่งภาพผลการแข่งขัน | GO TOURNAMENT",referrer:"no-referrer" as const};
export default function Page(){return <PublicPage icon="upload" title="ส่งผลการแข่งขัน" sub="ถ่ายรูปหรือแคปหน้าจอ แล้วส่งได้เลย • ไม่ต้องล็อกอิน" current="/results/submit"><ResultSubmit/></PublicPage>}
