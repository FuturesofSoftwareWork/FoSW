import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import { MACHINE_OWNED, HUMAN_OWNED, mergeMachineFields } from "../lib/radar-fields.mjs";

/** Property names declared on the Phenomenon interface. */
function phenomenonKeys() {
  const src = readFileSync("src/types/phenomenon.ts", "utf8");
  const body = /export interface Phenomenon \{([\s\S]*?)\n\}/.exec(src);
  assert.ok(body, "could not find the Phenomenon interface");
  return [...body[1].matchAll(/^ {2}(\w+)\??:/gm)].map((m) => m[1]);
}

test("every Phenomenon key is classified exactly once", () => {
  const keys = phenomenonKeys();
  assert.ok(keys.length > 10, `expected a populated interface, got ${keys.length} keys`);
  for (const key of keys) {
    const inMachine = MACHINE_OWNED.includes(key);
    const inHuman = HUMAN_OWNED.includes(key);
    assert.ok(inMachine || inHuman, `'${key}' is classified in neither list`);
    assert.ok(!(inMachine && inHuman), `'${key}' is classified in both lists`);
  }
});

test("the lists name no field that is not on the interface", () => {
  const keys = new Set(phenomenonKeys());
  for (const key of [...MACHINE_OWNED, ...HUMAN_OWNED]) {
    assert.ok(keys.has(key), `'${key}' is classified but not on the Phenomenon interface`);
  }
});

test("mergeMachineFields copies machine-owned updates", () => {
  const existing = { id: "a", thesis: "original", evidence: [] };
  const merged = mergeMachineFields(existing, { evidence: [{ signalId: "s1" }] });
  assert.deepEqual(merged.evidence, [{ signalId: "s1" }]);
});

test("mergeMachineFields cannot write a human-owned field", () => {
  const existing = { id: "a", thesis: "original", observedReach: "early-manifestations" };
  const merged = mergeMachineFields(existing, {
    thesis: "rewritten by a script",
    observedReach: "field-level-shift",
    construct: "redefined",
  });
  assert.equal(merged.thesis, "original");
  assert.equal(merged.observedReach, "early-manifestations");
  assert.equal(merged.construct, undefined);
});

test("mergeMachineFields does not mutate the original", () => {
  const existing = { id: "a", evidence: [] };
  mergeMachineFields(existing, { evidence: [{ signalId: "s1" }] });
  assert.deepEqual(existing.evidence, []);
});
