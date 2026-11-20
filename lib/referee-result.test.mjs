import test from "node:test";
import assert from "node:assert/strict";
import { buildResult, summaryLine, formFromResult, validMargin, needsWinner } from "./referee-result.mjs";

test("build result codes", () => {
  assert.deepEqual(buildResult({ winner: "black", method: "R" }), { ok: true, code: "black_win", margin: "R" });
  assert.deepEqual(buildResult({ winner: "white", method: "T" }), { ok: true, code: "white_win", margin: "T" });
  assert.deepEqual(buildResult({ winner: "white", method: "count", margin: " 6.5 " }), { ok: true, code: "white_win", margin: "6.5" });
  assert.deepEqual(buildResult({ winner: "black", method: "forfeit" }), { ok: true, code: "black_win_forfeit", margin: null });
  assert.equal(buildResult({ winner: null, method: "draw" }).ok, false, "no new draws may be entered");
  assert.deepEqual(buildResult({ winner: "black", method: "double_forfeit" }), { ok: true, code: "double_forfeit", margin: null }, "winner ignored");
  assert.equal(buildResult({ winner: null, method: "R" }).ok, false);
  assert.equal(buildResult({ winner: "black", method: "count", margin: "6.3" }).ok, false);
  assert.equal(buildResult({ winner: "black", method: "count", margin: "0" }).ok, false);
  assert.equal(buildResult({ winner: "black", method: "nope" }).ok, false);
});

test("margins and method flags", () => {
  assert.equal(validMargin("0.5"), true);
  assert.equal(validMargin("12"), true);
  assert.equal(validMargin("abc"), false);
  assert.equal(needsWinner("R"), true);
  assert.equal(needsWinner("draw"), false); // Unsupported method, retained only for reading history.
});

test("summary line", () => {
  assert.equal(summaryLine({ board: 3, winner: "black", method: "R" }), "โต๊ะ03 · หมากดำชนะ · ยอมแพ้");
  assert.equal(summaryLine({ board: 12, winner: "white", method: "count", margin: "6.5", names: { white: "อนุชา" } }), "โต๊ะ12 · หมากขาวชนะ (อนุชา) · 6.5 แต้ม");
  assert.equal(summaryLine({ board: 1, winner: null, method: "draw" }), "โต๊ะ01");
  assert.equal(summaryLine({ board: 1, winner: null, method: "R" }), "โต๊ะ01 · เลือกผู้ชนะ");
});

test("prefill from saved result", () => {
  assert.deepEqual(formFromResult({ result_code: "white_win", result_margin: "R" }), { winner: "white", method: "R", margin: "" });
  assert.deepEqual(formFromResult({ result_code: "black_win", result_margin: "6.5" }), { winner: "black", method: "normal", margin: "6.5" });
  assert.deepEqual(formFromResult({ result_code: "white_win_forfeit", result_margin: null }), { winner: "white", method: "forfeit", margin: "" });
  assert.deepEqual(formFromResult({ result_code: "draw", result_margin: null }), { winner: null, method: "normal", margin: "" });
  assert.deepEqual(formFromResult({ result_code: null, result_margin: null }), { winner: null, method: "normal", margin: "" });
});
