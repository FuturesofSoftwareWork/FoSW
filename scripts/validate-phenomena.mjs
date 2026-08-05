#!/usr/bin/env node
/**
 * Validates every phenomenon referenced by public/content/phenomena/index.json.
 *
 * Phenomena are runtime-fetched and never type-checked, so this script is the only
 * enforcement of their schema. It checks *form, not judgment*: it verifies that a
 * reach call carries a rationale and a review date, never whether the call is right.
 * That question belongs to review.
 *
 *   node scripts/validate-phenomena.mjs
 *
 * Exits 1 if any phenomenon is invalid.
 */

import { readIndex, readItems, indexById } from "./lib/content.mjs";
import {
  OBSERVED_REACH,
  EVIDENCE_STANCES,
  POTENTIAL_IMPACTS,
  RELATIONS,
  PHENOMENON_STATUSES,
  WORK_DIMENSION_IDS,
  ACTOR_IDS,
  REQUIRED_FIELDS,
} from "./lib/phenomenon-schema.mjs";

const PHENOMENA_DIR = "public/content/phenomena";
const SIGNALS_DIR = "public/content/ai-signals";

const isBlank = (v) => typeof v !== "string" || v.trim() === "";

/**
 * @param {object} p        the phenomenon
 * @param {{signalsById: Map, phenomenonIds: Set<string>}} ctx
 * @returns {string[]} one message per problem
 */
// ctx is part of the exported interface Task 7's cross-reference and derived-value checks
// read from; kept here now so the signature does not change between tasks and the CLI/tests
// already pass it.
// eslint-disable-next-line no-unused-vars
export function validatePhenomenon(p, ctx) {
  const errors = [];
  const e = (msg) => errors.push(msg);
  const published = p.status === "published";

  for (const field of REQUIRED_FIELDS) {
    if (p[field] == null || p[field] === "") e(`missing required field '${field}'`);
  }

  if (!PHENOMENON_STATUSES.includes(p.status)) {
    e(`status ${JSON.stringify(p.status)} must be one of ${PHENOMENON_STATUSES.join(" | ")}`);
  }
  if (p.observedReach !== undefined && !OBSERVED_REACH.includes(p.observedReach)) {
    e(`observedReach ${JSON.stringify(p.observedReach)} is not one of ${OBSERVED_REACH.join(" | ")}`);
  }
  if (p.potentialImpact !== undefined && !POTENTIAL_IMPACTS.includes(p.potentialImpact)) {
    e(`potentialImpact ${JSON.stringify(p.potentialImpact)} is not one of ${POTENTIAL_IMPACTS.join(" | ")}`);
  }
  if (p.primaryDimension !== undefined && !WORK_DIMENSION_IDS.includes(p.primaryDimension)) {
    e(`primaryDimension ${JSON.stringify(p.primaryDimension)} is not a known work dimension`);
  }

  // A ring position without a stated reason is unreviewable.
  if (isBlank(p.reachRationale)) e("reachRationale must be present and non-empty");
  if (isBlank(p.reachReviewedAt)) e("reachReviewedAt must be present");

  // The label sits beside a dot on the radar; anything longer does not fit.
  if (typeof p.label === "string" && p.label.trim().split(/\s+/).length > 4) {
    e(`label has ${p.label.trim().split(/\s+/).length} words (max 4)`);
  }
  if (!isBlank(p.title) && !isBlank(p.thesis) && p.title.trim() === p.thesis.trim()) {
    e("title and thesis must be distinct");
  }

  const implications = Array.isArray(p.implications) ? p.implications : [];
  if (!Array.isArray(p.implications)) e("'implications' must be an array");
  implications.forEach((im, i) => {
    if (!WORK_DIMENSION_IDS.includes(im?.dimension)) {
      e(`implications[${i}].dimension ${JSON.stringify(im?.dimension)} is not a known work dimension`);
    }
    if (isBlank(im?.statement)) e(`implications[${i}].statement must be a non-empty string`);
    for (const a of im?.actors || []) {
      if (!ACTOR_IDS.includes(a)) e(`implications[${i}].actors contains unknown actor ${JSON.stringify(a)}`);
    }
  });

  const evidence = Array.isArray(p.evidence) ? p.evidence : [];
  if (!Array.isArray(p.evidence)) e("'evidence' must be an array");
  evidence.forEach((ev, i) => {
    if (!EVIDENCE_STANCES.includes(ev?.stance)) {
      e(`evidence[${i}].stance ${JSON.stringify(ev?.stance)} is not one of ${EVIDENCE_STANCES.join(" | ")}`);
    }
    if (typeof ev?.primary !== "boolean") e(`evidence[${i}].primary must be true or false`);
  });

  const related = Array.isArray(p.related) ? p.related : [];
  if (p.related !== undefined && !Array.isArray(p.related)) e("'related' must be an array");
  for (const r of related) {
    if (!RELATIONS.includes(r?.relation)) {
      e(`related relation ${JSON.stringify(r?.relation)} is not one of ${RELATIONS.join(" | ")}`);
    }
  }

  if (p.contested === true && isBlank(p.contestedNote)) {
    e("contestedNote is required when contested is true");
  }

  // Editorial minimums apply to published phenomena only — drafts are work in
  // progress and are visible in preview builds precisely so they can be unfinished.
  if (published) {
    if (implications.length < 2) {
      e("a published phenomenon needs at least two implications — one that says nothing about software work does not belong on this radar");
    }
    if (p.primaryDimension && !implications.some((im) => im?.dimension === p.primaryDimension)) {
      e("primaryDimension must also appear as an implication dimension");
    }
    if (!evidence.some((ev) => ev?.stance === "supports")) {
      e("a published phenomenon needs at least one 'supports' evidence item — with only contextual evidence this is a diagnosis of the present, not a transformation");
    }
  }

  return errors;
}

// --- CLI ---------------------------------------------------------------------

function main() {
  let phenomenaIndex;
  try {
    phenomenaIndex = readIndex(PHENOMENA_DIR);
  } catch (err) {
    console.error(`validate-phenomena: ${err.message}`);
    process.exit(1);
  }

  const signalsIndex = readIndex(SIGNALS_DIR);
  const { items: signalItems } = readItems(SIGNALS_DIR, signalsIndex);
  const signalsById = indexById(signalItems);

  const { items, errors: loadErrors } = readItems(PHENOMENA_DIR, phenomenaIndex);
  const phenomenonIds = new Set(items.map(({ data }) => data.id));
  const problems = [...loadErrors];

  for (const { file, data } of items) {
    for (const msg of validatePhenomenon(data, { signalsById, phenomenonIds })) {
      problems.push(`${file}: ${msg}`);
    }
  }

  if (problems.length) {
    console.error(`validate-phenomena: ${problems.length} problem(s) found\n`);
    problems.forEach((p) => console.error("  " + p));
    process.exit(1);
  }
  console.log(`validate-phenomena: OK — ${items.length} phenomena valid`);
}

// Only run the CLI when invoked directly, so importing this module for tests is safe.
if (process.argv[1] && process.argv[1].endsWith("validate-phenomena.mjs")) main();
