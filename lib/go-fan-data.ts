import type { SupabaseClient } from "@supabase/supabase-js";
import { publicDb, loadEventPage, type EventInfo, type Division, type Match, type Bye, type Standing, type Person, type BoardRow } from "@/app/tournaments/[id]/_ui/data";
import { divisionKey } from "@/lib/division-display";
import { fanKey } from "@/lib/go-fan.mjs";
export type FanPerson = Person & { key: string; athleteId: string | null; divisionId: string; divisionName: string };
export type FanDivision = { division: Division; matches: Match[]; byes: Bye[]; standings: Standing[]; people: [string, Person][]; available: boolean; standingsAvailable: boolean };
export type FanData = { events: EventInfo[]; event: EventInfo | null; participants: FanPerson[]; divisions: FanDivision[]; checkedAt: string; error?: string };
export async function loadFanData(eventId?: string, client?: SupabaseClient | null): Promise<FanData> {
  const db = client === undefined ? publicDb() : client;
  const empty: FanData = { events: [], event: null, participants: [], divisions: [], checkedAt: new Date().toISOString() };
  if (!db) return { ...empty, error: "ยังเชื่อมต่อข้อมูลการแข่งขันไม่ได้" };
  const ev = await db.from("gt_tournaments").select("id,title,event_date,venue,poster_url,registration_open_date,registration_close_date").eq("published", true).order("event_date", { ascending: false }).limit(100);
  if (ev.error) return { ...empty, error: "โหลดรายการแข่งขันไม่สำเร็จ กรุณาลองใหม่" };
  const events = (ev.data ?? []) as EventInfo[];
  const today = new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Bangkok"}).format(new Date());
  const event = eventId ? events.find(e => e.id === eventId) : [...events].reverse().find(e => (e.event_date ?? "") >= today) ?? events[0];
  if (!event) return { ...empty, events, error: eventId ? "ไม่พบรายการแข่งขันที่เผยแพร่" : undefined };
  const page = await loadEventPage(db, event.id);
  const participants = new Map<string, FanPerson>();
  const divisions: FanDivision[] = await Promise.all(page.divisions.map(async division => {
    const [board, standings, photos] = await Promise.all([
      db.rpc("gt_division_board_v2", { p_division: division.id }),
      db.rpc("gt_division_standings_v3", { p_division: division.id, p_pool: null }),
      db.rpc("gt_division_photos_v1", { p_division: division.id }),
    ]);
    const photoMap = new Map<string, string | null>((photos.error ? [] : photos.data ?? []).map((p: {athlete_id:string;photo:string|null}) => [p.athlete_id,p.photo]));
    const people = new Map<string, Person>();
    const add = (id: string | null, name: string | null, institution: string | null, rank?: string | null, photo?: string | null) => {
      if (!id || !name) return;
      const p = { name, institution: institution ?? "", rank, photo: photo ?? photoMap.get(id) ?? null };
      people.set(id,p);
      const key=fanKey(event.id,division.id,name);
      participants.set(key,{...p,key,athleteId:id,divisionId:division.id,divisionName:division.name});
    };
    const rows: BoardRow[] = board.error ? [] : board.data ?? [];
    for (const r of rows) { add(r.black_id,r.black_name,r.black_institution,r.black_rank,r.black_photo); add(r.white_id,r.white_name,r.white_institution,r.white_rank,r.white_photo); }
    const ranks: Standing[] = standings.error ? [] : standings.data ?? [];
    for (const s of ranks) if (!people.has(s.athlete_id ?? "")) add(s.athlete_id,s.display_name,s.institution ?? "",s.current_rank);
    for (const e of page.entrants.filter(e=>divisionKey(e.division_name) === divisionKey(division.name))) {
      const key=fanKey(event.id,division.id,e.full_name);
      if (!participants.has(key)) participants.set(key,{key,athleteId:null,name:`${e.title ?? ""}${e.full_name}`,institution:e.institution,photo:null,divisionId:division.id,divisionName:division.name});
    }
    return { division, people: Array.from(people), available: !board.error, standingsAvailable: !standings.error, standings: ranks,
      matches: rows.filter(r=>r.kind === "match" && r.match_id && r.white_id).map(r=>({id:r.match_id!,round_number:r.round_number,board_number:r.board_number,black_athlete_id:r.black_id,white_athlete_id:r.white_id!,winner_athlete_id:r.winner_id,result_code:r.result_code,result_margin:r.result_margin,state:r.state ?? "pending",pool_label:r.pool_label})),
      byes: rows.filter(r=>r.kind === "bye").map(r=>({round_number:r.round_number,athlete_id:r.black_id,pool_label:r.pool_label})) };
  }));
  return { events, event, divisions, participants: Array.from(participants.values()).sort((a,b)=>a.name.localeCompare(b.name,"th")), checkedAt:new Date().toISOString() };
}
