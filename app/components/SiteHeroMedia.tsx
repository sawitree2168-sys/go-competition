"use client";
import {useEffect,useState} from "react";
type MediaImage={device:"desktop"|"tablet"|"mobile";image_url:string;alt_text:string};
function sourceFor(items:MediaImage[],device:MediaImage["device"]){return items.find(x=>x.device===device)?.image_url||items.find(x=>x.device==="desktop")?.image_url;}
export function SiteHeroMedia({slot="home"}:{slot?:string}){
 const [images,setImages]=useState<MediaImage[]>([]);
 useEffect(()=>{let active=true;const ctrl=new AbortController();
  void(async()=>{try{const response=await fetch("/api/site-media?slot="+encodeURIComponent(slot),{signal:ctrl.signal,cache:"no-store"});
   if(!response.ok)return;const data=await response.json();if(active&&data.status==="ok"&&Array.isArray(data.images))setImages(data.images);
  }catch{/* Keep visually legible native gradient if media network fails. */}})();
  return()=>{active=false;ctrl.abort()};
 },[slot]);
 const desktop=sourceFor(images,"desktop");
 if(!desktop)return null;
 const tablet=sourceFor(images,"tablet");
 const mobile=sourceFor(images,"mobile");
 return <picture aria-hidden="true" className="absolute inset-0 -z-20 block h-full w-full">
  {mobile&&<source media="(max-width: 639px)" srcSet={mobile}/>}
  {tablet&&<source media="(max-width: 1023px)" srcSet={tablet}/>}
  <img src={desktop} alt="" className="h-full w-full object-cover object-center"/>
 </picture>;
}
export function SiteOfficialLogo(){
 const [url,setUrl]=useState("");
 useEffect(()=>{let active=true;const ctrl=new AbortController();void(async()=>{try{
  const r=await fetch("/api/site-media?slot=brand-logo",{signal:ctrl.signal,cache:"no-store"});
  if(!r.ok)return;const data=await r.json();if(active&&Array.isArray(data.images)&&data.images.length)setUrl(data.images.find((x:MediaImage)=>x.device==="desktop")?.image_url||data.images[0].image_url||"");
 }catch{}})();return()=>{active=false;ctrl.abort()};},[]);
 return url?<img src={url} alt="GO TOURNAMENT" className="h-12 w-auto max-w-[230px] object-contain" />:<span className="inline-flex items-center rounded-lg border border-[#efc96a]/60 px-3 py-2 text-lg font-black tracking-wide text-[#f9e6ad]">GO TOURNAMENT</span>;
}
