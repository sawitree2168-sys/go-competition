import test from "node:test";
import assert from "node:assert/strict";
import { ageOn, beYears, birthIso, checkStep1, checkStep2, divisionFit, divisionRange, firstStep, phoneOk, reasonText, slipProblem } from "./register-form.mjs";

test("birth date and age", () => {
  assert.equal(birthIso(15, 5, 2553), "2010-05-15");
  assert.equal(birthIso(31, 2, 2553), "");
  assert.equal(birthIso("", 5, 2553), "");
  assert.equal(ageOn("2010-05-15", "2026-11-16"), 16);
  assert.equal(ageOn("2010-11-17", "2026-11-16"), 15);
  assert.equal(ageOn("", "2026-11-16"), null);
  const ys = beYears("2026-11-16");
  assert.equal(ys[0], 2566);
  assert.equal(ys.at(-1), 2483);
});

test("phone", () => {
  assert.ok(phoneOk("081-234-5678"));
  assert.ok(phoneOk("02 123 4567"));
  assert.ok(!phoneOk("08x-xxx-1234"));
  assert.ok(!phoneOk("8123456789"));
});

test("division fit", () => {
  assert.deepEqual(divisionRange("5–6 คิว"), { kind: "kyu", lo: 5, hi: 6 });
  assert.deepEqual(divisionRange("1-2 Dan"), { kind: "dan", lo: 1, hi: 2 });
  assert.deepEqual(divisionRange("เฟรนชิพ 9×9"), { kind: "friendship" });
  assert.equal(divisionFit("5–6 คิว", "5 คิว"), "fit");
  assert.equal(divisionFit("5–6 คิว", "7 คิว"), "out");
  assert.equal(divisionFit("9–12 คิว", "1 ดั้ง"), "out");
  assert.equal(divisionFit("เฟรนชิพ 13×13", "15 คิว"), "any");
  assert.equal(divisionFit("Open", "5 คิว"), "unknown");
});

test("checks list every missing item", () => {
  assert.deepEqual(checkStep1({ mode: "new" }), ["NAME", "BIRTH", "RANK", "PHONE", "DIVISION"]);
  assert.deepEqual(checkStep1({ mode: "new", firstName: "ก", lastName: "ข", birth: "2010-01-01", rank: "5 คิว", phone: "0812345678", division: "d", photo: true }), ["PHOTO_CONSENT"]);
  assert.deepEqual(checkStep1({ mode: "existing", rank: "5 คิว", phone: "0812345678", division: "d" }), ["ATHLETE"]);
  assert.deepEqual(checkStep2({}, { fee: 500, paymentReady: true }), ["SLIP", "ACCEPT"]);
  assert.deepEqual(checkStep2({ accept: true }, { fee: 0, paymentReady: false }), []);
  assert.deepEqual(checkStep2({ accept: true, slip: true }, { fee: 500, paymentReady: false }), ["PAYMENT_NOT_READY"]);
  assert.equal(firstStep(["ACCEPT", "PHONE"]), 1);
  assert.equal(firstStep(["SLIP"]), 2);
  assert.match(reasonText("SLIP"), /สลิป/);
  assert.match(reasonText("WHATEVER"), /ลองใหม่/);
});

test("slip files", () => {
  assert.equal(slipProblem({ type: "image/png", size: 1000 }), "");
  assert.match(slipProblem({ type: "image/gif", size: 1000 }), /JPG/);
  assert.match(slipProblem({ type: "application/pdf", size: 11 * 1024 * 1024 }), /10 MB/);
});
