import test from "node:test";
import assert from "node:assert/strict";
import { scoresFrom, roundState, pairingPlayers, friendshipAward, mapEntrantsToDivisions, staffErrorMessage } from "./competition-day.mjs";
import { proposeSwissRound } from "./swiss-round.mjs";

const m = (r, b, w, winner, state = "verified") => ({ round_number: r, black_athlete_id: b, white_athlete_id: w, winner_athlete_id: winner, state });

test("score counts verified wins and byes only", () => {
  const { score } = scoresFrom(["a", "b", "c"], [m(1, "a", "b", "a"), m(2, "a", "c", "c", "pending")], [{ athlete_id: "c", round_number: 1 }]);
  assert.deepEqual([...score], [["a", 1], ["b", 0], ["c", 1]]);
});

test("round state tells when the next round can be paired", () => {
  assert.deepEqual(roundState([], []), { lastRound: 0, pending: 0, finished: true, nextRound: 1, complete: false });
  const r1 = [m(1, "a", "b", null, "pending")];
  assert.equal(roundState(r1, []).nextRound, null);
  assert.equal(roundState([m(1, "a", "b", "a")], [{ round_number: 1 }]).nextRound, 2);
  const five = [1, 2, 3, 4, 5].map((r) => m(r, "a", "b" + r, "a"));
  assert.equal(roundState(five, [], 5).complete, true);
  assert.equal(roundState(five, [], 5).nextRound, null);
});

test("jitter only breaks ties: a higher score always stays on top", () => {
  const regs = ["a", "b", "c", "d"].map((id) => ({ athlete_id: id, rank: "5 kyu" }));
  for (let seed = 1; seed < 30; seed++) {
    const players = pairingPlayers(regs, [m(1, "a", "b", "a"), m(1, "c", "d", "c")], [], seed);
    const p = proposeSwissRound({ players, previousMatches: [m(1, "a", "b", "a"), m(1, "c", "d", "c")] });
    const t1 = [p.tables[0].blackAthleteId, p.tables[0].whiteAthleteId].sort();
    assert.deepEqual(t1, ["a", "c"]);
  }
});

test("different seeds give different round-1 draws", () => {
  const regs = Array.from({ length: 16 }, (_, i) => ({ athlete_id: "p" + i }));
  const draw = (seed) => proposeSwissRound({ players: pairingPlayers(regs, [], [], seed) }).tables.map((t) => [t.blackAthleteId, t.whiteAthleteId].sort().join()).join("|");
  assert.notEqual(draw(1), draw(2));
  assert.equal(draw(3), draw(3));
});

test("friendship medals follow the division thresholds", () => {
  const d = { award_scheme: "friendship_wins", friendship_gold_min_wins: 4, friendship_silver_min_wins: 3, friendship_bronze_min_wins: 2 };
  assert.deepEqual([5, 4, 3, 2, 1, 0].map((w) => friendshipAward(w, d)), ["gold", "gold", "silver", "bronze", null, null]);
  assert.equal(friendshipAward(5, { award_scheme: "ranking" }), null);
});

test("sheet division names map to database divisions", () => {
  const key = (s) => s.toLowerCase().replace(/[–-]/g, "-").replace(/คิว/, "kyu").replace(/\s+/g, "");
  const { rows, unmatched } = mapEntrantsToDivisions(
    [{ source_row: 1, division_name: "1-2 Kyu" }, { source_row: 2, division_name: "Dan" }],
    [{ id: "d1", name: "1–2 คิว" }], key);
  assert.deepEqual(rows, [{ source_row: 1, division_id: "d1" }]);
  assert.equal(unmatched.length, 1);
});

test("database errors become Thai messages", () => {
  assert.match(staffErrorMessage("PREVIOUS_ROUND_NOT_FINISHED"), /ยังกรอกผล/);
  assert.match(staffErrorMessage("weird"), /ไม่สำเร็จ/);
});
