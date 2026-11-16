import test from "node:test";
import assert from "node:assert/strict";
import { identifierKind, identifierProblem } from "./athlete-auth.mjs";

test("identifier kinds", () => {
  assert.equal(identifierKind("a@b.co"), "email");
  assert.equal(identifierKind("GO106260826"), "go");
  assert.equal(identifierKind(" go-347-180769 "), "go");
  assert.equal(identifierKind("go 1062 60826"), "go");
  assert.equal(identifierKind("1234"), "dan");
  assert.equal(identifierKind("1,234"), "dan");
  assert.equal(identifierKind("ธนวัฒน์  ศรีสุข"), "name");
  assert.equal(identifierKind("ธนวัฒน์"), "unknown");
  assert.equal(identifierKind(""), "unknown");
  assert.equal(identifierKind("GO12"), "unknown");
});

test("problems", () => {
  assert.equal(identifierProblem("GO106260826"), "");
  assert.match(identifierProblem("ธนวัฒน์"), /นามสกุล/);
  assert.match(identifierProblem(""), /กรุณากรอก/);
});
