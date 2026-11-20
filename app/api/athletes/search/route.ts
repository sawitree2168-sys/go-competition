import {NextResponse} from 'next/server';
import {publicDb} from '@/app/tournaments/[id]/_ui/data';
import {isMeetingLevel} from '@/lib/head-to-head';

export async function GET(request:Request) {
 const params = new URL(request.url).searchParams;
 const query = (params.get('q') ?? '').trim().slice(0,80);
 const level = params.get('level') ?? 'all';
 const requestedPage = Number(params.get('page') ?? '1');
 const page = Number.isInteger(requestedPage) ? Math.min(2_147_483_647, Math.max(1,requestedPage)) : 1;
 if (!isMeetingLevel(level)) return NextResponse.json({error:'ระดับฝีมือไม่ถูกต้อง'},{status:400});
 if ((query && query.length < 2) || (!query && level === 'all')) return NextResponse.json({rows:[],total:0,page:1,page_size:30});
 const db = publicDb();
 if (!db) return NextResponse.json({error:'ยังเชื่อมต่อข้อมูลไม่ได้'},{status:503});
 const result = await db.rpc('gt_head_to_head_athletes_v2',{p_query:query,p_level:level,p_page:page});
 if (result.error) return NextResponse.json({error:'ค้นหาไม่สำเร็จ กรุณาลองใหม่'},{status:503});
 return NextResponse.json(result.data ?? {rows:[],total:0,page:1,page_size:30},{headers:{'Cache-Control':'no-store'}});
}
