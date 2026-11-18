"use client";

import { useCallback, useEffect, useState } from "react";
import { staffDb, useStaff } from "../staff";
import { pingLive, useLiveFingerprint } from "../../../tournaments/[id]/_ui/live";
import type { Bye, DivisionData, DivisionRow, Match, Reg, Standing } from "./types";

/**
 * Loads everything for one division in parallel; `reload` refreshes after each organiser action.
 * Live: checks every 8 s whether anything changed (referees, other staff) and reloads by itself.
 */
export function useDivision(divisionId: string) {
  const staff = useStaff();
  const [data, setData] = useState<DivisionData | null>(null);
  const [missing, setMissing] = useState(false);

  const fetchAll = useCallback(async () => {
    const db = staffDb()!;
    const accessDivision=await db.from("gt_divisions").select("tournament_id").eq("id",divisionId).maybeSingle();
    if(!accessDivision.data){setMissing(true);return;}
    const access=await db.rpc("gt_can_manage_tournament_v1",{p_tournament:accessDivision.data.tournament_id});
    if(access.error||access.data!==true){setMissing(true);setData(null);return;}
    const [dv, rg, mt, by, st] = await Promise.all([
      db.from("gt_divisions").select("id,name,tournament_id,award_scheme,friendship_gold_min_wins,friendship_silver_min_wins,friendship_bronze_min_wins,total_rounds,gt_tournaments(bye_sos_mode)").eq("id", divisionId).maybeSingle(),
      db.from("gt_registrations").select("athlete_id,pool_label,payment_status,competition_rank_reference,registration_status,display_institution,present_for_round,gt_athletes(full_name,school_name,current_rank,go_id,avatar_url)")
        .eq("division_id", divisionId).in("registration_status", ["confirmed", "withdrawn"]).limit(2000),
      db.from("gt_matches").select("id,round_number,board_number,black_athlete_id,white_athlete_id,winner_athlete_id,result_code,result_margin,state,pool_label,black_checkin_at,white_checkin_at")
        .eq("division_id", divisionId).neq("state", "void").order("round_number").order("board_number").limit(5000),
      db.from("gt_byes").select("round_number,athlete_id,pool_label").eq("division_id", divisionId).limit(1000),
      db.rpc("gt_division_standings_v3", { p_division: divisionId, p_pool: null }),
    ]);
    if (!dv.data) { setMissing(true); return; }
    const regs = ((rg.data ?? []) as unknown as Reg[]).sort((a, b) => (a.gt_athletes?.full_name ?? "").localeCompare(b.gt_athletes?.full_name ?? "", "th"));
    setData({ division: dv.data as unknown as DivisionRow, regs, matches: (mt.data ?? []) as Match[], byes: (by.data ?? []) as Bye[], standings: (st.data ?? []) as Standing[] });
  }, [divisionId]);

  // After an organiser action: reload, and tell the public pages to rebuild now.
  const reload = useCallback(async () => {
    await fetchAll();
    pingLive(divisionId);
  }, [fetchAll, divisionId]);

  useEffect(() => { if (staff.status === "staff") queueMicrotask(fetchAll); }, [staff.status, fetchAll]);

  const { status: live } = useLiveFingerprint(async () => {
    const { data: fp, error } = await staffDb()!.rpc("gt_division_live_v1", { p_division: divisionId });
    if (error) throw error;
    return fp as string | null;
  }, () => { void fetchAll(); }, { interval: 8000, enabled: staff.status === "staff" });

  return { data, missing, reload, live };
}
