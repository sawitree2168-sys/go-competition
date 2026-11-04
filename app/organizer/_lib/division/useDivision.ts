"use client";

import { useCallback, useEffect, useState } from "react";
import { staffDb, useStaff } from "../staff";
import type { Bye, DivisionData, DivisionRow, Match, Reg, Standing } from "./types";

/** Loads everything for one division in parallel; `reload` refreshes after each organiser action. */
export function useDivision(divisionId: string) {
  const staff = useStaff();
  const [data, setData] = useState<DivisionData | null>(null);
  const [missing, setMissing] = useState(false);

  const reload = useCallback(async () => {
    const db = staffDb()!;
    const [dv, rg, mt, by, st] = await Promise.all([
      db.from("gt_divisions").select("id,name,tournament_id,award_scheme,friendship_gold_min_wins,friendship_silver_min_wins,friendship_bronze_min_wins").eq("id", divisionId).maybeSingle(),
      db.from("gt_registrations").select("athlete_id,pool_label,payment_status,competition_rank_reference,gt_athletes(full_name,school_name,current_rank,go_id)")
        .eq("division_id", divisionId).eq("registration_status", "confirmed").limit(2000),
      db.from("gt_matches").select("id,round_number,board_number,black_athlete_id,white_athlete_id,winner_athlete_id,result_code,result_margin,state,pool_label")
        .eq("division_id", divisionId).neq("state", "void").order("round_number").order("board_number").limit(5000),
      db.from("gt_byes").select("round_number,athlete_id,pool_label").eq("division_id", divisionId).limit(1000),
      db.rpc("gt_division_standings_v2", { p_division: divisionId, p_pool: null }),
    ]);
    if (!dv.data) { setMissing(true); return; }
    const regs = ((rg.data ?? []) as unknown as Reg[]).sort((a, b) => (a.gt_athletes?.full_name ?? "").localeCompare(b.gt_athletes?.full_name ?? "", "th"));
    setData({ division: dv.data as DivisionRow, regs, matches: (mt.data ?? []) as Match[], byes: (by.data ?? []) as Bye[], standings: (st.data ?? []) as Standing[] });
  }, [divisionId]);

  useEffect(() => { if (staff.status === "staff") queueMicrotask(reload); }, [staff.status, reload]);
  return { data, missing, reload };
}
