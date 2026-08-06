# Post-deploy: record what shipping Phase 4 proved, and fix local lint

Follow-up to PR #19, which merged and deployed. The preview is live at
`https://futuresofsoftwarework.github.io/FoSW/preview/`.

Docs and tooling only — **no source changes**, so nothing here alters the site.

## Why

The handover listed three things about the preview deployment as *asserted but
unproven outside a local simulation*, to be checked on the first real deploy. That
deploy has now happened. This PR records the answers, because one of them reverses a
conclusion the document invited a future reader to draw.

## What the first real deploy settled

**1. Pages answers a `/preview/` miss with the ROOT `404.html`, not
`preview/404.html`.**

This is the load-bearing case. The handover said that if the nested 404 answered, the
`sessionStorage` forwarder in the production `404.html` "is dead code and should be
deleted". The opposite is true — **the forwarder is what makes preview deep links
work, and deleting it would break every phenomenon link handed out by the drawer's
Copy-link button.**

Evidence: the body served for `/FoSW/preview/phenomena/<id>/` carries the *production*
asset base (`/FoSW/assets/…`), the production `robots` meta (`index, follow`) and the
`radarDeepLink` snippet — all three are root-404 markers. `preview/404.html` exists on
`gh-pages` but is never reached. The full round trip (root 404 → stash →
`location.replace` → preview shell → `history.replaceState` → `useDeepLink`) was then
driven in a real browser: the URL is restored and the phenomenon drawer opens.

**2. `clean-exclude: preview` spares the folder.** The production deploy finished at
09:38:13, after the preview deploy finished at 09:37:26, and `preview/` is still on
`gh-pages`.

**3. The shared `concurrency` group holds.** `Deploy to GitHub Pages` was observed
sitting in `pending` while `Deploy Radar Preview` ran, and completed after it.

## A correction

The handover predicted the new `pull_request` trigger would not fire on PR #19 itself,
reasoning that GitHub reads `pull_request` workflows from the base branch. **That was
wrong.** GitHub evaluates them from the PR's *merge ref*, so a workflow added by a PR
guards that same PR. Run `31089529655` ran Test, Lint and Build to success with Deploy
correctly **skipped** by `if: github.event_name == 'push'`. The guard is proven rather
than asserted, and the CI gap is closed.

## The lint fix

`npm run lint` was failing with **102 errors** in this checkout — every one of them a
parsing error inside `.claude/worktrees/`, where git worktrees hold full copies of this
repo. ESLint linted each worktree's `src/` alongside this one's and died on *multiple
candidate TSConfigRootDirs*. **No error was in the project's own source.**

CI never saw it, because a fresh checkout has no worktrees — so this only ever broke
the local command, which is exactly the one a contributor is told to run before
considering work complete.

Same root cause, second symptom: `git add -A` staged the worktrees as embedded git
repositories. Both are fixed by ignoring `.claude/` in ESLint and in git.

## Housekeeping

Five `PR_DESCRIPTION_*.md` files were sitting at the project root for already-merged
PRs — #13, #14, #15, #18 and #19. The CLAUDE.md convention moves them to
`docs/archive/merged_PRs/` on merge; the step had been skipped for the last five. They
are split across two commits so the pre-existing backlog stays separable from #19's
own file.

## Verification

- `npm test` — **69/69**
- `npm run lint` — **exit 0** (was 102 errors before this branch)
- `npm run build` — **exit 0**, prerender and sitemap unchanged
- `npm run verify:radar https://futuresofsoftwarework.github.io/FoSW/preview/` —
  **15/15 against the live deployment**: six dashed draft blips, drawer opens,
  deep-link URL correct, no clipping, no overlaps
- Deep links driven in a real browser against the live site — preview phenomenon link
  (via the forwarder) and production insight link (prerendered) both resolve and open
  their drawer

Note that preview deep links return HTTP **404 by status** while serving the app
shell. That is how the Pages SPA fallback is designed to work and is not a fault.
