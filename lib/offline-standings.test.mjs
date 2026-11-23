import test from "node:test";
import assert from "node:assert/strict";
import { poolStandings } from "./offline-standings.mjs";

const v = (b, w, win, rc) => ({ black_athlete_id: b, white_athlete_id: w, winner_athlete_id: win, result_code: rc, state: "verified" });
const regs = ["a", "b", "c", "d"].map((id) => ({ athlete_id: id, status: "confirmed" }));

test("score, SOS and SOSOS like gt_division_standings_v3 (bye rule none)", () => {
  const rows = poolStandings(regs, [v("a", "b", "a", "black_win"), v("c", "d", "c", "black_win"), v("a", "c", "a", "black_win"), v("b", "d", null, "draw")], [], "none");
  const by = Object.fromEntries(rows.map((x) => [x.athlete_id, x]));
  assert.deepEqual([by.a.pos, by.a.score, by.a.sos], [1, 2, 1.5]);
  assert.deepEqual([by.c.score, by.c.sos], [1, 2.5]);
  assert.equal(by.b.score, 0.5);
  assert.equal(by.a.sosos, by.b.sos + by.c.sos);
});

test("forfeit wins and byes do not count in SOS unless own_score", () => {
  const m = [v("a", "b", "a", "black_win_forfeit")];
  const none = poolStandings(regs.slice(0, 3), m, [{ athlete_id: "c" }], "none");
  const own = poolStandings(regs.slice(0, 3), m, [{ athlete_id: "c" }], "own_score");
  assert.equal(none.find((x) => x.athlete_id === "a").sos, 0);
  assert.equal(own.find((x) => x.athlete_id === "a").sos, 1);
  assert.equal(own.find((x) => x.athlete_id === "c").sos, 1);
});

test("withdrawn players have no position and come last; ties share a position", () => {
  const rows = poolStandings([...regs.slice(0, 2), { athlete_id: "x", status: "withdrawn" }], [], [], "none");
  assert.deepEqual(rows.map((x) => x.pos), [1, 1, null]);
  assert.equal(rows[2].athlete_id, "x");
});
