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

`teams-get-smaller` picks up the two editorial edits the detachments left owing,
both on human-owned fields that `radar:apply` correctly refused to touch:

- **No longer `contested`.** The flag and note described the four sources just
  detached as off-construct, so the bolt reported a disagreement the file no
  longer contains — and, per the Phase 2 design, never really did. Set to `false`
  rather than removed: absent means nobody has judged, and someone has now.
- **`reachRationale` rewritten.** It argued from "a single investor field
  writeup" and "the counter-evidence on aggregate demand is strong", neither true
  any more. It now names both supporting sources and what each measured, says
  what is still missing, and records that the removed counter-evidence was
  off-construct — so its disappearance is not misread as the claim strengthening.

`observedReach` and `reachReviewedAt` are unchanged on purpose. Correcting stale
prose is not a reach judgment, and stamping today's date would assert a
conversation that did not happen — leaving it also keeps `possibleReachChange`
raised, so the review stays outstanding.

The harness read the contested set from a hardcoded pair of names and would have
failed on the `contested` change; it now reads `contested` from the phenomenon
files, the same fix the blip count got.

### 6. `verify:radar` no longer hardcodes the blip count

It asserted exactly six, a literal from when six phenomena existed, and failed
the moment a seventh arrived — reading as "the radar broke" rather than "the
harness is stale", which is how a team learns to ignore a harness.

The count is now derived from the index the page itself fetched. Context is
handled without guessing: drafts render in dev and preview and are hidden in
production, so the expectation keys off whether any draft rendered — either none
do, or all of them do. A partial set is itself a bug and is now caught.

### 7. The radar canvas says less, and says it legibly

Three changes, all either removing text that repeated something already visible
or sizing text that carries the meaning.

**Blip labels are gone, and the labels toggle with them.** Ten phenomena across
seven sectors could not be labelled in place: the labels collided with each
other and struck through the ring labels while the blips themselves stayed
cleanly separated — `placeBlips` nudges blips apart, and nothing did the same for
their labels. A toggle you have to switch off to make the radar readable is not
a feature. The name is on hover, on focus, and in the drawer.

This is what the Phase 2 spec deferred as "the most likely next visible defect",
and it had become a **merge blocker**: `deploy.yml` gates both deployments on the
harness, and the crowding check failed at ten phenomena. It passes now.

**The hover card carries the label and nothing else**, at 12px rather than 9px.
It used to repeat the ring, plus `contested` and `draft` — all three already on
the canvas, since the ring *is* the distance from the centre, the bolt marks
contested and the dashed outline marks a draft. Restating them cost a line per
blip and taught the reader that the position was not to be trusted on its own.
They stay in `aria-label`, where a reader who cannot see the position needs them.

**Sector titles go from 8px at 75% opacity to 13px at full opacity**, wrapped
onto two lines; ring labels from 9px to 11px. The sector titles name the seven
dimensions the radar is organised by and were the least legible thing on it.
Wrapping rather than shrinking is what makes the size possible — the longest
title is 32 characters and caps single-line type at about 9px.

## Verification

- `npm run build` — exit 0
- `npm test` — 176 pass
- `npm run lint` — clean
- `npm run preview:radar` — **15/15**
- Radar screenshotted, in rest and hover states, since a green harness once
  reported 9/9 on a visibly broken radar

## Known, and deliberately not fixed here

- **`teams-get-smaller` still owes a reach review.** Its `contested` flag and
  `reachRationale` are corrected on this branch, but `possibleReachChange` is
  raised and `reachReviewedAt` deliberately still reads 2026-08-05: the prose was
  corrected, the ring was not re-judged. Whether `early-manifestations` is still
  right at two independent contexts is the conversation, and it has not happened.
- **All four proposed phenomena came back `gaining-traction`** — none at the rim,
  none at the centre. Worth scepticism at reach review; it is the anchoring
  pattern the adjacent-ring requirement exists to counter.

## Not in scope

Nothing is published. All ten phenomena are `draft`, the launch gate stays
closed, and the radar remains invisible in production. Publishing needs the reach
review: the four new phenomena have no `reachReviewedAt`, and the six existing
ones have no `construct`. `radar:accept` refuses on both, by design.
