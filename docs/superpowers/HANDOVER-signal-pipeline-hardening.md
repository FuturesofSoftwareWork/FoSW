# Handover — signal-pipeline hardening

Written 2026-08-19 at the end of the session that finished the branch.
**Updated 2026-09-01: the branch is merged and gone. The code strand is closed;
what is left here is the live editorial state and the open findings below, none
of which is derivable from the repo.** Read this first if you are picking it up
cold.

## Where the branch went

| | |
| --- | --- |
| **Status** | **Merged.** PR #28, rebase-merged into `main` on 2026-09-01 as `b0a4e82` |
| **Branch** | `feat-signal-pipeline-hardening` — deleted, local and remote |
| **Size** | 21 commits, +5590 / −218 |
| **PR body** | `docs/archive/merged_PRs/PR_DESCRIPTION_feat-signal-pipeline-hardening.md` |

Do not look for the branch. Its commits are on `main` under different SHAs —
the rebase merge means `git branch --merged` never recognised it, though the
trees were identical before deletion.

## What this branch was, in three sentences

Seven pieces of pipeline work: `sourceUrl` validation, tests for the two
state-owning scripts, a corrected Reddit diagnosis, source profiles that make
candidate collection sector- and claim-aware, a review log recording *why* each
editorial decision was made, and a nomination loop that lets a run's source
discoveries survive into the next run. It closed gaps found in an audit and
implemented two written designs. The full account is in the archived PR
description; the operator's view is `docs/pipeline-runbook.md`, added on this
branch.

## The immediate next action

**Work the review queue.** It is the only thing blocking signals from reaching
the site, and it is the deepest it has ever been — see below.

## State right now

**Verified on 2026-09-01, on `main` after the merge:**

- `npm test` — **284 pass**, 0 fail (176 before this branch)
- `npm run validate` — 102 signals valid; 10 phenomena valid, 0 published,
  launch gate still closed (needs 10 published)
- `npm run verify:radar` — **still never run by hand.** It needs a server
  already running. It first ran against this work in the deploy workflow on the
  PR-28 merge.

**`data/_seen-ledger.jsonl` — resolved 2026-08-19, and the diagnosis below was
wrong.** It is not a catch-up from a promote run. The 38-line diff was **pure
reordering**: 178 records before, 178 after, and a set comparison of canonicalised
records shows zero on either side that the other lacks. `signals:prepare` rewrites
the file sorted by `lastSeen`, so running it produces a large diff with no
content change. The correct action is `git checkout data/_seen-ledger.jsonl`,
which discards nothing; it has been done. Do not commit this diff "with a message
saying why" — there is no why, and the commit would imply state changed when it
did not. Expect it to reappear after any `signals:prepare`.

**The review queue is deep and untouched, and still growing:** as of 2026-09-01,
**43** drafts in `data/signal-drafts/`, **none** carrying a `_review` block yet,
`accepted/` empty, and two files in `rejected/` (`2026-08-07-03`,
`2026-08-10-01`). Dated 2026-08-07 through 2026-08-31. It was 26 at the
2026-08-19 handover; the 08-24 and 08-31 finder runs added the rest. All
gitignored, so none of it is at risk from a branch switch — but none of it is
backed up either, and nothing reaches the site until someone reviews it.

**Three source nominations are undecided:** `data/source-nominations/`
`andrew-diamond.json`, `dan-luu.json` and `github-engineering-blog.json`, all
sitting in the queue root with `accepted/` and `rejected/` empty. The Dan Luu one
cites `2026-08-17-12` and argues the generic pool is thin on named practitioners
who re-test other people's numbers. Deciding them is a folder move followed by
`npm run sources:promote`.

## Closed since the last handover — do not redo these

- **PR #24 (claim runs) merged** into `main` on 2026-08-10, merge commit
  `32c1faa`. `PR_DESCRIPTION_claim-validation-prompts.md` is archived under
  `docs/archive/merged_PRs/`.
- **The `teams-get-smaller` prune was applied.** The phenomenon cited six
  signals of which five measured employment rather than team size. It now cites
  two, both `supports` — `2026-08-03-10` and `2026-08-07-01` — with
  `contested: false` and `evidenceProfile.counterEvidence: false`. The claim
  run's report and rejection log are still on disk
  (`data/_finder-report-claim-teams-get-smaller.2026-08-07.md`,
  `data/_finder-rejected-claim-teams-get-smaller.jsonl`) and both are gitignored.
- **`scripts/verify-radar.mjs` no longer hardcodes which phenomena are
  contested.** The old check named `"Teams get smaller"` and
  `"The vanishing apprenticeship"` in a literal array and asserted exactly two
  bolts; it now keys off whether any draft rendered at all. Dropping `contested`
  on a phenomenon no longer breaks it.

## Decisions already made — do not silently reverse these

- **`config/sources/<profile>.json` is standalone, with no inheritance.** A
  profile lists every source it collects. Editing the profile, not
  `collect-candidates.mjs`, is how you change what a run pulls.
- **The rejection vocabulary lives in `scripts/lib/review-schema.mjs`** and the
  prompts must agree with it. The last commit on this branch exists because the
  prompts were teaching a `sourceUrl` shape the validator now rejects; the same
  class of drift applies to the vocabulary.
- **Three `data/` stores stay gitignored because they name third parties** —
  `_review-log.jsonl`, `_finder-rejected*.jsonl`, and `source-nominations/`.
  That is a privacy constraint on a public repo, not an oversight.
- **`signals:reconcile` is not in any run order.** It still exists and still
  works, but it records items as seen without them ever becoming drafts. Four
  signals were lost that way on 2026-08-10 and recovered by hand.

## Things that will bite you

- **The plan files' checkboxes are all unticked and the work is done anyway.**
  `docs/superpowers/plans/2026-08-12-source-nomination-loop.md` and
  `-source-profiles-and-review-log.md` show every step unchecked, but the
  commits implement them. Read the commits, not the checkboxes.
- **`npm run verify:radar` fails spuriously without a server already running,**
  which is why it is not wired into `build`, `test` or `lint`. Point it at
  `npm run dev` or a preview build; an ordinary production build has no radar in
  it to check.
- **A green deploy run does not mean the site updated.** Check
  `gh api repos/FuturesofSoftwareWork/FoSW/pages --jq .status`.

---

## Update 2026-08-19 — a sector run was used to test the instructions

After the branch was finished, the `worker-experience-identity-and-wellbeing`
sector prompt was run end to end against the new profile, deliberately as a test
of whether the instructions are followable rather than to produce content.

**Output:** 2 drafts (`2026-08-12-01`, `-02`, both in the queue of 26),
10 recorded rejections, 1 source nomination (Andrew Diamond, since resolved to a
verified feed). Report:
`data/_finder-report-worker-experience-identity-and-wellbeing.2026-08-12.md`.

**What held.** The altitude test rejected the two items that looked most like
good finds — Khare's *"The review queue is the bottleneck"*, the most on-sector
title in the whole pool and on reading a prescriptive framework with no personal
account, and DoltHub's 1,500-agent-PR piece, which has excellent numbers and is a
tool ranking. The commercial-intent discount caught an entire layer of
statistics-roundup SEO in one pass. The ledger caught an already-seen source
before any evaluation effort.

### Open findings — none of these is done

1. **No rejection code fits "on-topic but not experiential."** Khare's piece is
   neither vague nor out-of-sector; it is prescriptive rather than situated.
   `too-vague` was used as nearest-fit and misdescribes the call. A
   `not-experiential` code in `scripts/lib/review-schema.mjs` would be honest,
   and this sector would reach for it often. Adding one means the enum, the
   generated JSON schema (`npm run schema:build`) and all three prompts.
2. **Hacker News cannot be fetched the obvious way.** The instructions call
   comment threads primary sources, but `news.ycombinator.com/item?id=…` returns
   *socket hang up*. `https://hn.algolia.com/api/v1/items/<id>` serves the full
   comment tree. One line in the sector instructions would save every future run
   the detour. Worth noting the 2026-08-06 run concluded HN threads were
   unreachable through search; the 2026-08-12 run reached them first try, so that
   earlier conclusion is out of date.
3. **The sector profile needs trimming, and the report says why.** The pool
   produced **no drafts on its own** — it contributed dedup and one corroborating
   link. Two causes, both fixable in
   `config/sources/worker-experience-identity-and-wellbeing.json`:
   - **One writer dominates.** Sean Goedecke was 9 of 11 feed items. Round-robin
     interleaving balances across *sources*, and here one source is one prolific
     person. A per-feed cap of 2–3 would fix it — that is a change to
     `collect-candidates.mjs`, not just the profile.
   - **The Dev.to tags are not earning their place.** 40 of 51 pool items, zero
     usable. The failure is register, not topic: `career` and `mentalhealth` on
     Dev.to select for engagement bait. Recommend dropping both and making this
     profile feeds-only.
4. **`sourceType` is lossy when a thread is corroboration rather than the
   primary.** `2026-08-12-01` is a blog post corroborated by a 15-voice HN
   thread; the schema carries one `sourceType` for the item, so the thread's
   nature is invisible when reading the corpus back. Not wrong, just worth
   knowing before anyone counts `sourceType` distributions.

### Closed by this update — do not redo

- **The retrieval-report path now carries the run date**
  (`_finder-report-<id>.<YYYY-MM-DD>.md`), in both prompt instruction files and
  the pipeline doc, with a note saying the date is load-bearing. A fixed path
  meant the second run of a sector destroyed the first run's report. This had
  already happened for real: the 2026-08-17 `arxiv-v2` run overwrote the
  2026-08-10 one, and the 08-10 report survives only because someone saved it by
  hand first. All five reports on disk are now named for their run date.
- **`CLAUDE.md` now points at these handovers**, so a cold session finds them
  without being told they exist.
- **The pipeline doc's collector section no longer says to edit
  `collect-candidates.mjs`.** It had kept the pre-profile instruction and the old
  `TERMS`/`SUBREDDITS` constant names, both gone since source profiles landed.
