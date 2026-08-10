import test from "node:test";
import assert from "node:assert/strict";
import { validatePhenomenon } from "../validate-phenomena.mjs";

const signals = new Map([
  ["s-a", { id: "s-a", date: "2026-03-09", signalType: "tool-shift", status: "published" }],
  ["s-b", { id: "s-b", date: "2026-04-20", signalType: "field-report", status: "published" }],
]);
const ctx = { signalsById: signals, phenomenonIds: new Set(["other-phenomenon"]) };

/** A minimal phenomenon that passes every rule. Tests mutate a copy. */
const valid = () => ({
  id: "p",
  label: "Review becomes verification",
  title: "From reading code to verifying evidence",
  thesis: "Assurance shifts from inspecting code towards verifying evidence.",
  construct: "whether assurance work inspects code or verifies evidence",
  status: "published",
  primaryDimension: "nature-and-division-of-work",
  implications: [
    { dimension: "nature-and-division-of-work", statement: "Reviewing shifts to judging evidence." },
    { dimension: "skills-knowledge-and-learning", statement: "Specifying acceptance criteria matters more." },
  ],
  evidence: [
    { signalId: "s-a", stance: "supports", primary: true },
    { signalId: "s-b", stance: "contextual", primary: true },
  ],
  observedReach: "gaining-traction",
  reachRationale: "Running in production at several unrelated organisations.",
  reachReviewedAt: "2026-08-05",
});

const withOut = (key) => { const p = valid(); delete p[key]; return p; };

test("a well-formed phenomenon has no errors", () => {
  assert.deepEqual(validatePhenomenon(valid(), ctx), []);
});

test("observedReach must be one of the three values", () => {
  const p = { ...valid(), observedReach: "established" };
  assert.match(validatePhenomenon(p, ctx).join("\n"), /observedReach/);
});

test("reachRationale must be present and non-empty", () => {
  assert.match(validatePhenomenon(withOut("reachRationale"), ctx).join("\n"), /reachRationale/);
  const blank = { ...valid(), reachRationale: "   " };
  assert.match(validatePhenomenon(blank, ctx).join("\n"), /reachRationale/);
});

test("a draft may omit reachReviewedAt — nobody has judged its reach yet", () => {
  const p = { ...withOut("reachReviewedAt"), status: "draft" };
  assert.deepEqual(validatePhenomenon(p, ctx), []);
});

test("a published phenomenon may not omit reachReviewedAt", () => {
  const errors = validatePhenomenon(withOut("reachReviewedAt"), ctx);
  assert.ok(
    errors.some((e) => e.includes("reachReviewedAt")),
    `expected a reachReviewedAt error, got: ${errors.join("; ")}`,
  );
});

test("a draft may omit construct", () => {
  const p = { ...withOut("construct"), status: "draft" };
  assert.deepEqual(validatePhenomenon(p, ctx), []);
});

test("a published phenomenon may not omit construct", () => {
  const errors = validatePhenomenon(withOut("construct"), ctx);
  assert.ok(
    errors.some((e) => e.includes("construct")),
    `expected a construct error, got: ${errors.join("; ")}`,
  );
});

test("possibleReachChange needs a reason, a date and signal ids", () => {
  const p = { ...valid(), possibleReachChange: { reason: "", raisedAt: "2026-08-10", signalIds: [] } };
  const errors = validatePhenomenon(p, ctx);
  assert.ok(errors.some((e) => e.includes("possibleReachChange.reason")));
  assert.ok(errors.some((e) => e.includes("possibleReachChange.signalIds")));
});

test("possibleReachChange may be null", () => {
  assert.deepEqual(validatePhenomenon({ ...valid(), possibleReachChange: null }, ctx), []);
});

test("possibleReachChange may name no ring", () => {
  const p = {
    ...valid(),
    possibleReachChange: {
      reason: "gained 2 independent context(s) since reach was last reviewed (1 -> 3)",
      raisedAt: "2026-08-10",
      signalIds: ["s-a"],
      suggested: "gaining-traction",
    },
  };
  assert.ok(
    validatePhenomenon(p, ctx).some((e) => e.includes("suggested")),
    "a suggested ring must be rejected — reach is a human judgment",
  );
});

test("label must be four words or fewer", () => {
  const p = { ...valid(), label: "Review slowly becomes a verification activity" };
  assert.match(validatePhenomenon(p, ctx).join("\n"), /label/);
});

test("title and thesis must both exist and differ", () => {
  const same = { ...valid(), thesis: valid().title };
  assert.match(validatePhenomenon(same, ctx).join("\n"), /distinct/);
});

test("a published phenomenon needs at least two implications", () => {
  const p = { ...valid(), implications: [valid().implications[0]] };
  assert.match(validatePhenomenon(p, ctx).join("\n"), /at least two implications/);
});

test("primaryDimension must appear among the implications", () => {
  const p = { ...valid(), primaryDimension: "ethics-responsibility-and-society" };
  assert.match(validatePhenomenon(p, ctx).join("\n"), /primaryDimension/);
});

test("a published phenomenon needs at least one supporting evidence item", () => {
  const p = { ...valid() };
  p.evidence = [{ signalId: "s-b", stance: "contextual", primary: true }];
  assert.match(validatePhenomenon(p, ctx).join("\n"), /at least one 'supports'/);
});

test("draft phenomena are exempt from the editorial minimums", () => {
  const p = { ...valid(), status: "draft", implications: [valid().implications[0]] };
  const errors = validatePhenomenon(p, ctx).join("\n");
  assert.ok(!/at least two implications/.test(errors), errors);
});

test("contestedNote is required when contested is true", () => {
  const p = { ...valid(), contested: true };
  assert.match(validatePhenomenon(p, ctx).join("\n"), /contestedNote/);
});

test("unknown dimensions, stances and actors are rejected", () => {
  const badDim = { ...valid() };
  badDim.implications = [{ dimension: "made-up", statement: "x" }, valid().implications[1]];
  assert.match(validatePhenomenon(badDim, ctx).join("\n"), /dimension/);

  const badStance = { ...valid() };
  badStance.evidence = [{ signalId: "s-a", stance: "maybe", primary: true }];
  assert.match(validatePhenomenon(badStance, ctx).join("\n"), /stance/);

  const badActor = { ...valid() };
  badActor.implications = [{ ...valid().implications[0], actors: ["intern"] }, valid().implications[1]];
  assert.match(validatePhenomenon(badActor, ctx).join("\n"), /actors/);
});

test("an invalid related.relation is rejected", () => {
  const p = { ...valid(), related: [{ id: "other-phenomenon", relation: "causes" }] };
  assert.match(validatePhenomenon(p, ctx).join("\n"), /causes/);
});

test("an invalid potentialImpact is rejected", () => {
  const p = { ...valid(), potentialImpact: "enormous" };
  assert.match(validatePhenomenon(p, ctx).join("\n"), /potentialImpact/);
});

test("an invalid status is rejected", () => {
  const p = { ...valid(), status: "archived" };
  assert.match(validatePhenomenon(p, ctx).join("\n"), /status/);
});

test("related must be an array rather than throwing when it is not", () => {
  const p = { ...valid(), related: { id: "x", relation: "reinforces" } };
  assert.match(validatePhenomenon(p, ctx).join("\n"), /'related' must be an array/);
});

test("a dangling evidence signalId is an error", () => {
  const p = valid();
  p.evidence = [{ signalId: "does-not-exist", stance: "supports", primary: true }];
  assert.match(validatePhenomenon(p, ctx).join("\n"), /does-not-exist/);
});

test("evidence must reference a published signal", () => {
  const draftSignals = new Map(signals);
  draftSignals.set("s-draft", { id: "s-draft", date: "2026-05-01", signalType: "study", status: "draft" });
  const p = valid();
  p.evidence = [{ signalId: "s-draft", stance: "supports", primary: true }];
  const errors = validatePhenomenon(p, { ...ctx, signalsById: draftSignals }).join("\n");
  assert.match(errors, /not published/);
});

test("a stored evidenceProfile must match what the evidence derives", () => {
  const p = { ...valid(), evidenceProfile: { independentContexts: 9, evidenceTypes: 9, quartersSpanned: 9, counterEvidence: true } };
  assert.match(validatePhenomenon(p, ctx).join("\n"), /evidenceProfile/);
});

test("a correct evidenceProfile passes", () => {
  const p = { ...valid(), evidenceProfile: { independentContexts: 1, evidenceTypes: 1, quartersSpanned: 1, counterEvidence: false } };
  assert.deepEqual(validatePhenomenon(p, ctx), []);
});

test("stored dates must match the evidence", () => {
  const p = { ...valid(), firstObserved: "2020-01-01", latestEvidenceDate: "2020-01-01" };
  const errors = validatePhenomenon(p, ctx).join("\n");
  assert.match(errors, /firstObserved/);
  assert.match(errors, /latestEvidenceDate/);
});

test("pathIds must resolve to a declared development path", () => {
  const p = valid();
  p.developmentPaths = [{ id: "real-path", title: "Real", description: "…" }];
  p.implications[0].pathIds = ["ghost-path"];
  assert.match(validatePhenomenon(p, ctx).join("\n"), /ghost-path/);
});

test("related ids must resolve to a known phenomenon", () => {
  const p = { ...valid(), related: [{ id: "no-such-phenomenon", relation: "reinforces" }] };
  assert.match(validatePhenomenon(p, ctx).join("\n"), /no-such-phenomenon/);
});

test("a reach change without a history entry is an error", () => {
  const p = {
    ...valid(),
    observedReach: "field-level-shift",
    reachHistory: [{ edition: "2026-Q1", observedReach: "early-manifestations", rationale: "…" }],
  };
  assert.match(validatePhenomenon(p, ctx).join("\n"), /reachHistory/);
});

test("reach matching the latest history entry is fine", () => {
  const p = {
    ...valid(),
    reachHistory: [
      { edition: "2026-Q1", observedReach: "early-manifestations", rationale: "…" },
      { edition: "2026-Q3", observedReach: "gaining-traction", rationale: "…" },
    ],
  };
  assert.deepEqual(validatePhenomenon(p, ctx), []);
});

// --- malformed input: reports a clean message rather than throwing ------------

test("a null evidence element is rejected without throwing", () => {
  const p = { ...valid(), evidence: [null] };
  let errors;
  assert.doesNotThrow(() => { errors = validatePhenomenon(p, ctx); });
  assert.match(errors.join("\n"), /evidence\[0\]\.stance/);
});

test("developmentPaths must be an array rather than throwing when it is not", () => {
  const p = { ...valid(), developmentPaths: {} };
  let errors;
  assert.doesNotThrow(() => { errors = validatePhenomenon(p, ctx); });
  assert.match(errors.join("\n"), /'developmentPaths' must be an array/);
});

test("implications[].pathIds must be an array rather than throwing when it is not", () => {
  const p = valid();
  p.implications[0].pathIds = {};
  let errors;
  assert.doesNotThrow(() => { errors = validatePhenomenon(p, ctx); });
  assert.match(errors.join("\n"), /implications\[0\]\.pathIds must be an array/);
});

test("implications[].actors must be an array rather than throwing when it is not", () => {
  const p = valid();
  p.implications[0].actors = {};
  let errors;
  assert.doesNotThrow(() => { errors = validatePhenomenon(p, ctx); });
  assert.match(errors.join("\n"), /implications\[0\]\.actors must be an array/);
});

test("reachHistory must be an array rather than silently accepted when it is not", () => {
  const p = { ...valid(), reachHistory: {} };
  assert.match(validatePhenomenon(p, ctx).join("\n"), /'reachHistory' must be an array/);
});

// --- published phenomena must cite typed evidence (FIX 5) ---------------------

test("a published phenomenon's 'supports' evidence must reference a typed signal", () => {
  const untypedSignals = new Map(signals);
  untypedSignals.set("s-untyped", { id: "s-untyped", date: "2026-05-01", status: "published" });
  const p = valid();
  p.evidence = [
    { signalId: "s-untyped", stance: "supports", primary: true },
    { signalId: "s-b", stance: "contextual", primary: true },
  ];
  const errors = validatePhenomenon(p, { ...ctx, signalsById: untypedSignals }).join("\n");
  assert.match(errors, /s-untyped/);
  assert.match(errors, /signalType/);
});

test("a draft phenomenon may cite untyped 'supports' evidence", () => {
  const untypedSignals = new Map(signals);
  untypedSignals.set("s-untyped", { id: "s-untyped", date: "2026-05-01", status: "published" });
  const p = { ...valid(), status: "draft" };
  p.evidence = [{ signalId: "s-untyped", stance: "supports", primary: true }];
  const errors = validatePhenomenon(p, { ...ctx, signalsById: untypedSignals }).join("\n");
  assert.ok(!/signalType/.test(errors), errors);
});
