# Add the ethics sector prompt on engineering norms, and narrow what layoff news qualifies

## Why

`ethics-responsibility-and-society` is the one work dimension with no phenomenon as
its primary sector, and it had no sector prompt. The first version of this prompt
searched labour rights: unions, courts and labour ministries in the US, Europe and China,
following the published Blizzard signal. A test run produced eight drafts, and all eight
were rejected as off from software engineering. The venues decided the answer: those
sources talk about employment, not about how software is built.

This version is about the **norms, values and responsibilities of software engineering**
instead. The site has already published signals of that kind, such as Debian's vote on AI
contributions, and some of them sit in no phenomenon yet.

## What changes

**New sector prompt**, `docs/sector-prompts/ethics-responsibility-and-society.md`:

- Requires every item to be directly linked to software engineering and to name the
  engineering activity it changes. AI in the workplace in general is too broad. The
  generic prompt's society route now carries the same rule.
- Checks that a foreign item's question arises in Europe and Finland at all, since one
  rejected draft concerned US worker monitoring, which stricter European rules already govern.
- Searches four areas: norms of the craft (disclosure, attribution, contribution rules, what
  review is for, professional codes), responsibility for agent-written code, values shown in
  observed behaviour, and, at lowest priority, a say over engineering tools.
- Treats regulation and standards as a filter, not an area of their own. Most such news is
  about what a law requires of a software business. A rule counts only when a source shows
  engineering work changing because of it, or the rule's own text places a duty on how code
  is produced, reviewed or released. The generic prompt's governance section now applies
  the same test, replacing a rule that let in any regulation naming "who must do what, by
  when".
- Caps open-source items at half the run, because open-source governance is argued in
  public and company norms mostly are not.
- Requires runs to read the primary document, say how binding a rule is, and check every
  "first". Press coverage had embroidered the Blizzard contract terms.
- Adds a "Writing for the public" section. The first run put pipeline vocabulary and
  failed-fetch notes into draft text that would have reached the live site.
- Drops the China and labour-law searches. Those items failed the direct-link test.

**New source profile**, `config/sources/ethics-responsibility-and-society.json`, with two
feeds that were fetched and checked on 2026-11-09: LWN and the Software Freedom Conservancy
blog. Hacker News is left out because every term tried returned nothing at the collector's
threshold.

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
- The dimension id. The sector is a search lens, and only the search changes.
- Sector and claim runs do not propose phenomena. That stays a separate session.

## Verification

Documentation and a source profile only, so no build was run. `npm test` passes. The
labour version of the prompt had one full test run; this version has not had a live run
yet. The scheduled job `weekly-news-search-v5` is generated from the generic prompt and
was regenerated to match it.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
