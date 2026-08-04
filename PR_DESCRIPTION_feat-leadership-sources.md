# Add leadership-facing sources to the candidate collector

## Why

The collector's four original sources — Hacker News, Dev.to, Reddit, GitHub
releases — are all practitioner-technical. The first supervised finder run
exposed the consequence: **every org-design, roles, hiring and reskilling signal
had to be found by ad-hoc web search**, because nothing in the candidate pool
covered that ground. The pool biased the run toward tooling minutiae, which is
the failure the finder prompt's Altitude section was added to correct. Fixing the
prompt without fixing the inputs only makes the finder reject more of what it is
given.

This publication is about how software work is organised and managed, how people
reskill, and which tools will matter. The sources should reflect that.

## Changes

**Two new collectors, six new sources:**

- `LEADERSHIP_FEEDS` (RSS/Atom): LeadDev, InfoQ Culture & Methods, Martin Fowler,
  Stack Overflow Blog.
- `SUBSTACK_PUBS` (Substack's public JSON archive endpoint): The Pragmatic
  Engineer, Engineering Leadership.

Both use the existing `perItem` helper, so a single dead feed costs only that
feed and the all-sources-failed exit-1 rule still holds.

**A minimal zero-dependency feed parser.** Handles both RSS `<item>` and Atom
`<entry>`, including Atom's `<link href>` form. Deliberately string-based rather
than a real XML parse — the collector is zero-dependency by design and only four
fields per entry are needed; anything malformed yields an empty title or link and
is dropped.

**Pool is now interleaved by source, not sorted globally by score.** Hacker News
points, Dev.to reactions and Substack hearts measure different things, and feeds
expose no metric at all. A global score sort put every feed item at the bottom of
the pool — reintroducing the exact bias these sources were added to remove.
Round-robin puts every source in the top of the pool, strongest-first within each
source. Feed `score` stays `0` rather than being invented.

**Two text-cleaning fixes found by running it:**

- Stack Overflow pads titles with zero-width characters as a scraping
  fingerprint; they survive JSON round-trips and make titles look corrupted.
  Stripped.
- Numeric HTML entities were only partly decoded — `&#39;` worked, `&#x27;` did
  not, so titles read `Dispatches from O&#x27;Reilly`. Both forms now decode, and
  `&amp;` is decoded last so `&amp;#39;` is not double-decoded.

## Result

Live run, 14-day window: **162 candidates, up from 121**, with 125 from the new
sources (85 feeds + 40 Substack).

What the new sources surfaced, none of which the old pool could have found:

```
LeadDev                  Your AI-coding agents might need an org chart
LeadDev                  AI governance is now an engineering problem
LeadDev                  Your junior engineers don't need an office. They need you
Martin Fowler            The Conductor Developer
Martin Fowler            The Orchestrator's Tax
InfoQ Culture & Methods  AI-Assisted Software Development: Team Profiles and Capabilities
InfoQ Culture & Methods  Getting Rid of LeetCode Interviews in the World of AI
The Pragmatic Engineer   How building software is changing at Anthropic
Engineering Leadership   Clear Writing Is Becoming a Superpower in the AI Era
```

## Verification

- Live run: all six sources report; Reddit still fails (pre-existing 403 on
  unauthenticated datacenter requests) and is isolated as designed.
- Interleaving confirmed: every one of the 11 source groups appears within the
  top 12 of the pool.
- 0 titles with invisible characters, 0 with undecoded entities (was: several).
- `--timeout 1` still exits 1 with all six sources failing, so the
  total-failure guard did not regress.
- `npm run signals:validate`, `npm run lint` and `npm run build` all pass.

## Still open

Reddit remains 403 for unauthenticated datacenter traffic and contributed
nothing to either run. Fixing it needs a script-type OAuth app and a bearer
token; it is documented as a known limitation rather than silently failing.
