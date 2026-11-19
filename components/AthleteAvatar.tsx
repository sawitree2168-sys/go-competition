"use client";
/* eslint-disable @next/next/no-img-element -- athlete photos come from Supabase Storage */
import { DEFAULT_ATHLETE_PHOTO as AVATAR, athletePhotoSource } from "@/lib/athlete-photo.mjs";
import PhotoZoom from "./PhotoZoom";
import {athletePortrait} from '@/lib/athlete-portraits';
import './AthletePortraits.css';

/** Rectangular athlete picture: their photo, or the default avatar (person with Go stones). `zoom`: tap a real photo to see it large. */
export default function AthleteAvatar({ src, name, className = "h-12 w-12", zoom = false, variant='round' }: { src?: string | null; name: string; className?: string; zoom?: boolean;variant?:'round'|'portrait' }) {
  src = src?.endsWith(AVATAR) ? null : (src && athletePhotoSource(src) !== AVATAR ? src : null) ?? athletePortrait(name);
  const img = <img data-athlete-photo="true" src={athletePhotoSource(src)} alt={src ? name : ""} loading="lazy" onError={(event) => { if (!event.currentTarget.src.endsWith(AVATAR)) event.currentTarget.src = AVATAR; }} className={`shrink-0 rounded-lg bg-[var(--gt-cta-soft)] ${src ? "object-cover" : "object-contain"} ${className}`} />;
  return <span className={variant==='portrait'?'gt-athlete-portrait-frame':'gt-athlete-round-frame'} data-athlete-photo="true">{zoom ? <PhotoZoom src={src} name={name} className="shrink-0">{img}</PhotoZoom> : img}</span>;
}
