# Operating the pipeline: a runbook, a lost-signal fix, and a readable radar

Phase 2 is merged, so this branch is the first attempt to **operate** the
pipeline end to end rather than build it. Everything here came out of that one
run: the operator documentation that did not exist, two defects that only appear
when you actually run the thing, and the radar changes that ten phenomena made
unavoidable.

31 files, 14 commits. Each section below maps to its own commit or two.

## Why

Every document in `docs/` explains why the pipeline is shaped the way it is.
None answers *what do I type next*. Running it for the first time surfaced that
gap immediately — and then surfaced a contract bug that was silently losing
signals, a port collision that could corrupt a build, and a label layout that
had become a merge blocker.

---

## 1. `docs/pipeline-runbook.md` — the operator's page

Both stages end to end: signal drafts through `signals:promote`, then
`radar:prepare` through `radar:accept`. Plus who decides what, a command
reference, and a table mapping each refusal message to its cause and fix.

The organising rule: it does **not** restate what a command prints or what a spec
explains. Those duplicate, drift, and are one click away. It carries the judgment
calls instead — which passes need a fresh session, what to look for in the apply
diff, that `suggestions` are lost if nobody reads them, that reject is not `rm`,
and that a green harness is not proof.

The lead is the thing everyone gets wrong first: **there are two pipelines, not
one.** Publishing a signal and putting a phenomenon on the radar are separate
acts, joined only by a clustering pass. Running Stage A and never running Stage B
is a valid week.

CLAUDE.md gains a pointer, a `preview:radar` entry, and a corrected Windows note.

## 2. The generic finder was losing its signals

`docs/ai-signals-finder-prompt.md` still wrote one `data/_finder-output.json`
array and ended at `signals:reconcile` — a contract that predates draft staging.
Nothing converts that array into `data/signal-drafts/<id>.json`, so its items
could never reach `signals:promote`. Meanwhile `reconcile` had already recorded
them in the ledger as `published`, so no later run would re-surface them.

Both unpublishable and unfindable, with no error anywhere.

**This was live.** `2026-08-10-06` through `-09` were lost this way and are
recovered on this branch — validated against `signal-schema.mjs`, written into
the drafts queue, and their four premature `published` ledger records removed so
`promote` records the real outcome after review.

The prompt now uses the same contract as the sector and claim prompts: one file
per signal as `draft`, declines appended to `data/_finder-rejected.jsonl`, ending
at `signals:promote`. One shape rather than two. `signals:reconcile` still works
and is in no run order.

## 3. `npm run preview:radar`, and a port collision that corrupted builds

Seeing the radar as the preview deployment serves it took three commands, and on
Windows that sequence is where an afternoon goes: `--base=/FoSW/preview/` is
rewritten by MSYS in Git Bash — visibly on `vite preview`, **silently** on the
build (exit 0, wrong base, assets 404 at runtime) — and PowerShell, the usual
escape, is blocked by execution policy on machines here.

One command now builds with drafts on, serves, runs the radar checks, and stays
up until Ctrl+C. It serves over its own HTTP server rather than
`vite preview --base` and spawns the build through the platform's own shell, so
neither trap is reachable. `preview.bat` is a double-clickable wrapper;
`--help` documents the flags so the runbook does not have to.

**The port collision was found by hitting it.** On Windows `localhost` resolves
to `::1` first, and a stale server holding `::1:4173` does *not* collide with the
prerenderer binding `0.0.0.0:4173` — they coexist, and every client reaches the
stale one. `npm run build` prerendered Vite's *"the server is configured with a
public base URL of …"* error page into `dist/index.html`, then failed on a
missing dialog selector several steps from the cause.

The shared server now binds and addresses `127.0.0.1`, so a genuine clash is a
loud `EADDRINUSE`. The static server is extracted to
`scripts/lib/static-server.mjs` and shared with `prerender.mjs` — the SPA
fallback is the part that would have drifted between two copies.

## 4. The radar canvas says less, and says it legibly

**Blip labels are gone, and the labels toggle with them.** Ten phenomena across
seven sectors could not be labelled in place: the labels collided with each other
and struck through the ring labels while the blips stayed cleanly separated —
`placeBlips` nudges blips apart, and nothing did the same for their labels. A
toggle you have to switch off to make the radar readable is not a feature. The
name is on hover, on focus, and in the drawer.

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

## 5. The harness stops hardcoding what the content says

Three literals in `verify-radar.mjs` turned ordinary editorial changes into
harness failures — the failure mode that teaches a team to ignore a harness:

- **The blip count** asserted exactly six, from when six phenomena existed. Now
  derived from the index the page itself fetched. Context is handled without
  guessing: drafts render in dev and preview and are hidden in production, so the
  expectation keys off whether any draft rendered — either none do, or all of
  them do, and a partial set is itself a bug that is now caught.
- **The contested set** was a hardcoded pair of names, so marking a phenomenon
  uncontested would have failed the bolt check. Now read from the phenomenon
  files.
- **A "all 6 blips" message string**, now derived.

Check 7 is repurposed as the regression guard for the label removal: no blip
carries a standing label and no toggle offers to add one.

## 6. Content from the run

`signals:promote` published three reviewed signals. `radar:apply` added four
draft phenomena, 17 attachments, and five detachments from `teams-get-smaller`.

Those five are the construct cleanup the Phase 2 design predicted: the phenomenon
cited two layoff market-events and two labour-market datasets that measure
aggregate employment rather than the size of a delivery unit.

Ten phenomena validate, all `draft`. Coverage rises from 37 to 67 of 105
published signals.

`teams-get-smaller` then picks up the two editorial edits the detachments left
owing, both on human-owned fields `radar:apply` correctly refused to touch:

- **No longer `contested`.** The flag and note described the four sources just
  detached, so the bolt reported a disagreement the file no longer contains — and
  per the Phase 2 design, never really did. Set to `false` rather than removed:
  absent means nobody has judged, and someone has now.
- **`reachRationale` rewritten.** It argued from "a single investor field
  writeup" and "the counter-evidence on aggregate demand is strong", neither true
  any more. It now names both supporting sources and what each measured, says
  what is still missing, and records that the removed counter-evidence was
  off-construct — so its disappearance is not misread as the claim strengthening.

`observedReach` and `reachReviewedAt` are unchanged **on purpose**. Correcting
stale prose is not a reach judgment, and stamping today's date would assert a
conversation that did not happen. Leaving it also keeps `possibleReachChange`
raised, so the review stays outstanding.

---

## Verification

- `npm run build` — exit 0
- `npm test` — 176 pass
- `npm run lint` — clean
- `npm run validate` — 105 signals, 10 phenomena
- `npm run preview:radar` — **15/15**, up from 13/15
- Radar screenshotted in rest and hover states, since a green harness once
  reported 9/9 on a visibly broken radar

## Review notes

- **The content commit (`9020264`) is work the repo owner ran**, not the agent:
  `signals:promote` and `radar:apply` both executed in a separate terminal during
  the session. Worth confirming the four new phenomena are what was intended.
- **The ledger change spans two concerns and could not be split.**
  `data/_seen-ledger.jsonl` carries both `promote`'s appends and the removal of
  four premature `published` records; it sits in the content commit with the
  removal cross-referenced to the finder fix.

## Known, and deliberately not fixed here

- **`teams-get-smaller` still owes a reach review.** `possibleReachChange` is
  raised and `reachReviewedAt` still reads 2026-08-05: the prose was corrected,
  the ring was not re-judged. Whether `early-manifestations` is still right at two
  independent contexts is the conversation, and it has not happened.
- **All four proposed phenomena came back `gaining-traction`** — none at the rim,
  none at the centre. Worth scepticism at reach review; it is the anchoring
  pattern the adjacent-ring requirement exists to counter.

## Not in scope

Nothing is published. All ten phenomena are `draft`, the launch gate stays
closed, and the radar remains invisible in production. Publishing needs the reach
review: the four new phenomena have no `reachReviewedAt`, and the six existing
ones have no `construct`. `radar:accept` refuses on both, by design.
