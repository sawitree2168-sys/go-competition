import type { Metadata } from "next";
import AuthFrame from "@/app/login/_ui/AuthFrame";
import SignupForm from "./SignupForm";

export const metadata: Metadata = { title: "สมัครสมาชิก · GO TOURNAMENT" };

export default function Signup() {
  return <AuthFrame heroTitle={"เป็นส่วนหนึ่งของ\nGO TOURNAMENT"}><SignupForm /></AuthFrame>;
}
