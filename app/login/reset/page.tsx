import type { Metadata } from "next";
import AuthFrame from "../_ui/AuthFrame";
import ResetForm from "./ResetForm";

export const metadata: Metadata = { title: "ตั้งรหัสผ่านใหม่ · GO TOURNAMENT" };

export default function Reset() {
  return <AuthFrame heroTitle={"ตั้งรหัสผ่านใหม่"}><ResetForm /></AuthFrame>;
}
