# Move signal-pipeline working files out of `public/`

## Why

Vite copies everything under `public/` into `dist`, and `dist` is what the
GitHub Pages workflow deploys. The signal finder's working files were living in
`public/content/ai-signals/`, so they were on the path to being published on the
live site.

That matters because two of them record editorial decisions:

- `_seen-ledger.jsonl` stores `status: "rejected"` entries by design.
- `_finder-rejected.json` **is** the rejected list — stories the team evaluated
  and declined, with claims and URLs.

On a VTT / University of Helsinki research-communication site, a public list of
declined stories is not something to ship by accident.

## What was actually exposed

- `_seen-ledger.jsonl` was live (`HTTP 200`). It is committed state, so it
  deployed with the site. Its 88 records are all `status: "published"`, so
  nothing sensitive had been published yet — the exposure was latent, and would
  have become real on the first finder run that recorded a rejection.
- `_finder-output.json` / `_finder-rejected.json` / `_candidates.json` returned
  `HTTP 404`. They were gitignored and CI builds from a fresh checkout, so they
  never reached the deployed site.

The mechanism was verified locally: a build with those files present on disk
copied both into `dist`. Two stray files from an earlier finder run were sitting
in `public/` in this working tree and were caught by that check.

## Changes

- Moved `_seen-ledger.jsonl` to `data/_seen-ledger.jsonl` with `git mv`, so
  history is preserved. It remains **committed** — it is durable state.
- Moved the per-run artifacts to `data/` as well
  (`_candidates.json`, `_finder-output.json`, `_finder-rejected.json`) and
  updated `.gitignore` to the new paths. They stay gitignored.
- `scripts/ledger.mjs` and `scripts/collect-candidates.mjs`: new `DATA_DIR`
  constant, and both now `mkdir -p` the target directory before writing, so a
  fresh clone or a custom `--out` cannot fail on a missing folder.
- **New guard in `scripts/validate-signals.mjs`:** any file beginning with `_`
  under `public/content/ai-signals/` is now a validation error. Since the
  validator runs first in `npm run build`, a working file left in `public/`
  fails the build instead of deploying. Verified by planting a file and watching
  the build fail, then pass once removed.
- Updated `docs/ai-signals-pipeline.md` (including a section explaining the
  `public/` vs `data/` boundary and why it exists) and
  `docs/ai-signals-finder-prompt.md`, which tells the finder where to read and
  write. The archived PR description under `docs/archive/merged_PRs/` was left
  alone — it is a historical record of what that PR did.

## Verification

- `npm run signals:prepare` → writes to `data/_seen-ledger.jsonl`, 88 records.
- `npm run signals:validate` → `OK — 89 signals valid`.
- `npm run build` → PASS, and `find dist -name "_*"` returns nothing.
- `signals:reconcile` round-trip at the new path still appends correctly, and
  still tolerates a missing `--rejected` file without losing published items.

## Follow-up

After this merges and deploys, `/content/ai-signals/_seen-ledger.jsonl` should
return 404 on the live site. Worth confirming, since the deploy action replaces
the published folder rather than merging into it.
