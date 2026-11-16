import test from "node:test";
import assert from "node:assert/strict";
import { outcome, summary, opponents, headToHead, percent } from "./athlete-profile.mjs";

const me = "me";
const row = (t, round, colour, opp, winner, code = null, state = "verified") => ({
  kind: "match", tournament_id: t, title: t === "t1" ? "หมากล้อมโอเพ่น 2026" : "GO Friendship Cup", event_date: t === "t1" ? "2026-11-16" : "2026-10-25",
  round_number: round, colour, opponent_id: opp, opponent_name: { a: "กิตติพงษ์", b: "ปิยะนุช", c: "ณัฐธิดา" }[opp], winner_id: winner, result_code: code, state,
});
const rows = [
  row("t1", 1, "black", "a", me, "black_win"), row("t1", 2, "black", "b", me, "black_win"), row("t1", 3, "white", "c", me, "white_win"),
  row("t1", 4, "white", "a", "a", "black_win"), row("t1", 5, "black", "c", null, null, "pending"),
  row("t2", 1, "white", "b", "b", "black_win"), row("t2", 2, "black", "c", null, "draw"), row("t2", 3, "white", "a", me, "white_win_forfeit"),
  { kind: "bye", tournament_id: "t2", title: "GO Friendship Cup", event_date: "2026-10-25", round_number: 4, state: "verified" },
];

test("outcome", () => {
  assert.equal(outcome(rows[0], me), "win");
  assert.equal(outcome(rows[3], me), "loss");
  assert.equal(outcome(rows[4], me), "pending");
  assert.equal(outcome(rows[6], me), "draw");
  assert.equal(outcome(rows[8], me), "bye");
  assert.equal(outcome({ kind: "match", state: "verified", result_code: "double_loss", winner_id: null }, me), "loss");
});

test("summary excludes byes and pending games", () => {
  const s = summary(rows, me);
  assert.equal(s.events, 2);
  assert.equal(s.played, 7);
  assert.deepEqual([s.wins, s.losses, s.draws], [4, 2, 1]);
  assert.equal(percent(s.winRate), "57.1%");
  assert.deepEqual(s.black, { played: 3, wins: 2, losses: 0, draws: 1 });
  assert.deepEqual(s.white, { played: 4, wins: 2, losses: 2, draws: 0 });
  assert.deepEqual(s.perEvent.find((e) => e.tournament_id === "t1"), { tournament_id: "t1", title: "หมากล้อมโอเพ่น 2026", event_date: "2026-11-16", played: 4, wins: 3, losses: 1, draws: 0 });
});

test("opponents and head-to-head", () => {
  assert.deepEqual(opponents(rows).map((o) => [o.id, o.games]), [["a", 3], ["c", 3], ["b", 2]]);
  const h = headToHead(rows, me, "b");
  assert.deepEqual([h.played, h.wins, h.losses], [2, 1, 1]);
  assert.equal(headToHead(rows, me, "c").played, 2, "pending game not counted");
});
