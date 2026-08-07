# Make the drawer scannable: three tiers, shared primitives

The radar drawer had grown into a flat wall of text. Both the phenomenon and
signal bodies rendered every field they had as an equal-weight sibling, so
there was no way to tell a summary from an appendix, and the facts a reader
wants in three seconds were scattered through the prose as `text-gray-400`
sentences.

This restructures both bodies around one rule — **collapse anything whose body
is a list of links or metadata; keep prose open** — and extracts the shared
vocabulary so the two cannot drift apart again.

## What was wrong

**The phenomenon drawer never rendered its own title.** It opened straight into
`thesis`; `title` and `label` appeared nowhere. A radar blip carries a 2–4 word
label and labels can be switched off entirely, so clicking one landed you on a
four-sentence paragraph with no anchor at all.

Beyond that, in `PhenomenonContent`:

- Twelve sibling blocks under `space-y-8`, using three unrelated heading
  treatments — `font-serif text-xl` h3s, `font-mono text-xs` h4s, and reach as a
  bare `<p>`. The serif h3 scale appeared nowhere else on the site.
- Reach, evidence profile, potential impact, contested and dimensions — the five
  scannable facts — were prose at four different depths. `potentialImpact` sat
  *after* the evidence list and carried a methodology aside.
- Seven full-width evidence buttons formed the tallest block on the page and sat
  mid-document, pushing development paths and "what would change our mind" below
  the fold.
- Stance headings were three long mono sentences distinguished only by their text.
- Evidence links and related-phenomenon links were near-identical, differing only
  in hover ring colour.

In `SignalContent`:

- Roughly 150px and up to twelve metadata items rendered *before* the `<h2>`.
- `evidenceParts` flattened eleven heterogeneous provenance fields into one
  unlabelled `.join(" · ")` run-on — the fields that establish credibility, in
  the least legible form on the page.
- Cyan simultaneously meant source, category, date, tag and call-to-action, while
  the eight evidence genres each claimed a full accent (border + bg + text).
- Tags and categories were the same cyan pill despite being a free-text field and
  a controlled 13-value vocabulary.
- The "Evidence for X" backlink was rendered by `ContentDrawer` *outside* the
  component, orphaning it above the metadata block.

Measured against the corpus (102 signals): summary median 1049 chars, max 1493,
and **101 of 102 contain no line break** — so the `whitespace-pre-line` on the
summary was preserving nothing. Median 10 bullets across the three lists.

## What changed

### Shared primitives — `src/components/drawer/primitives.tsx`

`DrawerKicker`, `SectionHeading`, `StatStrip`, `StatChip`, `Panel`,
`DisclosureSection`, `MetaList`. Both bodies consume these, so there is one
heading scale rather than three. The mono/uppercase/icon pattern won — it was
already the one `SignalContent` used and the one the page sections use.

Pure helpers live in `src/lib/drawer.ts` rather than alongside the components,
because `react-refresh/only-export-components` is a warning and `npm run lint`
runs with `--max-warnings 0`.

### Disclosure sections use native `<details>`

Not a `useState` toggle: find-in-page auto-expands them, the content stays in the
DOM for the prerendered shell, and keyboard plus screen-reader behaviour comes
for free. Each `<summary>` carries a count and a one-line hint, so the fact stays
scannable while collapsed — Evidence reads
`EVIDENCE (7) — 4 supporting · 2 counter · 1 contextual` without being open.

### Phenomenon drawer

- **Tier 1** — dimension kicker, `title` as the h2 (new), and a status strip of
  reach / potential impact / evidence / contested. The reach chip carries a
  three-segment meter echoing the radar's rings. Chips with a backing section are
  buttons that open and scroll to it, so the scannable fact is also the door into
  the detail. Then thesis, then `currentPressure` demoted to a muted lead-in.
- **Tier 2, open** — implications (coloured left border kept), development paths
  **promoted above evidence** as a card grid, and "what would change our mind".
- **Tier 3, closed** — Evidence, Why it sits here (reach rationale, contested
  note, reach history), Related phenomena, Provenance. Evidence rows are now
  colour- and icon-coded by stance rather than headed by three long sentences.

### Signal drawer

- **Tier 1** — kicker with the primary category and date, then the title, then
  three chips (type, strength, horizon), the source with an inline `↗ host` link,
  and the phenomenon backlink moved in from `ContentDrawer`.
- The summary renders **in full, never clamped**. The card on the main page
  already shows the first ~50 words (`ContentStream.tsx:171`), so gating the rest
  would mean two clicks to reach what the drawer was opened for. The first
  sentence is promoted to a serif lead as typography only — it hides nothing, and
  it orients deep-link arrivals who never saw a card.
- **Tier 2** — the three lists now differ by container, not just dot colour: why
  it matters as prose bullets, recommended actions as a numbered emerald panel,
  risks as a single amber panel.
- **Tier 3** — Provenance & method (the `evidenceParts` fields as a labelled
  definition list), Corroboration, Tags.
- Colour discipline: the eight genre accents collapse to a neutral chip with a
  coloured icon; cyan is reserved for navigation into our own content; tags go
  neutral so they stop impersonating categories.

### Drawer shell

- Reading-progress bar now draws for **all three types** with the accent from
  `DRAWER_TYPE_META`. It was computed for every drawer but rendered only for
  insights, though the phenomenon body is the longest of the three.
- The phenomenon label is pinned in the sticky bar — a phenomenon drawer is a
  cold open, so the click has to carry its context through a long scroll.
- `ml-auto` on the copy button, which previously jumped to the left edge whenever
  there was no Back button. Its text label drops below `sm` so it cannot wrap.
- `px-6 md:px-10` with `max-w-[68ch]` on prose blocks, against ~100ch before.
- `useReducedMotion` on the drawer slide, and `motion-reduce:transition-none` on
  the interactive elements. Nothing in the app respected reduced motion except
  the carousel.

## `decisionHorizon` is no longer rendered

Its values are literal year ranges, and the distribution is degenerate: across
102 signals, **78 `now`, 19 `0,5 - 2 years`, and exactly one `2+ years`**. A chip
in the drawer's top row was spending reader attention to say almost nothing.

This is the same finding that already removed the field from the radar —
`docs/superpowers/specs/2026-08-04-futures-radar-design.md` rejected it as the
radius axis in August because four-fifths of every blip landed in the bullseye
and the outer ring was empty. The signal-level vocabulary is `signalStrength`;
how far a change has spread is the phenomenon's `observedReach`.

Relabelling to something like "Near term" was the obvious alternative and is
worse — it dresses a distinction the corpus cannot support in wording that
implies it can.

Removed from the two finder prompts as well, with a note saying why, so new
signals stop paying a judgement per item for a field nothing renders. The
`regulation-standard` rule that computed it from `effectiveDate` went with them.

**Deliberately left alone:** the field stays in `types/content.ts`,
`signal-schema.mjs` and the 98 JSON files that carry it. Nothing reads it now,
and stripping inert data from published research content would be a 98-file diff
for no visible gain.

**Recommended follow-up, not in this PR:** drop the enum check from
`signal-schema.mjs`, and update `CLAUDE.md` / `AGENTS.md`. Worth doing on its own
merits — the validator can currently fail a promote over a field nobody reads.
Note that `promote.test.mjs:147` uses `decisionHorizon: "watch"` as its only
invalid-value fixture, so that test needs a different violation
(`sourceType: "Academic"` works) or it stops testing anything.

**Related, undecided:** `leadTimeEstimate` (14 signals) carries the same kind of
literal duration — `"~3-6 months"`, `"~12-18 months"` — mixed with free text like
`"confirms current practice"`. It now sits inside collapsed Provenance, where
specifics belong, so it was left as-is.

## Design decisions worth flagging

- **Evidence stays closed by default.** The stance breakdown in the summary line
  keeps the fact visible without the seven buttons.
- **The two drawers do not share Tier-1 density, on purpose.** A signal drawer
  continues a read that the card started; a phenomenon drawer starts one from a
  2–4 word blip label. They share primitives and the heading scale, not weight.

## Verification

- `npm run lint` — clean.
- `npm test` — 93 pass.
- `npm run build` — passes, including both content validators and the prerender.
- Manually checked in Chrome at 1440px and 375px: phenomenon and signal Tier 1
  through Tier 3, stat-chip-to-disclosure navigation, cross-drawer navigation
  (phenomenon evidence → signal → Back), a legacy signal with no `signalType`,
  `signalStrength` or `category` degrading cleanly, and the insight drawer keeping
  its gold progress bar. No horizontal overflow at 375px.

No content files touched; no schema change.
