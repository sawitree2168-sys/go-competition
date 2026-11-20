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
