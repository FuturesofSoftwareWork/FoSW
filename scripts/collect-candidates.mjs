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
 *   node scripts/collect-candidates.mjs [--days N] [--out <file>]
 *       --days N   only keep items from the last N days   (default 10)
 *       --out      output path   (default data/_candidates.json)
 *
 * Working files live in data/, NOT public/. Vite copies public/ into dist, so
 * anything written there is published on the live site.
 *
 * Sources are each wrapped so one failing feed never kills the run. Add sources by
 * pushing an async collector into COLLECTORS. GitHub releases / Reddit are leading
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

const SIGNALS_DIR = resolve("public/content/ai-signals");
const INDEX_FILE = join(SIGNALS_DIR, "index.json");
// Outside public/ on purpose — see the note in the file header.
const DATA_DIR = resolve("data");
const LEDGER_FILE = join(DATA_DIR, "_seen-ledger.jsonl");

// Topic terms used for keyword-search feeds (HN). Tune to taste.
const TERMS = [
  "coding agent",
  "AI coding",
  "Copilot",
  "Claude Code",
  "Cursor editor",
  "LLM software engineering",
  "agentic coding",
  "AI code review",
];

// Dev.to tags (practitioner how-tos + firsthand lessons).
const DEVTO_TAGS = ["ai", "llm", "machinelearning", "devops", "programming"];

// Subreddits where senior engineers report firsthand before blogging.
const SUBREDDITS = ["ExperiencedDevs", "devops", "programming", "LocalLLaMA"];

// Dev-tool repos whose releases lead the discourse. Add the tools your readers use.
const GITHUB_REPOS = [
  "microsoft/vscode",
  "cline/cline",
  "Aider-AI/aider",
  "All-Hands-AI/OpenHands",
];

const args = process.argv.slice(2);
const DAYS = numArg("--days", 10);
const OUT = strArg("--out", join(DATA_DIR, "_candidates.json"));
const CUTOFF = Date.now() - DAYS * 86_400_000;

function numArg(flag, def) {
  const i = args.indexOf(flag);
  return i !== -1 ? Number(args[i + 1]) : def;
}
function strArg(flag, def) {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : def;
}

async function getJson(url, opts = {}) {
  const res = await fetch(url, {
    headers: { "User-Agent": "FoSW-signal-collector/1.0", Accept: "application/json", ...(opts.headers || {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

// ---------- source collectors (each returns candidate[] and never throws upward) ----------

async function collectHackerNews() {
  const out = [];
  const sinceTs = Math.floor(CUTOFF / 1000);
  for (const term of TERMS) {
    const url =
      `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(term)}` +
      `&tags=story&numericFilters=points>30,created_at_i>${sinceTs}&hitsPerPage=20`;
    const data = await getJson(url);
    for (const h of data.hits || []) {
      const link = h.url || `https://news.ycombinator.com/item?id=${h.objectID}`;
      out.push({
        title: h.title,
        url: link,
        discussionUrl: `https://news.ycombinator.com/item?id=${h.objectID}`,
        source: "Hacker News",
        sourceType: "discussion",
        date: (h.created_at || "").slice(0, 10),
        score: h.points || 0,
        signals: { comments: h.num_comments || 0, matchedTerm: term },
      });
    }
  }
  return out;
}

async function collectDevto() {
  const out = [];
  for (const tag of DEVTO_TAGS) {
    const data = await getJson(`https://dev.to/api/articles?tag=${tag}&top=7&per_page=20`);
    for (const a of data || []) {
      out.push({
        title: a.title,
        url: a.url,
        source: "Dev.to",
        sourceType: "social",
        date: (a.published_at || "").slice(0, 10),
        score: a.positive_reactions_count || 0,
        by: a.user?.name,
        signals: { comments: a.comments_count || 0, tag },
      });
    }
  }
  return out;
}

async function collectReddit() {
  const out = [];
  for (const sub of SUBREDDITS) {
    const data = await getJson(`https://www.reddit.com/r/${sub}/top.json?t=week&limit=20`);
    for (const c of data?.data?.children || []) {
      const p = c.data;
      if (p.stickied) continue;
      out.push({
        title: p.title,
        url: p.url_overridden_by_dest || `https://www.reddit.com${p.permalink}`,
        discussionUrl: `https://www.reddit.com${p.permalink}`,
        source: `r/${sub}`,
        sourceType: "discussion",
        date: new Date(p.created_utc * 1000).toISOString().slice(0, 10),
        score: p.score || 0,
        signals: { comments: p.num_comments || 0, subreddit: sub },
      });
    }
  }
  return out;
}

async function collectGithubReleases() {
  const out = [];
  for (const repo of GITHUB_REPOS) {
    const data = await getJson(`https://api.github.com/repos/${repo}/releases?per_page=5`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    for (const r of data || []) {
      if (r.draft || r.prerelease) continue;
      out.push({
        title: `${repo} ${r.name || r.tag_name}`,
        url: r.html_url,
        source: `GitHub: ${repo}`,
        sourceType: "release",
        date: (r.published_at || "").slice(0, 10),
        score: r.reactions?.total_count || 0,
        signals: { tag: r.tag_name },
      });
    }
  }
  return out;
}

const COLLECTORS = [
  ["Hacker News", collectHackerNews],
  ["Dev.to", collectDevto],
  ["Reddit", collectReddit],
  ["GitHub releases", collectGithubReleases],
];

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

function withinWindow(dateStr) {
  if (!dateStr) return true; // keep undated rather than silently dropping
  const t = new Date(dateStr + "T00:00:00Z").getTime();
  return Number.isNaN(t) || t >= CUTOFF;
}

async function main() {
  const seen = loadSeenUrls();
  const all = [];

  for (const [name, fn] of COLLECTORS) {
    try {
      const items = await fn();
      console.log(`  ${name}: ${items.length} raw`);
      all.push(...items);
    } catch (err) {
      console.warn(`  ! ${name} failed: ${err.message}`);
    }
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

  pool.sort((a, b) => (b.score || 0) - (a.score || 0));
  mkdirSync(dirname(resolve(OUT)), { recursive: true });
  writeFileSync(resolve(OUT), JSON.stringify(pool, null, 2) + "\n", "utf8");
  console.log(
    `collect: ${pool.length} candidates (dropped ${dropSeen} already-seen, ${dropOld} outside ${DAYS}d). Wrote ${OUT}`
  );
}

main().catch((err) => {
  console.error("collect failed:", err);
  process.exit(1);
});
