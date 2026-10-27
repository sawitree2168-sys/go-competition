"use client";
import {SiteHeroMedia} from "./SiteHeroMedia";
type BannerProps={slot:string;eyebrow?:string;title:string;description:string;compact?:boolean};
export function SiteSectionBanner({slot,eyebrow,title,description,compact=false}:BannerProps){
 return <section aria-labelledby={"media-heading-"+slot} className={"relative isolate overflow-hidden rounded-2xl bg-gradient-to-r from-[#082a60] via-[#155fbc] to-[#68b8f3] text-white shadow-md "+(compact?"min-h-[145px]":"min-h-[210px] sm:min-h-[240px]")}>
  <SiteHeroMedia slot={slot}/>
  <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#041633]/90 via-[#082a60]/65 to-[#155fbc]/15" aria-hidden="true"/>
  <div className={"relative max-w-3xl "+(compact?"px-5 py-5 sm:px-7":"px-6 py-7 sm:px-9 sm:py-9")}>
   {eyebrow&&<p className="text-xs font-bold uppercase tracking-widest text-[#f8d782]">{eyebrow}</p>}
   <h1 id={"media-heading-"+slot} className={"font-black leading-tight "+(compact?"mt-2 text-2xl sm:text-3xl":"mt-2 text-3xl sm:text-4xl")}>{title}</h1>
   <p className="mt-2 max-w-xl text-sm leading-relaxed text-blue-50 sm:text-base">{description}</p>
  </div>
 </section>;
}
