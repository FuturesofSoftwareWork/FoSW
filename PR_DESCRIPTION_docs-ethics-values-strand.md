# Point the ethics sector at moral conflict and earned trust

## Why

The first run of the redirected ethics prompt produced three drafts. One was accepted:
QGIS's ban on AI-assisted code. But what made it interesting was not the ban. It was the
follow-up proposal that contributors with 100 merged pull requests may use AI if they label
it, review it and link the full agent transcript: trust has to be earned before AI-written
work is accepted. The other two drafts, the Linux kernel dropping its `Assisted-by` tag and a
census of commit-attribution rules, were rejected as minor details.

What the run did not find at all was values and ethics: for example, stress from moral
conflict in software work. No published signal, rejected draft or ledger entry covers it.
The prompt sent "how the work feels" to the wellbeing sector, which does not search for it
either, accepted values only as collective behaviour, and searched only governance venues.

## What changes

`docs/sector-prompts/ethics-responsibility-and-society.md`:

- New first strand, **values and moral conflict**: engineers asked to ship code they cannot
  vouch for, AI-use targets that clash with their judgement, risks they see and cannot act
  on, refusal on principle, hidden use, guilt and complicity. A named person's firsthand
  account or a study with a stated method counts; general opinion does not. Engineers who
  build AI systems are included, not only those who use AI tools.
- Norms are re-centred on **who is trusted or allowed to do what**, with QGIS's
  earned-trust proposal as the reference case. Disclosure formats, tags and commit trailers
  are marked as minor details and rejected on their own.
- A formal proposal can now qualify when the proposal itself is new, described as a proposal.
- The boundary with wellbeing: stress from workload or pace is wellbeing; stress from being
  asked to do something the engineer believes is wrong belongs here.
- New hunting grounds: practitioner blogs, Hacker News, Lobsters, LeadDev, engineers'
  Mastodon instances, FAccT and AIES, university press releases, with search terms.
- A hazard on resignation and refusal stories retold without their source.
- Ranking puts moral conflict first.

`docs/sector-prompts/worker-experience-identity-and-wellbeing.md` routes moral conflict to
the ethics sector, so the two prompts do not both claim it.

## Deliberately not changed

- The cap of half the items from open source. The first run found it forces either an
  empty run or a breach on a thin week; that is still open.
- The 45-day window and the two-feed source profile.

## Verification

Documentation only. `npm test` passes. The new strand has not had a live run.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
