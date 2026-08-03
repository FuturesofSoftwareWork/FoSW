# Pipeline robustness: per-request isolation, stable counters, crash guards

Clears the remaining non-blocking findings from the signal-types code review.
Behaviour-only; no schema or content changes.

## 1. Failures are isolated per request, not per source

`collect-candidates.mjs` wrapped each *collector* in try/catch, so a single
rate-limited search term discarded every result from that source — including
requests that had already succeeded. With eight Hacker News terms, one 429 on
the last one threw away the other seven.

A shared `perItem()` helper now isolates each individual request. A source is
reported as failed only when *every* one of its requests fails, which keeps the
existing per-source accounting (and the "all sources failed → exit 1" rule)
intact.

Verified with a deliberately bogus repo among five:

```
! GitHub releases [this-org/does-not-exist] failed: 404 Not Found
  GitHub releases: 1/5 requests failed, keeping the rest
  GitHub releases: 20 raw          <- previously: 0
```

This matters most for Reddit, which 403s unauthenticated datacenter traffic as
its normal behaviour rather than as an edge case.

## 2. `timesSeen` no longer inflates

`prepare` re-derives every published signal from `index.json` on each run and
merges it into the existing ledger line. Merging summed `timesSeen`, so the
count grew by one per run whether or not the item had actually been seen again —
making the field meaningless. It now takes the max.

Verified: seven consecutive `prepare` runs leave the maximum at 2, stable. The
one record at 2 is genuine — `2026-04-13-05` and `2026-02-09-02` cite the same
arXiv paper, so the ledger is correctly recording a real duplicate source URL.
(Whether those two signals should both exist is an editorial question, left
alone here.)

## 3. The ledger is written atomically

`writeLedger` truncated then wrote, leaving a window where a crash or a killed
cron would empty the file the pipeline treats as durable state. It now writes a
temp file and `rename()`s over the target, so the ledger is either the old
content or the new one — never half-written.

## 4. The validator no longer crashes on malformed input

It runs first in `npm run build`, so its output is what a failing CI shows.
Three inputs previously produced a raw Node stack trace instead of a structured
error:

- unparseable `index.json`
- an index entry with a missing or non-string `file`
- a signal file whose root is `null`, an array, or a scalar

All three now report in the script's own format.

It also gained an **array-shape check** for the fields the site renders with
`.map()` (`tags`, `whyItMatters`, `recommendedActions`, `risksAndCaveats`,
`corroboration`). A string where an array is expected used to reach the browser
and throw inside render:

```
2026-08-03-01.json: 'corroboration' must be an array, got string
```

## 5. The drawer survives bad content anyway

Defence in depth for the same class of bug: `ContentDrawer` guarded
`corroboration` with a truthiness check, which is true for a non-empty string
and then throws on `.map()`. Now `Array.isArray`.

Verified in the browser with a string value injected: the drawer renders
normally with its badges, corroboration is simply omitted, and the console is
clean. Previously this blanked the drawer.

## Verification

- `npm run signals:validate` → `OK — 89 signals valid`
- `npm run build` → PASS
- Partial-failure isolation confirmed with a bogus repo (above)
- `timesSeen` stable across 7 `prepare` runs
- Array guard confirmed firing, then reverted
- Drawer verified in a running dev server for both the valid-array and
  string-value cases; no console errors

## Not included

ESLint is still broken repo-wide (`npm run lint` references a dependency that
was never installed or configured). That needs its own change — it adds
dependencies and may touch many files.
