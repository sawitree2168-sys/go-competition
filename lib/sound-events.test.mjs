import test from "node:test";
import assert from "node:assert/strict";
import { divisionSound, startedRounds } from "./sound-events.mjs";

const m = (id, extra = {}) => ({ id, state: "published", winner_athlete_id: null, black_checkin_at: null, white_checkin_at: null, ...extra });

test("first load is silent", () => {
  assert.equal(divisionSound(null, [m("a")]), null);
  assert.deepEqual(startedRounds(null, new Map([["d", 1]])), []);
});

test("check-in and result", () => {
  assert.equal(divisionSound([m("a")], [m("a", { black_checkin_at: "x" })]), "checkin");
  assert.equal(divisionSound([m("a")], [m("a", { state: "verified", winner_athlete_id: "p" })]), "result");
  // result wins over check-in in the same refresh
  assert.equal(divisionSound([m("a"), m("b")], [m("a", { white_checkin_at: "x" }), m("b", { state: "verified", winner_athlete_id: "q" })]), "result");
  // corrected winner also sounds; double loss (no winner) does not
  assert.equal(divisionSound([m("a", { state: "verified", winner_athlete_id: "p" })], [m("a", { state: "verified", winner_athlete_id: "q" })]), "result");
  assert.equal(divisionSound([m("a")], [m("a", { state: "verified" })]), null);
  // nothing changed / new tables of a new round
  assert.equal(divisionSound([m("a")], [m("a"), m("b", { black_checkin_at: "x" })]), null);
});

test("new round started", () => {
  assert.deepEqual(startedRounds(new Map([["k1", 2], ["f", 1]]), new Map([["k1", 3], ["f", 1], ["new", 1]])), ["k1"]);
});
