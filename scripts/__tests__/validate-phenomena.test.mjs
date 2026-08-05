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

test("reachReviewedAt must be present", () => {
  assert.match(validatePhenomenon(withOut("reachReviewedAt"), ctx).join("\n"), /reachReviewedAt/);
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
