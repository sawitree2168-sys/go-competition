import { redirect } from "next/navigation";

// Photo changes now live on the account page (one place, keyed by the signed-in athlete's GO ID).
export default function AthletePhotoPage() {
  redirect("/account/photo");
}
