# Signal-pipeline hardening: sourceUrl validation, tests, Reddit diagnosis, source profiles and the review log

Six pieces of work on the AI-signals pipeline, from an analysis pass over what
is implemented and what actually holds up.

Sections 1–3 close gaps found in the audit. Sections 5–6 implement the design in
section 4: sector- and claim-aware candidate collection, and a record of *why*
each editorial decision was made. Test suite goes **176 → 252**.

---

## 1. `sourceUrl` is now validated

**Three published signals cited `https://example.com/...`** — live on the site,
in `index.json`, and carrying invented figures attributed to real institutions:

| id | Claim | Attributed to |
|----|-------|---------------|
| `2026-02-05-01` | Open-source LLMs at 95% parity with commercial models | "arXiv Preprint" |
| `2026-02-06-01` | Generative AI surpasses junior-developer benchmarks | "MIT Technology Review" |
| `2026-02-06-02` | 60% enterprise AI pair-programming adoption in Nordic firms | "VTT Research Brief" |

They are seed content from the first runs, but nothing would have caught them
today either: `validateSignal` never looked at `sourceUrl` at all — not
parseability, not scheme, not host.

`checkSourceUrl` in `scripts/lib/signal-schema.mjs` now gates both callers
(`promote-signals.mjs` for drafts, `validate-signals.mjs` for published content,
which runs first inside `npm run build`). It rejects:

- non-absolute or unparseable values (`leaddev.com/article`, `not a url`)
- non-`http(s)` schemes — `sourceUrl` renders straight into an `href`, so
  `javascript:` is both useless as a citation and the shape an injection takes
- RFC 2606 reserved space: `example.com/.net/.org` **and their subdomains**,
  `localhost`, and the `.test` / `.example` / `.invalid` / `.localhost` TLDs

An absent `sourceUrl` stays valid — several legitimate signals have none.

**The three signals are unpublished** (files and index entries removed, 105 →
102). Nothing else referenced them: no phenomenon evidence, not in
`defaultContent.ts`. The seen-ledger still records them as `published`, so no
future run re-surfaces them.

On a research-communication site an unverifiable source is a correctness
failure, not a broken link. The runbook gains a row saying so, because the
tempting fix — invent a plausible URL — is the exact thing the check exists to
stop.

## 2. Tests for the two state-owning scripts

`ledger.mjs` and `collect-candidates.mjs` had **no tests**. Between them they
own the pipeline's memory and its retrieval, and both fail invisibly: a
suppressed candidate simply never appears in a run log.

Suite goes **176 → 216**.

`normalizeUrl` is the highest-leverage pure function here — too aggressive and
every new item is dropped as already-seen, too lax and the ledger stops being
memory. Its own header documents that bug having already happened once: dropping
the query string collapsed every Hacker News discussion onto one key, because HN
puts item identity in `?id=`. That regression is now pinned, and was verified by
reintroducing it and watching exactly one test go red.

Also covered: tracking-param stripping, parameter reordering, the unparseable-URL
fallback, `appendRecords` dedup and re-run idempotence, malformed-line recovery,
timestamp trimming in `recordFromSignal`; and on the collector, RSS/Atom parsing,
CDATA and numeric entities, the deliberate `&amp;` decode ordering, invisible
scraping-fingerprint stripping, per-request failure isolation, and window
filtering.

**Production change required to test the collector:** `parseFeed`, `perItem` and
`withinWindow` are now exported, and `main()` sits behind the same
direct-invocation guard `validate-signals.mjs` and `promote-signals.mjs` already
use. Importing the module previously fired six live feed collections.

## 3. Reddit: the documented cause was wrong

The docs said Reddit "403s unauthenticated **datacenter** requests". Measured
from a residential Windows machine on 2026-08-12:

| Request | Result |
|---|---|
| `www.reddit.com/r/<sub>/` (HTML) | **200** |
| `www.reddit.com/r/<sub>/top.json` | **403 Blocked** — 190 KB WAF page, *"You've been blocked by network security"* |
| `old.reddit.com/r/<sub>/top.json` | **302 → `/login/?reason=lor2`** |
| `oauth.reddit.com/r/<sub>/top` (no token) | **403** |
| `/api/v1/access_token` (no creds) | **401** |
| HN / Dev.to / GitHub (control) | **200** |

The same IP gets 200 for HTML and 403 for `.json`, and a browser user-agent
produces a byte-identical 189,908-byte response. Nothing about the client is
being judged: **the `.json` routes require OAuth**. `old.reddit.com` says so
plainly; `www` returns a generic WAF page instead of a 401, which is what made
this look like an IP block.

The distinction decides whether the problem is fixable by changing where the
request runs from. It is not — so the old wording would have sent someone
hunting for a residential proxy, a fix that cannot work. Corrected in
`ai-signals-pipeline.md` (with the evidence table), `pipeline-runbook.md`, and a
note at the `SUBREDDITS` list so anyone editing it knows the list is inert until
OAuth exists.

**Not fixed here.** Wiring a script-type OAuth app is its own piece of work and
needs credentials.

## 4. Spec: source profiles and the review log

`docs/superpowers/specs/2026-08-12-source-profiles-and-review-log-design.md`.
Design only — no implementation in this branch.

**Source profiles** make candidate collection sector- and claim-aware. Those
runs currently skip `signals:collect` entirely because the source lists are
module-level constants, which is why the worker-experience report reads *"there
was no candidate collector on this run, so already-seen material came back
through search looking new."* Standalone JSON per profile, no inheritance —
the generic run collects the shared sources weekly anyway and the ledger dedups
them, so an inherited half would be empty by construction.

**The review log** records why a human accepted or rejected a draft, which is
currently recorded nowhere. The vocabulary already exists: sector and claim
prompts require `reason`, `rejectedUnder` and `reviewable`, and all 55 rejection
lines in `data/` carry a code. `finderRejections()` discards all three when
sweeping them into the ledger — so the editorial reasoning the prompts work to
produce is deleted at the last step. The design retains it and lets the reviewer
write into the same stream by adding a `_review` block to the draft in the
editor, rather than by remembering CLI flags.

## 5. Source profiles — sector-aware candidate collection

Sector and claim runs skipped `signals:collect` entirely, because the six source
lists were module-level constants. The worker-experience report named the cost:
*"there was no candidate collector on this run, so already-seen material came
back through search looking new."*

**Which** sources a run collects now lives in `config/sources/<name>.json`.
`npm run signals:collect -- --profile <name>` writes
`data/_candidates-<name>.json`, derived from the name so a sector pool can never
overwrite the generic one. An unknown profile exits 1 rather than falling back —
collecting the wrong sources still writes a plausible pool, and nothing
downstream could tell it from a real one.

**No inheritance**, on the operational argument: the generic run executes weekly
regardless, so its sources are already collected and already in the ledger by
the time a sector run happens. A profile that re-listed them would re-fetch what
`collect` then strips as already-seen, so the inherited half would be empty by
construction. A profile is the *complement* of the generic run.

`config/sources/generic.json` holds today's constants verbatim; a test asserts
the values literally, so it survives the constants being deleted and catches an
edit made in the belief that the file is scratch.

Two findings from writing the first real profile, both recorded in it:

- **Hacker News is barren for this sector.** At the collector's `points>30`
  threshold, `developer burnout`, `cognitive load`, `code review fatigue`,
  `engineer morale` and `AI coding burnout` each returned **zero** stories in 60
  days, and `developer experience` returned only Launch HN noise. `hackerNewsTerms`
  is empty there rather than carrying terms that only match noise.
- **One named practitioner has no feed.** Wes McKinney is absent because his site
  exposes none; the other five were fetched and parsed before being added.

Live run: 51 candidates from 2 sources, including on-sector material like *"The
review queue is the bottleneck."*

## 6. The review log — why a decision was made

A human rejection recorded **nothing**: `promote` produced a ledger line with a
key, claim, url and status. Meanwhile the prompts require `reason`,
`rejectedUnder` and `reviewable` on every one of the agent's own declines — and
`finderRejections()` copied out claim, url and status only, deleting all three
at the last step. Both halves are fixed.

**The reviewer writes in the draft they are already reading**, then moves it:

```jsonc
"_review": {
  "under": "commercial-intent",
  "note": "too technically focused security news — the consequence is the exploit, not a policy change"
}
```

The folder stays the decision and `_review` carries only rationale, so the two
cannot disagree. `reviewer` defaults to `git config user.name`. `promote` strips
`_review` and `$schema` before publishing — a candid note about a named vendor
must never ship with the signal it describes — and appends one event per
decision to `data/_review-log.jsonl`, human and finder alike.

**Measured against the real data:** all 55 rejection lines on disk now retain
their code and reasoning. Previously all 55 lost it.

Six codes were **adopted from what runs already emit**, not invented —
`seo-content-no-method`, `adjacent-already-covered`, `illustrative-not-measured`,
`superseded-by-later-development`, `aggregator-used-primary-instead`,
`capped-this-run`. Without them 8 of 55 degraded to `unrecorded`. `capped-this-run`
matters most: it means *deferred by a quota, not disqualified*.

`schemas/signal-draft.schema.json` gives editors enum autocomplete with
descriptions on hover, via an inline `$schema` key in each draft —
`.vscode/settings.json` is gitignored, so that is the only wiring surviving a
fresh checkout. It is generated by `npm run schema:build` from the libraries, and
a test fails if they drift.

**The review log is gitignored.** Free-text judgment about named third parties
does not belong in a permanent public history — the same rule
`_finder-rejected*` already follows. The cost is real and stated in the design:
the log is local to one machine and not shared between reviewers, which is the
clearest concrete pressure toward a private store.

A bare `mv` still works: the decision is recorded as `unrecorded` and counted,
never refused. Refusing would punish a reviewer at the end of a session and
break the guarantee that an interrupted review publishes nothing.

---

## Verification

- `npm test` — **252 pass**, 0 fail (176 before this branch)
- `npm run lint` — clean
- `npm run build` — `validate: OK — 102 signals valid`, phenomena valid,
  prerender and sitemap fine
- End-to-end reviewer workflow exercised in a throwaway tree: `_review` and
  `$schema` stripped from published output, both decisions logged with the git
  name filled in
- Both collector failure paths exit 1 (unknown profile, bad `--days`)

## Notes for review

- The old test fixtures used `https://example.com` as their `sourceUrl`, so
  adding the check turned 8 existing tests red. Updated to real hosts — that was
  the check working, not a problem with it.
- **Correction to an earlier claim in the analysis this branch came from:**
  Pragmatic Engineer is not broken. Its Substack archive returns 200 and parses
  fine; it contributed nothing on 2026-08-10 because its newest post was 12 days
  old against a 10-day window. That is a window-tuning question, and the spec's
  per-profile `windowDays` addresses it.
