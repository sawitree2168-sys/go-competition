import test from "node:test";
import assert from "node:assert/strict";
import { thaiYear, yearsOf, eventsOf, filterRecords, totals, studentReport, studentStats, achievements, amountDue, placeLabel, portalError } from "./institution-portal.mjs";

const S = [{ id: "a", name: "ธนวัฒน์ ศรีสุข" }, { id: "b", name: "ปิยะนุช แก้วมณี" }, { id: "c", name: "กิตติพงษ์ วงศ์ทอง" }, { id: "d", name: "ใหม่ เอี่ยม" }];
const R = [
  { athlete_id: "a", tournament_id: "t2", title: "งาน 2", date: "2026-10-01", games: 5, wins: 4, losses: 1, draws: 0, pos: 2, field: 20 },
  { athlete_id: "b", tournament_id: "t2", title: "งาน 2", date: "2026-10-01", games: 4, wins: 3, losses: 1, draws: 0, pos: 6, field: 20 },
  { athlete_id: "b", tournament_id: "t1", title: "งาน 1", date: "2026-03-01", games: 4, wins: 1, losses: 3, draws: 0, pos: 15, field: 20 },
  { athlete_id: "c", tournament_id: "t2", title: "งาน 2", date: "2026-10-01", games: 3, wins: 1, losses: 2, draws: 0, pos: 12, field: 20 },
  { athlete_id: "a", tournament_id: "t0", title: "งาน 0", date: "2025-11-01", games: 5, wins: 2, losses: 2, draws: 1, pos: 1, field: 8 },
];

test("years and events", () => {
  assert.equal(thaiYear("2026-10-01"), 2569);
  assert.deepEqual(yearsOf(R, new Date("2026-11-16")), [2569, 2568]);
  assert.deepEqual(eventsOf(R).map((e) => e.id), ["t2", "t1", "t0"]);
  assert.deepEqual(eventsOf(R, 2568).map((e) => e.id), ["t0"]);
  assert.equal(filterRecords(R, { year: 2569 }).length, 4);
  assert.equal(filterRecords(R, { event: "t1" }).length, 1);
});

test("totals", () => {
  assert.deepEqual(totals(filterRecords(R, { year: 2569 }), S), { students: 4, events: 2, games: 16, wins: 9, losses: 7, draws: 0 });
});

test("report highlights", () => {
  const rows = studentReport(filterRecords(R, { year: 2569 }), S);
  assert.deepEqual(rows.map((r) => [r.student.id, r.line, r.note]), [
    ["a", "ชนะ 4 จาก 5 เกม", "รองชนะเลิศ"],
    ["b", "ชนะ 3 จาก 4 เกม", "ชนะมากกว่าครั้งก่อน"],
    ["c", "ชนะ 1 จาก 3 เกม", "รอติดตามพัฒนาการ"],
    ["d", "ยังไม่มีผล", "ยังไม่ได้ลงแข่ง"],
  ]);
});

test("gold rows ordered by place", () => {
  const rows = studentReport([
    { athlete_id: "c", tournament_id: "t", title: "x", date: "2026-11-01", games: 3, wins: 2, losses: 1, draws: 0, pos: 3, field: 8 },
    { athlete_id: "b", tournament_id: "t", title: "x", date: "2026-11-01", games: 3, wins: 2, losses: 1, draws: 0, pos: 2, field: 8 },
  ], S);
  assert.deepEqual(rows.slice(0, 2).map((r) => r.note), ["รองชนะเลิศ", "อันดับ 3"]);
});

test("stats and achievements", () => {
  const st = studentStats(R, S);
  assert.equal(st[0].student.id, "a"); assert.equal(st[0].rate, 60); assert.equal(st[0].draws, 1);
  assert.equal(st.at(-1).rate, null);
  assert.deepEqual(achievements(R, S).map((x) => [x.student.id, x.label]), [["a", "ชนะเลิศ"], ["a", "รองชนะเลิศ"], ["b", "อันดับ 6"], ["c", "อันดับ 12"], ["b", "อันดับ 15"]]);
  assert.equal(placeLabel(3), "อันดับ 3");
});

test("money and errors", () => {
  assert.equal(amountDue([{ fee: 300, status: "pending", payment: null }, { fee: "300.00", status: "approved", payment: "verified" }, { fee: 300, status: "rejected" }, { fee: 250, status: "approved", payment: "pending" }]), 550);
  assert.match(portalError("NOT_APPROVED"), /อนุมัติ/);
  assert.match(portalError("x"), /ไม่สำเร็จ/);
});
