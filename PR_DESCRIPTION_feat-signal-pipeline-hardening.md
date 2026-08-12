# Signal-pipeline hardening: sourceUrl validation, ledger/collector tests, Reddit diagnosis

Four related pieces of work on the AI-signals pipeline, from an analysis pass
over what is implemented and what actually holds up. Three are shipped here; the
fourth is a spec for the next branch.

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

---

## Verification

- `npm test` — 216 pass, 0 fail
- `npm run lint` — clean
- `npm run build` — `validate: OK — 102 signals valid`, phenomena valid,
  prerender and sitemap fine

## Notes for review

- The old test fixtures used `https://example.com` as their `sourceUrl`, so
  adding the check turned 8 existing tests red. Updated to real hosts — that was
  the check working, not a problem with it.
- **Correction to an earlier claim in the analysis this branch came from:**
  Pragmatic Engineer is not broken. Its Substack archive returns 200 and parses
  fine; it contributed nothing on 2026-08-10 because its newest post was 12 days
  old against a 10-day window. That is a window-tuning question, and the spec's
  per-profile `windowDays` addresses it.
