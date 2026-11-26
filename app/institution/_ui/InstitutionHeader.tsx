import type { ReactNode } from "react";
import MenuIcon from "@/components/MenuIcon";
import styles from "./InstitutionHeader.module.css";

type Action = { label: string; icon: ReactNode; onClick: () => void };
export default function InstitutionHeader({name,logo,status,description,actions,bannerImage,coverImage}:{name:string;logo:ReactNode;status:string;description:string;actions:Action[];bannerImage?:string|null;coverImage?:string|null}) {
 return <div className={styles.header}>
  <section className={styles.banner} style={bannerImage?{backgroundImage:`linear-gradient(90deg,#0752b5,transparent),url("${bannerImage}")`}:undefined}>
   <span className={styles.emblem}><MenuIcon name="school"/></span>
   <div><h2>สถาบันของฉัน</h2><p>จัดการข้อมูลสถาบัน นักกีฬา และการแข่งขัน</p></div>
  </section>
  <section className={styles.identity} style={coverImage?{backgroundImage:`linear-gradient(90deg,rgba(255,255,255,.97),rgba(255,255,255,.86)),url("${coverImage}")`}:undefined}>
   <div className={styles.profile}>
    <div className={styles.logo}>{logo}</div>
    <div className={styles.details}><h1>{name}</h1><span className={styles.status}>{status}</span><p>{description}</p></div>
   </div>
   <div className={styles.actions}>{actions.map((a,i)=><button key={a.label} type="button" onClick={a.onClick} className={i===0?styles.primary:undefined}>{a.icon}<span>{a.label}</span></button>)}</div>
  </section>
 </div>;
}
