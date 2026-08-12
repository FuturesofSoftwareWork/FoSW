/**
 * Tests for the review vocabulary and the event a decision produces.
 *
 * The rule these protect is that a reviewer's rationale reaches the log and
 * nothing else — an editorial note about a named vendor must never be published
 * with the signal it was written about.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { REJECTED_UNDER, validateReview, stripReviewFields, reviewEvent } from "../lib/review-schema.mjs";

const drafted = (over = {}) => ({ id: "2026-08-10-02", title: "T", ...over });

test("a draft with no _review block is valid", () => {
  assert.deepEqual(validateReview(drafted()), []);
});

test("a well-formed _review block is valid", () => {
  assert.deepEqual(
    validateReview(drafted({ _review: { under: "commercial-intent", note: "vendor research", reviewer: "arto" } })),
    [],
  );
});

test("an out-of-enum under is rejected and names the value", () => {
  const problems = validateReview(drafted({ _review: { under: "made-up" } }));
  assert.equal(problems.length, 1);
  assert.match(problems[0], /made-up/);
});

// Written by code when a reviewer moved a file without commenting. A human
// writing it by hand would make the unrecorded rate meaningless.
test("unrecorded is a valid code", () => {
  assert.deepEqual(validateReview(drafted({ _review: { under: "unrecorded" } })), []);
});

test("a non-object _review is rejected", () => {
  assert.equal(validateReview(drafted({ _review: "too technical" })).length, 1);
  assert.equal(validateReview(drafted({ _review: ["a"] })).length, 1);
  assert.equal(validateReview(drafted({ _review: null })).length, 1);
});

test("note and reviewer must be strings when present", () => {
  assert.equal(validateReview(drafted({ _review: { note: 42 } })).length, 1);
  assert.equal(validateReview(drafted({ _review: { reviewer: [] } })).length, 1);
});

// Editorial commentary must never reach the live site.
test("stripReviewFields removes _review and $schema without mutating the input", () => {
  const draft = drafted({ _review: { under: "too-vague" }, $schema: "../../schemas/x.json", summary: "s" });
  const clean = stripReviewFields(draft);
  assert.equal(clean._review, undefined);
  assert.equal(clean.$schema, undefined);
  assert.equal(clean.summary, "s");
  assert.ok(draft._review, "input must not be mutated");
});

test("stripReviewFields leaves a draft that has neither field alone", () => {
  assert.deepEqual(stripReviewFields({ id: "x", title: "T" }), { id: "x", title: "T" });
});

test("an event carries the decision, the rationale and the id", () => {
  const e = reviewEvent({
    signal: drafted({ _review: { under: "commercial-intent", note: "n" } }),
    decision: "rejected",
    reviewer: "arto",
    ts: "2026-08-12T09:00:00Z",
  });
  assert.deepEqual(e, {
    ts: "2026-08-12T09:00:00Z",
    id: "2026-08-10-02",
    decision: "rejected",
    by: "human",
    reviewer: "arto",
    under: "commercial-intent",
    note: "n",
  });
});

test("a draft reviewed with no rationale is recorded as unrecorded", () => {
  const e = reviewEvent({ signal: drafted(), decision: "rejected", reviewer: "arto", ts: "2026-08-12T09:00:00Z" });
  assert.equal(e.under, "unrecorded");
  assert.equal(e.note, "");
});

// Matters the moment more than one person reviews on the same checkout.
test("an explicit reviewer in _review beats the caller's default", () => {
  const e = reviewEvent({
    signal: drafted({ _review: { reviewer: "someone-else" } }),
    decision: "accepted",
    reviewer: "arto",
    ts: "2026-08-12T09:00:00Z",
  });
  assert.equal(e.reviewer, "someone-else");
});

// Guessing a name would attribute an editorial decision to someone who did not
// make it, which is worse than recording that nobody was identified.
test("with no reviewer available the field is omitted rather than guessed", () => {
  const e = reviewEvent({ signal: drafted(), decision: "accepted", reviewer: "", ts: "2026-08-12T09:00:00Z" });
  assert.ok(!("reviewer" in e));
});

test("REJECTED_UNDER carries the documented codes", () => {
  for (const code of ["wrong-construct", "commercial-intent", "low-altitude", "unrecorded", "out-of-sector"]) {
    assert.ok(REJECTED_UNDER.includes(code), code);
  }
});
