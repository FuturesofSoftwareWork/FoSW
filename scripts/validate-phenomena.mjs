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

import { readdirSync } from "fs";
import { resolve } from "path";
import { readIndex, readItems, indexById } from "./lib/content.mjs";
import { deriveEvidenceProfile, deriveDates } from "./lib/derive.mjs";
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

  // A dangling reference is the most likely error here and the least visible on the
  // page — the blip simply renders with less evidence than it claims.
  evidence.forEach((ev, i) => {
    const signal = ctx.signalsById.get(ev?.signalId);
    if (!signal) {
      e(`evidence[${i}].signalId ${JSON.stringify(ev?.signalId)} does not resolve to a known signal`);
    } else if (signal.status !== "published") {
      e(`evidence[${i}].signalId ${JSON.stringify(ev?.signalId)} refers to a signal that is not published`);
    }
  });

  const pathIds = new Set((p.developmentPaths || []).map((d) => d?.id));
  implications.forEach((im, i) => {
    for (const pid of im?.pathIds || []) {
      if (!pathIds.has(pid)) e(`implications[${i}].pathIds contains ${JSON.stringify(pid)}, which is not a declared developmentPath`);
    }
  });

  const related = Array.isArray(p.related) ? p.related : [];
  if (p.related !== undefined && !Array.isArray(p.related)) e("'related' must be an array");
  for (const r of related) {
    if (!RELATIONS.includes(r?.relation)) {
      e(`related relation ${JSON.stringify(r?.relation)} is not one of ${RELATIONS.join(" | ")}`);
    }
    if (r?.id && !ctx.phenomenonIds.has(r.id)) {
      e(`related id ${JSON.stringify(r.id)} does not resolve to a known phenomenon`);
    }
  }

  if (p.contested === true && isBlank(p.contestedNote)) {
    e("contestedNote is required when contested is true");
  }

  // Derived values are written by the pipeline. A mismatch means someone hand-edited
  // them, which would make the drawer's evidence sentence describe a corpus that
  // does not exist.
  const derivedProfile = deriveEvidenceProfile(p, ctx.signalsById);
  if (p.evidenceProfile) {
    for (const key of ["independentContexts", "evidenceTypes", "quartersSpanned", "counterEvidence"]) {
      if (p.evidenceProfile[key] !== derivedProfile[key]) {
        e(`evidenceProfile.${key} is ${JSON.stringify(p.evidenceProfile[key])} but derives to ${JSON.stringify(derivedProfile[key])}`);
      }
    }
  }

  const derivedDates = deriveDates(p, ctx.signalsById);
  if (p.firstObserved && p.firstObserved !== derivedDates.firstObserved) {
    e(`firstObserved is ${p.firstObserved} but derives to ${derivedDates.firstObserved}`);
  }
  if (p.latestEvidenceDate && p.latestEvidenceDate !== derivedDates.latestEvidenceDate) {
    e(`latestEvidenceDate is ${p.latestEvidenceDate} but derives to ${derivedDates.latestEvidenceDate}`);
  }

  // Ring movement must always be auditable after the fact.
  const history = p.reachHistory || [];
  if (history.length > 0) {
    const last = history[history.length - 1];
    if (last?.observedReach !== p.observedReach) {
      e(`observedReach is '${p.observedReach}' but the latest reachHistory entry records '${last?.observedReach}' — every reach change needs a history entry`);
    }
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

  for (const { file, data } of items) {
    if (data.id && `${data.id}.json` !== file) {
      problems.push(`${file}: id '${data.id}' does not match the filename`);
    }
  }

  for (const file of readdirSync(resolve(PHENOMENA_DIR))) {
    // Vite copies public/ into dist, so a pipeline working file left here would be
    // published on the live site. Fail the build rather than deploy it.
    if (file.startsWith("_")) {
      problems.push(`${file}: pipeline working file found under public/ — move it to data/`);
      continue;
    }
    if (file === "index.json" || file === "editions.json" || !file.endsWith(".json")) continue;
    if (!items.some((it) => it.file === file)) {
      problems.push(`${file}: exists on disk but is not listed in index.json (invisible to the site)`);
    }
  }

  if (problems.length) {
    console.error(`validate-phenomena: ${problems.length} problem(s) found\n`);
    problems.forEach((p) => console.error("  " + p));
    process.exit(1);
  }

  const publishedSignals = signalItems.filter(({ data }) => data.status === "published").length;
  const covered = new Set();
  for (const { data } of items) {
    for (const ev of data.evidence || []) covered.add(ev.signalId);
  }
  const publishedCount = items.filter(({ data }) => data.status === "published").length;
  const gate = publishedCount >= 10 ? "OPEN" : `closed (${10 - publishedCount} more needed)`;

  console.log(
    `validate-phenomena: OK — ${items.length} phenomena valid ` +
      `(${publishedCount} published, launch gate ${gate})\n` +
      `  coverage: ${covered.size} of ${publishedSignals} published signals map to a phenomenon`
  );
}

// Only run the CLI when invoked directly, so importing this module for tests is safe.
if (process.argv[1] && process.argv[1].endsWith("validate-phenomena.mjs")) main();
