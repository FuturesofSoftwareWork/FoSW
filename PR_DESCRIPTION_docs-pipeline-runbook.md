# Pipeline runbook, a lost-signal fix, and one command to see the radar

Phase 2 is merged, so this branch is the first attempt to *operate* the pipeline
end to end rather than build it. Three things came out of that: the operator
documentation that did not exist, a contract bug that was silently losing
signals, and a command that makes looking at the radar one step instead of three.

## Why

Every document in `docs/` explains why the pipeline is shaped the way it is.
None of them answers *what do I type next*. Running it for the first time
surfaced that gap immediately — and then surfaced two defects that only appear
when you actually run the thing.

## What changed

### 1. `docs/pipeline-runbook.md` — the operator's page

Both stages end to end: signal drafts through `signals:promote`, then
`radar:prepare` through `radar:accept`. Plus who decides what, a command
reference, and a table mapping each refusal message to its cause and fix.

The organising rule is that it does **not** restate what a command prints or
what a spec explains. Those duplicate, drift, and are one click away. It carries
the judgment calls instead — which passes need a fresh session, what to look for
in the apply diff, that `suggestions` are lost if nobody reads them, that reject
is not `rm`, and that a green harness is not proof.

The lead is the thing everyone gets wrong first: **there are two pipelines, not
one.** Publishing a signal and putting a phenomenon on the radar are separate
acts, joined only by a clustering pass. Running Stage A and never running Stage B
is a valid week.

### 2. The generic finder was losing its signals

`docs/ai-signals-finder-prompt.md` still wrote one `data/_finder-output.json`
array and ended at `signals:reconcile` — a contract that predates draft staging.
Nothing in the repo converts that array into `data/signal-drafts/<id>.json`, so
its items could never reach `signals:promote`. Meanwhile `reconcile` had already
recorded them in the ledger as `published`, so no later run would re-surface
them.

Both unpublishable and unfindable, with no error anywhere.

**This was live.** `2026-08-10-06` through `-09` were lost this way and are
recovered on this branch — validated against `signal-schema.mjs`, written into
the drafts queue, and their four premature `published` ledger records removed so
`promote` can record the real outcome after review.

The prompt now uses the same contract as the sector and claim prompts: one file
per signal as `draft`, declines appended to `data/_finder-rejected.jsonl`, ending
at `signals:promote`. One shape rather than two. `signals:reconcile` still works
and is in no run order.

### 3. `npm run preview:radar`

Seeing the radar as the preview deployment serves it took three commands, and on
Windows that sequence is where an afternoon goes:

- `--base=/FoSW/preview/` is rewritten by MSYS in Git Bash — **visibly** on
  `vite preview` (404, `/Program%20Files/Git/...` in the log), **silently** on
  the build (exit 0, wrong base, assets 404 at runtime).
- PowerShell avoids MSYS, but a locked-down execution policy blocks npm's `.ps1`
  shim on machines here.

One command now builds with drafts on, serves, runs the radar checks, and stays
up until Ctrl+C. It serves over its own HTTP server rather than
`vite preview --base` and spawns the build through the platform's own shell, so
neither trap is reachable. `preview.bat` is a double-clickable wrapper, and
`--help` documents the flags so the runbook does not have to.

### 4. A stale server could hijack the prerenderer

Found by hitting it. On Windows `localhost` resolves to `::1` first, and a stale
server holding `::1:4173` does **not** collide with the prerenderer binding
`0.0.0.0:4173` — they coexist, and every client reaches the stale one.
`npm run build` prerendered Vite's *"the server is configured with a public base
URL of …"* error page into `dist/index.html`, then failed on a missing dialog
selector several steps from the cause.

The shared server now binds and addresses `127.0.0.1`, so a genuine clash is a
loud `EADDRINUSE`. The static server is extracted to
`scripts/lib/static-server.mjs` and shared with `prerender.mjs` — the SPA
fallback is the part that would have drifted between two copies.

### 5. Content from the run

`signals:promote` published three reviewed signals. `radar:apply` added four
draft phenomena, 17 attachments, and five detachments from `teams-get-smaller`.

Those five are the construct cleanup the Phase 2 design predicted: the
phenomenon cited two layoff market-events and two labour-market datasets that
measure aggregate employment rather than the size of a delivery unit. It now
cites two `supports` items and `evidenceProfile.counterEvidence` is false.

Ten phenomena validate, all `draft`. Coverage rises from 37 to 67 of 105
published signals.

### 6. `verify:radar` no longer hardcodes the blip count

It asserted exactly six, a literal from when six phenomena existed, and failed
the moment a seventh arrived — reading as "the radar broke" rather than "the
harness is stale", which is how a team learns to ignore a harness.

The count is now derived from the index the page itself fetched. Context is
handled without guessing: drafts render in dev and preview and are hidden in
production, so the expectation keys off whether any draft rendered — either none
do, or all of them do. A partial set is itself a bug and is now caught.

## Verification

- `npm run build` — exit 0
- `npm test` — 176 pass
- `npm run lint` — clean
- `npm run preview:radar` — **14/15**, the one failure being the label crowding
  below
- Radar screenshotted at 10 blips, since a green harness once reported 9/9 on a
  visibly broken radar

## ⚠️ This branch will fail the deploy workflow

`.github/workflows/deploy.yml` runs `verify:radar` against the preview build and
gates **both** deployments on it — "nothing publishes if the harness fails" is
deliberate and documented there. The label-crowding check fails at ten
phenomena, so merging this as-is means the workflow goes red and nothing
deploys, including production.

The overlap is between `Managing machine spend` and the two new phenomena
`The management layer thins` and `Maintenance becomes the constraint`, so it is
new on this branch — main's six phenomena do not collide.

Three ways forward, and this is a call for the team rather than something to
decide inside this PR:

1. **Fix blip-label layout first** and merge that ahead of this branch. It is
   the honest fix and it is real work — `placeBlips` separates blips but nothing
   separates their labels.
2. **Merge and accept a red deploy** until the layout fix lands. Only sensible
   if nothing needs to ship meanwhile.
3. **Hold the four new phenomena** — merge the tooling and docs now, apply the
   radar proposal after the layout fix. Splits cleanly: the content is one
   commit.

## Known, and deliberately not fixed here

- **Label crowding at ten phenomena.** Blips stay cleanly separated; it is only
  the labels, exactly as the Phase 2 spec predicted when it deferred this and
  called it "the most likely next visible defect".
- **`teams-get-smaller` still renders a contested bolt**, and its
  `contestedNote` describes the evidence just detached. Both fields are
  human-owned, so `apply` correctly left them alone; they need an editorial edit.
- **All four proposed phenomena came back `gaining-traction`** — none at the rim,
  none at the centre. Worth scepticism at reach review; it is the anchoring
  pattern the adjacent-ring requirement exists to counter.

## Not in scope

Nothing is published. All ten phenomena are `draft`, the launch gate stays
closed, and the radar remains invisible in production. Publishing needs the reach
review: the four new phenomena have no `reachReviewedAt`, and the six existing
ones have no `construct`. `radar:accept` refuses on both, by design.
