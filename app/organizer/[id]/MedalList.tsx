"use client";

import { useEffect, useState } from "react";
import CompetitionPanel from "@/components/CompetitionPanel";
import { divisionLabel } from "@/lib/division-display";
import { friendshipAward } from "@/lib/competition-day.mjs";
import { staffDb } from "../_lib/staff";
import type { DivisionStatus } from "../_lib/EventDay";
import type { Standing } from "../_lib/division/types";

/**
 * รายชื่อรับเหรียญ for the ceremony / photo: Friendship = gold / silver / bronze by number of wins
 * (the division's own thresholds); other divisions = places 1–3 of each สาย. Full screen, PNG / PDF to print.
 */
type Award = { key: string; title: string; tone: string; people: Standing[] };

export default function MedalList({ division, onClose }: { division: DivisionStatus; onClose: () => void }) {
  const [awards, setAwards] = useState<Award[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stop = false;
    (async () => {
      const db = staffDb()!;
      const [dv, st] = await Promise.all([
        db.from("gt_divisions").select("award_scheme,friendship_gold_min_wins,friendship_silver_min_wins,friendship_bronze_min_wins").eq("id", division.id).maybeSingle(),
        db.rpc("gt_division_standings_v3", { p_division: division.id, p_pool: null }),
      ]);
      if (stop) return;
      if (st.error) { setError("โหลดรายชื่อไม่สำเร็จ"); return; }
      const rows = ((st.data ?? []) as Standing[]).filter((s) => s.athlete_id && !s.withdrawn);
      const byName = (a: Standing, b: Standing) => (a.display_name ?? "").localeCompare(b.display_name ?? "", "th");
      if (division.friendship) {
        const tier = (s: Standing) => friendshipAward(s.wins + s.byes, dv.data);
        setAwards([
          { key: "gold", title: "🥇 เหรียญทอง", tone: "gold", people: rows.filter((s) => tier(s) === "gold").sort(byName) },
          { key: "silver", title: "🥈 เหรียญเงิน", tone: "silver", people: rows.filter((s) => tier(s) === "silver").sort(byName) },
          { key: "bronze", title: "🥉 เหรียญทองแดง", tone: "bronze", people: rows.filter((s) => tier(s) === "bronze").sort(byName) },
        ]);
      } else {
        const pools = [...new Set(rows.map((s) => s.pool_label ?? ""))].sort();
        setAwards(pools.flatMap((p) => [1, 2, 3].map((place) => ({
          key: `${p}-${place}`, title: `${["🥇", "🥈", "🥉"][place - 1]} อันดับ ${place}${pools.length > 1 ? ` · สาย ${p || "—"}` : ""}`,
          tone: ["gold", "silver", "bronze"][place - 1], people: rows.filter((s) => (s.pool_label ?? "") === p && s.pos === place),
        }))));
      }
    })();
    return () => { stop = true; };
  }, [division.id, division.friendship]);

  const title = `รายชื่อรับเหรียญ ${divisionLabel(division.name)}`;
  const total = awards?.reduce((n, a) => n + a.people.length, 0) ?? 0;
  return (
    <CompetitionPanel title={title} context={`GO TOURNAMENT · ${title}`} onClose={onClose}>
      <div className="gt-medals">
        <h2>{title}</h2>
        {error && <p role="alert">{error}</p>}
        {!awards && !error && <p>กำลังโหลด…</p>}
        {awards && <p className="gt-medals-sum">รวม {total} คน{division.kind !== "done" && " · ⚠ ยังแข่งไม่ครบทุกรอบ รายชื่ออาจเปลี่ยน"}</p>}
        {awards?.map((a) => (
          <section key={a.key} className={`gt-medal-group tone-${a.tone}`}>
            <h3>{a.title} <span>{a.people.length} คน</span></h3>
            {a.people.length ? (
              <ol>{a.people.map((s) => <li key={s.athlete_id}><b>{s.display_name}</b><small>{[s.institution, `${s.wins + s.byes} ชนะ`].filter(Boolean).join(" · ")}</small></li>)}</ol>
            ) : <p className="gt-medal-none">— ไม่มี —</p>}
          </section>
        ))}
      </div>
    </CompetitionPanel>
  );
}
