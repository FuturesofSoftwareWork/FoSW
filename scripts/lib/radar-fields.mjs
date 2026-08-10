/**
 * Which fields of a phenomenon a script may write.
 *
 * Once a phenomenon exists, its wording is research output. A routine run
 * attaching one signal must not be able to rewrite a thesis that took an hour to
 * get right — so `mergeMachineFields` is the only write path onto an existing
 * phenomenon, and touching a human-owned field is not forbidden but unreachable.
 *
 * scripts/__tests__/radar-fields.test.mjs asserts every key of the Phenomenon
 * interface appears in exactly one list. That test is the guard: it fails the day
 * someone adds a field and forgets to classify it.
 */

/** Derived facts. A script computes these; nobody hand-edits them. */
export const MACHINE_OWNED = [
  "evidence",
  "evidenceProfile",
  "firstObserved",
  "latestEvidenceDate",
  // "possibleReachChange" is added in Task 2, with the field itself.
];

/**
 * Research output and human judgment.
 *
 * `observedReach` is the most important entry: it is the whole radar's meaning,
 * and nothing automatic may move it. `construct` is here because it defines what
 * counts as evidence — a script that could rewrite it could redefine the claim.
 * `reachHistory` is here because its entries record judgments; radar:snapshot is
 * out of scope for Phase 2.
 */
export const HUMAN_OWNED = [
  "id",
  "label",
  "title",
  "thesis",
  // "construct" is added in Task 2, with the field itself.
  "currentPressure",
  "status",
  "primaryDimension",
  "potentialImpact",
  "implications",
  "observedReach",
  "reachRationale",
  "reachReviewedAt",
  "contested",
  "contestedNote",
  "lastReviewed",
  "reachHistory",
  "whatWouldChangeThis",
  "developmentPaths",
  "related",
  "indicators",
  "retiredAt",
  "retiredReason",
];

/**
 * Copy `existing`, applying only machine-owned keys from `updates`.
 * The single write path onto a phenomenon that already exists.
 */
export function mergeMachineFields(existing, updates = {}) {
  const out = { ...existing };
  for (const key of MACHINE_OWNED) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) out[key] = updates[key];
  }
  return out;
}
