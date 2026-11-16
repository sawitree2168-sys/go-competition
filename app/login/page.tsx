import type { Metadata } from "next";
import AuthFrame from "./_ui/AuthFrame";
import LoginPage from "./_ui/LoginPage";

export const metadata: Metadata = { title: "เข้าสู่ระบบ · GO TOURNAMENT" };

export default function Login() {
  return <AuthFrame><LoginPage /></AuthFrame>;
}
