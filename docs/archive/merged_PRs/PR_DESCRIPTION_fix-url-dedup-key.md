# Fix: the ledger's dedup key discarded the query string

## Why

Found during the first supervised finder run. `normalizeUrl` built its dedup key
from host + path only, deliberately dropping the query string. That is wrong for
any site where the query string *is* the item identity:

```
https://news.ycombinator.com/item?id=49104747  ->  news.ycombinator.com/item
https://news.ycombinator.com/item?id=49149800  ->  news.ycombinator.com/item
https://qwen.ai/blog?id=qwen3.8                ->  qwen.ai/blog
```

Every Hacker News discussion collapsed onto one key. Because Hacker News is the
collector's highest-signal source, the effect was that **the first HN item ever
recorded silently blocked every later one**.

This was not theoretical — it fired in the run that found it. A selected signal
("Code review is quietly being replaced by verification") was dropped by
`reconcile` as "already seen", matching an unrelated HN discussion recorded in
February. `reconcile` reported `appended 20, skipped 2 already-seen`, and the
skip looked like normal dedup working. Two items were lost with no error.

The failure mode is the quiet kind: the ledger exists to prevent repeats, so
over-aggressive matching looks exactly like success.

## Changes

- **`normalizeUrl` keeps the query string**, minus known tracking parameters
  (`utm_*`, `fbclid`, `gclid`, `msclkid`, `mc_cid`, `mc_eid`, `igshid`), with
  remaining parameters sorted so cosmetic reordering still dedupes. The
  non-URL fallback branch no longer strips the query either.
- **`prepare` recomputes every stored key** from the record's own url/claim
  instead of trusting the key on disk. Without this, changing normalization
  leaves two generations of keys in the same file and dedup silently degrades.
  It now self-heals on the next run.
- **Fixed a crash in the module main-guard.** `pathToFileURL(process.argv[1])`
  throws when `argv[1]` is undefined, which is the case under `node -e` or a
  REPL — so simply importing `ledger.mjs` in those contexts crashed instead of
  just not running the CLI. Guarded.

## Verification

```
normalizeUrl:
  news.ycombinator.com/item?id=49104747   distinct from  ...?id=49149800   ✔
  ex.com/a?b=1&a=2  ==  ex.com/a?a=2&b=1                                   ✔
  ex.com/p?utm_source=x&id=7  ==  ex.com/p?id=7                            ✔
  import under `node -e` no longer throws                                  ✔
```

- `prepare` re-keyed all 108 existing records with **0 colliding keys**.
- Re-running `reconcile` appended the 2 previously-swallowed records; all 7
  items from the run are now present.
- `reconcile` is still idempotent: a third run appended 0, skipped 22.
- `npm run signals:validate` OK (89 signals), `npm run lint` clean,
  `npm run build` passes.

## Note on the ledger file

`data/_seen-ledger.jsonl` is committed in this PR with re-keyed records and the
run's new entries. No records were dropped — the count went 108 -> 110 as the
two swallowed items were recovered.
