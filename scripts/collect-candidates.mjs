#!/usr/bin/env node
/**
 * Candidate collector for the AI-signals news finder.
 *
 * A generic web search never surfaces fresh practitioner/social posts well, which is
 * why the finder only ever returned published articles + arXiv. This pulls the
 * leading-indicator feeds directly (all zero-auth JSON APIs), dedupes them against the
 * seen-ledger + published history, and writes a candidate pool the finder prompt scores.
 *
 * Two-stage design: retrieve broadly here (code) -> score editorially in the prompt (LLM).
 *
 *   node scripts/collect-candidates.mjs [--profile NAME] [--days N] [--out <file>] [--timeout MS]
 *       --profile    which config/sources/<name>.json to collect  (default generic)
 *       --days N     only keep items from the last N days   (overrides the profile)
 *       --out        output path   (default derived from the profile)
 *       --timeout    per-request timeout in ms   (default 15000)
 *
 * WHICH sources are collected lives in config/sources/*.json, not here. Profiles
 * are standalone — no inheritance — so a sector or claim run declares exactly the
 * venues the generic run cannot reach. The output path is derived from the
 * profile name so a sector pool can never overwrite the generic one.
 *
 * Every request is bounded by --timeout, so an unresponsive feed cannot hang the
 * cron job. Requests run sequentially, so worst-case wall clock is roughly
 * (number of requests) x timeout; with the generic profile that is about 5 minutes.
 *
 * Working files live in data/, NOT public/. Vite copies public/ into dist, so
 * anything written there is published on the live site.
 *
 * Sources are each wrapped so one failing feed never kills the run. Add a new KIND
 * of source by writing an async collector and wiring it into collectorsFor();
 * add more of an existing kind by editing a profile. GitHub releases are leading
 * indicators for tools before anyone writes them up; HN comments carry firsthand
 * operational lessons; Dev.to carries practitioner how-tos.
 *
 * X/Twitter and LinkedIn are deliberately absent: neither offers zero-auth post search.
 * For those, maintain a curated account list and use their paid/official APIs, or check
 * them manually — see docs/ai-signals-pipeline.md.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve, join, dirname } from "path";
import { normalizeUrl } from "./ledger.mjs";
import {
  loadProfile,
  candidatesPathFor,
  resolveWindowDays,
} from "./lib/source-profile.mjs";

const SIGNALS_DIR = resolve("public/content/ai-signals");
const INDEX_FILE = join(SIGNALS_DIR, "index.json");
// Outside public/ on purpose — see the note in the file header.
const DATA_DIR = resolve("data");
const LEDGER_FILE = join(DATA_DIR, "_seen-ledger.jsonl");

const args = process.argv.slice(2);

function numArg(flag, def) {
  const i = args.indexOf(flag);
  if (i === -1) return def;
  const n = Number(args[i + 1]);
  // A missing or non-numeric value used to yield NaN, which silently dropped
  // every candidate (`t >= NaN` is always false). Fail loudly instead.
  if (!Number.isFinite(n) || n <= 0) {
    console.error(`collect: ${flag} needs a positive number, got ${JSON.stringify(args[i + 1])}`);
    process.exit(1);
  }
  return n;
}
function strArg(flag, def) {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : def;
}

const TIMEOUT_MS = numArg("--timeout", 15_000);

// Resolved in main() once the profile is known, since the window can come from
// the profile as well as from --days. They keep a module-level default so
// withinWindow() is callable (and testable) without a profile loaded.
let DAYS = 10;
let CUTOFF = Date.now() - DAYS * 86_400_000;

/**
 * Fetch JSON with a hard per-request timeout.
 *
 * This runs unattended from cron, where a feed that accepts the connection and
 * then never responds would hang the job forever — worse than failing, because
 * nothing reports it. Each request is bounded; a timed-out feed is treated like
 * any other failed source and isolated by the caller.
 */
async function getJson(url, opts = {}) {
  let res;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": "FoSW-signal-collector/1.0", Accept: "application/json", ...(opts.headers || {}) },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    // TimeoutError comes from AbortSignal.timeout; AbortError from an external abort.
    // `cause` keeps the original error attached for debugging.
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      throw new Error(`timed out after ${TIMEOUT_MS}ms for ${url}`, { cause: err });
    }
    throw new Error(`${err?.message || err} for ${url}`, { cause: err });
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

/** Same contract as getJson, but returns raw text (feeds are XML, not JSON). */
async function getText(url) {
  let res;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": "FoSW-signal-collector/1.0", Accept: "application/rss+xml, application/atom+xml, text/xml, */*" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      throw new Error(`timed out after ${TIMEOUT_MS}ms for ${url}`, { cause: err });
    }
    throw new Error(`${err?.message || err} for ${url}`, { cause: err });
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.text();
}

// ---------- minimal feed parsing (no dependencies) ----------

// Some publishers pad titles with zero-width characters as a scraping
// fingerprint (Stack Overflow does this). They survive JSON round-trips and make
// titles look corrupted downstream, so strip them along with the entities.
// Written as escapes, not literal characters — invisible bytes in source are
// unreadable and unreviewable (and ESLint's no-irregular-whitespace rejects them).
// ZWSP, ZWNJ, ZWJ, word joiner, BOM, soft hyphen.
const INVISIBLE = /[\u200B-\u200D\u2060\uFEFF\u00AD]/g;

const decodeEntities = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    // Numeric entities, decimal (&#39;) and hex (&#x27;) — feeds use both.
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    // &amp; last, so "&amp;#39;" does not become an entity we then re-decode.
    .replace(/&amp;/g, "&")
    .replace(INVISIBLE, "")
    .replace(/\s+/g, " ")
    .trim();

const tagText = (block, tag) => {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? decodeEntities(m[1]) : "";
};

/**
 * Parse RSS 2.0 <item> and Atom <entry> elements out of a feed document.
 *
 * Deliberately string-based rather than a real XML parse: the collector is
 * zero-dependency by design, and we only need four fields per entry. Anything
 * malformed yields an empty title or link and is dropped by the caller.
 */
export function parseFeed(xml) {
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) || [];
  return blocks
    .map((b) => {
      const title = tagText(b, "title");
      // RSS puts the URL in <link>text</link>; Atom puts it in <link href="..."/>
      let link = tagText(b, "link");
      if (!link) {
        const m = b.match(/<link[^>]*\bhref=["']([^"']+)["']/i);
        link = m ? decodeEntities(m[1]) : "";
      }
      const raw = tagText(b, "pubDate") || tagText(b, "updated") || tagText(b, "published") || "";
      const t = raw ? new Date(raw) : null;
      const date = t && !Number.isNaN(t.getTime()) ? t.toISOString().slice(0, 10) : "";
      return { title, link, date };
    })
    .filter((e) => e.title && e.link);
}

// ---------- source collectors (each returns candidate[] and never throws upward) ----------

/**
 * Run `fn` for each item in `list`, isolating failures to the individual request.
 *
 * Without this, one rate-limited search term or one blocked subreddit discarded
 * every result from that whole source — including requests that had already
 * succeeded. Reddit routinely 403s, so that was the normal case, not the edge.
 *
 * The source is only reported as failed if EVERY request failed, which keeps the
 * caller's per-source failure accounting intact.
 */
export async function perItem(label, list, fn) {
  const items = [];
  let failed = 0;
  for (const item of list) {
    try {
      items.push(...(await fn(item)));
    } catch (err) {
      failed++;
      console.warn(`    ! ${label} [${item}] failed: ${err.message}`);
    }
  }
  if (list.length > 0 && failed === list.length) {
    throw new Error(`all ${list.length} requests failed`);
  }
  if (failed) console.warn(`    ${label}: ${failed}/${list.length} requests failed, keeping the rest`);
  return items;
}

async function collectHackerNews(terms) {
  const sinceTs = Math.floor(CUTOFF / 1000);
  return perItem("Hacker News", terms, async (term) => {
    const url =
      `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(term)}` +
      `&tags=story&numericFilters=points>30,created_at_i>${sinceTs}&hitsPerPage=20`;
    const data = await getJson(url);
    return (data.hits || []).map((h) => ({
      title: h.title,
      url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      discussionUrl: `https://news.ycombinator.com/item?id=${h.objectID}`,
      source: "Hacker News",
      sourceType: "discussion",
      date: (h.created_at || "").slice(0, 10),
      score: h.points || 0,
      signals: { comments: h.num_comments || 0, matchedTerm: term },
    }));
  });
}

async function collectDevto(tags) {
  return perItem("Dev.to", tags, async (tag) => {
    const data = await getJson(`https://dev.to/api/articles?tag=${tag}&top=7&per_page=20`);
    return (data || []).map((a) => ({
      title: a.title,
      url: a.url,
      source: "Dev.to",
      sourceType: "social",
      date: (a.published_at || "").slice(0, 10),
      score: a.positive_reactions_count || 0,
      by: a.user?.name,
      signals: { comments: a.comments_count || 0, tag },
    }));
  });
}

async function collectReddit(subreddits) {
  return perItem("Reddit", subreddits, async (sub) => {
    const data = await getJson(`https://www.reddit.com/r/${sub}/top.json?t=week&limit=20`);
    return (data?.data?.children || [])
      .map((c) => c.data)
      .filter((p) => !p.stickied)
      .map((p) => ({
        title: p.title,
        url: p.url_overridden_by_dest || `https://www.reddit.com${p.permalink}`,
        discussionUrl: `https://www.reddit.com${p.permalink}`,
        source: `r/${sub}`,
        sourceType: "discussion",
        date: new Date(p.created_utc * 1000).toISOString().slice(0, 10),
        score: p.score || 0,
        signals: { comments: p.num_comments || 0, subreddit: sub },
      }));
  });
}

async function collectGithubReleases(repos) {
  return perItem("GitHub releases", repos, async (repo) => {
    const data = await getJson(`https://api.github.com/repos/${repo}/releases?per_page=5`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    return (data || [])
      .filter((r) => !r.draft && !r.prerelease)
      .map((r) => ({
        title: `${repo} ${r.name || r.tag_name}`,
        url: r.html_url,
        source: `GitHub: ${repo}`,
        sourceType: "release",
        date: (r.published_at || "").slice(0, 10),
        score: r.reactions?.total_count || 0,
        signals: { tag: r.tag_name },
      }));
  });
}

async function collectLeadershipFeeds(feeds) {
  return perItem("Leadership feeds", feeds, async (feed) => {
    const xml = await getText(feed.url);
    return parseFeed(xml).map((e) => ({
      title: e.title,
      url: e.link,
      source: feed.name,
      sourceType: "article",
      date: e.date,
      // Feeds expose no engagement metric. Left at 0 deliberately rather than
      // invented — the pool is interleaved by source, so these are not buried.
      score: 0,
      signals: { feed: feed.name },
    }));
  });
}

async function collectSubstack(pubs) {
  return perItem("Substack", pubs, async (pub) => {
    const data = await getJson(`https://${pub.host}/api/v1/archive?sort=new&limit=20`);
    return (data || []).map((p) => ({
      title: p.title,
      url: p.canonical_url || `https://${pub.host}/p/${p.slug}`,
      source: pub.name,
      sourceType: "social",
      date: (p.post_date || "").slice(0, 10),
      score: p.reaction_count || 0,
      signals: { comments: p.comment_count || 0, publication: pub.name },
    }));
  });
}

/**
 * The collectors this profile actually declares sources for, as
 * [name, thunk] pairs.
 *
 * A profile that omits a key runs no collector for it — nothing is inherited to
 * fill the gap. That is the point: the generic run's tooling sources are the
 * bias that under-samples every other sector, so a sector profile is written as
 * the complement of the generic run rather than an extension of it.
 *
 * Building the list makes no network call, which is what lets a test assert
 * which collectors a profile activates.
 */
export function collectorsFor(profile) {
  return [
    ["Hacker News", profile.hackerNewsTerms, collectHackerNews],
    ["Dev.to", profile.devtoTags, collectDevto],
    ["Reddit", profile.subreddits, collectReddit],
    ["GitHub releases", profile.githubRepos, collectGithubReleases],
    ["Leadership feeds", profile.feeds, collectLeadershipFeeds],
    ["Substack", profile.substacks, collectSubstack],
  ]
    .filter(([, list]) => Array.isArray(list) && list.length > 0)
    .map(([name, list, fn]) => [name, () => fn(list)]);
}

// ---------- dedup + filter ----------

function loadSeenUrls() {
  const seen = new Set();
  if (existsSync(LEDGER_FILE)) {
    for (const line of readFileSync(LEDGER_FILE, "utf8").split("\n")) {
      if (!line.trim()) continue;
      try {
        const rec = JSON.parse(line);
        if (rec.url) seen.add(normalizeUrl(rec.url));
      } catch {
        /* ignore malformed */
      }
    }
  }
  if (existsSync(INDEX_FILE)) {
    try {
      const index = JSON.parse(readFileSync(INDEX_FILE, "utf8"));
      for (const entry of index.items || []) {
        const f = join(SIGNALS_DIR, entry.file);
        if (!existsSync(f)) continue;
        const s = JSON.parse(readFileSync(f, "utf8"));
        if (s.sourceUrl) seen.add(normalizeUrl(s.sourceUrl));
      }
    } catch {
      /* ignore */
    }
  }
  return seen;
}

export function withinWindow(dateStr) {
  if (!dateStr) return true; // keep undated rather than silently dropping
  const t = new Date(dateStr + "T00:00:00Z").getTime();
  return Number.isNaN(t) || t >= CUTOFF;
}

async function main() {
  const profileName = strArg("--profile", "generic");
  let profile;
  try {
    profile = loadProfile(profileName);
  } catch (err) {
    // An unknown or malformed profile is fatal rather than a fallback to
    // generic: collecting the wrong sources still writes a plausible pool, and
    // nothing downstream could tell it from a real one.
    console.error(`collect: ${err.message}`);
    process.exit(1);
  }

  DAYS = resolveWindowDays(profile, numArg("--days", undefined));
  CUTOFF = Date.now() - DAYS * 86_400_000;
  const out = strArg("--out", candidatesPathFor(profileName));
  const collectors = collectorsFor(profile);

  console.log(`collect: profile '${profileName}', ${collectors.length} source(s), ${DAYS}d window`);

  const seen = loadSeenUrls();
  const all = [];

  const failed = [];
  for (const [name, fn] of collectors) {
    try {
      const items = await fn();
      console.log(`  ${name}: ${items.length} raw`);
      all.push(...items);
    } catch (err) {
      failed.push(name);
      console.warn(`  ! ${name} failed: ${err.message}`);
    }
  }

  // Every source dying looks identical to a quiet news week if we exit 0: the
  // finder would run against an empty pool and silently fall back to web search.
  // Make total failure visible to whatever is running the cron.
  if (failed.length === collectors.length) {
    console.error(
      `collect: ALL ${collectors.length} sources failed (${failed.join(", ")}) — not writing a candidate pool`
    );
    process.exit(1);
  }
  if (failed.length) {
    console.warn(`collect: ${failed.length}/${collectors.length} sources failed: ${failed.join(", ")}`);
  }

  // dedup within this run + against seen-ledger/published history, then window-filter
  const pool = [];
  const runSeen = new Set();
  let dropSeen = 0;
  let dropOld = 0;
  for (const c of all) {
    const k = normalizeUrl(c.url);
    if (!k) continue;
    if (runSeen.has(k)) continue;
    runSeen.add(k);
    if (seen.has(k)) {
      dropSeen++;
      continue;
    }
    if (!withinWindow(c.date)) {
      dropOld++;
      continue;
    }
    pool.push(c);
  }

  // Interleave by source instead of sorting globally by score.
  //
  // Scores are not comparable across sources — Hacker News points, Dev.to
  // reactions and Substack hearts measure different things, and RSS feeds expose
  // no metric at all. A global score sort therefore ranked HN first and buried
  // every leadership feed at the bottom, which is exactly the technical bias
  // these sources were added to correct. Round-robin guarantees the top of the
  // pool shows every source, with each source's strongest items first.
  const groups = new Map();
  for (const c of pool) {
    if (!groups.has(c.source)) groups.set(c.source, []);
    groups.get(c.source).push(c);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => (b.score || 0) - (a.score || 0) || String(b.date).localeCompare(String(a.date)));
  }
  const interleaved = [];
  const lists = [...groups.values()];
  for (let i = 0; interleaved.length < pool.length; i++) {
    for (const list of lists) if (i < list.length) interleaved.push(list[i]);
  }
  pool.length = 0;
  pool.push(...interleaved);
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFileSync(resolve(out), JSON.stringify(pool, null, 2) + "\n", "utf8");
  console.log(
    `collect: ${pool.length} candidates (dropped ${dropSeen} already-seen, ${dropOld} outside ${DAYS}d). Wrote ${out}`
  );
}

// Only run the CLI when invoked directly. Importing this module for tests must
// not fire six live feed collections — the same guard validate-signals.mjs and
// promote-signals.mjs use.
if (process.argv[1] && process.argv[1].endsWith("collect-candidates.mjs")) {
  main().catch((err) => {
    console.error("collect failed:", err);
    process.exit(1);
  });
}
