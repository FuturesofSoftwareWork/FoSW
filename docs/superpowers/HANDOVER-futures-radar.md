# Futures Radar — Handover

**Written:** 2026-08-06. Read this first if you are picking the radar work up cold.

## What the radar is

The site publishes **AI signals** — dated news observations as JSON in
`public/content/ai-signals/`, fetched at runtime and never type-checked.

The radar adds a second content type, **phenomena** (`public/content/phenomena/`): a
phenomenon is a *forward-looking claim about how software work may be changing*,
backed by signals as evidence. Six exist, all `draft`.

A blip's position means **how far the change has reached**, not how confident anyone
is. Rings, centre outwards: `field-level-shift` → `gaining-traction` →
`early-manifestations`. That is a human judgement (`observedReach`) with a written
`reachRationale`, and **nothing computes it** — a formula over signal counts would
mistake coverage for spread.

Sectors are the seven **dimensions of software work**; a blip sits in the one it most
affects. Colour follows the sector, size shows how recently evidence appeared, and a
lightning bolt marks a `contested` phenomenon — one where the evidence genuinely
disagrees with itself.

## Where things stand

| Phase | State |
| --- | --- |
| **1 — Schema and validation** | Merged (PR #15, plus #16 fixing a semantic merge conflict) |
| **Content — 27 typed signals, 6 phenomena** | Merged (PR #17) |
| **3 — Radar UI** | Merged (PR #18) |
| **4 — Preview deployment** | **Built, not merged, not deployed.** Draft PR #19, branch `radar-phase4-preview` |
| **2 — Bootstrap pipeline** | Not started |

Phases were built out of order deliberately: Phase 2's pipeline is not on the
critical path to seeing a radar, so the first phenomena were hand-authored instead.

## What is unfinished — read this before starting anything

**There is no preview URL yet.** `futuresofsoftwarework.github.io/FoSW/preview/`
does not exist. Phase 4 built everything needed to produce it and none of it is
live. If you are here to "check the preview", it is not there — that is the state,
not a bug you have hit.

The blockers, in the order they must be cleared:

| # | What | Who can do it |
| --- | --- | --- |
| 1 | **The two workflow files are not installed.** They sit in `docs/pending-workflows/`, not `.github/workflows/`. Pushing to that path needs a token with `workflow` scope; the credentials on this project have `gist`, `read:org`, `repo` only and the push is rejected outright. | A human, through GitHub's web editor — or anyone with a `workflow`-scoped token. **An agent cannot clear this.** Do not spend a turn re-attempting the push; it will fail the same way. |
| 2 | **PR #19 is a draft and unmerged.** | A human reviews and merges. |
| 3 | **The preview deploy has never run,** so nothing about it is confirmed against real GitHub Pages — only against a local simulation. | Follows automatically from 1 + 2. |

Until #1 is done, the `pull_request` CI trigger is also **not** in effect: PRs are
still merged without `npm test` or `npm run lint` having run. The fix exists in
`docs/pending-workflows/deploy.yml` and is inert where it sits.

### To verify once it does deploy

Three things are asserted but unproven outside a local simulation. Check them on
the first real deploy:

1. **Does Pages serve a nested `404.html`?** If `/FoSW/preview/<anything-missing>/`
   is answered by `preview/404.html`, the `sessionStorage` forwarder injected into
   the production `404.html` is dead code and should be deleted. If it is answered
   by the *root* `404.html`, the forwarder is what makes preview deep links work.
   Both paths were tested locally and both land correctly; which one fires is only
   observable in production.
2. **Does `clean-exclude: preview` actually spare the folder?** A production deploy
   running after a preview deploy must not empty it.
3. **Does the shared `concurrency` group hold?** Both workflows trigger on a push to
   `main` and both commit to `gh-pages`.

### Known, unfixed, and not blocking

- **Blip labels crowd well before blips do.** At eleven phenomena labels overlap
  each other and strike through the ring labels, while every blip is cleanly
  separated. Labels default to on below sixteen, so this is five publications away.
  Blip placement is solved; label layout is not. This is the most likely next
  visible defect.
- **Nudging is unverified above ~5 blips in one cell.** A cell is roughly 64 × 48
  viewBox units and a blip needs ~380 sq units at the required spacing, so a cell
  holds about five. Beyond that it stays crowded by design — moving a blip out of
  its cell would misstate how far that change has reached. If 30–40 phenomena
  cluster into few dimensions, revisit the insets rather than the relaxation.
- **`scripts/prerender.mjs` still keeps its own copy of `SITE_URL`.** It cannot
  import `src/config.ts` and the comment says so, but the two can still drift. A
  `node --test` reading both files and comparing the literals would close it; the
  pattern already exists in `scripts/__tests__/config.test.mjs`.
- **The preview will redeploy on every push to `main`,** including documentation-only
  commits. Add `paths-ignore` for `docs/**` and `*.md` if that becomes noisy.
- **Only 6 phenomena exist and all are `draft`.** The radar stays invisible in
  production until ten are `published` — that gate is the point, not an obstacle.
  Publishing the tenth is what launches it.
- **Spec rule 12 is unimplemented** — that `radar:apply` touched no human-owned field
  on a pre-existing phenomenon. It belongs to Phase 2.

## The documents, and which to trust

| Document | Status |
| --- | --- |
| `docs/superpowers/specs/2026-08-04-futures-radar-design.md` | The design record. **Read its *As Built* section** — it lists every place the code deliberately diverges. Where they disagree, the code is right. |
| `docs/superpowers/plans/2026-08-05-futures-radar-phase1-schema.md` | Phase 1, done. Its carry-forward table is still live. |
| `docs/superpowers/plans/2026-08-05-futures-radar-phase3-ui.md` | Phase 3, done. Its carry-forward section listed the Phase 4 obligations; all are now closed. |
| `docs/superpowers/plans/2026-08-06-futures-radar-phase4-preview.md` | Phase 4, executed. One step was corrected mid-execution and says so inline — the forced-collision test called for twenty blips in one cell, which is four times what a cell physically holds. |
| `PR_DESCRIPTION_radar-phase4-preview.md` | The PR #19 body. Current. |
| `docs/pending-workflows/README.md` | **How to install the two workflow files.** Read this if you are the human unblocking the deploy. |
| `CLAUDE.md` / `AGENTS.md` | Current, and identical apart from the heading and mirror note. Carry the two conventions below. |

## Two conventions that will bite if you do not know them

**One drawer, one URL owner.** `App` owns content fetching, the drawer stack, deep
links and article meta, and renders `ContentDrawer` once. Sections take data and an
`onOpen` callback. This was a refactor, not an accident: `ContentStream` used to own
all of it, so a sibling radar section could not open the drawer, and a second
`ContentDrawer` would fight it for `window.history`. **Do not add a second one.**

**The radar is invisible until ten phenomena are published.** `FuturesRadar` returns
`null` in a production build below that threshold, except in dev and preview
(`VITE_RADAR_PREVIEW=1`). Drafts are fetched in those same two cases and never in
production. One predicate, `isPreviewContext()` in `src/lib/phenomenon.ts`, answers
that question for both the fetch and the gate — they used to be separate expressions
at opposite polarity, which would have desynchronised silently. This is the mechanism
that keeps unreviewed research claims off a VTT / University of Helsinki site.

## What Phase 4 did

Both of the items that used to head this section are fixed, along with the three
Phase 3 carry-forwards.

- **`scripts/prerender.mjs` no longer hardcodes the base.** It reads the base back
  off the built bundle's own asset URLs (`scripts/lib/prerender-base.mjs`), so the
  preview build — `--base=/FoSW/preview/` — prerenders instead of timing out at
  `waitForSelector`. There is no second place to keep in sync.
- **Deep links resolve.** Every build emits `dist/404.html`, a copy of the
  prerendered shell. Pages serves it *without redirecting*, so `useDeepLink` still
  sees the requested path. The production copy also forwards `/preview/` paths
  through `sessionStorage`, covering the case where Pages answers a preview miss
  with the root 404 page. Both routes were tested against a simulated Pages tree.
- **`/FoSW/preview/` is `noindex`,** applied by the `previewNoindex` plugin in
  `vite.config.ts`, keyed on the base rather than an environment variable.
- **Drafts render as dashed outlines** with a legend key, so a reviewer can tell a
  settled claim from one still being written.
- **Blips no longer overlap.** `placeBlips` nudges colliding pairs apart within
  their own cell.
- **A `pull_request` CI trigger was written** — but see *What is unfinished*: it is
  parked in `docs/pending-workflows/` and is **not** in effect yet.

All of the above is verified locally: `npm test` 69/69, `npm run lint` clean,
`npm run verify:radar` 15/15 against a preview build, deep links exercised by both
fallback routes against a simulated Pages tree, and nudging exercised by forcing five
phenomena into one cell (three genuine seed collisions before, none after). None of
it has been exercised by a real deployment.

## Start here for Phase 2

**Only after the three blockers above are cleared** — otherwise Phase 4 quietly
never ships, which is exactly how a preview that must later be "moved" gets
deferred forever.

The pipeline: `radar:prepare` / `apply` / `accept` / `derive`, the clustering
prompt, the machine-owned vs human-owned field manifest, editions and
`reachHistory` rendering. `deriveImpacts` in `src/lib/phenomenon.ts` already exists
for it to reuse. Spec rule 12 — that `radar:apply` touched no human-owned field on a
pre-existing phenomenon — is still unimplemented and belongs there.

**Still owed, and visible today:** blip *labels* crowd well before blips do. At
eleven phenomena the labels overlap each other and strike through the ring labels
while every blip is cleanly separated. Labels default to on below sixteen
phenomena, so this is five publications away. Blip placement is solved; label
layout is not.

## The verification harness — read this

There is **no frontend test runner**. The 63 `node --test` tests cover
`scripts/` only. Phase 3 was verified by a **headless Puppeteer harness** built from
the project's own devDependency, because MCP browser tools were unavailable.

It lives at `scripts/verify-radar.mjs`, **committed to the repo**, and is run with
`npm run verify:radar <baseUrl>` — not wired into `npm run build`, `npm test` or
`npm run lint`, since it needs a server already running and would fail spuriously in
an unattended pipeline. It *is* wired into `deploy-preview.yml`, which starts a
server first and verifies the artefact it is about to deploy. It runs 15 checks.
Six exist because *screenshots or a whole-branch review caught defects the DOM
checks had missed*:

- the radar SVG contains a nonzero number of `<text>` elements — added because, run against a production build, there is no radar at all, so the next two checks would otherwise pass vacuously over an empty list
- no SVG `<text>` may fall outside the viewBox — added after six rim labels shipped clipped while the harness reported 9/9
- labels sharing a line need 6px of clearance; labels on different lines need only not overlap — added after ring labels were struck through by blip labels
- no hover card may leave the viewBox with labels off — a state no other check enters
- no two blips may overlap — note this passes vacuously at six blips across seven sectors; the load-bearing check was a forced-collision run with five phenomena in one cell, which had three genuine seed collisions before nudging and none after
- every `draft` blip carries the dashed mark — added with the draft styling, since identical blips hid exactly the thing a reviewer needs to know

Run it against `npm run dev`, or a production build made with `VITE_RADAR_PREVIEW=1` —
the radar is hidden below ten published phenomena in every other production build, so
those are the only two contexts where the harness is meaningful.

## CI

**None of this is live yet** — the two files are parked, see *What is unfinished*.
What they will do once installed:

`deploy.yml` also triggers on `pull_request`, with an
`if: github.event_name == 'push'` guard on the Deploy step, so `npm test` and
`npm run lint` finally run *before* a merge rather than after. `deploy-preview.yml`
builds and publishes `/FoSW/preview/` from `main`. Both share the
`github-pages-deploy` concurrency group, because both commit to `gh-pages` on a push
to `main` and would otherwise interleave.

Until then the CI gap the previous handover recorded is **still open**: nothing
listens for `pull_request`, so no PR is checked before it lands.

**Pushing workflow changes needs a token with `workflow` scope, which the usual
credential here lacks** — it has `gist`, `read:org` and `repo` only, and the push is
rejected outright. So on the pushed branch both files are parked in
`docs/pending-workflows/`, with a README explaining how to apply them. **Neither the
preview build nor anything else in Phase 4 depends on them being applied**; they only
automate the deployment. This is now the second workflow change on this project to
need the web editor — it is worth getting a `workflow`-scoped token rather than
hitting it a third time.

## How to see it

```bash
npm run dev          # http://localhost:5173/FoSW/  — note the /FoSW/ base, the root 404s
```

Drafts and the radar both appear in dev. `npm run build && npx vite preview` shows
the production behaviour: **no radar at all**, which is correct at 0 of 10 published.

For the deployed preview:

```bash
VITE_RADAR_PREVIEW=1 npm run build:preview     # PowerShell on Windows, or MSYS_NO_PATHCONV=1
npx vite preview --base=/FoSW/preview/ --port 5199 --strictPort
npm run verify:radar http://localhost:5199/FoSW/preview/
```

**On Windows, do not run the `--base=` build from Git Bash without
`MSYS_NO_PATHCONV=1`.** MSYS rewrites `/FoSW/preview/` into `C:/Program Files/Git/...`
and the build then succeeds with a silently wrong base. This cost a debugging cycle
during Phase 4 — the symptom looks exactly like a code defect.

## Things worth knowing about how this went

- **Six defects originated in the plans, not the implementations** — a test command
  that worked on Node 20 and failed on Node 22, a union extension that broke `tsc` via
  five consumers, a missing array guard, a false claim about a devDependency, an
  import contradicting its own instruction, and a label-gap rule that measured the
  wrong thing. All were caught before merge. If you write plans for the remaining
  phases, expect the same rate and design for it.
- **Two implementer reports contained claims that did not survive checking** — one a
  fabricated passing test suite, one a specific false statement about a constant.
  Verify reports against the repo rather than accepting status lines.
- **Automated checks confirm structure, not appearance.** The harness reported 9/9
  while the radar was visibly broken. Take screenshots.
