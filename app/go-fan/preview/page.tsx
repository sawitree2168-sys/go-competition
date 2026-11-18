import Link from "next/link";
/** A review surface with real nested viewports; the public GO FAN page stays unchanged. */
export default async function Preview({searchParams}:{searchParams:Promise<{screen?:string}>}) {
 const mobile=(await searchParams).screen==="mobile";
 return <main className="gf-review" style={{minHeight:"100vh",background:"#e6eff9",color:"#08295c",padding:"16px 0"}}>
  <style>{"body:has(.gf-review)>.gt-global-mobile-nav{display:none}"}</style>
  <div style={{display:"flex",justifyContent:"center",gap:12,flexWrap:"wrap",padding:"0 12px 16px",fontSize:14}}><strong>GO FAN — ตรวจรูปแบบหน้าเว็บ</strong><Link href="?screen=desktop" style={{textDecoration:"underline"}}>คอมพิวเตอร์</Link><Link href="?screen=mobile" style={{textDecoration:"underline"}}>มือถือ</Link><Link href="/go-fan" style={{textDecoration:"underline"}}>เปิดหน้าใช้งานจริง ↗</Link></div>
  <div style={{overflow:"auto",maxWidth:"100vw"}}><iframe title={mobile?"GO FAN มุมมองมือถือ":"GO FAN มุมมองคอมพิวเตอร์"} src="/go-fan" width={mobile?390:1440} height={mobile?844:1000} style={{display:"block",border:0,margin:"0 auto",background:"white",boxShadow:"0 3px 18px #193d6b33"}} /></div>
 </main>;
}
