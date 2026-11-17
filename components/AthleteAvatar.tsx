"use client";
/* eslint-disable @next/next/no-img-element -- athlete photos come from Supabase Storage */
import { AVATAR } from "@/lib/public-site";

/** Round athlete picture: their photo, or the default avatar (person with Go stones). */
export default function AthleteAvatar({ src, name, className = "h-12 w-12" }: { src?: string | null; name: string; className?: string }) {
  return <img src={src || AVATAR} alt={src ? name : ""} loading="lazy" onError={(event) => { if (!event.currentTarget.src.endsWith(AVATAR)) event.currentTarget.src = AVATAR; }} className={`shrink-0 rounded-full bg-[var(--gt-cta-soft)] ${src ? "object-cover" : "object-contain"} ${className}`} />;
}
