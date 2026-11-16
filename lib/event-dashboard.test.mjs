import test from "node:test";
import assert from "node:assert/strict";
import { seatStatus, seatSummary, registrationWindow } from "./event-dashboard.mjs";

test("seat status matches the design", () => {
  assert.equal(seatStatus(15, 32).label, "ว่าง");
  assert.equal(seatStatus(26, 32).label, "ใกล้เต็ม");
  assert.equal(seatStatus(31, 32).label, "เหลือ 1 ที่");
  assert.deepEqual(seatStatus(35, 32), { tone: "full", label: "เต็ม", left: 0, waitlist: 3 });
  assert.equal(seatStatus(4, null).tone, "none");
});

test("summary", () => {
  assert.deepEqual(seatSummary([{ count: 15, limit: 32 }, { count: 35, limit: 32 }, { count: 4, limit: null }]),
    { entrants: 54, seats: 64, left: 17, waitlist: 3 });
});

test("registration window", () => {
  assert.equal(registrationWindow("2026-12-01", "2026-12-20", "2026-11-16").tone, "soon");
  assert.equal(registrationWindow(null, "2026-11-29", "2026-11-16").text, "ปิดรับสมัคร");
  assert.equal(registrationWindow(null, "2026-11-10", "2026-11-16").tone, "closed");
});
