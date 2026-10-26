"use client";
import {useState} from "react";
export function VisualImage({local,fallback,alt,className}:{local:string;fallback:string;alt:string;className?:string}){
 const [src,setSrc]=useState(local);
 return <img src={src} alt={alt} loading="lazy" className={className||"h-auto w-full"} onError={()=>{if(src!==fallback)setSrc(fallback)}}/>;
}
export function CroppedMockup({local,fallback,index,alt}:{local:string;fallback:string;index:number;alt:string}){
 const [src,setSrc]=useState(local);
 return <div className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border-4 border-[#0c336c] bg-[#e8eef7] shadow-xl">
  <div className="relative overflow-hidden" style={{aspectRatio:"0.44"}}>
   <img src={src} alt={alt} onError={()=>{if(src!==fallback)setSrc(fallback)}}
     className="absolute left-0 top-0 h-auto max-w-none" style={{width:"500%",transform:`translateX(-${index*20}%)`}}/>
  </div>
 </div>;
}
