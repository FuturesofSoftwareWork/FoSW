/**
 * The review vocabulary, in one place.
 *
 * These codes are not new. The sector and claim prompts have required
 * `rejectedUnder` on every decline for a while, and every rejection line in
 * `data/` carries one. What was missing is the other half: a human moving a
 * draft into `rejected/` recorded no rationale at all, and `promote` discarded
 * the agent's on the way into the ledger. This lifts the vocabulary to where a
 * reviewer, the promote step and the editor's JSON Schema can all share it.
 *
 * Two codes are additions. `low-altitude` is the generic prompt's most-used
 * rule and had no code. `unrecorded` is written only by code, for a draft moved
 * without a comment — a human writing it by hand would make the unrecorded rate
 * meaningless.
 *
 * Design: docs/superpowers/specs/2026-08-12-source-profiles-and-review-log-design.md
 */

export const REJECTED_UNDER = [
  "out-of-sector",
  "wrong-construct",
  "outside-window",
  "too-vague",
  "stale-fieldwork",
  "no-original-data",
  "overlaps-published",
  "unverifiable-source",
  "not-primary-source",
  "commercial-intent",
  "already-in-ledger",
  "low-altitude",
  "unrecorded",
];

/**
 * Check a draft's `_review` block. Every subfield is optional and an absent
 * block is valid — a bare `mv` has to keep working, or an interrupted review
 * becomes a batch that refuses to promote.
 *
 * Returns an array of human-readable problems; empty means valid.
 */
export function validateReview(s) {
  const r = s?._review;
  if (r === undefined) return [];
  if (typeof r !== "object" || r === null || Array.isArray(r)) {
    return ["'_review' must be an object"];
  }

  const errors = [];
  if (r.under !== undefined && !REJECTED_UNDER.includes(r.under)) {
    errors.push(`_review.under = ${JSON.stringify(r.under)} is not one of ${REJECTED_UNDER.join(" | ")}`);
  }
  for (const field of ["note", "reviewer"]) {
    if (r[field] !== undefined && typeof r[field] !== "string") {
      errors.push(`_review.${field} must be a string, got ${typeof r[field]}`);
    }
  }
  return errors;
}

/**
 * Drop the editorial working fields before a draft becomes published content.
 *
 * `_review` is a candid judgement about a named source and `$schema` is an
 * editor affordance; neither belongs on the live site. Returns a copy — the
 * caller still needs the original to build the log event.
 */
export function stripReviewFields(signal) {
  const rest = { ...signal };
  delete rest._review;
  delete rest.$schema;
  return rest;
}

/**
 * One review-log line for one human decision.
 *
 * The shape is deliberately the one an app would store: `reviewer` is filled by
 * auth, `note` is the comment box, `under` is the dropdown, and `by`
 * distinguishes this from the finder's own declines in the same stream.
 */
export function reviewEvent({ signal, decision, reviewer, ts }) {
  const r = signal?._review ?? {};
  const event = {
    ts,
    id: signal?.id ?? "",
    decision,
    by: "human",
    reviewer: r.reviewer ?? reviewer,
    under: r.under ?? "unrecorded",
    note: r.note ?? "",
  };
  // Better to record that nobody was identified than to attribute an editorial
  // decision to someone who did not make it.
  if (!event.reviewer) delete event.reviewer;
  return event;
}
