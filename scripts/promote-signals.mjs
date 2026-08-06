#!/usr/bin/env node
/**
 * Promote reviewed signal drafts into the published site content.
 *
 * The finder agent writes one draft per selected signal into
 * data/signal-drafts/. A human sorts them:
 *
 *   data/signal-drafts/            still to review — this script never touches it
 *   data/signal-drafts/accepted/   -> public/content/ai-signals/ + index.json
 *   data/signal-drafts/rejected/   -> recorded in the seen-ledger, file stays put
 *
 * Because nothing sits between the agent and the drafts folder, this script is
 * the only schema gate before content reaches the live site. It therefore
 * validates the whole batch first and moves nothing if any file fails: a
 * half-moved batch would leave accepted/ partly emptied with no record of which
 * failures were real.
 *
 *   node scripts/promote-signals.mjs
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, rmSync, mkdirSync } from "fs";
import { resolve, join } from "path";
import { spawnSync } from "child_process";
import { validateSignal } from "./lib/signal-schema.mjs";
import { appendRecords, recordFromSignal, keyFor } from "./ledger.mjs";

const SIGNALS_DIR = "public/content/ai-signals";
const DRAFTS_DIR = "data/signal-drafts";

const today = () => new Date().toISOString().slice(0, 10);
// index.json stores second-precision timestamps; toISOString adds milliseconds.
const nowStamp = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

/** Every *.json in a directory, as {file, path} — missing directory means none. */
function listJson(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((file) => ({ file, path: join(dir, file) }));
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}

/** Ledger records for the finder's own declines, from the append-only .jsonl stores. */
function finderRejections(dataDir) {
  if (!existsSync(dataDir)) return [];
  const out = [];
  for (const file of readdirSync(dataDir)) {
    if (!file.startsWith("_finder-rejected") || !file.endsWith(".jsonl")) continue;
    const lines = readFileSync(join(dataDir, file), "utf8").split("\n");
    for (const line of lines) {
      const text = line.trim();
      if (!text) continue;
      let r;
      try {
        r = JSON.parse(text);
      } catch {
        console.warn(`  ! skipping malformed line in ${file}: ${text.slice(0, 80)}`);
        continue;
      }
      const claim = r.claim || "";
      const url = r.url || "";
      const seen = r.run || today();
      out.push({
        key: keyFor({ url, claim }),
        claim,
        url,
        firstSeen: seen,
        lastSeen: seen,
        timesSeen: 1,
        status: "rejected",
        id: r.id || "",
      });
    }
  }
  return out;
}

/**
 * Move accepted drafts into published content and record every decision.
 *
 * `root` is the repo root; it is a parameter so the tests can build an isolated
 * tree rather than mutating real content.
 *
 * Returns { promoted, rejected, queued, errors }. A non-empty `errors` means
 * nothing was moved at all.
 */
export function promote({ root = process.cwd() } = {}) {
  const signalsDir = resolve(root, SIGNALS_DIR);
  const draftsDir = resolve(root, DRAFTS_DIR);
  const acceptedDir = join(draftsDir, "accepted");
  const rejectedDir = join(draftsDir, "rejected");
  const indexFile = join(signalsDir, "index.json");
  const ledgerFile = resolve(root, "data/_seen-ledger.jsonl");

  const errors = [];
  const queued = listJson(draftsDir).length;
  const accepted = [];

  // ---- validate the whole batch before moving anything ----
  for (const { file, path } of listJson(acceptedDir)) {
    let signal;
    try {
      signal = readJson(path);
    } catch (e) {
      errors.push(`${file}: invalid JSON: ${e.message}`);
      continue;
    }
    for (const problem of validateSignal(signal)) errors.push(`${file}: ${problem}`);
    if (signal?.id && `${signal.id}.json` !== file) {
      errors.push(`${file}: filename does not match id '${signal.id}'`);
    }
    // A collision means the agent's id scan missed something, or a file was
    // hand-edited. Published content is never clobbered to resolve it.
    if (signal?.id && existsSync(join(signalsDir, `${signal.id}.json`))) {
      errors.push(`${file}: ${signal.id}.json already exists in ${SIGNALS_DIR} — refusing to overwrite`);
    }
    accepted.push({ file, path, signal });
  }

  const rejected = listJson(rejectedDir)
    .map(({ file, path }) => {
      try {
        return readJson(path);
      } catch {
        console.warn(`  ! could not parse rejected draft ${file}`);
        return null;
      }
    })
    .filter(Boolean);

  if (errors.length) {
    return { promoted: [], rejected: 0, queued, ledger: { added: 0, skipped: 0 }, errors };
  }

  // ---- move accepted drafts into published content ----
  const promoted = [];
  for (const { path, signal } of accepted) {
    writeJson(join(signalsDir, `${signal.id}.json`), { ...signal, status: "published" });
    rmSync(path);
    promoted.push(signal.id);
  }

  // ---- index.json: append, never reorder ----
  if (promoted.length) {
    const index = existsSync(indexFile) ? readJson(indexFile) : { items: [] };
    index.items = index.items || [];
    for (const { signal } of accepted) {
      index.items.push({
        id: signal.id,
        file: `${signal.id}.json`,
        date: signal.date,
        status: "published",
      });
    }
    index.lastUpdated = nowStamp();
    writeJson(indexFile, index);
  }

  // ---- ledger: one record per decision ----
  mkdirSync(resolve(root, "data"), { recursive: true });
  const records = [
    ...accepted.map(({ signal }) => recordFromSignal(signal)),
    ...rejected.map((s) => ({ ...recordFromSignal(s), status: "rejected" })),
    ...finderRejections(resolve(root, "data")),
  ];
  // `added` vs `skipped` distinguishes a first run from a repeat: the records
  // are rebuilt from the folders every time, and the key-dedup absorbs the rest.
  const ledger = appendRecords(records, ledgerFile);

  return { promoted, rejected: rejected.length, queued, ledger, errors: [] };
}

function main() {
  const result = promote();

  if (result.errors.length) {
    console.error(`promote: ${result.errors.length} problem(s) — nothing was moved\n`);
    result.errors.forEach((e) => console.error("  " + e));
    process.exit(1);
  }

  console.log(
    `promote: ${result.promoted.length} promoted, ` +
      `${result.ledger.added} new ledger record(s), ${result.ledger.skipped} already seen`,
  );
  result.promoted.forEach((id) => console.log(`  -> ${SIGNALS_DIR}/${id}.json`));
  if (result.queued) {
    console.log(`  ${result.queued} draft(s) still in ${DRAFTS_DIR}/ awaiting review`);
  }

  // Fail now rather than at the next build.
  const check = spawnSync(process.execPath, ["scripts/validate-signals.mjs"], { stdio: "inherit" });
  if (check.status !== 0) process.exit(check.status ?? 1);
}

if (process.argv[1] && process.argv[1].endsWith("promote-signals.mjs")) main();
