import type { Metadata } from "next";
import AuthFrame from "../_ui/AuthFrame";
import ForgotForm from "./ForgotForm";

export const metadata: Metadata = { title: "ลืมรหัสผ่าน · GO TOURNAMENT" };

export default function Forgot() {
  return <AuthFrame heroTitle={"ลืมรหัสผ่าน?\nตั้งใหม่ได้ใน 1 นาที"}><ForgotForm /></AuthFrame>;
}
