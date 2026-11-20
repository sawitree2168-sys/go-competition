import test from "node:test";
import assert from "node:assert/strict";
import { toIsoDate } from "./easy-auth.mjs";

test("birth dates in Thai and ISO forms", () => {
  assert.equal(toIsoDate("2015-03-07"), "2015-03-07");
  assert.equal(toIsoDate("7/3/2558"), "2015-03-07");
  assert.equal(toIsoDate("07-03-2015"), "2015-03-07");
  assert.equal(toIsoDate("31/2/2558"), "");
  assert.equal(toIsoDate("abc"), "");
});

test("internal addresses are never shown", async () => {
  const { shownName } = await import("./easy-auth.mjs");
  assert.equal(shownName({ email: "x@easy.go-tournament.invalid", user_metadata: { display_name: "วสุ สารพิมพา" } }), "วสุ สารพิมพา");
  assert.equal(shownName({ email: "a@athlete.go-tournament.invalid" }), "บัญชีของฉัน");
  assert.equal(shownName({ email: "a@b.co" }), "a@b.co");
});
