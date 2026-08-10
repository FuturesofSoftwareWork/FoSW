#!/usr/bin/env node
/**
 * Decline a draft phenomenon: record the decision, then remove the file.
 *
 * Deleting the file is what releases its signals — "covered" is derived from
 * files on disk, not stored — so the release needs no machinery. The store exists
 * for the second problem: without it the next clustering run re-proposes the
 * cluster just declined, and rejection-by-absence cannot tell a considered
 * decline from an accidental rm.
 *
 * Refuses a published phenomenon. Removing something already on the site, with
 * deep links pointing at it, is retirement — a different act, out of scope.
 *
 *   node scripts/radar-reject.mjs <id> [<id>...] --reason "why"
 */

import { appendFileSync, readFileSync, existsSync, rmSync, mkdirSync, writeFileSync } from "fs";
import { resolve, join } from "path";
import { readIndex, readItems } from "./lib/content.mjs";

const PHENOMENA_DIR = "public/content/phenomena";
const STORE_FILE = "data/_radar-rejected.jsonl";

const writeJson = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + "\n", "utf8");
const nowStamp = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

function alreadyRejected(root) {
  const file = resolve(root, STORE_FILE);
  if (!existsSync(file)) return new Set();
  const ids = new Set();
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const text = line.trim();
    if (!text) continue;
    try { ids.add(JSON.parse(text).id); } catch { /* skip malformed */ }
  }
  return ids;
}

export function reject({ root = process.cwd(), ids = [], reason = "", today = new Date().toISOString().slice(0, 10) } = {}) {
  const phenomenaDir = resolve(root, PHENOMENA_DIR);
  const errors = [];

  if (!ids.length) return { rejected: [], released: [], errors: ["no phenomenon ids given"] };
  if (!String(reason).trim()) {
    return { rejected: [], released: [], errors: ["--reason is required: a decline with no stated reason is not a decision"] };
  }

  let items = [];
  let phenomenaIndex = null;
  try {
    phenomenaIndex = readIndex(phenomenaDir);
    const result = readItems(phenomenaDir, phenomenaIndex);
    items = result.items;
    errors.push(...result.errors);
  } catch (e) {
    errors.push(e.message);
  }
  if (errors.length) return { rejected: [], released: [], errors };

  const byId = new Map(items.map(({ file, data }) => [data.id, { file, data }]));
  const seen = alreadyRejected(root);

  const targets = [];
  for (const id of ids) {
    if (seen.has(id) && !byId.has(id)) continue; // already rejected — no-op
    const entry = byId.get(id);
    if (!entry) { errors.push(`'${id}': no such phenomenon`); continue; }
    if (entry.data.status !== "draft") {
      errors.push(`'${id}': status is '${entry.data.status}' — only a draft may be rejected (published is retirement)`);
      continue;
    }
    targets.push(entry);
  }

  if (errors.length) return { rejected: [], released: [], errors };

  // Append before deleting: an interrupted run should lose a file whose record
  // already exists, never a decision with no trace.
  mkdirSync(resolve(root, "data"), { recursive: true });
  const released = [];
  const rejected = [];
  for (const { file, data } of targets) {
    const signalIds = (data.evidence || []).map((e) => e.signalId);
    appendFileSync(
      resolve(root, STORE_FILE),
      JSON.stringify({ id: data.id, label: data.label, thesis: data.thesis, signalIds, reason, at: today }) + "\n",
      "utf8",
    );
    rmSync(join(phenomenaDir, file));
    phenomenaIndex.items = phenomenaIndex.items.filter((i) => i.id !== data.id);
    released.push(...signalIds);
    rejected.push(data.id);
  }

  if (rejected.length) {
    phenomenaIndex.lastUpdated = nowStamp();
    writeJson(join(phenomenaDir, "index.json"), phenomenaIndex);
  }

  return { rejected, released: [...new Set(released)], errors: [] };
}

function flag(name, fallback = "") {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  const value = process.argv[i + 1];
  return value === undefined || value.startsWith("--") ? fallback : value;
}

function main() {
  const reason = flag("--reason");
  const ids = process.argv.slice(2).filter((a, i, all) => !a.startsWith("--") && all[i - 1] !== "--reason");

  const result = reject({ ids, reason });
  if (result.errors.length) {
    console.error(`radar:reject: ${result.errors.length} problem(s) — nothing was removed\n`);
    result.errors.forEach((e) => console.error("  " + e));
    process.exit(1);
  }
  console.log(`radar:reject: ${result.rejected.length} declined`);
  result.rejected.forEach((id) => console.log(`  -> ${id}`));
  if (result.released.length) {
    console.log(`  ${result.released.length} signal(s) released back to the uncovered pool`);
  }
}

if (process.argv[1] && process.argv[1].endsWith("radar-reject.mjs")) main();
