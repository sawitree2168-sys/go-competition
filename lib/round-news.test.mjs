import test from "node:test";
import assert from "node:assert/strict";
import { roundNews, rankValue, rankShort, scoreText } from "./round-news.mjs";

const people = {
  a: { name: "ธนวัฒน์ ศรีสุข", rank: "3 คิว" }, b: { name: "ปิยะนุช แก้วมณี", rank: "1 ดั้ง" },
  c: { name: "ศิริลักษณ์ ประเสริฐ", rank: "5 Kyu" }, d: { name: "ณัฐธิดา จันทร์เพ็ญ", rank: "1d" },
  e: { name: "ชลธิชา มีสุข", rank: "8k" }, f: { name: "ภูมิพัฒน์ แสงอรุณ", rank: "6 คิว" },
};
const g = (round, b, w, winner, code, margin = null, state = "verified") =>
  ({ round_number: round, black_athlete_id: b, white_athlete_id: w, winner_athlete_id: winner, result_code: code, result_margin: margin, state });

test("rank helpers", () => {
  assert.equal(rankValue("7 คิว"), -7);
  assert.equal(rankValue("9 Kyu"), -9);
  assert.equal(rankValue("1 ดั้ง"), 0);
  assert.equal(rankValue("3d"), 2);
  assert.equal(rankValue("?"), null);
  assert.equal(rankShort("5 Kyu"), "5k");
  assert.equal(rankShort("1 ดั้ง"), "1d");
  assert.equal(scoreText(2.5), "2½");
  assert.equal(scoreText(0.5), "½");
  assert.equal(scoreText(3), "3");
});

test("round news: shared lead, endings, upsets, unfinished rounds skipped", () => {
  const matches = [
    g(1, "a", "f", "a", "black_win", "R"), g(1, "b", "c", "b", "black_win", "6.5"), g(1, "e", "d", "e", "black_win", "R"),
    g(2, "a", "e", "a", "black_win", "R"), g(2, "c", "d", "c", "black_win", "R"), g(2, "b", "f", null, "draw"),
    g(3, "a", "c", null, null, null, "pending"),
  ];
  const items = roundNews({ matches, byes: [], people });
  assert.deepEqual(items.map((i) => i.round), [2, 1], "round 3 not finished yet");
  const [r2, r1] = items;
  assert.equal(r1.headline, "3 ผู้เล่นนำร่วมที่ 1 คะแนน");
  assert.match(r1.body, /แข่งครบ 3 กระดาน จบด้วยการยอมแพ้ 2 เกม และนับแต้ม 1 เกม/);
  assert.deepEqual(r1.upsets, ["ชลธิชา มีสุข (8k) ชนะ ณัฐธิดา จันทร์เพ็ญ (1d) B+R"]);
  assert.equal(r2.headline, "ธนวัฒน์ ศรีสุข ชนะรวด 2 เกม ขึ้นนำเดี่ยว");
  assert.match(r2.deck, /ผู้นำเก็บ 2 คะแนนเต็ม ตามด้วยปิยะนุช แก้วมณี 1½ คะแนน/);
  assert.match(r2.body, /เสมอ 1 เกม/);
  assert.deepEqual(r2.upsets, ["ศิริลักษณ์ ประเสริฐ (5k) ชนะ ณัฐธิดา จันทร์เพ็ญ (1d) B+R"]);
});

test("round news: bye counts, forfeits are not upsets", () => {
  const matches = [g(1, "a", "b", "a", "black_win_forfeit"), g(1, "c", "d", "c", "black_win", "T")];
  const [r1] = roundNews({ matches, byes: [{ round_number: 1, athlete_id: "e" }], people });
  assert.equal(r1.headline, "3 ผู้เล่นนำร่วมที่ 1 คะแนน");
  assert.match(r1.body, /หมดเวลา 1 เกม และชนะผ่าน \(คู่ไม่มา\) 1 เกม/);
  assert.equal(r1.upsets.length, 1, "c (5k) beat d (1d) on time is an upset; the forfeit is not");
});
