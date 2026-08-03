#!/usr/bin/env node
/**
 * Seen-ledger manager for the AI-signals news finder.
 *
 * The news-finder prompt is stateless: without memory it re-surfaces the same
 * landmark studies (e.g. the Faros study) every run. This script owns that memory
 * as a file so state is maintained by deterministic code, not by model discipline.
 *
 * File: public/content/ai-signals/_seen-ledger.jsonl  (append-only, one record per line)
 *   { key, claim, url, firstSeen, lastSeen, timesSeen, status, id }
 *   - key:       dedup key (normalized url, else normalized claim)
 *   - status:    "published" (surfaced on the site) | "rejected" (seen but not surfaced)
 *   - published records are kept forever; rejected records age out after RETENTION_DAYS
 *
 * Commands:
 *   node scripts/ledger.mjs prepare
 *       Bootstraps/compacts the ledger from published history (index.json) + existing
 *       ledger lines, prunes stale rejected records, and rewrites the file. Run this
 *       BEFORE a finder run so the prompt reads a fresh, deduped ledger.
 *
 *   node scripts/ledger.mjs reconcile <finder-output.json> [--rejected <rejected.json>]
 *       Appends the finder's chosen items (status "published") and, optionally, items it
 *       rejected-as-already-seen (status "rejected") to the ledger. Append-only + safe:
 *       items whose url/claim already exist are skipped. Run this AFTER a finder run.
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync } from "fs";
import { resolve, join } from "path";
import { pathToFileURL } from "url";

const SIGNALS_DIR = resolve("public/content/ai-signals");
const INDEX_FILE = join(SIGNALS_DIR, "index.json");
const LEDGER_FILE = join(SIGNALS_DIR, "_seen-ledger.jsonl");
const RETENTION_DAYS = 90; // rejected records older than this are pruned

// ---------- helpers ----------

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(dateStr) {
  const then = new Date(dateStr + "T00:00:00Z").getTime();
  if (Number.isNaN(then)) return Infinity;
  return (Date.now() - then) / 86_400_000;
}

/** Canonical dedup key from a URL: drop protocol, www, query, hash, trailing slash. */
export function normalizeUrl(url) {
  if (!url || typeof url !== "string") return "";
  try {
    const u = new URL(url.trim());
    let host = u.hostname.toLowerCase().replace(/^www\./, "");
    let path = u.pathname.replace(/\/+$/, "");
    return `${host}${path}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "").split(/[?#]/)[0];
  }
}

/** Canonical dedup key from free text: lowercase, strip punctuation, collapse spaces. */
export function normalizeText(s) {
  if (!s || typeof s !== "string") return "";
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function keyFor({ url, claim }) {
  const u = normalizeUrl(url);
  if (u) return `url:${u}`;
  const c = normalizeText(claim);
  return c ? `claim:${c}` : "";
}

function readLedger() {
  if (!existsSync(LEDGER_FILE)) return [];
  return readFileSync(LEDGER_FILE, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        console.warn(`  ! skipping malformed ledger line: ${l.slice(0, 80)}`);
        return null;
      }
    })
    .filter(Boolean);
}

/** Read every published signal referenced by index.json. */
function loadPublishedSignals() {
  if (!existsSync(INDEX_FILE)) return [];
  const index = JSON.parse(readFileSync(INDEX_FILE, "utf8"));
  const out = [];
  for (const entry of index.items || []) {
    if (entry.status && entry.status !== "published") continue;
    const file = join(SIGNALS_DIR, entry.file);
    if (!existsSync(file)) {
      console.warn(`  ! index references missing file: ${entry.file}`);
      continue;
    }
    try {
      const s = JSON.parse(readFileSync(file, "utf8"));
      out.push(s);
    } catch {
      console.warn(`  ! could not parse ${entry.file}`);
    }
  }
  return out;
}

function recordFromSignal(s) {
  const claim = s.title || (s.summary || "").slice(0, 140);
  const seenDate = (s.detectedAt || s.date || today()).slice(0, 10); // date-only, drop any timestamp
  return {
    key: keyFor({ url: s.sourceUrl, claim }),
    claim,
    url: s.sourceUrl || "",
    firstSeen: seenDate,
    lastSeen: seenDate,
    timesSeen: 1,
    status: "published",
    id: s.id || "",
  };
}

/** Merge two records for the same key. */
function mergeRecords(a, b) {
  const firstSeen = a.firstSeen < b.firstSeen ? a.firstSeen : b.firstSeen;
  const lastSeen = a.lastSeen > b.lastSeen ? a.lastSeen : b.lastSeen;
  return {
    key: a.key,
    claim: a.claim || b.claim,
    url: a.url || b.url,
    firstSeen,
    lastSeen,
    timesSeen: (a.timesSeen || 1) + (b.timesSeen || 1),
    // published is authoritative and never downgraded to rejected
    status: a.status === "published" || b.status === "published" ? "published" : "rejected",
    id: a.id || b.id || "",
  };
}

function writeLedger(records) {
  const sorted = [...records].sort((a, b) => (a.lastSeen < b.lastSeen ? 1 : -1));
  const body = sorted.map((r) => JSON.stringify(r)).join("\n");
  writeFileSync(LEDGER_FILE, body ? body + "\n" : "", "utf8");
}

// ---------- commands ----------

function cmdPrepare() {
  console.log("prepare: bootstrapping + compacting seen-ledger");
  const byKey = new Map();

  const add = (rec) => {
    if (!rec.key) return;
    byKey.set(rec.key, byKey.has(rec.key) ? mergeRecords(byKey.get(rec.key), rec) : rec);
  };

  // 1) existing ledger lines
  const existing = readLedger();
  existing.forEach(add);

  // 2) published history from index.json (permanent seen-set — this is why the
  //    Faros study, already published, will never be re-surfaced)
  const published = loadPublishedSignals();
  published.forEach((s) => add(recordFromSignal(s)));

  // 3) prune: drop rejected records past retention; keep all published
  let pruned = 0;
  const kept = [];
  for (const rec of byKey.values()) {
    if (rec.status !== "published" && daysAgo(rec.lastSeen) > RETENTION_DAYS) {
      pruned++;
      continue;
    }
    kept.push(rec);
  }

  writeLedger(kept);
  const pub = kept.filter((r) => r.status === "published").length;
  console.log(
    `prepare: ${kept.length} records (${pub} published, ${kept.length - pub} rejected), ` +
      `pruned ${pruned} stale. Ledger: ${LEDGER_FILE}`
  );
}

function loadJsonArray(path) {
  const raw = readFileSync(resolve(path), "utf8").trim();
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error(`${path} is not a JSON array`);
  return data;
}

function cmdReconcile(args) {
  const outputPath = args[0];
  if (!outputPath) {
    console.error("usage: node scripts/ledger.mjs reconcile <finder-output.json> [--rejected <rejected.json>]");
    process.exit(1);
  }
  const rejectedIdx = args.indexOf("--rejected");
  const rejectedPath = rejectedIdx !== -1 ? args[rejectedIdx + 1] : null;

  const seen = new Set(readLedger().map((r) => r.key));
  const lines = [];
  let added = 0;
  let skipped = 0;

  const append = (rec) => {
    if (!rec.key) return;
    if (seen.has(rec.key)) {
      skipped++;
      return;
    }
    seen.add(rec.key);
    lines.push(JSON.stringify(rec));
    added++;
  };

  // published items = the finder's output
  for (const s of loadJsonArray(outputPath)) {
    append(recordFromSignal(s));
  }

  // rejected-as-already-seen items (optional): array of {claim,url} or signal-shaped
  if (rejectedPath) {
    for (const r of loadJsonArray(rejectedPath)) {
      const claim = r.claim || r.title || "";
      const url = r.url || r.sourceUrl || "";
      append({
        key: keyFor({ url, claim }),
        claim,
        url,
        firstSeen: today(),
        lastSeen: today(),
        timesSeen: 1,
        status: "rejected",
        id: r.id || "",
      });
    }
  }

  if (lines.length) appendFileSync(LEDGER_FILE, lines.join("\n") + "\n", "utf8");
  console.log(`reconcile: appended ${added}, skipped ${skipped} already-seen. Ledger: ${LEDGER_FILE}`);
}

// ---------- main (only when run directly, not when imported) ----------

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  switch (cmd) {
    case "prepare":
      cmdPrepare();
      break;
    case "reconcile":
      cmdReconcile(rest);
      break;
    default:
      console.error("usage: node scripts/ledger.mjs <prepare|reconcile> [args]");
      process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
