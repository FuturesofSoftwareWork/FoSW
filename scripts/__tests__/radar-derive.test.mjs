import test from "node:test";
import assert from "node:assert/strict";
import { deriveOne } from "../radar-derive.mjs";
import { MACHINE_OWNED } from "../lib/radar-fields.mjs";

const sig = (id, over = {}) => ({ id, date: "2026-08-01", status: "published", signalType: "study", ...over });

function signals(list) {
  return new Map(list.map((s) => [s.id, s]));
}

const base = (over = {}) => ({
  id: "p1", reachReviewedAt: "2026-08-01",
  evidence: [{ signalId: "s1", stance: "supports", primary: true }],
  ...over,
});

test("the profile and dates are computed from the evidence", () => {
  const { updates } = deriveOne(base(), signals([sig("s1")]), { today: "2026-08-10" });
  assert.equal(updates.evidenceProfile.independentContexts, 1);
  assert.equal(updates.firstObserved, "2026-08-01");
  assert.equal(updates.latestEvidenceDate, "2026-08-01");
});

test("no stored profile means no reach candidate — nothing to compare against", () => {
  const { updates } = deriveOne(base(), signals([sig("s1")]), { today: "2026-08-10" });
  assert.equal(updates.possibleReachChange, null);
});

test("a GAINED independent context raises a candidate", () => {
  const p = base({
    evidenceProfile: { independentContexts: 1, evidenceTypes: 1, quartersSpanned: 1, counterEvidence: false },
    evidence: [
      { signalId: "s1", stance: "supports", primary: true },
      { signalId: "s2", stance: "supports", primary: true },
    ],
  });
  const { updates } = deriveOne(p, signals([sig("s1"), sig("s2")]), { today: "2026-08-10" });
  assert.equal(updates.possibleReachChange.raisedAt, "2026-08-10");
  assert.match(updates.possibleReachChange.reason, /gained|new/i);
  assert.deepEqual(updates.possibleReachChange.signalIds, ["s1", "s2"]);
  assert.equal("suggested" in updates.possibleReachChange, false);
});

test("a LOST independent context raises a candidate too", () => {
  const p = base({
    evidenceProfile: { independentContexts: 3, evidenceTypes: 1, quartersSpanned: 1, counterEvidence: false },
  });
  const { updates } = deriveOne(p, signals([sig("s1")]), { today: "2026-08-10" });
  assert.ok(updates.possibleReachChange, "a shrinking evidence base is the more urgent review");
  assert.match(updates.possibleReachChange.reason, /lost|removed|fell/i);
});

test("changedSignalIds names what moved, not what survived", () => {
  const p = base({
    evidenceProfile: { independentContexts: 3, evidenceTypes: 1, quartersSpanned: 1, counterEvidence: false },
  });
  const { updates } = deriveOne(p, signals([sig("s1")]), {
    today: "2026-08-10",
    changedSignalIds: ["s2", "s3"],
  });
  assert.deepEqual(
    updates.possibleReachChange.signalIds,
    ["s2", "s3"],
    "on a loss the removed ids are already gone from evidence, so the survivors say nothing",
  );
});

test("with no changedSignalIds the candidate falls back to the current evidence ids", () => {
  const p = base({
    evidenceProfile: { independentContexts: 3, evidenceTypes: 1, quartersSpanned: 1, counterEvidence: false },
  });
  const { updates } = deriveOne(p, signals([sig("s1")]), { today: "2026-08-10" });
  assert.deepEqual(updates.possibleReachChange.signalIds, ["s1"], "standalone derive cannot recover them");
});

test("elapsed quarters alone raise nothing — time passing is not spread", () => {
  const p = base({
    evidenceProfile: { independentContexts: 1, evidenceTypes: 1, quartersSpanned: 1, counterEvidence: false },
    evidence: [
      { signalId: "s1", stance: "supports", primary: true },
      { signalId: "s2", stance: "supports", primary: false },
    ],
  });
  const { updates } = deriveOne(p, signals([sig("s1"), sig("s2", { date: "2026-11-01" })]), { today: "2026-11-02" });
  assert.equal(updates.evidenceProfile.quartersSpanned, 2);
  assert.equal(updates.possibleReachChange, null);
});

test("an existing candidate is sticky while reach is still unreviewed", () => {
  const p = base({
    evidenceProfile: { independentContexts: 1, evidenceTypes: 1, quartersSpanned: 1, counterEvidence: false },
    possibleReachChange: { reason: "raised earlier", raisedAt: "2026-08-05", signalIds: ["s1"] },
  });
  const { updates } = deriveOne(p, signals([sig("s1")]), { today: "2026-08-10" });
  assert.equal(updates.possibleReachChange.raisedAt, "2026-08-05", "must not be cleared by a no-op run");
});

test("a candidate clears once reach has been reviewed since it was raised", () => {
  const p = base({
    reachReviewedAt: "2026-08-09",
    evidenceProfile: { independentContexts: 1, evidenceTypes: 1, quartersSpanned: 1, counterEvidence: false },
    possibleReachChange: { reason: "raised earlier", raisedAt: "2026-08-05", signalIds: ["s1"] },
  });
  const { updates } = deriveOne(p, signals([sig("s1")]), { today: "2026-08-10" });
  assert.equal(updates.possibleReachChange, null);
});

test("derive is idempotent", () => {
  const p = base({ evidenceProfile: { independentContexts: 1, evidenceTypes: 1, quartersSpanned: 1, counterEvidence: false } });
  const map = signals([sig("s1")]);
  const first = deriveOne(p, map, { today: "2026-08-10" }).updates;
  const second = deriveOne({ ...p, ...first }, map, { today: "2026-08-10" }).updates;
  assert.deepEqual(second, first);
});

// derive() applies these through mergeMachineFields, which silently drops anything
// outside the allowlist. A human-owned key added here would therefore not be written
// but would also not be noticed — this is the check that notices.
test("every key deriveOne proposes is machine-owned", () => {
  const p = base({
    evidenceProfile: { independentContexts: 3, evidenceTypes: 1, quartersSpanned: 1, counterEvidence: false },
  });
  const { updates } = deriveOne(p, signals([sig("s1")]), { today: "2026-08-10" });
  for (const key of Object.keys(updates)) {
    assert.ok(MACHINE_OWNED.includes(key), `${key} is not on the machine-owned allowlist`);
  }
});

test("counter-evidence with contested unset is reported, not written", () => {
  const p = base({
    evidence: [
      { signalId: "s1", stance: "supports", primary: true },
      { signalId: "s2", stance: "counter", primary: true },
    ],
  });
  const { updates, reachChangeNote } = deriveOne(p, signals([sig("s1"), sig("s2")]), { today: "2026-08-10" });
  assert.equal(updates.evidenceProfile.counterEvidence, true);
  assert.equal("contested" in updates, false, "contested is human-owned");
  assert.match(reachChangeNote ?? "", /contested/i);
});
