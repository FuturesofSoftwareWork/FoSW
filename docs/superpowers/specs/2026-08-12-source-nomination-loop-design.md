# The source nomination loop

**Date:** 2026-08-12
**Status:** design, approved for implementation
**Follows:** [source profiles and the review log](./2026-08-12-source-profiles-and-review-log-design.md),
which deliberately deferred this piece until a profile had been written once.

## The problem

The seen-ledger remembers **items**. Nothing remembers **sources**.

The 2026-08-06 worker-experience run found Herrington, Khare, Stetskov,
Goedecke, Wellons, Crawshaw, Jake Gold and Alec Scollon by hand. Its own report
names the single most productive query of the run and the three writers it
surfaced. Every one of those names was discovered, used once, and dropped. The
next run starts from zero and either re-finds them by luck or does not.

Seeding `config/sources/worker-experience-identity-and-wellbeing.json` by hand
proved the value — five feeds, verified, now collected every run — and proved
the cost: it took a person reading a report and probing feed paths one at a
time.

**The prompt already asks the right question.** Section 5 of the retrieval
report is *"would a dedicated candidate collector for this sector have
materially improved the run? If yes, which feeds and which search terms would
have helped most. Be specific enough that someone could implement it."* The
finder answers it — in prose, in a markdown file nothing machine-reads, and the
answer dies there. This work gives that answer a structured form and somewhere
to go.

## Shape

```
finder run  ──► data/source-nominations/<slug>.json     name, profile, foundAt, why
                        │
npm run sources:discover│  fetch foundAt, read <link rel="alternate">, verify it
                        │  parses, write feed + feedStatus back into the file
                        ▼
      you: read it, mv to accepted/ or rejected/   (+ optional _review note)
                        │
npm run sources:promote │  append to config/sources/<profile>.json
                        ▼
              the next collect run picks them up
```

Same contract as signal drafts throughout: the agent proposes, a human moves a
file, a script promotes. Nothing enters a profile unread, and nothing is
accepted automatically.

### Scope

**Feeds only** — named practitioners and publications. Not search terms, not
Dev.to tags, not subreddits.

The reason is verifiability. A feed can be checked by code: does it fetch, does
it parse, when did it last publish. A search term cannot — its value is only
knowable by running it next week and looking at what came back. The evidence
also points this way: five of six candidate Hacker News terms for this sector
returned zero stories in 60 days, so terms are the weak end of the pool, while
the practitioner-blog vein is what the last run said was most productive.

## Nomination files

`data/source-nominations/<slug>.json`, one per candidate. `<slug>` is the
nominee's name lowercased, non-alphanumerics collapsed to `-`. On collision the
finder appends `-2`, `-3`, as it already does for signal ids.

```json
{
  "name": "Jono Herrington",
  "profile": "worker-experience-identity-and-wellbeing",
  "foundAt": "https://example.dev/posts/review-day-cognitive-load",
  "why": "firsthand account of review-day cognitive load; cleared altitude and became 2026-08-06-06",
  "signalId": "2026-08-06-06",

  "feed": "https://example.dev/rss.xml",
  "feedStatus": "ok — 24 entries, newest 2026-08-09",
  "discoveredAt": "2026-08-12",
  "alreadyInProfile": false,

  "_review": { "note": "optional; yours" }
}
```

Written by the finder: `name`, `profile`, `foundAt`, `why`, and `signalId` when
the nomination produced one. Written by `sources:discover`: `feed`,
`feedStatus`, `discoveredAt`, `alreadyInProfile`. Written by the reviewer:
`_review`, optional, and consistent with the signal-draft convention.

`profile` is required. A nomination that does not say which profile it belongs
to cannot be routed and is a refusal, not a guess.

### When the finder nominates

The criterion is evidence-based rather than editorial taste:

> Nominate a source when you drafted, or seriously considered drafting, a signal
> from it this run.

That keeps the roster growing from material that actually cleared the bar. The
finder must check the profile and all three nomination folders first, and not
re-nominate what is already there or already declined.

## Feed discovery

Code's job, not the model's. Asking a model to guess a feed path produces
plausible 404s — seeding the first profile by hand hit exactly that, and needed
a probe over six candidate paths per domain to resolve.

`scripts/lib/feed-discovery.mjs` is pure and holds:

- `slugify(name)` → filename stem.
- `findFeedUrls(html, baseUrl)` → absolute URLs from
  `<link rel="alternate" type="application/rss+xml|application/atom+xml">`,
  in document order, relative hrefs resolved against `baseUrl`. Attribute order
  varies between publishers, so matching cannot assume `rel` precedes `type`.
- `fallbackFeedUrls(baseUrl)` → the conventional paths (`/rss.xml`, `/feed`,
  `/feed.xml`, `/index.xml`, `/atom.xml`, `/rss`) against the origin, for sites
  that publish a feed without advertising it.

Both strategies are load-bearing. Measured against the four pages the first
sector run found people on: three advertise a feed in a `<link>` tag, and
`jacob.gold` advertises none but serves `/index.xml`. Tag parsing alone misses a
quarter of them; the fallback list alone guesses wrong for any site using a path
outside the conventional six. (An earlier note here claimed none of them
advertised a feed — that was drawn from a hand-probe that only tried common
paths and never looked at the tags.)

`scripts/sources-discover.mjs` composes them, taking an **injectable fetcher**
so the whole path is testable with no network — the rule every other test here
follows.

Per nomination: fetch `foundAt`, take `findFeedUrls` then `fallbackFeedUrls` as
candidates, and accept the first that fetches and yields at least one entry
through the collector's own `parseFeed`. Reusing `parseFeed` matters: a feed
that discovery accepts but the collector cannot read would be worse than none.

Idempotent — a nomination already carrying a verified feed is skipped unless
`--force`. Failure is recorded, not thrown: `feedStatus: "no feed found"` leaves
the nomination reviewable, and *"this person has no feed"* is a legitimate
reason to reject rather than an error.

## Promotion

`npm run sources:promote` reads `accepted/`, groups by `profile`, and appends
`{name, url}` to that profile's `feeds`. Append, never reorder — the same rule
`index.json` follows.

All-or-nothing, like `signals:promote`. It refuses when:

| Condition | Why |
|---|---|
| no `profile`, or no such profile file | cannot route it |
| no `feed`, or `feedStatus` is not `ok` | discovery has not run or found nothing |
| the feed URL is already in that profile | duplicate collection, silently doubling one source's weight in the pool |

**It does not re-fetch the feed.** Discovery already verified it, and keeping
promotion pure-filesystem makes it fully testable and deterministic. A feed that
dies between discovery and promotion surfaces as an isolated per-request failure
on the next collect run, which is exactly how the collector already handles a
dead source. (This is a deliberate simplification of the sketch discussed
before implementation, which had promote re-verifying.)

Duplicate detection compares normalised URLs, reusing `normalizeUrl` from
`ledger.mjs`, so `http`/`https` and a trailing slash do not smuggle a second
copy of the same feed into a profile.

On success the accepted file is removed: the profile is now the record. Rejected
files stay where they are — they are the memory that stops the next run
re-nominating someone already declined.

## Privacy

`data/source-nominations/` is gitignored. It is unreviewed material naming
individuals, on a public repo, and it carries a reviewer's reasons for declining
a named person. That is the same rule `data/_review-log.jsonl` and
`data/_finder-rejected*` already follow.

The same cost applies, and this is now the third place it appears: the record of
who you declined is local to one machine and not shared between reviewers.
Nominations are the case where it bites hardest, because the value of the
declined list grows over time — it is what stops the loop re-proposing the same
people indefinitely.

## Testing

No network, following every other suite here.

**`feed-discovery.mjs`** — `slugify` including accents and collisions;
`findFeedUrls` with `rel` before and after `type`, single and double quotes,
relative and absolute and protocol-relative hrefs, Atom as well as RSS, multiple
feeds in document order, a comment-only page yielding none; `fallbackFeedUrls`
building against the origin and discarding the path.

**`sources-discover.mjs`** — with a stub fetcher: a page advertising a feed;
a page advertising none where a fallback path works; neither working, recording
`no feed found` rather than throwing; a feed that fetches but parses to zero
entries being rejected; idempotence, and `--force` overriding it;
`alreadyInProfile` set when the discovered URL is in the target profile.

**`sources-promote.mjs`** — appends to the right profile and leaves other keys
untouched; routes two nominations to two different profiles in one run; each
refusal in the table above, each blocking the whole batch; the accepted file is
removed and the rejected one is not; re-running is a no-op.

## Out of scope

- **Nominating search terms, tags or subreddits.** Verifiability, as above.
- **Automatic acceptance** under any rule. Every nominee passes through a human.
- **Removing a source that has gone quiet.** A profile grows here and is pruned
  by hand; deciding a writer has stopped being worth following needs a judgment
  about why they went quiet, and a script that drops sources silently would
  shrink the pool without anyone noticing.
- **Nominating into a claim profile.** No claim profile exists yet.
