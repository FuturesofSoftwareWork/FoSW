# Scannable signal bullets: inline markdown in the drawer, and the guidance to use it

Signal bullets were slow to read. This makes them scannable — a bolded label at
the head of each bullet, rendered rather than printed as asterisks — and changes
the three prompts so future runs write that shape by default.

Nothing published changes appearance except two signals, deliberately. The other
107 render exactly as before.

---

## What the problem measured out as

Across the 109 published signals, before this branch:

| | |
| --- | --- |
| Prose per signal | median **413 words** — 158 summary, **255 in bullets** |
| Drift | median **412 → 590 words** (Feb–Apr vs Aug–Sep), +43% |
| Bullets at 3+ rendered lines | **76%**. One line: 0.4% |
| Bullets opening with a short label | **6%** |
| Bullets that could carry emphasis | **0** |

The bullets carry 62% of the prose, and three quarters of them run past three
lines with no landing point for the eye. That is the reading problem; bullet
*count* was not it, and the counts were mostly within their stated caps.

Emphasis was impossible rather than merely unused: `SignalContent` passed each
bullet to JSX as a bare string, so `**like this**` reached the reader as literal
asterisks.

## 1. `InlineMarkdown` — emphasis inside a bullet, and nothing else

New primitive in `src/components/drawer/primitives.tsx`, used by the three
bullet lists in `SignalContent.tsx`. No new dependency: `react-markdown` was
already installed and already used by `InsightContent` for article bodies.

Deliberately much narrower than that article renderer:

- **No remark plugins.** CommonMark covers `**bold**`; GFM would add tables and
  block constructs a bullet has no use for.
- **`allowedElements: ["p", "strong", "em", "code"]` with `unwrapDisallowed`.**
  A heading or list an author writes is unwrapped to its text rather than
  dropped, so a stray `#` costs formatting and not content.
- **Raw HTML stays inert.** `rehype-raw` is not installed, so `<script>` is
  escaped to text.
- **The wrapping `<span>` is load-bearing.** These bullets are flex rows of
  `[dot, text]`. Without a single wrapping element, every `<strong>` markdown
  produced would become its own flex item and the row would break into columns.

**Known limitation, documented in the code:** a markdown link is unwrapped to its
text and the URL is silently lost. Bullets are not where links belong —
`sourceUrl` and `corroboration` are, and the drawer renders both — but the
comment says to add `a` here rather than let an address disappear if that ever
changes.

### Verification

Dev servers cannot be started from this session, so the visual layout is
reasoned about rather than screenshotted. **Worth a look at `npm run dev` before
merging.** The rendering semantics were verified directly, through
`react-dom/server` with the component's exact options:

| input | output |
| --- | --- |
| `**Averages hide the cost.**` | `<strong class="font-semibold text-gray-100">` |
| a plain legacy bullet | unchanged — no regression across the 109 |
| lone `*` (exists in `2026-08-31-04`) | stays literal |
| `_underscore_` | italic; `snake_case_word` untouched |
| `# heading`, `- list` | markup stripped, text kept |
| `[text](url)` | text kept, **URL lost** — see above |
| `<script>alert(1)</script>` | escaped inert |

A corpus scan backs the no-regression claim: of **1,143 text fields** across all
109 signals, exactly **one** contains a markdown-significant character — a lone
`*`, which CommonMark renders literally.

## 2. Guidance — the shape, and paragraphs in `summary`

Added to all three prompts (`ai-signals-finder-prompt.md`,
`sector-prompt-instructions.md`, `claim-prompt-instructions.md`) and to the
generated schema, so authors get it as editor hover text:

> Every bullet opens with a **bolded label of two to five words**, then an em
> dash, then one sentence. The label must carry the claim, not name a category.
> Aim for two rendered lines, never more than three. Bold the label only.

And, for the summary field:

> Over roughly 120 words, split into paragraphs with `\n\n` — a literal escape,
> since JSON cannot hold a real newline. Never break inside the first sentence:
> `splitLead` lifts that sentence into its own `<p>`, which has no
> `whitespace-pre-line`, so a break there is lost. No bold in a summary.

That last rule is written down because it was hit by hand. Paragraph breaks
already worked in summaries; nothing told anyone they did, so they were being
added manually after the fact.

### Three smaller fixes to the same guidance

- **`risksAndCaveats` had a six-item checklist** — "uncertainty, external
  validity, benchmark realism, data freshness, vendor bias, adoption
  constraints" — against a cap of three bullets. It is the most-exceeded cap in
  the corpus. Replaced with: name only what would change a reader's decision.
- **`whyItMatters` had a two-clause template** — *"should read like 'Because of
  this, leaders should reconsider X'"* — which built setup-plus-consequence into
  every bullet by construction. Removed.
- **"Do not pad" was missing from the main finder prompt.** It existed only in
  the sector and claim instructions, so the generic weekly run — which produces
  most signals — never saw a Style section at all. Added.

## 3. `2026-05-20-05` rewritten as the first consumer

The HBR "AI brain fry" signal, rewritten against real extracted figures and in
the new bullet shape. All ten bullets fit two rendered lines; the summary is 118
words in two paragraphs.

It also gains provenance that was missing: `signalType: field-report`,
`sampleSize`, and `sponsor` naming Boston Consulting Group. The `source` said
Harvard Business Review, but the research is BCG's and all six authors are
BCG-affiliated — material to how a reader weighs the numbers, and previously
invisible. `fieldworkPeriod` is deliberately omitted: the source does not state
when the survey was fielded, and inventing one is worse than leaving it out.

`decisionHorizon` is dropped from this file. It is retired per CLAUDE.md; the 98
other legacy files carrying it are left alone, but rewriting this one counts as
emitting it.

## 4. `2026-09-01-01` rewritten — the worst offender in the corpus

The Amazon frontier-development signal was the heaviest item on the site at
**1,237 words**, three times the corpus median, breaking all three caps at
6/5/6. Rewritten in the new shape it is **552 words**, and all twelve bullets
fit two rendered lines.

Bullets were re-checked line by line against the talk transcript rather than
against the previous bullets, so the compression did not drift from the source.
The summary is left exactly as it was — it had already been rewritten by hand
into three paragraphs.

**`recommendedActions` deliberately keeps five bullets against a cap of four.**
The five habits are the substance of this item and the source names exactly
five; cutting one to satisfy a count would remove the thing the signal is for.
The cap exists for scannability, which the two-line shape now delivers.

Two caveats were dropped rather than compressed — the estimate-versus-actual
baselines of the two pathfinder teams, and the metric changing between studies.
Both described claims that the hand-rewritten summary no longer makes.

## Not in scope

- **No backfill.** The other 107 signals keep their current shape and render
  unchanged. They will look inconsistent beside new ones until someone decides
  whether to trim them — that is a separate editorial call.
- **No enforcement.** A character-length check in `promote` (warn past ~180
  chars, where a third line begins) was discussed and deferred. The caps have
  drifted before without one, so this will likely need revisiting.

## Verification

- `npm test` — **284 pass**, 0 fail
- `npm run validate` — 109 signals valid; 10 phenomena valid, launch gate still
  closed at 0 of 10 published
- `npm run build` — clean
- `npm run lint` — clean, zero warnings
- `npm run verify:radar` — **not run**; needs a server already running

🤖 Generated with [Claude Code](https://claude.com/claude-code)
