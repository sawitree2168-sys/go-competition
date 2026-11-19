import {NextResponse} from 'next/server';
import {publicDb} from '@/app/tournaments/[id]/_ui/data';
export async function GET(request:Request){
 const q=(new URL(request.url).searchParams.get('q')??'').trim().slice(0,80);
 if(q.length<2)return NextResponse.json({rows:[]});
 const db=publicDb();if(!db)return NextResponse.json({error:'ยังเชื่อมต่อข้อมูลไม่ได้'},{status:503});
 const r=await db.rpc('gt_public_athlete_directory_v1',{p_query:q,p_page:1,p_size:30});
 if(r.error)return NextResponse.json({error:'ค้นหาไม่สำเร็จ กรุณาลองใหม่'},{status:503});
 return NextResponse.json({rows:r.data?.rows??[],total:r.data?.total??0},{headers:{'Cache-Control':'no-store'}});
}
