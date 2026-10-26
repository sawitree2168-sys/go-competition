export function reply(body:unknown,status=200){return Response.json(body,{status,headers:{"Cache-Control":"no-store"}})}
export async function staffAuth(request:Request){
 const base=process.env.GO_TOURNAMENT_SUPABASE_URL;
 const key=process.env.GO_TOURNAMENT_SUPABASE_PUBLISHABLE_KEY;
 if(!base||!key)return {error:reply({status:"error",message:"ระบบฐานข้อมูลยังไม่พร้อม"},503)} as const;
 const token=/^Bearer ([A-Za-z0-9._~-]+)$/.exec(request.headers.get("authorization")||"")?.[1];
 if(!token)return {error:reply({status:"unauthorized",message:"กรุณาเข้าสู่ระบบ"},401)} as const;
 const headers={apikey:key,Authorization:`Bearer ${token}`,Accept:"application/json","Content-Type":"application/json"};
 try {
  const u=await fetch(new URL("/auth/v1/user",base),{headers,cache:"no-store",signal:AbortSignal.timeout(8000)});
  if(!u.ok)return {error:reply({status:"unauthorized",message:"เซสชันหมดอายุ"},401)} as const;
  const user=await u.json();if(typeof user.id!=="string")return {error:reply({status:"unauthorized"},401)} as const;
  const endpoint=new URL("/rest/v1/gt_staff_members",base);
  endpoint.searchParams.set("select","role,active");endpoint.searchParams.set("user_id",`eq.${user.id}`);
  const s=await fetch(endpoint,{headers,cache:"no-store",signal:AbortSignal.timeout(8000)});
  const rows=await s.json();if(!s.ok||!Array.isArray(rows)||rows.length!==1||rows[0].active!==true||!["owner","admin","reviewer"].includes(rows[0].role))
   return {error:reply({status:"forbidden",message:"บัญชีนี้ไม่ได้รับสิทธิ์เจ้าหน้าที่"},403)} as const;
  return {base,headers,role:rows[0].role as "owner"|"admin"|"reviewer",userId:user.id} as const;
 }catch{return {error:reply({status:"error",message:"เชื่อมระบบยืนยันตัวตนไม่สำเร็จ"},503)} as const}
}
