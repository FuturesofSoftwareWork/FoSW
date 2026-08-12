# AI-Signals News-Finder Pipeline

Tooling that makes the news-finder **stateful** (stops re-surfacing the same landmark
studies) and **discovery-driven** (surfaces fresh practitioner/social signals, not just
published articles + arXiv).

Design principle: **retrieve broadly in code → score editorially in the LLM.** The prompt
can only reason over what it's given, so discovery and de-duplication live in scripts; the
model does the editorial judgment.

> Operating this? Read [`pipeline-runbook.md`](./pipeline-runbook.md) instead — what to
> type, in what order, and what to do when a step refuses. This page is the design.

## Files

| Path | What it is | Committed? |
|------|------------|------------|
| `scripts/ledger.mjs` | Seen-ledger manager (`prepare`, `reconcile`) | yes |
| `scripts/collect-candidates.mjs` | Zero-auth feed collector (HN, Dev.to, Reddit, GitHub releases) | yes |
| `scripts/validate-signals.mjs` | Schema validator; runs first in `npm run build` | yes |
| `data/_seen-ledger.jsonl` | Append-only memory of everything seen | **yes — this is state** |
| `scripts/promote-signals.mjs` | Publishes reviewed drafts; the only schema gate | yes |
| `data/_candidates.json` | Per-run candidate pool for the prompt | no (gitignored, regenerated) |
| `data/signal-drafts/<id>.json` | The finder's selected items, one file each, awaiting review | no (gitignored) |
| `data/_finder-rejected*.jsonl` | Items evaluated and declined, append-only across runs | no (gitignored) |

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
#                                 the prompt writes data/signal-drafts/<id>.json,
#                                 one per signal, and appends to
#                                 data/_finder-rejected.jsonl
#                              4. review data/signal-drafts/, mv each file into
#                                 accepted/ or rejected/
npm run signals:promote      # 5. validate, publish, and record every decision in the ledger
```

Steps 1, 2, and 5 are deterministic code. Step 3 is the LLM and step 4 is a person. Keeping
ledger writes in code (step 5) rather than asking the model to append means state can't be
lost to a model slip or a run that dies mid-write.

**The generic run ends at `signals:promote`, not `signals:reconcile`.** It used to write a
single `data/_finder-output.json` array which `reconcile` appended to the ledger as
`published` — a contract that predates draft staging. Nothing converts that array into
drafts, so items written that way are invisible to review and to `promote`, while `reconcile`
has already recorded them as seen, so no later run re-surfaces them. Four signals were lost
that way on 2026-08-10 and recovered by hand. `signals:reconcile` still exists and still
works; no run order in this repo uses it.

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

Flags: `--profile NAME` (which source profile to collect, default `generic`),
`--days N` (window; overrides the profile's `windowDays`), `--out <file>`
(output path; defaults to the profile-derived one), `--timeout MS` (per-request
timeout, default 15000).

## Source profiles

**Which** sources a run collects lives in `config/sources/<name>.json`, not in
the collector. `--profile <name>` selects one; the pool is written to
`data/_candidates-<name>.json` (`data/_candidates.json` for `generic`), derived
from the name so a sector pool can never overwrite the generic one. An unknown
profile exits 1 rather than falling back — collecting the wrong sources still
writes a plausible pool, and nothing downstream could tell it from a real one.

```json
{
  "profile": "worker-experience-identity-and-wellbeing",
  "description": "why this profile exists and what it deliberately omits",
  "hackerNewsTerms": [], "devtoTags": ["career"], "subreddits": [],
  "githubRepos": [], "feeds": [{ "name": "…", "url": "…" }],
  "substacks": [{ "name": "…", "host": "…" }],
  "windowDays": 21
}
```

Every source key is optional; an absent or empty one means that collector does
not run. `profile` must equal the filename stem. `windowDays` defaults to 10 and
exists because sources publish at very different cadences — Pragmatic Engineer
contributed nothing on 2026-08-10 through no fault of its own, its newest post
being 12 days old against a 10-day window.

**Profiles are standalone. There is no inheritance**, deliberately. The generic
run executes weekly regardless, so its sources are already collected and already
in the ledger by the time a sector run happens; a profile that re-listed them
would re-fetch what `signals:collect` then strips as already-seen, so the
inherited half would be empty by construction. A profile is therefore the
*complement* of the generic run — the venues it structurally cannot reach — and
each one must be written deliberately rather than assumed to inherit defaults.

### What a profile can and cannot reach

| Venue named by the sector/claim prompts | Collectable |
|---|---|
| Hacker News threads | yes, via `hackerNewsTerms` |
| Personal blogs, Substacks, LeadDev, trade press | yes, via `feeds` / `substacks` |
| Dev.to | yes, via `devtoTags` |
| Reddit | **no** — `.json` routes require OAuth |
| LinkedIn, X, Blind | **no** — no zero-auth search |
| DORA / Stack Overflow / JetBrains surveys | no — not feed-shaped |
| arXiv `cs.HC`, `cs.SE` | **deliberately excluded** |

arXiv is left out on purpose: it is already the largest single host in the corpus
at 19 of 102 signals, the prompts cap academic items at 2 per run, and academic
work is a lagging indicator here. Collecting it would feed the exact bias the
collector exists to correct.

So a sector profile covers roughly half of its prompt's venue list. It is still
worth having, because the half it covers arrives **pre-deduped against the
ledger** — the specific failure the worker-experience run reported.

### Writing a new profile

Verify every feed URL fetches and parses before adding it, and check that search
terms actually return on-topic hits. Writing the worker-experience profile
turned up two findings worth repeating: one named practitioner (Wes McKinney)
exposes no discoverable feed and had to be left out, and at the collector's
`points>30` threshold this sector returned **zero** Hacker News stories in 60
days, so `hackerNewsTerms` is empty there rather than carrying terms that only
match noise. A source that contributes nothing but costs requests trains its
reviewer to ignore the pool.

### Source nominations — how a profile grows

The seen-ledger remembers items. Nothing remembered **sources**, so the
2026-08-06 sector run found eight named practitioners by hand, used them once,
and dropped them; the next run started from zero. Seeding the first profile
proved the value and the cost — a person reading a report and probing feed paths
one domain at a time.

```
finder run  ──► data/source-nominations/<slug>.json    name, profile, foundAt, why
                        │
npm run sources:discover│  fetch foundAt, read <link rel="alternate">, fall back to
                        │  conventional paths, verify it parses, write feed + feedStatus
                        ▼
      you: read it, mv to accepted/ or rejected/   (+ optional _review note)
                        │
npm run sources:promote │  append to config/sources/<profile>.json
                        ▼
              the next collect run picks them up
```

Same contract as signal drafts: the agent proposes, a human moves a file, a
script promotes. Nothing joins a profile unread and nothing is accepted
automatically.

**The finder nominates a person and the page it read, never a feed URL.**
Discovery is code's job — a model asked to guess a feed path returns plausible
404s, and a URL that looks right but is never fetched contributes nothing to
every run afterwards. Both discovery strategies earn their place: of the four
pages the first sector run found people on, three advertise a feed in a `<link>`
tag and `jacob.gold` advertises none but serves `/index.xml`. Candidates are
verified with the collector's own `parseFeed`, because a feed discovery accepted
but the collector could not read would be worse than none.

**Feeds only** — not search terms, tags or subreddits. A feed is checkable by
code: does it fetch, does it parse, when did it last publish. A search term is
knowable only by running it next week, and the evidence says terms are the weak
end anyway: five of six candidate Hacker News terms for this sector returned
zero stories in 60 days.

The nomination criterion in the prompts is deliberately evidence-based —
*nominate a source when you drafted, or seriously considered drafting, a signal
from it this run* — so the roster grows from material that cleared the bar.

`sources:promote` is all-or-nothing and refuses an unroutable nomination, an
unverified feed, or a duplicate. Duplicates are compared on the normalised URL,
so a scheme change or a trailing slash cannot smuggle a second copy of one feed
into a profile and double its weight in the pool. It does not re-fetch: a feed
that dies between discovery and promotion shows up as an isolated per-request
failure on the next collect run, which is how the collector already handles a
dead source.

Accepted files are consumed — the profile is the record from then on. **Rejected
files stay**, because they are the memory that stops the next run re-nominating
someone already declined.

`data/source-nominations/` is gitignored: unreviewed material naming
individuals, plus a reviewer's reasons for declining a named person, on a public
repo. The cost bites hardest here of the three places it applies — the value of
the declined list grows over time, and it lives on one machine.

A profile is pruned by hand. Nothing removes a source that has gone quiet:
deciding a writer has stopped being worth following needs a judgment about why,
and a script that dropped sources silently would shrink the pool without anyone
noticing.

### Run ordering

Both runs use a window wider than the weekly cadence, so pools overlap by design
and the ledger absorbs it. But **whichever run happens first takes the item** —
`signals:collect` drops anything already in the ledger and `signals:promote`
writes it. If the generic run lands first, a burnout story appearing in both
pools is scored under generic quotas rather than by the sector prompt with its
distress-selection hazard section. Choose the order deliberately.

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
  normal case for Reddit, whose `.json` routes now require OAuth (see
  *Known source limitations*).
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

- **Reddit** returns `403` to *every* unauthenticated request for a `.json`
  listing, from any address. This was previously recorded here as a block on
  datacenter traffic; that is wrong, and the distinction decides whether the
  problem is fixable by changing where the request comes from. It is not.
  Measured on 2026-08-12 from a residential Windows machine:

  | Request | Result |
  |---|---|
  | `www.reddit.com/r/<sub>/` (HTML) | `200` |
  | `www.reddit.com/r/<sub>/top.json` | `403 Blocked`, 190 KB HTML: *"You've been blocked by network security"* |
  | `old.reddit.com/r/<sub>/top.json` | `302` → `/login/?reason=lor2` |
  | `oauth.reddit.com/r/<sub>/top` (no token) | `403` |
  | `www.reddit.com/api/v1/access_token` (no creds) | `401` |

  The same IP gets `200` for HTML and `403` for `.json`, so it is not an IP,
  user-agent or reputation block — the route itself now requires OAuth, as part
  of Reddit's API lockdown. `old.reddit.com` says so plainly by redirecting to
  login; `www` returns a generic WAF page instead of a `401`, which is what made
  this look like an IP block. **No user-agent, header or host change gets past
  it.** The only fix is a script-type OAuth app: POST client id/secret to
  `/api/v1/access_token` with `grant_type=client_credentials`, then call
  `oauth.reddit.com` with the bearer token. Until then the source contributes
  nothing and its failure is isolated, so the rest of the run is unaffected.
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

Run order. `signals:collect` runs **only if a profile exists** for this
dimension at `config/sources/<dim>.json` — see [Source profiles](#source-profiles):

```bash
npm run signals:prepare
npm run signals:collect -- --profile <dim>   # only if config/sources/<dim>.json exists
#  run the sector prompt. It reads data/_candidates-<dim>.json when present and
#  searches the web for everything the profile cannot reach. It writes, itself:
#    data/signal-drafts/<id>.json          one file per selected signal
#    data/_finder-rejected-<dim>.jsonl     appended, one line per rejection
#    data/_finder-report-<dim>.md          retrieval report
#  review data/signal-drafts/, mv each file into accepted/ or rejected/
npm run signals:promote
```

A profile is a floor, not a ceiling: it reaches feeds and search APIs only, so
everything the prompt finds by web search still arrives undeduped and must be
checked against the ledger by hand.

`signals:promote` validates every file in `accepted/`, moves them into
`public/content/ai-signals/` as `published`, appends their `index.json` entries,
and records each decision in the seen-ledger — promoted as `published`,
everything in `rejected/` and every `_finder-rejected-*.jsonl` line as
`rejected`. It never touches the unreviewed queue, refuses to overwrite an
existing published file, and moves nothing at all if any file fails validation.
See [the publishing design](./superpowers/specs/2026-08-06-signals-publish-design.md).

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

## Claim runs (targeted at one phenomenon's evidence base)

A generic run and a sector run both ask *what is new?* A **claim run** asks
whether the evidence under one radar phenomenon actually supports what that
phenomenon says — and goes looking for what would show that it does not.

Why they exist: evidence accumulates by topical association, not by measurement.
A phenomenon claiming the delivery unit is shrinking attracts a year of layoff
and hiring data, all of it real and none of it about team size. The result looks
like a well-evidenced claim and is a single source wearing five coats. A claim
run is the corrective pass.

Three things make it different from every other run here:

1. **It tests rather than scouts.** Novelty is not the bar; measuring the
   construct is.
2. **It hunts both sides deliberately.** A phenomenon's `whatWouldChangeThis`
   list is a ready-made search brief for the refuting side, and refutations are
   rarer because nothing that stayed the same makes news.
3. **Its deliverable is an evidence block, not a set of drafts.** The retrieval
   report ends with the `evidence` array proposed for the phenomenon file,
   including proposed removals and their consequences for `evidenceProfile
   .counterEvidence`, `contested` and `reachRationale`. The run never edits the
   phenomenon file; a human applies it.

The central rule is the **construct test**: a source is evidence for a claim only
if it measured the thing the claim is about. Each claim file names the construct
and tabulates the near neighbours that get mistaken for it, which the run must
reject under `wrong-construct` however well reported they are.

Each claim has its own **standalone** prompt in `docs/claim-prompts/`. These are
forks of the sector prompts, not extensions of them: never run a claim prompt and
a sector prompt against one another.

Currently written:

| Claim | Prompt |
|-------|--------|
| `teams-get-smaller` | [`claim-prompts/teams-get-smaller.md`](./claim-prompts/teams-get-smaller.md) |

Each claim prompt is launched on its own and reads
[`claim-prompts/claim-prompt-instructions.md`](./claim-prompts/claim-prompt-instructions.md)
first — the shared half, carrying the construct test, the schema, the output
contract, dedup rules and the retrieval-report format. The claim file carries
only the claim, its construct, its near neighbours, what would refute it, the
search window, source mix, hunting grounds and hazards. The two are disjoint.

Run order — as with sector runs there is **no `signals:collect` step**, because
the collector's feeds are not claim-aware:

```bash
npm run signals:prepare
#  run the claim prompt. No claim profile has been written yet, so this is web
#  search only; if one is added, run signals:collect --profile claim-<id> first.
#  It writes, itself:
#    data/signal-drafts/<id>.json                        one file per selected signal
#    data/_finder-rejected-claim-<claim-id>.jsonl        appended, one line per rejection
#    data/_finder-report-claim-<claim-id>.md             retrieval report + proposed evidence block
#  review data/signal-drafts/, mv each file into accepted/ or rejected/
npm run signals:promote
#  then apply the report's proposed evidence block to
#  public/content/phenomena/<claim-id>.json by hand
```

The `claim-` infix keeps a claim run's working files clear of both the generic
run's and any sector run's. `promote-signals.mjs` sweeps every
`data/_finder-rejected*.jsonl` into the ledger, so claim-run rejections are
remembered without further wiring.

The claim is a **run-time lens only**, exactly as the sector is: it shapes the
search and the output filenames and is never recorded in published signal JSON.
There is no phenomenon field and no stance field on a signal — stance lives on
the phenomenon's evidence entry, because the same source can be support for one
phenomenon and context for another.

Applying the proposed block is a human step, and three fields move with it:
`evidenceProfile.counterEvidence` is derived and validated (`validate-phenomena
.mjs` fails the build on a mismatch), `contested` gates a radar bolt that
`scripts/verify-radar.mjs` counts by name, and `reachRationale` and
`contestedNote` are prose that may now describe evidence no longer in the file.
`observedReach` is a human judgment and a claim run may report that it no longer
matches the evidence, but never propose a new ring value as though it were
derived.

## Review rationale

A human rejection used to record nothing: `promote` turned a file in `rejected/`
into a ledger line with a key, a claim, a url and a status. Meanwhile the
prompts required `reason`, `rejectedUnder` and `reviewable` on every one of the
agent's own declines — and `finderRejections()` copied out claim, url and status
only, deleting all three at the last step. Both halves are fixed.

**The reviewer writes in the draft.** Add a `_review` block to the file you are
already reading, then move it:

```jsonc
{
  "id": "2026-08-10-02",
  "_review": {
    "under": "commercial-intent",
    "note": "too technically focused security news — the consequence is the exploit, not a policy change"
  }
}
```

The folder is the decision; `_review` carries only the rationale, so the two
cannot disagree — that is why it has no `decision` field. `reviewer` defaults to
`git config user.name`. Every draft carries a `$schema` key pointing at
`schemas/signal-draft.schema.json`, which gives an editor the `under` codes with
descriptions on hover; `.vscode/settings.json` is gitignored, so an inline key
is the only wiring that survives a fresh checkout. That schema is generated by
`npm run schema:build` from `scripts/lib/review-schema.mjs`, and a test fails if
they drift — an editor offering a code that `promote` then rejects is worse than
no autocomplete at all.

`promote` **strips `_review` and `$schema`** before writing to `public/`. A
candid note about a named vendor must never ship with the signal it describes.

**Every decision becomes an event** in `data/_review-log.jsonl`, human and
finder alike, distinguished by `by`. The seen-ledger is untouched: it stays a
lean dedup index and judgment lives beside it, the same relationship
`_radar-reach-log.jsonl` has to the phenomenon files. A draft moved with no
`_review` is recorded as `unrecorded` and counted, never refused — refusing
would punish a reviewer at the end of a session and break the guarantee that an
interrupted review publishes nothing.

**The log is gitignored.** Free-text judgment about named third parties does not
belong in a permanent public history; that is the same rule the
`_finder-rejected*` files already follow. The seen-ledger is committed and does
name declined stories, but carries no reasons. The cost is that the log is local
to one machine and not shared between reviewers, which is the clearest concrete
pressure toward a private store.

The six codes `seo-content-no-method`, `adjacent-already-covered`,
`illustrative-not-measured`, `superseded-by-later-development`,
`aggregator-used-primary-instead` and `capped-this-run` were adopted from what
runs were already emitting, not invented: 8 of the 55 rejections on disk use
one, and collapsing them into `unrecorded` would have discarded the distinction
the run took the trouble to draw. `capped-this-run` means **deferred by a quota,
not disqualified** — those items are candidates for a later run.

## Extending

Add a source by writing an `async` collector that returns candidate objects
(`{title, url, source, sourceType, date, score, signals}`) and pushing `[name, fn]` into
`COLLECTORS`. Dedup, windowing, and failure isolation are handled for you.
