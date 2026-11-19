'use client';
import {useRouter} from 'next/navigation';
export const BACK_KEY='gt-in-app-nav';
export function markInAppNav(){try{sessionStorage.setItem(BACK_KEY,'1');}catch{}}
export default function BackLink({href,label,className}:{href:string;label:string;className?:string}){
 const router=useRouter();
 return <a href={href} className={className} onClick={e=>{
  if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  let inApp=false;try{inApp=sessionStorage.getItem(BACK_KEY)==='1';}catch{}
  if(inApp&&window.history.length>1){e.preventDefault();router.back();}
 }}>{label}</a>;
}
