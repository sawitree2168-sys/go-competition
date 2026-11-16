import test from "node:test";
import assert from "node:assert/strict";
import { eventStatus, divisionKinds, thaiYear } from "./event-list.mjs";

test("event status from dates", () => {
  const t = "2026-11-16";
  assert.equal(eventStatus({ event_date: "2026-11-01" }, t), "finished");
  assert.equal(eventStatus({ event_date: t }, t), "live");
  assert.equal(eventStatus({ event_date: "2026-12-05", registration_open_date: "2026-11-01", registration_close_date: "2026-11-30" }, t), "open");
  assert.equal(eventStatus({ event_date: "2026-12-05", registration_open_date: "2026-11-20" }, t), "upcoming");
  assert.equal(eventStatus({ event_date: "2026-12-05", registration_close_date: "2026-11-10" }, t), "closed");
  assert.equal(eventStatus({ event_date: "2026-12-05", registration_mode: "closed", registration_open_date: "2026-11-01" }, t), "closed");
  assert.equal(eventStatus({ event_date: "2026-12-05", registration_mode: "web" }, t), "open");
  assert.equal(eventStatus({ event_date: null }, t), "tba");
});

test("division kinds and Thai year", () => {
  assert.equal(divisionKinds(["kyu:1-2", "kyu:9-12", "dan:1"]), "รุ่นคิว • รุ่นดั้ง");
  assert.equal(divisionKinds(["kyu:3-4", "friendship:9"]), "รุ่นคิว • รุ่นเฟรนชิพ");
  assert.equal(divisionKinds([]), "");
  assert.equal(thaiYear("2026-12-05"), 2569);
  assert.equal(thaiYear(null), null);
});
