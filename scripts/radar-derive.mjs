#!/usr/bin/env node
/**
 * Recompute every derived value on every phenomenon, and flag reach candidates.
 *
 * Mechanical work only. Nothing here decides where a blip sits: possibleReachChange
 * names what prompted a second look and carries no ring, because reach is a human
 * judgment and a script naming a target ring is most of the way to deciding it.
 *
 *   node scripts/radar-derive.mjs
 */

import { writeFileSync } from "fs";
import { resolve, join } from "path";
import { readIndex, readItems, indexById } from "./lib/content.mjs";
import { deriveEvidenceProfile, deriveDates } from "./lib/derive.mjs";
import { mergeMachineFields } from "./lib/radar-fields.mjs";

const PHENOMENA_DIR = "public/content/phenomena";
const SIGNALS_DIR = "public/content/ai-signals";

/**
 * Derived values for one phenomenon, plus a reviewer note.
 *
 * The reach candidate compares the fresh profile against the STORED one rather
 * than re-filtering evidence by date. Detached evidence is gone from the array,
 * so a date filter can only ever see additions — and a claim run that strips
 * off-construct evidence produces exactly the decrease that matters most.
 *
 * `changedSignalIds` is what the caller just attached or detached. The candidate's
 * signalIds exist so a reviewer can tell "three new contexts appeared" from "three
 * of your four were removed" — and on a loss the removed ids are already gone from
 * `evidence`, so the surviving ids name precisely what did NOT change. radar:apply
 * knows what it moved and passes it; standalone radar:derive cannot recover it and
 * falls back to the current evidence ids.
 */
export function deriveOne(phenomenon, signalsById, { today, changedSignalIds } = {}) {
  const evidenceProfile = deriveEvidenceProfile(phenomenon, signalsById);
  const { firstObserved, latestEvidenceDate } = deriveDates(phenomenon, signalsById);

  const stored = phenomenon.evidenceProfile;
  const previous = phenomenon.possibleReachChange ?? null;
  const reviewedAt = phenomenon.reachReviewedAt;
  const signalIds = Array.isArray(changedSignalIds)
    ? [...changedSignalIds]
    : (phenomenon.evidence || []).map((e) => e.signalId);

  let possibleReachChange = null;

  // A candidate stays up until a human has looked at reach since it was raised.
  // Clearing it on a quiet run would drop a review nobody performed.
  const stillOutstanding =
    previous && (!reviewedAt || !previous.raisedAt || reviewedAt < previous.raisedAt);

  if (stored && stored.independentContexts !== evidenceProfile.independentContexts) {
    const delta = evidenceProfile.independentContexts - stored.independentContexts;
    const reason =
      delta > 0
        ? `gained ${delta} independent context(s) since reach was last reviewed ` +
          `(${stored.independentContexts} -> ${evidenceProfile.independentContexts})`
        : `lost ${-delta} independent context(s) since reach was last reviewed ` +
          `(${stored.independentContexts} -> ${evidenceProfile.independentContexts}); ` +
          `the blip may need to move outward`;
    possibleReachChange = { reason, raisedAt: today, signalIds };
  } else if (stillOutstanding) {
    possibleReachChange = previous;
  }

  // contested is human-owned; derive only says a reviewer should look.
  const note =
    evidenceProfile.counterEvidence && !phenomenon.contested
      ? `${phenomenon.id}: counter-evidence present but 'contested' is not set. ` +
        `Check the counter items measure this phenomenon's construct — off-construct ` +
        `counter-evidence manufactures contestation.`
      : null;

  return {
    updates: { evidenceProfile, firstObserved, latestEvidenceDate, possibleReachChange },
    reachChangeNote: note,
  };
}

export function derive({ root = process.cwd(), today = new Date().toISOString().slice(0, 10) } = {}) {
  const phenomenaDir = resolve(root, PHENOMENA_DIR);
  const signalsDir = resolve(root, SIGNALS_DIR);
  const errors = [];

  let items = [];
  let signalsById = new Map();
  try {
    const dir = signalsDir;
    const result = readItems(dir, readIndex(dir));
    signalsById = indexById(result.items);
    errors.push(...result.errors);
  } catch (e) {
    errors.push(e.message);
  }
  try {
    const loaded = readItems(phenomenaDir, readIndex(phenomenaDir));
    items = loaded.items;
    errors.push(...loaded.errors);
  } catch (e) {
    errors.push(e.message);
  }
  if (errors.length) return { changed: [], notes: [], errors };

  const changed = [];
  const notes = [];
  for (const { file, data } of items) {
    const { updates, reachChangeNote } = deriveOne(data, signalsById, { today });
    if (reachChangeNote) notes.push(reachChangeNote);
    // Through the allowlist, not a raw spread: mergeMachineFields is meant to be the
    // single write path onto an existing phenomenon in fact, not only in the docs.
    const next = mergeMachineFields(data, updates);
    // A field that computed to null and was never on this phenomenon before
    // (possibleReachChange on content predating this script, chiefly) is not a
    // real change — just the field's absence written out explicitly. Writing
    // that null would rewrite every old file on the first run for no reason.
    // Once a key IS present, though, a later null is a real clearing and stays.
    for (const key of Object.keys(updates)) {
      if (next[key] === null && !(key in data)) delete next[key];
    }
    if (JSON.stringify(next) !== JSON.stringify(data)) {
      writeFileSync(join(phenomenaDir, file), JSON.stringify(next, null, 2) + "\n", "utf8");
      changed.push(data.id);
    }
  }
  return { changed, notes, errors: [] };
}

function main() {
  const result = derive();
  if (result.errors.length) {
    console.error(`radar:derive: ${result.errors.length} problem(s)\n`);
    result.errors.forEach((e) => console.error("  " + e));
    process.exit(1);
  }
  console.log(`radar:derive: ${result.changed.length} phenomena updated`);
  result.changed.forEach((id) => console.log(`  -> ${id}`));
  result.notes.forEach((n) => console.log(`  ! ${n}`));
}

if (process.argv[1] && process.argv[1].endsWith("radar-derive.mjs")) main();
