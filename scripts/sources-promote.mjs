#!/usr/bin/env node
/**
 * Promote accepted source nominations into their profiles.
 *
 * Same contract as promote-signals.mjs, one level up: the finder nominates a
 * source, a human moves the file into accepted/ or rejected/, and this appends
 * the accepted ones to config/sources/<profile>.json. Nothing joins a profile
 * unread.
 *
 *   node scripts/sources-promote.mjs
 *
 * All-or-nothing. A half-applied batch would leave accepted/ partly emptied
 * with no record of which failures were real.
 *
 * It does NOT re-fetch the feed: sources:discover already verified it, and
 * keeping this step pure filesystem makes it deterministic and testable. A feed
 * that dies in between surfaces as an isolated per-request failure on the next
 * collect run, which is how the collector already handles a dead source.
 *
 * Accepted files are consumed once applied — the profile is the record from
 * then on. Rejected files stay: they are the memory that stops the next run
 * re-nominating someone already declined.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, rmSync } from "fs";
import { resolve, join } from "path";
import { normalizeUrl } from "./ledger.mjs";

const NOMINATIONS_DIR = "data/source-nominations";
const PROFILES_DIR = "config/sources";

function listJson(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((file) => ({ file, path: join(dir, file) }));
}

/**
 * Apply every accepted nomination, or none.
 *
 * `root` is a parameter so tests build an isolated tree rather than mutating
 * real config.
 */
export function promoteSources({ root = process.cwd() } = {}) {
  const nominationsDir = resolve(root, NOMINATIONS_DIR);
  const acceptedDir = join(nominationsDir, "accepted");
  const profilesDir = resolve(root, PROFILES_DIR);

  const errors = [];
  const queued = listJson(nominationsDir).length;

  // ---- validate the whole batch before writing anything ----
  const applying = [];
  // Seen feeds accumulate across the batch as well as within each profile, so
  // two nominations of the same feed in one run cannot both land.
  const seenByProfile = new Map();

  for (const { file, path } of listJson(acceptedDir)) {
    let nomination;
    try {
      nomination = JSON.parse(readFileSync(path, "utf8"));
    } catch (e) {
      errors.push(`${file}: invalid JSON: ${e.message}`);
      continue;
    }

    const { name, profile, feed, feedStatus } = nomination;
    if (!profile) {
      errors.push(`${file}: no 'profile' — nothing says which source profile this belongs to`);
      continue;
    }
    const profilePath = join(profilesDir, `${profile}.json`);
    if (!existsSync(profilePath)) {
      errors.push(`${file}: unknown profile '${profile}' (no ${PROFILES_DIR}/${profile}.json)`);
      continue;
    }
    if (!feed) {
      errors.push(`${file}: no 'feed' — run 'npm run sources:discover' first`);
      continue;
    }
    if (!String(feedStatus ?? "").startsWith("ok")) {
      errors.push(`${file}: feedStatus is ${JSON.stringify(feedStatus ?? null)}, not a verified feed`);
      continue;
    }

    if (!seenByProfile.has(profile)) {
      let existing;
      try {
        existing = JSON.parse(readFileSync(profilePath, "utf8"));
      } catch (e) {
        errors.push(`${profile}.json: invalid JSON: ${e.message}`);
        continue;
      }
      const feeds = Array.isArray(existing.feeds) ? existing.feeds : [];
      seenByProfile.set(profile, {
        json: existing,
        path: profilePath,
        keys: new Set(feeds.map((f) => normalizeUrl(f?.url))),
      });
    }
    const target = seenByProfile.get(profile);
    const key = normalizeUrl(feed);
    if (target.keys.has(key)) {
      errors.push(`${file}: ${feed} is already collected by '${profile}' — a second entry would double its weight`);
      continue;
    }
    target.keys.add(key);
    applying.push({ file, path, name: name ?? feed, feed, profile });
  }

  if (errors.length) return { promoted: [], queued, errors };

  // ---- apply ----
  for (const { name, feed, profile } of applying) {
    const target = seenByProfile.get(profile);
    target.json.feeds = Array.isArray(target.json.feeds) ? target.json.feeds : [];
    // Append, never reorder — the same rule index.json follows.
    target.json.feeds.push({ name, url: feed });
  }
  for (const { json, path } of seenByProfile.values()) {
    writeFileSync(path, JSON.stringify(json, null, 2) + "\n", "utf8");
  }
  // Consumed only after every profile is written, so a failed write cannot lose
  // the nomination that caused it.
  for (const { path } of applying) rmSync(path);

  return {
    promoted: applying.map(({ name, feed, profile }) => ({ name, url: feed, profile })),
    queued,
    errors: [],
  };
}

function main() {
  const result = promoteSources();

  if (result.errors.length) {
    console.error(`sources:promote: ${result.errors.length} problem(s) — nothing was applied\n`);
    result.errors.forEach((e) => console.error("  " + e));
    process.exit(1);
  }

  console.log(`sources:promote: ${result.promoted.length} source(s) added`);
  result.promoted.forEach(({ name, url, profile }) => console.log(`  -> ${profile}: ${name} (${url})`));
  if (result.queued) {
    console.log(`  ${result.queued} nomination(s) still awaiting review in ${NOMINATIONS_DIR}/`);
  }
}

if (process.argv[1] && process.argv[1].endsWith("sources-promote.mjs")) main();
