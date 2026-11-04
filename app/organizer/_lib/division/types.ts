export const TOTAL_ROUNDS = 5;

export type Athlete = { full_name: string; school_name: string | null; current_rank: string | null; go_id: string | null };
export type Reg = {
  athlete_id: string; pool_label: string | null; payment_status: string; competition_rank_reference: string | null;
  registration_status: string; display_institution: string | null; gt_athletes: Athlete | null;
};
export type Match = {
  id: string; round_number: number; board_number: number | null; black_athlete_id: string; white_athlete_id: string;
  winner_athlete_id: string | null; result_code: string | null; result_margin: string | null; state: string; pool_label: string | null;
  black_checkin_at: string | null; white_checkin_at: string | null;
};
export type Bye = { round_number: number; athlete_id: string; pool_label: string | null };
export type Standing = {
  pool_label: string | null; pos: number; athlete_id: string | null; display_name: string | null; institution: string | null;
  current_rank: string | null; wins: number; losses: number; draws: number; byes: number; forfeit_wins: number;
  score: number; sos: number; sosos: number; withdrawn: boolean;
};
export type DivisionRow = {
  id: string; name: string; tournament_id: string; award_scheme: string | null;
  friendship_gold_min_wins: number | null; friendship_silver_min_wins: number | null; friendship_bronze_min_wins: number | null;
};

export type DivisionData = { division: DivisionRow; regs: Reg[]; matches: Match[]; byes: Bye[]; standings: Standing[] };

/** "" stands for "no pool" (whole division plays as one group). */
export const poolKey = (p: string | null | undefined) => p ?? "";
export const poolName = (p: string) => (p ? `สาย ${p}` : "ทั้งรุ่น");
export const poolArg = (p: string) => (p ? p : null);

export const nameOf = (r: Reg | undefined) => r?.gt_athletes?.full_name ?? "ไม่ทราบชื่อ";
export const schoolOf = (r: Reg | undefined) => r?.display_institution || r?.gt_athletes?.school_name || "";
export const isWithdrawn = (r: Reg | undefined) => r?.registration_status === "withdrawn";
/** 2.5 -> "2.5", 3 -> "3" */
export const pts = (n: number | string | null | undefined) => { const v = Number(n ?? 0); return Number.isInteger(v) ? String(v) : v.toFixed(1); };
