export async function POST(request:Request){
 const base=process.env.GO_TOURNAMENT_SUPABASE_URL,key=process.env.GO_TOURNAMENT_SUPABASE_PUBLISHABLE_KEY;
 const headers={'Cache-Control':'no-store'};
 if(!base||!key)return Response.json({message:'ระบบล็อกอินยังไม่พร้อม'},{status:503,headers});
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return Response.json({message:'คำขอไม่ถูกต้อง'},{status:403,headers});
 try{const body=await request.text();if(body.length>4096)return Response.json({message:'ข้อมูลยาวเกินไป'},{status:413,headers});
 const res=await fetch(new URL('/functions/v1/athlete-login',base),{method:'POST',headers:{apikey:key,'Content-Type':'application/json',...(request.headers.get('authorization')?{Authorization:request.headers.get('authorization')!}:{})},body,cache:'no-store',signal:AbortSignal.timeout(20000)});
 return Response.json(await res.json(),{status:res.status,headers});
 }catch{return Response.json({message:'เชื่อมต่อระบบไม่สำเร็จ'},{status:503,headers});}
}
