#!/usr/bin/env node
/**
 * Resolve each source nomination to a working feed.
 *
 * A finder run nominates a person and the page it found them on; it does not
 * guess a feed URL, because a model asked to do that returns plausible 404s.
 * This step fetches that page, reads any advertised feed, falls back to the
 * conventional paths, and verifies the result parses with the collector's own
 * reader — a feed this accepted but the collector could not read would be worse
 * than none.
 *
 *   node scripts/sources-discover.mjs [--force]
 *       --force   re-check nominations that already have a verified feed
 *
 * Idempotent, and failure is recorded rather than thrown: "this person has no
 * feed" is a reason for the reviewer to decline them, not a broken run.
 *
 * Reads and writes only the queue root — data/source-nominations/accepted/ and
 * rejected/ record a human decision and are never touched here.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { resolve, join } from "path";
import { findFeedUrls, fallbackFeedUrls } from "./lib/feed-discovery.mjs";
import { parseFeed } from "./collect-candidates.mjs";
import { loadProfile } from "./lib/source-profile.mjs";
import { normalizeUrl } from "./ledger.mjs";

const NOMINATIONS_DIR = "data/source-nominations";
const TIMEOUT_MS = 15_000;

const today = () => new Date().toISOString().slice(0, 10);

/** The real network fetcher. Tests inject their own. */
const defaultFetcher = (url) =>
  fetch(url, {
    headers: { "User-Agent": "FoSW-signal-collector/1.0" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: "follow",
  });

/** Body text, or null for anything that did not come back cleanly. */
async function getText(fetcher, url) {
  try {
    const res = await fetcher(url);
    if (!res?.ok) return null;
    return await res.text();
  } catch {
    // A dead candidate is ordinary here — we are probing several per nominee.
    return null;
  }
}

/**
 * First candidate that fetches and yields at least one entry.
 * Returns {url, entries, newest} or null.
 */
async function firstWorkingFeed(fetcher, candidates) {
  for (const url of candidates) {
    const body = await getText(fetcher, url);
    if (!body) continue;
    const entries = parseFeed(body);
    if (!entries.length) continue;
    const newest = entries
      .map((e) => e.date)
      .filter(Boolean)
      .sort()
      .pop();
    return { url, entries: entries.length, newest };
  }
  return null;
}

/**
 * Enrich every nomination in the queue with a verified feed.
 *
 * `fetcher` is injectable so the whole path is testable without network.
 */
export async function discover({ root = process.cwd(), fetcher = defaultFetcher, force = false } = {}) {
  const dir = resolve(root, NOMINATIONS_DIR);
  const stats = { checked: 0, resolved: 0, unresolved: 0, skipped: 0 };
  if (!existsSync(dir)) return stats;

  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const path = join(dir, file);
    let nomination;
    try {
      nomination = JSON.parse(readFileSync(path, "utf8"));
    } catch (e) {
      console.warn(`  ! skipping ${file}: invalid JSON: ${e.message}`);
      continue;
    }

    if (!force && nomination.feed && String(nomination.feedStatus ?? "").startsWith("ok")) {
      stats.skipped++;
      continue;
    }

    stats.checked++;
    const page = nomination.foundAt ? await getText(fetcher, nomination.foundAt) : null;

    let status;
    let feed;
    if (page === null) {
      status = `could not fetch foundAt (${nomination.foundAt ?? "missing"})`;
    } else {
      const candidates = [...findFeedUrls(page, nomination.foundAt), ...fallbackFeedUrls(nomination.foundAt)];
      const hit = await firstWorkingFeed(fetcher, candidates);
      if (hit) {
        feed = hit.url;
        status = `ok — ${hit.entries} entries${hit.newest ? `, newest ${hit.newest}` : ""}`;
      } else {
        status = `no feed found (tried ${candidates.length} candidate${candidates.length === 1 ? "" : "s"})`;
      }
    }

    const next = { ...nomination, feedStatus: status, discoveredAt: today() };
    if (feed) {
      next.feed = feed;
      next.alreadyInProfile = isAlreadyInProfile(root, nomination.profile, feed);
      stats.resolved++;
    } else {
      // A re-run that no longer finds a feed must not leave a stale one behind.
      delete next.feed;
      delete next.alreadyInProfile;
      stats.unresolved++;
    }
    writeFileSync(path, JSON.stringify(next, null, 2) + "\n", "utf8");
    console.log(`  ${nomination.name ?? file}: ${status}`);
  }

  return stats;
}

/**
 * Whether this feed is already collected by the target profile.
 *
 * Compared on the normalised URL, so a scheme change or a trailing slash cannot
 * hide an existing entry from the reviewer.
 */
function isAlreadyInProfile(root, profileName, feedUrl) {
  if (!profileName) return false;
  let profile;
  try {
    profile = loadProfile(profileName, { root });
  } catch {
    return false; // an unroutable nomination is promote's refusal to make
  }
  const key = normalizeUrl(feedUrl);
  return profile.feeds.some((f) => normalizeUrl(f?.url) === key);
}

async function main() {
  const force = process.argv.includes("--force");
  const stats = await discover({ force });
  console.log(
    `discover: ${stats.resolved} resolved, ${stats.unresolved} without a feed, ${stats.skipped} already done`
  );
  if (stats.checked === 0 && stats.skipped === 0) {
    console.log(`  nothing queued in ${NOMINATIONS_DIR}/`);
  }
}

if (process.argv[1] && process.argv[1].endsWith("sources-discover.mjs")) {
  main().catch((err) => {
    console.error("discover failed:", err);
    process.exit(1);
  });
}
