#!/usr/bin/env node
/**
 * Build the digest the clustering prompt reads.
 *
 * Selects published signals that no phenomenon cites. "Uncovered" rather than a
 * date window because draft staging decoupled a signal's date from when it was
 * published: a signal can sit in data/signal-drafts/accepted/ for weeks, so its
 * date predates the last run's cutoff and a date filter skips it silently.
 *
 * The per-dimension coverage table is printed for the reviewer and deliberately
 * kept OUT of the digest. Two sectors have no phenomenon, and handing a model a
 * gap it is told not to fill is not a control — primaryDimension is a property of
 * what a phenomenon claims, not of what is missing.
 *
 *   node scripts/radar-prepare.mjs [--all] [--since YYYY-MM-DD] [--out FILE]
 */

import { writeFileSync, existsSync, readFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { readIndex, readItems } from "./lib/content.mjs";
import { WORK_DIMENSION_IDS } from "./lib/phenomenon-schema.mjs";

const SIGNALS_DIR = "public/content/ai-signals";
const PHENOMENA_DIR = "public/content/phenomena";
const REJECTED_FILE = "data/_radar-rejected.jsonl";
const DEFAULT_OUT = "data/_radar-input.json";

/** Fields the model needs to judge a signal. Deliberately not the whole record. */
const digestSignal = (s) => ({
  id: s.id,
  title: s.title,
  summary: s.summary,
  source: s.source,
  date: s.date,
  category: s.category,
  tags: s.tags,
  signalType: s.signalType,
  signalStrength: s.signalStrength,
  signalStage: s.signalStage,
  whyItMatters: s.whyItMatters,
});

/** Enough to attach to a phenomenon or avoid re-proposing it — not its evidence. */
const digestPhenomenon = (p) => ({
  id: p.id,
  label: p.label,
  title: p.title,
  thesis: p.thesis,
  construct: p.construct,
  primaryDimension: p.primaryDimension,
  status: p.status,
  citedSignalIds: (p.evidence || []).map((e) => e.signalId),
});

function readRejected(root) {
  const file = resolve(root, REJECTED_FILE);
  if (!existsSync(file)) return [];
  const out = [];
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const text = line.trim();
    if (!text) continue;
    try {
      out.push(JSON.parse(text));
    } catch {
      console.warn(`  ! skipping malformed line in ${REJECTED_FILE}`);
    }
  }
  return out;
}

export function prepare({ root = process.cwd(), all = false, since = null, out = null } = {}) {
  const errors = [];
  let signalItems = [];
  let phenomenonItems = [];

  try {
    const dir = resolve(root, SIGNALS_DIR);
    const result = readItems(dir, readIndex(dir));
    signalItems = result.items;
    errors.push(...result.errors);
  } catch (e) {
    errors.push(e.message);
  }
  try {
    const dir = resolve(root, PHENOMENA_DIR);
    const result = readItems(dir, readIndex(dir));
    phenomenonItems = result.items;
    errors.push(...result.errors);
  } catch (e) {
    errors.push(e.message);
  }
  if (errors.length) return { digest: null, coverage: {}, undecided: 0, errors };

  const phenomena = phenomenonItems.map(({ data }) => data);

  // Covered means cited by ANY phenomenon, drafts included: a draft still under
  // consideration owns its evidence. radar:reject releases it.
  const covered = new Set();
  for (const p of phenomena) {
    for (const ev of p.evidence || []) covered.add(ev.signalId);
  }

  const signals = signalItems
    .map(({ data }) => data)
    .filter((s) => s.status === "published")
    .filter((s) => all || !covered.has(s.id))
    .filter((s) => !since || (typeof s.date === "string" && s.date >= since))
    .map(digestSignal);

  const coverage = Object.fromEntries(WORK_DIMENSION_IDS.map((id) => [id, 0]));
  for (const p of phenomena) {
    if (p.primaryDimension in coverage) coverage[p.primaryDimension] += 1;
  }

  const digest = {
    generatedAt: new Date().toISOString().slice(0, 10),
    phenomena: phenomena.map(digestPhenomenon),
    signals,
    rejectedClusters: readRejected(root),
  };

  const undecided = phenomena.filter((p) => p.status === "draft").length;

  if (out) {
    const path = resolve(root, out);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(digest, null, 2) + "\n", "utf8");
  }

  return { digest, coverage, undecided, errors: [] };
}

export function flag(name, fallback = null) {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  const value = process.argv[i + 1];
  return value === undefined || value.startsWith("--") ? fallback : value;
}

function main() {
  const out = flag("--out", DEFAULT_OUT);
  const result = prepare({
    all: process.argv.includes("--all"),
    since: flag("--since"),
    out,
  });

  if (result.errors.length) {
    console.error(`radar:prepare: ${result.errors.length} problem(s)\n`);
    result.errors.forEach((e) => console.error("  " + e));
    process.exit(1);
  }

  const n = result.digest.signals.length;
  console.log(
    n === 0
      ? "radar:prepare: nothing to cluster — every published signal is already cited"
      : `radar:prepare: ${n} uncovered signal(s) -> ${out}`,
  );
  console.log("\n  phenomena per dimension (for you, not for the model):");
  for (const [id, count] of Object.entries(result.coverage)) {
    console.log(`    ${count === 0 ? "!" : " "} ${String(count).padStart(2)}  ${id}`);
  }
  if (result.undecided) {
    console.log(`\n  ${result.undecided} draft phenomena awaiting accept or reject`);
  }
}

if (process.argv[1] && process.argv[1].endsWith("radar-prepare.mjs")) main();
