import {NextResponse} from 'next/server';
import {publicDb} from '@/app/tournaments/[id]/_ui/data';
import {isMeetingLevel} from '@/lib/head-to-head';

export async function GET(request:Request) {
 const params = new URL(request.url).searchParams;
 const query = (params.get('q') ?? '').trim().slice(0,80);
 const level = params.get('level') ?? 'all';
 if (!isMeetingLevel(level)) return NextResponse.json({error:'ระดับฝีมือไม่ถูกต้อง'},{status:400});
 if ((query && query.length < 2) || (!query && level === 'all')) return NextResponse.json({rows:[],total:0});
 const db = publicDb();
 if (!db) return NextResponse.json({error:'ยังเชื่อมต่อข้อมูลไม่ได้'},{status:503});
 const result = await db.rpc('gt_head_to_head_athletes_v1',{p_query:query,p_level:level});
 if (result.error) return NextResponse.json({error:'ค้นหาไม่สำเร็จ กรุณาลองใหม่'},{status:503});
 return NextResponse.json({rows:result.data?.rows ?? [],total:result.data?.total ?? 0},{headers:{'Cache-Control':'no-store'}});
}
