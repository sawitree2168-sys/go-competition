import test from "node:test";
import assert from "node:assert/strict";
import { actionState, applicationStatus, refundLines, refundPercent, requestMoney, requestReason, thaiShort } from "./application-changes.mjs";

const policy = {
  allow_withdraw: true, withdraw_until: "2026-11-30", refund_tiers: [{ until: "2026-11-25", percent: 50 }, { until: "2026-11-20", percent: 100 }],
  refund_after_percent: 0, allow_swap: true, swap_until: "2026-11-28", swap_fee: 50, allow_division: false, division_until: null, division_fee: 0,
};

test("refund tiers", () => {
  assert.equal(refundPercent(policy, "2026-11-18"), 100);
  assert.equal(refundPercent(policy, "2026-11-20"), 100);
  assert.equal(refundPercent(policy, "2026-11-21"), 50);
  assert.equal(refundPercent(policy, "2026-11-26"), 0);
  assert.equal(refundPercent(null, "2026-11-26"), 0);
  assert.deepEqual(refundLines(policy), ["คืน 100% ถ้าขอถึง 20 พ.ย. 2569", "คืน 50% ถ้าขอถึง 25 พ.ย. 2569", "หลังจากนั้นไม่คืนเงิน"]);
  assert.deepEqual(refundLines({ refund_tiers: [], refund_after_percent: 30 }), ["คืน 30%"]);
});

test("what can be asked today", () => {
  assert.equal(actionState(policy, "withdraw", "2026-11-18", "2026-12-05").ok, true);
  assert.match(actionState(policy, "swap", "2026-11-29", "2026-12-05").why, /เลยกำหนด/);
  assert.match(actionState(policy, "division", "2026-11-18", "2026-12-05").why, /ไม่เปิด/);
  assert.match(actionState(null, "withdraw", "2026-11-18", null).why, /ยังไม่เปิด/);
  assert.match(actionState(policy, "withdraw", "2026-12-06", "2026-12-05").why, /ผ่านไปแล้ว/);
  assert.equal(thaiShort("2026-11-20"), "20 พ.ย. 2569");
});

test("money", () => {
  const app = { paid: true, fee: 500, policy: { ...policy, division_fee: 100 }, divisions: [{ id: "a", fee: 500 }, { id: "b", fee: 700 }, { id: "c", fee: 300 }] };
  assert.deepEqual(requestMoney(app, "withdraw", "2026-11-22"), { refund: 250, percent: 50, charge: 0 });
  assert.equal(requestMoney({ ...app, paid: false }, "withdraw", "2026-11-18").refund, 0);
  assert.equal(requestMoney(app, "swap", "2026-11-18").charge, 50);
  assert.equal(requestMoney(app, "division", "2026-11-18", "b").charge, 300);
  assert.equal(requestMoney(app, "division", "2026-11-18", "c").charge, 100);
  assert.match(requestReason("BANK"), /บัญชี/);
  assert.equal(applicationStatus({ status: "approved", registration: "confirmed" }).label, "ยืนยันแล้ว");
  assert.equal(applicationStatus({ status: "approved", registration: "cancelled" }).label, "ถอนตัวแล้ว");
  assert.equal(applicationStatus({ status: "pending", paid: true }).label, "รอตรวจสอบการชำระเงิน");
});
