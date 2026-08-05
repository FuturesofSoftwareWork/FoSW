import test from "node:test";
import assert from "node:assert/strict";
import { quarterOf, deriveEvidenceProfile, deriveDates } from "../lib/derive.mjs";

const signals = new Map([
  ["s-tool",    { id: "s-tool",    date: "2026-03-09", signalType: "tool-shift" }],
  ["s-cf",      { id: "s-cf",      date: "2026-04-20", signalType: "field-report", sponsor: "Cloudflare" }],
  ["s-vendor1", { id: "s-vendor1", date: "2026-05-01", signalType: "field-report", sponsor: "Acme" }],
  ["s-vendor2", { id: "s-vendor2", date: "2026-05-02", signalType: "field-report", sponsor: "Acme" }],
  ["s-forecast",{ id: "s-forecast",date: "2026-05-03", signalType: "forecast" }],
  ["s-study",   { id: "s-study",   date: "2026-04-03", signalType: "study" }],
  ["s-context", { id: "s-context", date: "2026-01-29", signalType: "field-report", sponsor: "Opsera" }],
]);

const ev = (signalId, stance, primary = true) => ({ signalId, stance, primary });

test("quarterOf maps a date to its calendar quarter", () => {
  assert.equal(quarterOf("2026-01-29"), "2026-Q1");
  assert.equal(quarterOf("2026-03-31"), "2026-Q1");
  assert.equal(quarterOf("2026-04-01"), "2026-Q2");
  assert.equal(quarterOf("2026-12-31"), "2026-Q4");
});

test("independentContexts counts supporting primary sources", () => {
  const p = { evidence: [ev("s-tool", "supports"), ev("s-cf", "supports")] };
  assert.equal(deriveEvidenceProfile(p, signals).independentContexts, 2);
});

test("field reports sharing a sponsor collapse to one context", () => {
  const p = { evidence: [ev("s-vendor1", "supports"), ev("s-vendor2", "supports")] };
  const profile = deriveEvidenceProfile(p, signals);
  assert.equal(profile.independentContexts, 1);
  assert.equal(profile.evidenceTypes, 1);
});

test("forecasts never count as evidence", () => {
  const p = { evidence: [ev("s-tool", "supports"), ev("s-forecast", "supports")] };
  const profile = deriveEvidenceProfile(p, signals);
  assert.equal(profile.independentContexts, 1);
  assert.equal(profile.evidenceTypes, 1);
});

test("commentary does not add an independent context but does add a quarter", () => {
  const p = {
    evidence: [ev("s-tool", "supports"), ev("s-study", "supports", false)],
  };
  const profile = deriveEvidenceProfile(p, signals);
  assert.equal(profile.independentContexts, 1);
  assert.equal(profile.quartersSpanned, 2, "2026-Q1 and 2026-Q2");
});

test("contextual evidence is excluded from the profile entirely", () => {
  const p = { evidence: [ev("s-tool", "supports"), ev("s-context", "contextual")] };
  const profile = deriveEvidenceProfile(p, signals);
  assert.equal(profile.independentContexts, 1);
  assert.equal(profile.quartersSpanned, 1);
});

test("counterEvidence is true only for primary counter items", () => {
  const withCounter = { evidence: [ev("s-tool", "supports"), ev("s-study", "counter")] };
  const withCommentary = { evidence: [ev("s-tool", "supports"), ev("s-study", "counter", false)] };
  assert.equal(deriveEvidenceProfile(withCounter, signals).counterEvidence, true);
  assert.equal(deriveEvidenceProfile(withCommentary, signals).counterEvidence, false);
});

test("an unresolvable signalId is ignored rather than crashing", () => {
  const p = { evidence: [ev("s-tool", "supports"), ev("missing", "supports")] };
  assert.equal(deriveEvidenceProfile(p, signals).independentContexts, 1);
});

test("deriveDates spans all evidence regardless of stance", () => {
  const p = {
    evidence: [ev("s-tool", "supports"), ev("s-context", "contextual"), ev("s-cf", "supports")],
  };
  assert.deepEqual(deriveDates(p, signals), {
    firstObserved: "2026-01-29",
    latestEvidenceDate: "2026-04-20",
  });
});

test("deriveDates returns nulls when nothing resolves", () => {
  assert.deepEqual(deriveDates({ evidence: [] }, signals), {
    firstObserved: null,
    latestEvidenceDate: null,
  });
});

test("deriveEvidenceProfile returns the zero profile rather than crashing when evidence is not an array", () => {
  const p = { evidence: { signalId: "s-tool", stance: "supports", primary: true } };
  assert.deepEqual(deriveEvidenceProfile(p, signals), {
    independentContexts: 0,
    evidenceTypes: 0,
    quartersSpanned: 0,
    counterEvidence: false,
  });
});

test("deriveDates returns nulls rather than crashing when evidence is not an array", () => {
  assert.deepEqual(deriveDates({ evidence: "nonsense" }, signals), {
    firstObserved: null,
    latestEvidenceDate: null,
  });
});

test("a null evidence element is ignored rather than crashing", () => {
  const p = { evidence: [null, ev("s-tool", "supports")] };
  assert.doesNotThrow(() => deriveEvidenceProfile(p, signals));
  assert.equal(deriveEvidenceProfile(p, signals).independentContexts, 1);
});

test("field reports without a sponsor do not collapse into one context", () => {
  const localSignals = new Map(signals);
  localSignals.set("s-fr1", { id: "s-fr1", date: "2026-05-01", signalType: "field-report" });
  localSignals.set("s-fr2", { id: "s-fr2", date: "2026-05-02", signalType: "field-report" });
  const p = { evidence: [ev("s-fr1", "supports"), ev("s-fr2", "supports")] };
  assert.equal(deriveEvidenceProfile(p, localSignals).independentContexts, 2);
});

test("sponsor: 'independent' (any case) is treated as no sponsor, not a shared one", () => {
  const localSignals = new Map(signals);
  localSignals.set("s-ind1", { id: "s-ind1", date: "2026-05-01", signalType: "field-report", sponsor: "independent" });
  localSignals.set("s-ind2", { id: "s-ind2", date: "2026-05-02", signalType: "field-report", sponsor: "Independent" });
  const p = { evidence: [ev("s-ind1", "supports"), ev("s-ind2", "supports")] };
  assert.equal(deriveEvidenceProfile(p, localSignals).independentContexts, 2);
});
