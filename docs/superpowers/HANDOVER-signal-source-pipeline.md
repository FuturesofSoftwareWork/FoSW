# Handover — signal source pipeline (Slack/crawler intake, drafted findings, review app)

**Written:** 2026-11-11. Read this first if you are picking the pipeline strand up cold from *this* repo. The work itself lives in a separate private repository; this note covers the seam and the website-side tasks.

## Where it lives

| | |
| --- | --- |
| **Repo** | `vttfinland/signal-pipeline` (private), local `C:\github\signal-pipeline`. Everything is on its `main` |
| **Start there with** | `STATUS.md` (what is live, open items, next steps), `DECISIONS.md` (why), `FEEDBACK.md` (what using it taught us), `docs/deploy.md` |
| **Hosted** | Supabase project `rglgqalkmypotonbmsgs` (EU); review app on Firebase Hosting, `https://signal-pipeline-45eab.web.app` |
| **Status** | A first version works and is being tested by Arto alone. No curators yet. Slack intake is not connected |

Pipeline idea in three sentences: a link is captured and its text stored privately; a model drafts findings that quote the stored text; a person reviews them in the review app, and promoted findings are exported as signal files that this repo's own `npm run signals:promote` still gates.

## The seam with this repo

Nothing imports across repos. They meet in three places:
1. **Signal JSON files** written by the pipeline's exporter (Task 23, not built yet) into `data/signal-drafts/`, then reviewed here as usual.
2. **A read-only endpoint** `GET /source-text?signalId=...` with `RADAR_READ_KEY`, deployed on the hosted project, for the radar scripts to read stored source text.
3. **A tested copy of the vocabulary** (`config/instance/software-work.vocab.json` in the pipeline repo) of this repo's categories, source types and rejection reasons. If you change `scripts/lib/signal-schema.mjs` or `review-schema.mjs`, update that copy; its parity test only runs when `SITE_REPO` is set.

## Done in this repo

- `sourceId` and `primarySourceId` are optional signal fields (commit `06d0e7e`, on `main` since 2026-11-03). Nothing renders them.

## Not started in this repo (from the pipeline plan, Phase A)

| Task | What | Depends on |
| --- | --- | --- |
| 24 | Evidence carries a quote, checked against the stored source (`findQuote` copy plus a call to `/source-text`) | The endpoint (live) |
| 24b | Independence counts sources, not signals | `sourceId` (done) |
| 25 | `npm run radar:reread -- <phenomenonId>` enqueues re-read jobs | The pipeline's `reread` handler (built, unused by the UI) |
| 26 (website half) | Team guide and `CLAUDE.md` section for the pipeline | Pipeline concept settling |

The plan text is `docs/superpowers/plans/2026-10-29-pipeline-phase-a.md` in the pipeline repo. **Do not start 24, 24b or 25 yet:** the concept is under review (below), and they depend on what a "finding" turns out to be.

## What is undecided

The pipeline currently drafts one finding per quote-worthy point. Arto proposed a topic-based flow instead: extract topics against the project brief, the system suggests which matter, a person selects, and news items are written on the better model, possibly combining topics. A spike worked, but no decision is recorded (see `DECISIONS.md`, "Open direction"). The export (Task 23) and the website tasks above should wait for that.

## What will bite you

- The two repos are on different GitHub accounts: the website repo uses the personal account, the pipeline repo the VTT account (`Arto-Wallin_vttfi`). `gh` may not see runs in the other one.
- The pipeline's hosted data (1 source, 15 pending findings) is test material on the Haiku tier. A finding cannot be promoted until it is redrafted on the publish tier (Sonnet). Do not export anything from it.
- Never put captured source text or commentary about named third parties in this public repo.
- Untracked files in this working tree (`data/events/`, `data/_claim-run-prompt-feedback...`) belong to other strands, not this one.
