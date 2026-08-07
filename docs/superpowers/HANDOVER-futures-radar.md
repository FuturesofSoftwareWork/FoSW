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
| **4 — Preview deployment** | **Merged (PR #19) and deployed.** Live at `/FoSW/preview/`, verified 15/15 against the real deployment |
| **2 — Bootstrap pipeline** | Not started — **this is the next phase** |

Phases were built out of order deliberately: Phase 2's pipeline is not on the
critical path to seeing a radar, so the first phenomena were hand-authored instead.

## What is unfinished — read this before starting anything

**Phase 4 is done, merged and live.** The preview is at
`https://futuresofsoftwarework.github.io/FoSW/preview/`. All three blockers the
previous version of this section listed are cleared, and everything it listed as
"asserted but unproven" has now been checked against the real deployment.

### What the first real deploy settled — 2026-08-06

All three open questions are answered. **Read #1 before touching the 404 code.**

1. **Pages answers a `/preview/` miss with the ROOT `404.html`, not
   `preview/404.html`.** So the `sessionStorage` forwarder is **load-bearing — do not
   delete it.** The previous version of this document said it might be dead code; it
   is the opposite. Proof: the body served for
   `/FoSW/preview/phenomena/<id>/` carries the *production* asset base
   (`/FoSW/assets/…`), the production `robots` meta (`index, follow`) and the
   `radarDeepLink` snippet — all three are root-404 markers, and
   `preview/404.html` exists but is never reached. The full round trip
   (root 404 → stash → `location.replace` → preview shell → `history.replaceState`)
   was then confirmed in a real browser: the URL is restored and the phenomenon
   drawer opens.
2. **`clean-exclude: preview` works.** The production deploy finished at 09:38:13,
   after the preview deploy finished at 09:37:26, and `preview/` is still on
   `gh-pages`.
3. **The shared `concurrency` group holds — with one sharp edge.** `Deploy to GitHub
   Pages` was observed sitting in `pending` while `Deploy Radar Preview` ran, then
   completing after it. Neither ever raced for `gh-pages`.

   **But a queued run can be cancelled rather than merely delayed.** GitHub allows
   only **one pending run per concurrency group**, and both workflows share
   `github-pages-deploy`. Two pushes landing close together put four runs in
   contention for that single pending slot, and one loses. This was observed: the
   preview run for `295302b` was cancelled while production's succeeded, leaving the
   preview one commit behind `main`.

   **This is fixed as of 2026-08-07 — the two workflows are now one.** What follows
   is kept because the failure it describes was worse than cancellation, and the
   diagnosis is not obvious.

   The contention was never really between the two *workflows*; the concurrency group
   serialised those correctly. It was between the **GitHub Pages deployments each of
   their `gh-pages` pushes spawned** — only one may be in flight, and a
   `concurrency:` group has no authority over them. On 2026-08-06 one wedged in
   `building` and blocked every later deployment: the site served a two-hour-old
   build while every workflow run showed green, because a green run means `gh-pages`
   was written, not that Pages published it.

   - **The check that actually works** is
     `gh api repos/FuturesofSoftwareWork/FoSW/pages --jq .status`. Anything but
     `built`, or `building` for more than a couple of minutes, means the live site is
     stale regardless of what Actions shows.
   - **Clear a wedged deployment** with
     `gh api -X POST repos/FuturesofSoftwareWork/FoSW/pages/deployments/<sha>/cancel`,
     then re-trigger. Until it is cancelled every later deploy fails with
     *"due to in progress deployment"*.
   - **Do not split `deploy.yml` back into two workflows.** One push to `gh-pages`
     per commit is the only structural fix.

Two further things were confirmed on the live deployment:

- **`npm run verify:radar https://futuresofsoftwarework.github.io/FoSW/preview/`
  passes 15/15** against the deployed artefact — six dashed draft blips, drawer
  opens, deep-link URL correct, no clipping, no overlaps.
- **Production deep links resolve too** — `/FoSW/insights/<id>/` opens its drawer.
  Note these return HTTP **404 by status** while serving the app shell; that is how
  the Pages SPA fallback is designed to work and is not a fault.

### The `pull_request` trigger fired on PR #19 itself

The previous version of this document predicted it would not, on the reasoning that
GitHub reads `pull_request` workflows from the base branch. **That was wrong** —
GitHub evaluates them from the PR's *merge ref*, so a workflow added by the PR guards
that same PR. Run 31089529655 on `radar-phase4-preview` ran Test, Lint and Build to
success with **Deploy correctly skipped** by `if: github.event_name == 'push'`. The
guard is therefore proven, not merely asserted, and the CI gap is closed.

### How the token was fixed

The credential had `gist`, `read:org`, `repo` and the push was rejected outright.
`gh auth refresh -h github.com -s workflow` added the missing scope in place, on the
`artwall4` account, which is already a repo admin — so the permissions were never the
problem, only the OAuth scope. **If you hit this again, run that command rather than
reaching for the web editor**; two earlier workflow changes on this project went
through the web editor unnecessarily. The SSH route is not a workaround: the key on
this machine authenticates as `Arto-Wallin_vttfi`, which is not a collaborator here.

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
- **The preview redeploys on every push to `main`,** including documentation-only
  commits — *except* when a second push cancels its queued run, see the concurrency
  note above. Adding `paths-ignore` for `docs/**` and `*.md` fixes both the noise and
  the cancellation, since docs-only pushes are what create the contention. This is
  now the highest-value unclaimed CI change.
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
| `docs/archive/merged_PRs/PR_DESCRIPTION_radar-phase4-preview.md` | The PR #19 body. Archived on merge, per the CLAUDE.md convention — it is **no longer at the project root**. |
| `docs/archive/merged_PRs/PR_DESCRIPTION_docs-phase4-postdeploy.md` | PR #20 — the post-deploy record: what the first real deploy proved, and the `.claude/` lint fix. |
| ~~`docs/pending-workflows/README.md`~~ | Deleted 2026-08-06 — the workflows it described are now installed at `.github/workflows/`. |
| `CLAUDE.md` / `AGENTS.md` | Current, and identical apart from the heading and mirror note. Carry the two conventions below. |

## Two conventions that will bite if you do not know them

**One drawer, one URL owner.** `App` owns content fetching, the drawer stack, deep
links and article meta, and renders `ContentDrawer` once. Sections take data and an
`onOpen` callback. This was a refactor, not an accident: `ContentStream` used to own
all of it, so a sibling radar section could not open the drawer, and a second
`ContentDrawer` would fight it for `window.history`. **Do not add a second one.**

**The radar is invisible until ten phenomena are published.** `FuturesRadar` returns
`null` in a production build below that threshold. One predicate,
`isPreviewContext()` in `src/lib/phenomenon.ts`, answers that question for both the
draft fetch and the gate — they used to be separate expressions at opposite polarity,
which would have desynchronised silently. It is true in **three** cases: dev, when
`VITE_RADAR_PREVIEW=1`, **and when `BASE_URL` contains `/preview/`**. The third is a
backstop added in Phase 4 so a build deployed to the preview folder cannot silently
render as production if the environment variable is ever dropped from the workflow.
Drafts are fetched in exactly those cases and never otherwise. This is the mechanism
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
  through `sessionStorage` — and that forwarder is **not a fallback, it is the path
  every preview deep link actually takes**, since Pages answers a preview miss with
  the root 404 page. See finding #1 above before touching it.
- **`/FoSW/preview/` is `noindex`,** applied by the `previewNoindex` plugin in
  `vite.config.ts`, keyed on the base rather than an environment variable.
- **Drafts render as dashed outlines** with a legend key, so a reviewer can tell a
  settled claim from one still being written.
- **Blips no longer overlap.** `placeBlips` nudges colliding pairs apart within
  their own cell.
- **A `pull_request` CI trigger** is installed at `.github/workflows/deploy.yml` and
  is in effect. It fired on PR #19 itself — see above.

Verified locally first: `npm test` 69/69, `npm run lint` clean, `npm run verify:radar`
15/15 against a preview build, deep links exercised by both fallback routes against a
simulated Pages tree, and nudging exercised by forcing five phenomena into one cell
(three genuine seed collisions before, none after). **Then re-verified against the
real deployment** — see *What the first real deploy settled*.

## Start here for Phase 2

Phase 4 is shipped, so nothing gates this any more.

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

There is **no frontend test runner**. The 69 `node --test` tests cover
`scripts/` only. Phase 3 was verified by a **headless Puppeteer harness** built from
the project's own devDependency, because MCP browser tools were unavailable.

It lives at `scripts/verify-radar.mjs`, **committed to the repo**, and is run with
`npm run verify:radar <baseUrl>` — not wired into `npm run build`, `npm test` or
`npm run lint`, since it needs a server already running and would fail spuriously in
an unattended pipeline. It *is* wired into `deploy.yml`, which starts a server first
and verifies the artefact it is about to deploy — and since the workflows merged,
that check gates **production** as well as the preview: a failing harness stops the
whole release. It runs 15 checks.
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

Both files are installed at `.github/workflows/` and both have run successfully on
`main`. There is a third file, `static.yml`, which is **inert** — pinned to
`branches: ["disabled"]` and superseded by `deploy.yml`. It is easy to miss and it
also deploys to Pages, so check it before debugging a mystery deployment.

`deploy.yml` also triggers on `pull_request`, with an
`if: github.event_name != 'pull_request'` guard on the Deploy step, so `npm test` and
`npm run lint` finally run *before* a merge rather than after.

**Since 2026-08-07 it is a single workflow.** It builds production, stashes it to
`_site`, builds the preview, verifies the radar against it, moves the preview to
`_site/preview`, and pushes `gh-pages` once. `deploy-preview.yml` is gone, and so is
`clean-exclude: preview` — the preview now sits inside the deployed tree, so a clean
deploy cannot threaten it. Merging cost no parallelism, because the concurrency group
had already forced the two workflows to run one after the other; it took the
push-to-published time from 2m26s to 1m52s.

The CI gap earlier versions of this document recorded is **closed**: PRs are now
checked before they land.

**Pushing workflow changes needs a token with `workflow` scope.** The credential here
lacked it and the push was rejected outright; `gh auth refresh -h github.com -s
workflow` added it in place on the `artwall4` account. That account was already a repo
admin, so this was never a permissions problem, only a scope one. **If you hit the
same rejection again, run that command rather than reaching for the web editor** — the
two earlier workflow changes on this project both went through the web editor
unnecessarily. The SSH remote is not an alternative: the key on this machine
authenticates as `Arto-Wallin_vttfi`, which is not a collaborator here.

## How to see it

**The deployed preview, with the radar and all six drafts, is live:**

```
https://futuresofsoftwarework.github.io/FoSW/preview/
```

It redeploys from `main` on every push — unless a closely-following push cancels its
queued run, so confirm the `gh-pages` head matches `main` before trusting it. Locally:

```bash
npm run dev          # http://localhost:5173/FoSW/  — note the /FoSW/ base, the root 404s
```

Drafts and the radar both appear in dev. `npm run build && npx vite preview` shows
the production behaviour: **no radar at all**, which is correct at 0 of 10 published.

To reproduce the preview build locally:

```bash
VITE_RADAR_PREVIEW=1 npm run build:preview     # PowerShell on Windows, or MSYS_NO_PATHCONV=1
npx vite preview --base=/FoSW/preview/ --port 5199 --strictPort
npm run verify:radar http://localhost:5199/FoSW/preview/
```

The harness also runs against the deployed site, which is the stronger check:

```bash
npm run verify:radar https://futuresofsoftwarework.github.io/FoSW/preview/
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
