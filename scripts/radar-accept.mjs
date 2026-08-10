#!/usr/bin/env node
/**
 * Publish reviewed draft phenomena.
 *
 * The accept gate. It is split out of radar:apply so lastReviewed is honest —
 * apply runs before anyone has looked, so stamping it there would claim a review
 * that had not happened, on exactly the phenomena where staleness matters most.
 *
 * A phenomenon with no reachReviewedAt has never had its reach judged by a human,
 * and that date is the only machine-checkable trace that the conversation
 * happened. It is refused here rather than caught at build time.
 *
 *   node scripts/radar-accept.mjs <id> [<id>...]
 */

import { writeFileSync } from "fs";
import { resolve, join } from "path";
import { spawnSync } from "child_process";
import { readIndex, readItems, indexById } from "./lib/content.mjs";

const PHENOMENA_DIR = "public/content/phenomena";
const SIGNALS_DIR = "public/content/ai-signals";

const writeJson = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + "\n", "utf8");
const nowStamp = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const isBlank = (v) => typeof v !== "string" || v.trim() === "";

export function accept({ root = process.cwd(), ids = [], today = new Date().toISOString().slice(0, 10) } = {}) {
  const phenomenaDir = resolve(root, PHENOMENA_DIR);
  const signalsDir = resolve(root, SIGNALS_DIR);
  const errors = [];
  const warnings = [];

  if (!ids.length) return { accepted: [], warnings, errors: ["no phenomenon ids given"] };

  let signalsById = new Map();
  let items = [];
  let phenomenaIndex = null;
  try {
    const result = readItems(signalsDir, readIndex(signalsDir));
    signalsById = indexById(result.items);
    errors.push(...result.errors);
  } catch (e) {
    errors.push(e.message);
  }
  try {
    phenomenaIndex = readIndex(phenomenaDir);
    const result = readItems(phenomenaDir, phenomenaIndex);
    items = result.items;
    errors.push(...result.errors);
  } catch (e) {
    errors.push(e.message);
  }
  if (errors.length) return { accepted: [], warnings, errors };

  const byId = new Map(items.map(({ file, data }) => [data.id, { file, data }]));

  // ---- check every id before writing anything ----
  for (const id of ids) {
    const entry = byId.get(id);
    if (!entry) { errors.push(`'${id}': no such phenomenon`); continue; }
    const p = entry.data;

    if (p.status !== "draft") { errors.push(`'${id}': status is '${p.status}', not 'draft'`); continue; }

    if (isBlank(p.reachReviewedAt)) {
      errors.push(
        `'${id}': no reachReviewedAt — reach has never been judged by a human. ` +
          `Run the reach review before accepting.`,
      );
    }
    if (isBlank(p.construct)) {
      errors.push(`'${id}': no construct — a published phenomenon must state what its evidence measures`);
    }

    // The published-only editorial minimums, pre-checked so a failure is a refusal
    // rather than a red build that blocks everyone from building anything.
    const implications = Array.isArray(p.implications) ? p.implications : [];
    if (implications.length < 2) {
      errors.push(`'${id}': a published phenomenon needs at least two implications`);
    }
    const supports = (p.evidence || []).filter((e) => e.stance === "supports");
    if (supports.length < 1) {
      errors.push(`'${id}': a published phenomenon needs at least one 'supports' evidence item`);
    }
    for (const ev of supports) {
      const s = signalsById.get(ev.signalId);
      if (s && !s.signalType) {
        errors.push(`'${id}': supporting signal '${ev.signalId}' has no signalType`);
      }
    }

    // Not a refusal: reach may still be right, but it was judged without the newest
    // evidence in front of the reviewer.
    if (!isBlank(p.reachReviewedAt) && p.latestEvidenceDate && p.reachReviewedAt < p.latestEvidenceDate) {
      warnings.push(
        `'${id}': reach was judged ${p.reachReviewedAt}, before the newest evidence (${p.latestEvidenceDate})`,
      );
    }
  }

  if (errors.length) return { accepted: [], warnings, errors };

  const accepted = [];
  for (const id of ids) {
    const { file, data } = byId.get(id);
    writeJson(join(phenomenaDir, file), { ...data, status: "published", lastReviewed: today });
    const entry = phenomenaIndex.items.find((i) => i.id === id);
    if (entry) entry.status = "published";
    accepted.push(id);
  }
  phenomenaIndex.lastUpdated = nowStamp();
  writeJson(join(phenomenaDir, "index.json"), phenomenaIndex);

  return { accepted, warnings, errors: [] };
}

function main() {
  const ids = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const result = accept({ ids });

  if (result.errors.length) {
    console.error(`radar:accept: ${result.errors.length} problem(s) — nothing was published\n`);
    result.errors.forEach((e) => console.error("  " + e));
    process.exit(1);
  }
  result.warnings.forEach((w) => console.log(`  ! ${w}`));
  console.log(`radar:accept: ${result.accepted.length} published`);
  result.accepted.forEach((id) => console.log(`  -> ${id}`));

  const check = spawnSync(process.execPath, ["scripts/validate-phenomena.mjs"], { stdio: "inherit" });
  if (check.status !== 0) process.exit(check.status ?? 1);
}

if (process.argv[1] && process.argv[1].endsWith("radar-accept.mjs")) main();
