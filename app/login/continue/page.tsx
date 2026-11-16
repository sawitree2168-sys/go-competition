import type { Metadata } from "next";
import AuthFrame from "../_ui/AuthFrame";
import ContinueClient from "./ContinueClient";

export const metadata: Metadata = { title: "กำลังเข้าสู่ระบบ · GO TOURNAMENT" };

/** Landing page after Google sign-in or the e-mail confirmation link. */
export default function Continue() {
  return <AuthFrame><ContinueClient /></AuthFrame>;
}
