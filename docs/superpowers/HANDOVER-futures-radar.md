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
| **4 — Preview deployment** | Built on branch `worktree-radar-phase4-preview` |
| **2 — Bootstrap pipeline** | Not started |

Phases were built out of order deliberately: Phase 2's pipeline is not on the
critical path to seeing a radar, so the first phenomena were hand-authored instead.

## The documents, and which to trust

| Document | Status |
| --- | --- |
| `docs/superpowers/specs/2026-08-04-futures-radar-design.md` | The design record. **Read its *As Built* section** — it lists every place the code deliberately diverges. Where they disagree, the code is right. |
| `docs/superpowers/plans/2026-08-05-futures-radar-phase1-schema.md` | Phase 1, done. Its carry-forward table is still live. |
| `docs/superpowers/plans/2026-08-05-futures-radar-phase3-ui.md` | Phase 3, done. Its carry-forward section holds the Phase 4 obligations. |
| `CLAUDE.md` | Current. Carries the two conventions below. |

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
- **PRs are checked before merging** — see below.

## Start here for Phase 2

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

`deploy.yml` now also triggers on `pull_request`, with an
`if: github.event_name == 'push'` guard on the Deploy step, so `npm test` and
`npm run lint` finally run *before* a merge rather than after. `deploy-preview.yml`
builds and publishes `/FoSW/preview/` from `main`. Both share the
`github-pages-deploy` concurrency group, because both commit to `gh-pages` on a push
to `main` and would otherwise interleave.

**Pushing workflow changes needs a token with `workflow` scope, which the usual
credential here lacks.** The last one was applied through GitHub's web editor; expect
to do the same with these two files if the push is rejected.

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
