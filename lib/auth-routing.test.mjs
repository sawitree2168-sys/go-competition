import test from "node:test";
import assert from "node:assert/strict";
import { safeNext, destinationFor, looksLikeEmail, authErrorMessage } from "./auth-routing.mjs";

test("safe next", () => {
  assert.equal(safeNext("/organizer/abc"), "/organizer/abc");
  assert.equal(safeNext("//evil.com"), null);
  assert.equal(safeNext("https://evil.com"), null);
  assert.equal(safeNext("/\\evil.com"), null);
  assert.equal(safeNext("/login"), null);
  assert.equal(safeNext(null), null);
});

test("destination by role", () => {
  assert.equal(destinationFor({ platform_role: "owner", organizers: [] }, null), "/organizer");
  assert.equal(destinationFor({ platform_role: null, organizers: [{ status: "active" }] }, null), "/organizer");
  assert.equal(destinationFor({ platform_role: null, organizers: [{ status: "suspended" }] }, null), "/account");
  assert.equal(destinationFor(null, null), "/account");
  assert.equal(destinationFor(null, "/organizer/x"), "/account", "non-staff never sent to organiser pages");
  assert.equal(destinationFor(null, "/tournaments/x"), "/tournaments/x");
  assert.equal(destinationFor({ platform_role: "owner" }, "/organizer/x"), "/organizer/x");
  assert.equal(destinationFor({ platform_role: null, organizers: [], academies: [{ status: "pending" }] }, null), "/institution");
  assert.equal(destinationFor({ platform_role: null, organizers: [], academies: [{ status: "active" }] }, "/tournaments/x"), "/tournaments/x");
});

test("email check and messages", () => {
  assert.equal(looksLikeEmail("a@b.co"), true);
  assert.equal(looksLikeEmail("GO100234"), false);
  assert.match(authErrorMessage("Invalid login credentials"), /ไม่ถูกต้อง/);
  assert.match(authErrorMessage("Email not confirmed"), /ยืนยันอีเมล/);
  assert.match(authErrorMessage("User already registered"), /มีบัญชีอยู่แล้ว/);
  assert.match(authErrorMessage("whatever"), /ไม่สำเร็จ/);
});
