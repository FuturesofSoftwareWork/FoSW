# Phase 4 documentation audit: correct six stale or wrong claims

Documentation only — **no source, no config, no workflow changes.**

An audit of whether Phase 4 is correctly documented and cleaned up. Cleanup was
already correct; the documentation was not. Six defects, one of them a claim the
deploy had already disproven.

## The one that matters

**"The shared `concurrency` group holds"** was recorded as a clean pass. It is not
the whole truth, and the missing half bites.

`cancel-in-progress: false` keeps one run in flight, but GitHub allows only **one
pending run per concurrency group**, and `deploy.yml` and `deploy-preview.yml` share
`github-pages-deploy`. Two pushes landing close together put four runs in contention
for that single pending slot and one loses. This was **observed, not theorised**: the
preview run for `295302b` was cancelled while production's succeeded, leaving the
preview a commit behind `main`.

Harmless that time — the commit only moved a docs file, so the output was identical.
It will not always be harmless: a preview that silently lags `main` undercuts the
reason the preview exists. The handover now records how to spot it (compare the
`gh-pages` head to `main`; a `cancelled` preview run is the tell) and how to fix it
(`gh workflow run deploy-preview.yml --ref main`, used successfully on 2026-08-06).

This also upgrades the `paths-ignore` idea from "if it becomes noisy" to the actual
fix, since docs-only pushes are what create the contention.

## The other five

| Defect | Correction |
| --- | --- |
| `PR_DESCRIPTION_radar-phase4-preview.md` listed at the project root | It was archived on merge. Path now points at `docs/archive/merged_PRs/`, and PR #20's description is listed alongside it. |
| "The 63 `node --test` tests" | **69** — the same document said 69/69 twelve lines earlier and contradicted itself. |
| `isPreviewContext()` described as two cases (dev, `VITE_RADAR_PREVIEW=1`) | **Three.** The `BASE_URL` contains `/preview/` backstop added in Phase 4 was missing, though `CLAUDE.md` and the spec both carry it. |
| The `sessionStorage` forwarder described as "covering the case where" Pages answers with the root 404 | It is **not a fallback** — it is the path every preview deep link actually takes. Softening it invites exactly the deletion finding #1 warns against. |
| "The preview will redeploy on every push to `main`" (twice) | True except when a following push cancels the queued run — now cross-referenced to the concurrency note. |

## Plan status banner

`docs/superpowers/plans/2026-08-06-futures-radar-phase4-preview.md` opens with 51
unchecked boxes and reads as unstarted. It shipped. A banner now says so, and notes
that no plan in this repo is ever ticked off, so an empty checklist carries no
information either way.

**Not a Phase 4 defect:** the phase 1 and phase 3 plans have the identical trap and
are left alone here.

## Cleanup verified, no changes needed

- `docs/pending-workflows/` — gone
- `PR_DESCRIPTION_radar-phase4-preview.md` and `..._docs-phase4-postdeploy.md` — both archived
- No unarchived PR description remains from the radar work
- `CLAUDE.md` / `AGENTS.md` — differ only by the mirror note and heading
- The spec's *As Built* section already covers Phase 4 correctly and is untouched

## Verification

- `npm test` — **69/69**
- `npm run lint` — **exit 0**
- Live preview re-checked with `npm run verify:radar` against the deployed site — **15/15**
