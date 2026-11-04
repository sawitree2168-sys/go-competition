import test from "node:test";
import assert from "node:assert/strict";
import { assignPools } from "./pool-assignment.mjs";

const make = (spec) => spec.flatMap(([inst, n]) => Array.from({ length: n }, (_, i) => ({ id: `${inst}-${i}`, institution: inst })));
const count = (map, pool) => [...map.values()].filter((p) => p === pool).length;

test("pool sizes differ by at most one", () => {
  for (const n of [2, 7, 16, 31, 32]) {
    const m = assignPools(make([["X", n]]), { seed: n });
    assert.ok(Math.abs(count(m, "A") - count(m, "B")) <= 1, `n=${n}`);
  }
});

test("each institution is split evenly between pools", () => {
  const entrants = make([["Think Kub", 9], ["Hanping", 6], ["ครูเตอร์", 5], ["อิสระ", 1], ["โรงเรียน ก", 3], ["โรงเรียน ข", 3], ["", 5]]);
  for (let seed = 1; seed <= 50; seed++) {
    const m = assignPools(entrants, { seed });
    for (const inst of ["Think Kub", "Hanping", "ครูเตอร์", "โรงเรียน ก", "โรงเรียน ข"]) {
      const ids = entrants.filter((e) => e.institution === inst).map((e) => e.id);
      const a = ids.filter((id) => m.get(id) === "A").length;
      assert.ok(Math.abs(a - (ids.length - a)) <= 1, `${inst} seed ${seed}: ${a}/${ids.length}`);
    }
    assert.ok(Math.abs(count(m, "A") - count(m, "B")) <= 1);
  }
});

test("institution names are matched ignoring case and extra spaces", () => {
  const entrants = [{ id: "1", institution: "Think Kub" }, { id: "2", institution: " think  kub " }, { id: "3", institution: "THINK KUB" }, { id: "4", institution: "think kub" }];
  const m = assignPools(entrants, { seed: 3 });
  assert.equal(count(m, "A"), 2);
});

test("same seed gives the same draw; a new seed re-draws", () => {
  const entrants = make([["X", 8], ["Y", 8], ["Z", 8]]);
  const a = assignPools(entrants, { seed: "zeer-1" }), b = assignPools(entrants, { seed: "zeer-1" }), c = assignPools(entrants, { seed: "zeer-2" });
  assert.deepEqual([...a], [...b]);
  assert.notDeepEqual([...a].sort(), [...c].sort());
});

test("supports more than two pools and rejects duplicates", () => {
  const m = assignPools(make([["X", 10]]), { pools: ["A", "B", "C"], seed: 1 });
  assert.deepEqual(["A", "B", "C"].map((p) => count(m, p)).sort(), [3, 3, 4]);
  assert.throws(() => assignPools([{ id: "1" }, { id: "1" }]));
});
