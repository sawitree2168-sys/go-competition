import test from "node:test";
import assert from "node:assert/strict";
import { proposeSwissRound, parseRankStrength, surnameKey, institutionKeys, floatedAthletes } from "./swiss-round.mjs";

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

test("round 1: players from the same institution do not meet", () => {
  // 4 from club X, 4 from club Y: every table should be X v Y.
  const players = ["a", "b", "c", "d"].map((id) => ({ ...p(id, 0), institution: "Black Stone Go" }))
    .concat(["e", "f", "g", "h"].map((id) => ({ ...p(id, 0), institution: "IQ-UP" })));
  const r = proposeSwissRound({ players });
  assert.ok(r.tables.every((t) => !t.sameInstitution), JSON.stringify(r.tables.map(key)));
});

test("institution spellings match: 'Blackstone Go' = 'Black stone go'; shared part of 'A / B' counts", () => {
  assert.deepEqual(institutionKeys("Blackstone Go"), institutionKeys("Black stone go"));
  assert.deepEqual(institutionKeys("IQ-UP"), institutionKeys("IQ-Up"));
  assert.deepEqual(institutionKeys("รร สาธิตรามคำแหง"), institutionKeys("สาธิตรามคำแหง"));
  const players = [{ ...p("a", 0), institution: "Blackstone Go" }, { ...p("b", 0), institution: "Black stone go" },
    { ...p("c", 0), institution: "Trinity Go / สาธิตจุฬา" }, { ...p("d", 0), institution: "สาธิตจุฬา" }];
  const r = proposeSwissRound({ players });
  assert.ok(r.tables.every((t) => !t.sameInstitution), JSON.stringify(r.tables.map(key)));
});

test("round 1: brothers and sisters (same surname) do not meet", () => {
  const players = [{ ...p("a", 0), surname: surnameKey("ด.ช. ธราธรรม ทองตัน") }, { ...p("b", 0), surname: surnameKey("ด.ช.ธารธรรม ทองตัน") },
    { ...p("c", 0), surname: surnameKey("ด.ญ. ลิตา วิทยานนท์") }, { ...p("d", 0), surname: surnameKey("ด.ญ.อันยา วิทยานนท์") }];
  const r = proposeSwissRound({ players });
  assert.ok(r.tables.every((t) => !t.sameSurname), JSON.stringify(r.tables.map(key)));
});

test("later rounds: never a move to another score group just to avoid the same institution", () => {
  const players = [{ ...p("a", 1), institution: "Go Kids" }, { ...p("b", 1), institution: "Go Kids" }, { ...p("c", 0), institution: "IQ-UP" }, { ...p("d", 0), institution: "IQ-UP" }];
  const r = proposeSwissRound({ players, previousMatches: [m("a", "c"), m("b", "d")] });
  // a-b and c-d are same club but same score; a-d / b-c would move players. Same score wins.
  assert.deepEqual(r.tables.map(key).sort(), ["a|b", "c|d"]);
  assert.ok(r.tables[0].sameInstitution);
});

test("floatedAthletes: players paired across score groups in earlier rounds", () => {
  const prev = [
    { ...m("a", "b"), round_number: 1, winner_athlete_id: "a" }, { ...m("c", "d"), round_number: 1, winner_athlete_id: "c" },
    { ...m("a", "d"), round_number: 2, winner_athlete_id: "a" }, { ...m("b", "c"), round_number: 2, winner_athlete_id: "c" },
  ];
  assert.deepEqual([...floatedAthletes(prev)].sort(), ["a", "b", "c", "d"]); // round 2: 1 v 0 on both tables
  assert.equal(floatedAthletes(prev.slice(0, 2)).size, 0);
});

test("prefers moving someone who has not been moved before", () => {
  // Scores: a1 b1 c1 | d0 e0 f0 ... odd groups force one move between 1s and 0s.
  // b was moved before (round 1 pairing across groups is impossible, so craft round 2 history).
  const prev = [
    { ...m("a", "d"), round_number: 1, winner_athlete_id: "a" }, { ...m("b", "e"), round_number: 1, winner_athlete_id: "e" },
    { ...m("c", "f"), round_number: 1, winner_athlete_id: "f" }, { ...m("g", "h"), round_number: 1, winner_athlete_id: "g" },
    // round 2 (scores a1 e1 f1 g1 | b0 c0 d0 h0): g(1) v b(0) is a move for g and b
    { ...m("g", "b"), round_number: 2, winner_athlete_id: "b" }, { ...m("a", "e"), round_number: 2, winner_athlete_id: "a" },
    { ...m("f", "c"), round_number: 2, winner_athlete_id: "c" }, { ...m("d", "h"), round_number: 2, winner_athlete_id: "h" },
  ];
  // now: a2 | b1 c1 e0? recompute: a: r1 W r2 W =2; b: r1 L r2 W =1; c: L,W =1; d: L,L=0; e: W,L=1; f: W,L=1; g: W,L=1; h: L,W=1
  const players = [p("a", 2), p("b", 1), p("c", 1), p("e", 1), p("f", 1), p("g", 1), p("h", 1), p("d", 0)];
  const r = proposeSwissRound({ players, previousMatches: prev });
  // a (2) must meet a 1-pointer and d (0) a 1-pointer. b and g were moved in round 2: they should not be chosen.
  const moved = r.tables.filter((t) => t.scoreDifference).flatMap((t) => [t.blackAthleteId, t.whiteAthleteId]);
  assert.ok(!moved.includes("b") && !moved.includes("g"), moved.join(","));
  assert.ok(r.tables.every((t) => t.movedAgain.length === 0));
});

test("round 1 follows the random draw, not the rank order", () => {
  const players = Array.from({ length: 4 }, (_, i) => ({ ...p("s" + i, 0, 10 - i), draw: [0.9, 0.1, 0.5, 0.3][i] }));
  const r = proposeSwissRound({ players });
  // draw order: s1, s3, s2, s0 → s1 v s3, s2 v s0 (strongest s0 does not automatically meet s1)
  assert.deepEqual(r.tables.map(key).sort(), ["s0|s2", "s1|s3"]);
});
