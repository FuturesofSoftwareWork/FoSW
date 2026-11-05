# Widen the finder prompt to the people doing the work, and exclude tool news

## Why

An analysis of the published signals and phenomena found that the radar sees how
leading technology firms reorganise around agents, but little outside a single
firm. No phenomenon has `ethics-responsibility-and-society` as its primary
dimension, and wellbeing and careers have one each. Much of this comes from
retrieval: the finder's role did not name careers, wellbeing or society, its
altitude test asked whether a VP of Engineering could act on an item, and
governance shared a one-item cap with security.

## What changes

Only `docs/ai-signals-finder-prompt.md` changes, plus this file.

- **Scope.** The role now covers careers, employee wellbeing and society, and
  each run must search for those deliberately and report what it looked for.
- **Altitude test.** The VP test is replaced by: who is affected, and what
  changed for them? An item qualifies through one of eight routes: the work
  itself, organisation and management, skills, economics and productivity,
  governance, careers, wellbeing, and society. The source must show the
  consequence. A firsthand account of one person's own work still counts, so
  weak signals are not held to a higher bar.
- **Society and ecosystem.** Societal topics qualify when they reach people
  through software work. Industry and ecosystem news qualifies only when the
  source shows what changed for the people doing the work.
- **Governance over security.** Governance has no separate cap but must show what
  changes in someone's work. Security keeps its one-item cap and must pass the
  same test.
- **Tool news.** Excluded by default. A tool item needs a source showing it has
  already changed organisation, management, wellbeing or the work itself.
- **New exclusions.** Agent-performance studies with no observation of people or
  teams, vendor and platform behaviour, build-or-buy stories told as tool stories,
  and general workforce or general agent news. These come from a review of the
  drafts reviewers have rejected.
- **Freshness and bias.** Careers, wellbeing and society get a 30-day window.
  Forum-sourced wellbeing items must name the selection effect, and forerunner
  reports must say they are not the whole field.
- **Retrieval report.** The prompt referred to one without saying where it goes.
  It is now a defined output at `data/_finder-report-generic.<date>.md`.

## Deliberately not changed

- The seven work dimensions. An eighth "ecosystem" category was considered and
  dropped: the project is about how work changes, so ecosystem topics are in scope
  only through their effect on work.
- `config/sources/generic.json`, so the feeds still lean towards tools and the new
  routes rely on the prompt's manual searches.
- Sector and claim prompts, which have their own instructions.
- The rejection vocabulary. Tool news is logged under `low-altitude`.

## Expected side effect

`configuring-the-machine` draws partly on agent studies that the generic run will
now reject. Firsthand team accounts still qualify, and claim runs use their own
prompt, but the generic run will feed that phenomenon less.

## Verification

Documentation only, so no build was run. No test reads this prompt. The scheduled
job `weekly-news-search-v5` is generated from this file and was checked to match
it; `weekly-news-search-v3` is disabled. The job has not yet had a live run.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
