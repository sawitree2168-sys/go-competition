"use client";
import {useEffect,useState} from "react";
import {EventDetails} from "../components/competition/EventDetails";
import {DivisionDetails,type DivisionData} from "../components/competition/DivisionDetails";
import type {Tournament,Division} from "../../lib/competition/public-data";
const tournament:Tournament={id:"ce1382d9-1e1f-4697-8fe4-6a1a347d91eb",title:"ZEER GO KYU WAR 2026",event_date:"2026-12-05",start_at:null,status:"draft",poster_url:"/posters/zeer-go-kyu-war-2026.jpg",registration_open_date:"2026-11-01",registration_close_date:"2026-11-30",refund_policy_text:"ตัวอย่างพื้นที่กติกาการแข่งขัน รายละเอียดจริงต้องประกาศโดยผู้จัด",full_refund_through_date:null};
const names=["ONE DAN","1–2 คิว","3–4 คิว","5–6 คิว","7–8 คิว","9–12 คิว","เฟรนชิพ 9×9","เฟรนชิพ 13×13"];
const divisions:Division[]=names.map((name,i)=>({id:"demo-"+i,name:"รุ่น "+name,entry_fee_thb:i===0?600:500,pairing_enabled:false,seats_limit:null}));
const eventPreview={tournament,divisions};
const divisionPreview:DivisionData={tournament,division:divisions[1],roster_available:true,athletes:["นที ใจดี","ธารา รุ่งเรือง","ภูผา แสงทอง","พิมพ์ดาว สุขใจ","ต้นกล้า วัฒนา","ปันปัน มีสุข","อิงฟ้า พูนทรัพย์","ภาคิน ตั้งใจ"].map((full_name,i)=>({id:"sample-"+i,go_id:"GO000"+(i+1),full_name,current_rank:"2 คิว"}))};
export default function DesignReview(){const [screen,setScreen]=useState("division");useEffect(()=>{setScreen(new URLSearchParams(location.search).get("screen")||"division")},[]);return screen==="event"?<EventDetails preview={eventPreview}/>:<DivisionDetails preview={divisionPreview}/>}
