import test from "node:test";
import assert from "node:assert/strict";
import { proposeSwissRound, parseRankStrength } from "./swiss-round.mjs";

const p = (id, score, strength) => ({ id, score, strength });
const m = (b, w, state = "verified") => ({ black_athlete_id: b, white_athlete_id: w, state });
const key = (t) => [t.blackAthleteId, t.whiteAthleteId].sort().join("|");

test("finds a pairing where a greedy pass would give up", () => {
  // Greedy pairs a-c, then b-d have met already. Backtracking finds a-d, b-c.
  const r = proposeSwissRound({ players: [p("a", 2), p("b", 2), p("c", 1), p("d", 1)], previousMatches: [m("a", "b"), m("b", "d")] });
  assert.equal(r.requiresManualReview, false);
  assert.deepEqual(r.tables.map(key).sort(), ["a|d", "b|c"]);
});

test("never repeats a pairing, ignoring void games", () => {
  const prev = [m("a", "b"), m("c", "d"), m("a", "c", "void")];
  const r = proposeSwissRound({ players: [p("a", 1), p("b", 0), p("c", 1), p("d", 0)], previousMatches: prev });
  for (const t of r.tables) assert.ok(!["a|b", "c|d"].includes(key(t)));
});

test("table 1 holds the highest scores and tables descend", () => {
  const r = proposeSwissRound({ players: [p("a", 0), p("b", 3), p("c", 1), p("d", 3), p("e", 1), p("f", 0)] });
  assert.deepEqual(r.tables.map((t) => t.board), [1, 2, 3]);
  assert.equal(key(r.tables[0]), "b|d");
  assert.equal(key(r.tables[2]), "a|f");
});

test("bye goes to the lowest-placed athlete without a previous bye", () => {
  const players = [p("a", 2), p("b", 1), p("c", 1), p("d", 0), p("e", 0)];
  const r = proposeSwissRound({ players, previousByes: ["e"] });
  assert.equal(r.byeAthleteId, "d");
  assert.equal(r.tables.length, 2);
  assert.ok(r.tables.every((t) => t.blackAthleteId !== "d" && t.whiteAthleteId !== "d"));
});

test("bye skips a candidate whose removal leaves no valid pairing", () => {
  // If e takes the bye, a-b-c-d cannot be paired (a-b and c-d played, a-c, b-d played... only a-d, b-c left but a-d played).
  const prev = [m("a", "b"), m("c", "d"), m("a", "c"), m("b", "d"), m("a", "d")];
  const r = proposeSwissRound({ players: [p("a", 1), p("b", 1), p("c", 1), p("d", 1), p("e", 0)], previousMatches: prev });
  assert.equal(r.requiresManualReview, false);
  assert.notEqual(r.byeAthleteId, "e");
});

test("colour: whoever played black more often gets white; else the stronger player takes white", () => {
  const r1 = proposeSwissRound({ players: [p("a", 1), p("b", 1)], previousMatches: [m("a", "x"), m("y", "b")] });
  assert.equal(r1.tables[0].whiteAthleteId, "a");
  const r2 = proposeSwissRound({ players: [p("a", 0, -5), p("b", 0, 2)] });
  assert.equal(r2.tables[0].whiteAthleteId, "b");
});

test("returns manual review instead of forcing a rematch", () => {
  const r = proposeSwissRound({ players: [p("a", 1), p("b", 1)], previousMatches: [m("a", "b")] });
  assert.equal(r.requiresManualReview, true);
  assert.equal(r.tables.length, 0);
});

test("is deterministic and does not mutate input", () => {
  const players = [p("b", 0), p("a", 0), p("d", 1), p("c", 1)];
  const r1 = proposeSwissRound({ players }), r2 = proposeSwissRound({ players });
  assert.deepEqual(r1, r2);
  assert.equal(players[0].id, "b");
});

test("handles a 40-player late round without rematches", () => {
  const players = Array.from({ length: 40 }, (_, i) => p("p" + String(i).padStart(2, "0"), 0));
  const prev = [];
  for (let round = 0; round < 5; round++) {
    const r = proposeSwissRound({ players, previousMatches: prev });
    assert.equal(r.requiresManualReview, false, "round " + (round + 1));
    for (const t of r.tables) {
      prev.push(m(t.blackAthleteId, t.whiteAthleteId));
      players.find((x) => x.id === t.blackAthleteId).score += 1; // black wins, keeps scores spread
    }
  }
  assert.equal(new Set(prev.map((x) => [x.black_athlete_id, x.white_athlete_id].sort().join("|"))).size, prev.length);
});

test("rejects duplicate identity", () => assert.throws(() => proposeSwissRound({ players: [p("a", 1), p("a", 2)] })));

test("parses Thai and English rank labels", () => {
  assert.equal(parseRankStrength("1d"), 0);
  assert.equal(parseRankStrength("3 ดั้ง"), 2);
  assert.equal(parseRankStrength("5k"), -5);
  assert.equal(parseRankStrength("15 คิว"), -15);
  assert.equal(parseRankStrength("13–14 คิว"), -13);
  assert.equal(parseRankStrength("ไม่ทราบ"), null);
});

test("keeps everyone inside their score group when the history allows it", () => {
  // 2,2,1,1,1,1,0,0 with c-d and d-f already played. The first valid pairing (a-b, c-e, d-g, f-h)
  // floats two players; the best one is a-b, c-f, d-e, g-h.
  const players = [p("a", 2), p("b", 2), p("c", 1), p("d", 1), p("e", 1), p("f", 1), p("g", 0), p("h", 0)];
  const r = proposeSwissRound({ players, previousMatches: [m("c", "d"), m("d", "f")] });
  assert.deepEqual(r.tables.map(key).sort(), ["a|b", "c|f", "d|e", "g|h"]);
  assert.ok(r.tables.every((t) => t.scoreDifference === 0));
});

test("prefers two 1-point gaps over one 2-point gap", () => {
  // a(2) has played b(2) and c(1): a must float. a-d (gap 1) + b-c ... is better than a-e (gap 2).
  const players = [p("a", 2), p("b", 2), p("c", 1), p("d", 1), p("e", 0), p("f", 0)];
  const r = proposeSwissRound({ players, previousMatches: [m("a", "b"), m("a", "c")] });
  assert.ok(r.tables.every((t) => t.scoreDifference <= 1));
});

test("half points from draws are handled", () => {
  const players = [p("a", 1.5), p("b", 1.5), p("c", 1), p("d", 1)];
  const r = proposeSwissRound({ players, previousMatches: [m("a", "b")] });
  assert.equal(r.requiresManualReview, false);
  assert.ok(r.tables.every((t) => t.scoreDifference === 0.5));
});

test("round 1: top half v bottom half (1 v 5, 2 v 6, 3 v 7, 4 v 8)", () => {
  const players = Array.from({ length: 8 }, (_, i) => p("s" + (i + 1), 0, 10 - i)); // s1 strongest … s8
  const r = proposeSwissRound({ players });
  assert.deepEqual(r.tables.map(key).sort(), ["s1|s5", "s2|s6", "s3|s7", "s4|s8"]);
});

test("odd score group: fold the top four, the lowest floats down", () => {
  const players = [p("a", 1, 5), p("b", 1, 4), p("c", 1, 3), p("d", 1, 2), p("e", 1, 1), p("f", 0, 9), p("g", 0, 8), p("h", 0, 7)];
  const r = proposeSwissRound({ players });
  const pairs = r.tables.map(key).sort();
  assert.ok(pairs.includes("a|c") && pairs.includes("b|d"), pairs.join(" "));
  assert.ok(pairs.some((x) => x.includes("e") && /[fgh]/.test(x)), "e floats down");
});
