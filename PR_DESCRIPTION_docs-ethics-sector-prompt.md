# Add the ethics sector prompt, and narrow what layoff news qualifies

## Why

`ethics-responsibility-and-society` is the one work dimension with no phenomenon as
its primary sector, and it had no sector prompt. The published Blizzard signal also
raised a question the corpus cannot answer yet: whether workers gaining a say over AI
is a pattern or a single contract. A first test run of this prompt produced eight
drafts, and reviewing them showed what the prompt needed to change.

## What changes

**New sector prompt**, `docs/sector-prompts/ethics-responsibility-and-society.md`:

- Starts each run on who gets a say over AI at work, and ranks a clause or ruling
  being used above a new right, and a new right above a demand.
- Searches the US, Europe and China on every run, with local-language search terms and
  an explicit check of Finland. It keeps Chinese court rulings apart from state
  employment policy, which so far supports workers without limiting automation.
- Requires runs to read the primary document, attribute contract terms and check every
  "first", because press coverage had embroidered the Blizzard contract terms.
- Adds a "Writing for the public" section. The first run put pipeline vocabulary and
  failed-fetch notes into draft text that would have reached the live site.

**New source profile**, `config/sources/ethics-responsibility-and-society.json`, with six
feeds that were fetched and collected. Hacker News is left out because these terms return
almost nothing at the collector's threshold.

**General layoff news is rejected** in the generic prompt, the ethics prompt and the shared
sector instructions. A layoff item qualifies only when the source explains how AI use led
to the cuts, or shows a change in rights or duties. An employer naming AI as its reason is
not a mechanism, and neither is cutting staff to pay for AI investment.

**Shared sector instructions** no longer say "leadership implications" or list only
executives as who should care, and they add `outside-window` and `wrong-construct` to the
rejection codes. These apply to the wellbeing run too.

The pipeline doc and runbook now list the new sector.

## Deliberately not changed

- The seven work dimensions and the signal schema.
- The first run's other feedback on the prompt, including that no signal type fits a
  dispute. It is recorded in that run's retrieval report and is still open.
- Sector and claim runs do not propose phenomena. That stays a separate session.

## Verification

Documentation and a source profile only, so no build was run. `npm test` passes. The
profile ran through `signals:collect`, and one full finder run was carried out with an
earlier version of this prompt. The wording rules and the final layoff rule have not had a
live run. The scheduled job `weekly-news-search-v5` is generated from the generic prompt and
was regenerated to match it.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
