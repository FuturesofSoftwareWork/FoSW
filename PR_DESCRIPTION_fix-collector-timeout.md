# Bound the candidate collector's network calls

## Why

`scripts/collect-candidates.mjs` is designed to run unattended from cron, but
its `fetch` calls had no timeout. A feed that accepts the connection and then
stops responding would hang the job indefinitely — worse than failing, because
nothing reports it and the next scheduled run stacks up behind it.

Two related failure modes surfaced while fixing that, both of which fail
*silently* today:

- `--days` with a missing or non-numeric value produced `NaN`, making the cutoff
  comparison `t >= NaN` false for every item. The whole candidate pool was
  dropped and the run still reported success.
- If every source failed, the collector wrote an empty pool and exited 0. To the
  cron that is indistinguishable from a quiet news week, and the finder would go
  on to score an empty candidate list — silently falling back to web search,
  which is exactly the behaviour the collector exists to replace.

## Changes

- **Per-request timeout** via `AbortSignal.timeout`, default 15s, configurable
  with `--timeout MS`. Timeouts are reported distinctly
  (`timed out after 15000ms for <url>`) rather than as a generic fetch error, so
  a slow feed is diagnosable from the cron log.
- **Fail fast on bad flag values.** `--days` and `--timeout` now require a
  positive finite number and exit 1 with a clear message otherwise.
- **Exit 1 if every source fails**, and write no pool. A partial failure still
  writes a pool and exits 0, now with a `N/M sources failed: <names>` summary.
- Documented the failure behaviour and the wall-clock bound in
  `docs/ai-signals-pipeline.md`.

Requests still run sequentially, so worst-case wall clock is roughly
*(number of requests) × timeout* — about 5 minutes with the default source
lists. That is bounded, which is the property that matters for cron.

## Verification

- `--timeout 1` (forces every request to time out): each source reports
  `timed out after 1ms`, all four are isolated, the process exits **1**, and no
  candidate file is written.
- Normal run (`--days 14`): Reddit fails with its usual 403, the run logs
  `1/4 sources failed: Reddit`, writes **131 candidates**, and exits **0**.
- `--days abc` and `--days` with no value: exit **1** with
  `--days needs a positive number`.

## Not included

No retry logic. A single retry on timeout or 5xx would help transient failures,
but it interacts with the per-source isolation and the wall-clock bound, so it
belongs in its own change with its own thinking about backoff.
