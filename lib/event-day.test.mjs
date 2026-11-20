import test from "node:test";
import assert from "node:assert/strict";
import { thaiToday, thaiMinutes, parseHHMM, minutesUntil, countdownText, urgency, elapsedText } from "./event-day.mjs";

// 2026-11-21 10:36 Thai time = 03:36 UTC
const now = new Date("2026-11-21T03:36:00Z");

test("Thai date and clock", () => {
  assert.equal(thaiToday(now), "2026-11-21");
  assert.equal(thaiToday(new Date("2026-11-20T17:30:00Z")), "2026-11-21"); // 00:30 next day in Thailand
  assert.equal(thaiMinutes(now), 10 * 60 + 36);
});

test("parse HH:MM", () => {
  assert.equal(parseHHMM("10:40"), 640);
  assert.equal(parseHHMM("9:05"), 545);
  assert.equal(parseHHMM("24:00"), null);
  assert.equal(parseHHMM(""), null);
  assert.equal(parseHHMM(null), null);
});

test("countdown only on the event day", () => {
  assert.equal(minutesUntil("10:40", "2026-11-21", now), 4);
  assert.equal(minutesUntil("10:30", null, now), -6);
  assert.equal(minutesUntil("10:40", "2026-11-22", now), null);
  assert.equal(minutesUntil("", "2026-11-21", now), null);
  const late = new Date("2026-11-21T16:50:00Z"); // 23:50 Thai
  assert.equal(minutesUntil("00:10", null, late), 20);
  assert.equal(minutesUntil("23:30", null, late), -20);
});

test("wording and urgency", () => {
  assert.equal(countdownText(4), "อีก 4 นาที");
  assert.equal(countdownText(-3), "เลยมา 3 นาที");
  assert.equal(countdownText(65), "อีก 1 ชม. 5 นาที");
  assert.equal(countdownText(0), "ถึงเวลาแล้ว");
  assert.equal(countdownText(null), "");
  assert.equal(urgency(-1), "late");
  assert.equal(urgency(10), "soon");
  assert.equal(urgency(11), "later");
  assert.equal(urgency(null), "none");
  assert.equal(elapsedText(0, 200_000), "3:20");
});
