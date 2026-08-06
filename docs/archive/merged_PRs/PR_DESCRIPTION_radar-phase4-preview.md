# Futures Radar Phase 4 — Preview Deployment

Publishes the radar to **`futuresofsoftwarework.github.io/FoSW/preview/`** so
colleagues at VTT and the University of Helsinki can review phenomena by URL before
anything is public.

The preview is not a separate site. It is this repo, this commit, built with
`--base=/FoSW/preview/` and `VITE_RADAR_PREVIEW=1` — two switches, everything else
identical. So what reviewers see is byte-for-byte what ships, and going live is
publishing the tenth phenomenon rather than migrating anything.

## What was blocking it

Two things would have failed on the first CI run, both flagged in the Phase 3
handover:

**`scripts/prerender.mjs` hardcoded the base path.** With `--base=/FoSW/preview/`
the bundle requests `/FoSW/preview/assets/…`, the prerenderer's server stripped only
`^/FoSW`, looked for `dist/preview/assets/…`, found nothing, served the app shell as
JavaScript, and `waitForSelector` timed out fifteen seconds later. It now reads the
base back off `dist/index.html`'s own asset URLs — the bundle already states the
answer, so there is no second place to keep in sync. Six unit tests cover the
detection.

**Deep links hard-404ed.** `dist/` contained `insights/` and nothing else, so
`/FoSW/phenomena/<id>/` — the URL the drawer's Copy-link button hands out — was a
404 for whoever received it. Phase 4 is what puts those links in front of reviewers
who will paste them into email.

Every build now emits `dist/404.html`, a copy of the prerendered shell. GitHub Pages
serves it *without redirecting*, so `useDeepLink` still sees the requested path and
opens the right drawer — no client-side routing changes needed. Whether Pages serves
a *nested* `404.html` for misses under `preview/` is not verifiable without
deploying, so the production copy also forwards `/preview/` paths through
`sessionStorage`. Both routes were tested end to end against a simulated Pages tree;
both land on the phenomenon.

## Not indexed

A `noindex, nofollow` meta, applied by a small `previewNoindex` plugin in
`vite.config.ts`, and the canonical link removed rather than repointed — left
pointing at production it would claim the preview and the live home page are the
same document, which stops being true the moment the preview carries drafts. The
plugin throws if the meta tag it expects has drifted, because a silent no-op would
ship an indexable preview.

The plugin keys on the base path, not an environment variable: what makes a build a
preview is where it is deployed. `isPreviewContext()` now reads `BASE_URL` for the
same reason — a preview deployed without the flag would otherwise render as
production, an empty page where the radar belongs with nothing to explain it.

Preview builds also drop the sitemap and ship a disallow `robots.txt`. Worth being
honest about that last one: crawlers read `robots.txt` from the domain root only,
and this site is published under `/FoSW/`, so neither the preview file nor the
existing production one is ever actually fetched. The meta tag is the control that
works. The file is written anyway, and says so in a comment.

## Phase 3 carry-forwards closed

**Drafts are visually distinct.** They rendered as blips identical to published
ones, so a reviewer could not tell whether the claim they were commenting on was
settled or still being written — which changes what their comment is for. Drafts now
draw as dashed outlines, the contested bolt switches to the sector colour so it stays
visible against the lighter fill, and the legend gains a key that appears only when
drafts are present.

**Blips no longer overlap.** `placeBlip` hashed each id independently, so two ids in
the same ring-and-sector cell could land on top of each other — invisible at six
phenomena, near-certain at the thirty-plus this is built for. `placeBlips` relaxes
overlapping pairs apart, clamped to each blip's own ring band and sector wedge.
Position *is* the claim being made, so an over-full cell stays crowded rather than
nudging a blip into the next ring and misstating how far that change has reached.
The seed math is unchanged, so existing blips did not move.

**The harness runs in CI.** `deploy-preview.yml` starts a server and verifies the
artefact it is about to deploy.

## CI, while in these files

`deploy.yml` triggered only on `push: main` and nothing listened for
`pull_request`, so `npm test` and `npm run lint` ran *after* a merge — no PR was ever
checked before it landed. It now also triggers on `pull_request`, with the Deploy
step guarded by `if: github.event_name == 'push'`. `clean-exclude: preview` stops a
production deploy wiping the preview folder, and both workflows share a
`github-pages-deploy` concurrency group so they cannot race for `gh-pages`.

> **Both workflow files are installed at `.github/workflows/`.** They were parked in
> `docs/pending-workflows/` for part of this branch's life, because pushing to that
> path needs a token with `workflow` scope and the credential here had only `gist`,
> `read:org` and `repo`. That was resolved with `gh auth refresh -h github.com -s
> workflow` on the `artwall4` account, which is already a repo admin, so no web-editor
> step is needed. `docs/pending-workflows/` is gone.
>
> **They take effect on merge, not before.** This PR's own checks still run under the
> old `push`-only `deploy.yml` on `main`; the `pull_request` trigger starts guarding
> the *next* PR.

## Verification

- `npm run validate` — 96 signals, 6 phenomena valid
- `npm test` — 69 passing (63 before, plus 6 for base detection)
- `npm run lint` — clean
- `npm run build` — production: radar absent (correct at 0 of 10 published), robots
  `index, follow`, canonical present, sitemap regenerated, `404.html` emitted
- `npm run build:preview` — radar present, `noindex, nofollow`, canonical removed,
  sitemap removed, disallow `robots.txt`, and present via the `BASE_URL` backstop
  even with the environment variable deliberately unset
- `npm run verify:radar` — **15/15** against a preview build
- Deep links verified against a simulated Pages tree, by both routes
- Blip nudging verified by forcing five phenomena into one cell: three genuine seed
  collisions before, none after. Screenshotted, not just asserted.

## Known limitation, not fixed here

Blip **labels** crowd well before blips do. At eleven phenomena the labels overlap
each other and strike through the ring labels, while every blip is cleanly separated.
Labels default to on below sixteen phenomena, so this is five publications away.
Blip placement is solved; label layout is not. Recorded in the spec's *As Built* and
in the handover.

## Deliberately not in scope

- **Phase 2's pipeline.** Phenomena are still hand-authored.
- **Prerendered phenomenon pages.** Static pages with Open Graph cards for unreviewed
  research claims are what `noindex` exists to prevent, and the files would outlive
  the drafts. The 404 shim serves those links instead.
- **Access control on the preview.** Unlisted and `noindex`, per the spec — the
  repository is public, so nothing here is secret.
