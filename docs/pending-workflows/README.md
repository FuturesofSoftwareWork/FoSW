# Workflow files awaiting manual application

These two files belong at `.github/workflows/`. They are parked here because
**pushing changes under `.github/workflows/` requires a token with `workflow`
scope**, and the credentials available on this project have only `gist`,
`read:org` and `repo`. The push is rejected outright:

```
! [remote rejected] ... (refusing to allow an OAuth App to create or update
  workflow `.github/workflows/deploy-preview.yml` without `workflow` scope)
```

This is the same constraint the radar handover records for the previous workflow
change, which was applied through GitHub's web editor.

## To apply

Either push from a machine with a `workflow`-scoped token:

```bash
git checkout worktree-radar-phase4-preview   # this branch, with the files in place
git push -u origin worktree-radar-phase4-preview
```

…or copy each file into `.github/workflows/` through GitHub's web editor:

| Park | Destination |
| --- | --- |
| `docs/pending-workflows/deploy.yml` | `.github/workflows/deploy.yml` (**replaces** the existing file) |
| `docs/pending-workflows/deploy-preview.yml` | `.github/workflows/deploy-preview.yml` (new) |

Delete this directory once they are in place.

## What they do

**`deploy-preview.yml`** (new) builds `main` with `--base=/FoSW/preview/` and
`VITE_RADAR_PREVIEW=1`, runs the 15-check radar harness against the artefact it is
about to publish, and deploys it to the `preview/` folder of the same Pages
deployment — giving reviewers `futuresofsoftwarework.github.io/FoSW/preview/`.

**`deploy.yml`** (modified) gains three things:

- `clean-exclude: preview`, so a production deploy does not wipe the preview folder
  it now shares `gh-pages` with;
- a `concurrency` group shared with `deploy-preview.yml`, because both trigger on a
  push to `main` and both commit to `gh-pages` — without it they interleave and one
  loses;
- a `pull_request` trigger with `if: github.event_name == 'push'` on the Deploy step.
  Until now nothing listened for `pull_request`, so `npm test` and `npm run lint` ran
  only *after* a merge — no PR was ever checked before it landed.

**Nothing else in this branch depends on these two files being applied.** The
preview build, the `noindex` handling, the 404 shim and the radar changes all work
locally and are verified without them; these only automate the deployment.
