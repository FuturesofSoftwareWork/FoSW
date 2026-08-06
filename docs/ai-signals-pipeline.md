# AI-Signals News-Finder Pipeline

Tooling that makes the news-finder **stateful** (stops re-surfacing the same landmark
studies) and **discovery-driven** (surfaces fresh practitioner/social signals, not just
published articles + arXiv).

Design principle: **retrieve broadly in code → score editorially in the LLM.** The prompt
can only reason over what it's given, so discovery and de-duplication live in scripts; the
model does the editorial judgment.

## Files

| Path | What it is | Committed? |
|------|------------|------------|
| `scripts/ledger.mjs` | Seen-ledger manager (`prepare`, `reconcile`) | yes |
| `scripts/collect-candidates.mjs` | Zero-auth feed collector (HN, Dev.to, Reddit, GitHub releases) | yes |
| `scripts/validate-signals.mjs` | Schema validator; runs first in `npm run build` | yes |
| `data/_seen-ledger.jsonl` | Append-only memory of everything seen | **yes — this is state** |
| `data/_candidates.json` | Per-run candidate pool for the prompt | no (gitignored, regenerated) |
| `data/_finder-output.json` | The finder's selected items for this run | no (gitignored) |
| `data/_finder-rejected.json` | Items evaluated and declined this run | no (gitignored) |

### Why these live in `data/`, not `public/`

Vite copies everything under `public/` into `dist`, and `dist` is what gets
deployed to GitHub Pages. A working file kept there is served on the live site.

That matters because the ledger records `status: "rejected"` entries and
`_finder-rejected.json` holds them directly — a list of stories the editorial
team evaluated and declined. On a VTT / University of Helsinki research site
that should not be world-readable. Keeping the whole pipeline's working set in
`data/` makes the boundary obvious: `public/` is published, `data/` is not.

`data/` must never be moved under `public/`, and no pipeline file should be
written into `public/` — only finished signal JSON belongs there.

## Run order (per finder run)

```bash
npm run signals:prepare      # 1. bootstrap/compact the seen-ledger from published history
npm run signals:collect      # 2. pull leading-indicator feeds -> data/_candidates.json
#                              3. run the finder prompt, feeding it:
#                                   - data/_seen-ledger.jsonl  (what NOT to resurface)
#                                   - data/_candidates.json    (fresh items to score)
#                                 the prompt writes data/_finder-output.json
#                                 and data/_finder-rejected.json
npm run signals:reconcile -- data/_finder-output.json --rejected data/_finder-rejected.json   # 4. append to ledger
```

Steps 1, 2, and 4 are deterministic code. Step 3 is the LLM. Keeping ledger writes in code
(step 4) rather than asking the model to append means state can't be lost to a model slip or
a run that dies mid-write.

## The seen-ledger

Append-only JSONL, one record per line:

```json
{"key":"url:faros.ai/research/...","claim":"Faros 2026 Engineering Report...","url":"https://www.faros.ai/research/...","firstSeen":"2026-06-29","lastSeen":"2026-06-29","timesSeen":1,"status":"published","id":"2026-06-29-04"}
```

- **`key`** — dedup key: normalized URL (protocol/www/query/hash/trailing-slash stripped), or normalized claim text if no URL.
- **`status`** — `published` (surfaced on the site) or `rejected` (seen but not surfaced; recording these stops the finder re-evaluating the same non-story every week).
- **Retention** — `published` records are kept **forever** (this is why an already-covered study like Faros never returns). `rejected` records age out after 90 days (see `RETENTION_DAYS`), long enough that anything resurfacing after that is legitimately "newly relevant."

`prepare` bootstraps the ledger from `index.json` + all published signal files, so the entire
back-catalog is in the seen-set from the first run — no cold-start window where old studies
leak back in.

### Prompt wiring

Add to the finder prompt (see the finder prompt itself for the full text):

- **Before scanning:** read `_seen-ledger.jsonl`; do not output any item whose core claim/URL is already there, unless there's a genuinely new development (frame it as an UPDATE).
- **Instead of web search:** score the items in `_candidates.json`; treat arXiv/academic as lagging/confirming indicators (cap per run) and prioritize weak signals with a credible firsthand basis.
- The prompt does **not** write the ledger — `signals:reconcile` does, from the prompt's output.

## The candidate collector

Pulls fresh items from zero-auth JSON feeds, dedupes against the ledger + published history,
and keeps only the last N days (default 10). Each source is isolated — one failing feed logs a
warning and the run continues.

Tune the lists at the top of `scripts/collect-candidates.mjs`:

- `TERMS` — Hacker News search terms (story text + comments = firsthand operational lessons).
- `DEVTO_TAGS` — Dev.to tags (practitioner how-tos).
- `SUBREDDITS` — subreddits where senior engineers report before blogging.
- `GITHUB_REPOS` — dev-tool repos whose **releases lead the discourse** (a tool ships months before anyone studies it).
- `LEADERSHIP_FEEDS` — RSS/Atom from leadership-facing publications (LeadDev, InfoQ Culture & Methods, Martin Fowler, Stack Overflow Blog).
- `SUBSTACK_PUBS` — Substack newsletters via their public JSON archive (The Pragmatic Engineer, Engineering Leadership).

### Why the leadership feeds exist

The original four sources are all practitioner-technical. In the first supervised
run every org-design, roles, hiring and reskilling signal had to be found by
ad-hoc web search, because nothing in the pool covered that ground — which biased
the run toward low-altitude tooling items (see the Altitude section of the finder
prompt). These feeds cover the editorial themes the publication actually cares
about: how work is organised and managed, how people reskill, and which tools
matter.

Feeds expose no engagement metric, so their `score` is `0` by design rather than
invented. That is also why the pool is **interleaved by source** rather than
sorted globally by score: points, reactions and hearts are not comparable across
sources, and a global sort buried every feed item beneath Hacker News — exactly
the bias the feeds were added to fix. Round-robin guarantees the top of the pool
shows every source, strongest-first within each.

Flags: `--days N` (window, default 10), `--out <file>` (output path),
`--timeout MS` (per-request timeout, default 15000).

### Failure behaviour (matters for cron)

- **Every request is bounded by `--timeout`.** A feed that accepts the
  connection and then stops responding cannot hang the job. Requests run
  sequentially, so worst-case wall clock is roughly *(number of requests) ×
  timeout* — about 5 minutes with the default source lists.
- **Failures are isolated per request, not per source.** Each search term,
  tag, subreddit, and repo is its own request; one rate-limited term costs only
  that term's results, and the source keeps everything else
  (`GitHub releases: 1/5 requests failed, keeping the rest`). A source is only
  reported as failed when *every* one of its requests failed — which is the
  normal case for Reddit, since it 403s unauthenticated datacenter traffic.
- **A failed source is isolated too**, logged as `! <name> failed: <reason>`,
  and the run continues with the rest. A partial run still writes a pool and
  exits 0, with a `N/M sources failed` summary line.
- **If ALL sources fail, the collector exits 1 and writes nothing.** Exiting 0
  with an empty pool would be indistinguishable from a quiet news week: the
  finder would score an empty candidate list and silently fall back to web
  search, losing the point of the collector. Whatever runs the cron should treat
  a non-zero exit as "collection broke", not "no news".
- **Bad flag values fail fast.** `--days`/`--timeout` require a positive number;
  previously a missing or non-numeric value produced `NaN` and silently dropped
  every candidate.

### Known source limitations

- **Reddit** now returns `403` to unauthenticated datacenter requests. For reliable Reddit access, register a script-type OAuth app and add a bearer token; the collector isolates the failure so the rest of the run is unaffected.
- **GitHub** unauthenticated calls are rate-limited (60/hr). Set a `GITHUB_TOKEN` header if you add many repos.
- **X/Twitter and LinkedIn** have no zero-auth post search and are intentionally not collected here. Options: maintain a curated list of ~20–30 credible practitioners and check them via the official (paid) X API, or check manually. LinkedIn post scraping violates its ToS.

## Sector runs (targeted at one radar work dimension)

The pipeline above is the **generic** weekly run. Alongside it there are
**sector runs**: a targeted finder pass aimed at a single radar work dimension,
used when a radar sector looks thin on evidence.

Why they exist: the generic finder's search terms, feeds and quotas are all
tuned for SDLC, tooling and productivity signal, so the other sectors are
structurally under-sampled — which reads as an absence of phenomena in the world
rather than an absence of sampling.

Each sector has its own **standalone** prompt in `docs/sector-prompts/`. These
are forks of `ai-signals-finder-prompt.md`, not extensions of it: a sector
prompt's source-mix quotas and altitude test **replace** the generic prompt's.
Never run both against one another.

Currently written:

| Sector | Prompt |
|--------|--------|
| `worker-experience-identity-and-wellbeing` | [`sector-prompts/worker-experience-identity-and-wellbeing.md`](./sector-prompts/worker-experience-identity-and-wellbeing.md) |

Each sector prompt is launched on its own and reads
[`sector-prompts/sector-prompt-instructions.md`](./sector-prompts/sector-prompt-instructions.md)
first — the shared half, carrying the schema, output contract, dedup rules and
retrieval-report format. The sector file carries only scope, altitude, source mix,
hunting grounds and hazards. The two are disjoint: nothing in one overrides the
other.

Run order — note there is **no `signals:collect` step**, because the collector's
feeds are not sector-aware yet:

```bash
npm run signals:prepare
#  run the sector prompt (web search; no candidate pool). It writes, itself:
#    data/signal-drafts/<id>.json          one file per selected signal
#    data/_finder-rejected-<dim>.jsonl     appended, one line per rejection
#    data/_finder-report-<dim>.md          retrieval report
#  review data/signal-drafts/, mv each file into accepted/ or rejected/
npm run signals:promote                  # NOT BUILT YET — see the design below
```

Until `signals:promote` exists, the drafts have to be placed by hand. The
staging folders and the append-only rejection store are specified in
[the publishing design](./superpowers/specs/2026-08-06-signals-publish-design.md).

Working filenames are sector-suffixed so a sector run can never overwrite the
generic run's output.

The retrieval report records what was searched, what could not be reached, and
whether a sector-aware candidate collector would have helped. **The first run
answered that: yes, decisively** — three of the sector's own named hunting
grounds (Reddit, Hacker News, Blind) were unreachable through general search.
See [the design](./superpowers/specs/2026-08-06-radar-sector-signal-search-design.md)
and [the handover](./superpowers/HANDOVER-sector-signal-search.md).

The sector is a **run-time lens only**: it shapes the search and the output
filenames, and is never recorded in published signal JSON. There is no
`workDimensions` field on the AI Signal schema.

## Extending

Add a source by writing an `async` collector that returns candidate objects
(`{title, url, source, sourceType, date, score, signals}`) and pushing `[name, fn]` into
`COLLECTORS`. Dedup, windowing, and failure isolation are handled for you.
