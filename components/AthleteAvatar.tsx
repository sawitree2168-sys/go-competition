/* eslint-disable @next/next/no-img-element -- athlete photos come from Supabase Storage */
import { AVATAR } from "@/lib/public-site";

/** Round athlete picture: their photo, or the default avatar (person with Go stones). */
export default function AthleteAvatar({ src, name, className = "h-12 w-12" }: { src?: string | null; name: string; className?: string }) {
  return <img src={src || AVATAR} alt={src ? name : ""} loading="lazy" className={`shrink-0 rounded-full bg-[var(--gt-cta-soft)] object-cover ${className}`} />;
}
