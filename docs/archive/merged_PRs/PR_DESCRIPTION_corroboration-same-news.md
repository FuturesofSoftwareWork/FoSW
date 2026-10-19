# Corroboration means the same news, reported elsewhere

Narrows a signal's `corroboration` field to **other outlets covering the same
news**. Similar experiences at other organisations now become signals of their
own. `signals:promote` now records corroboration links in the seen-ledger.

## Why

`corroboration` is display-only. The drawer lists it in a collapsed section,
and nothing downstream reads it: `radar:prepare` leaves it out of the digest, a
phenomenon's `evidence` cites signals by id, and the seen-ledger keys only
`sourceUrl`.

The finder prompt nonetheless told agents to fold "the same emerging pattern
from 2+ unrelated sources" into one item, with the others in `corroboration`.
So a second organisation's firsthand account, which is exactly what the radar
exists to count, went into a field the radar never sees and few readers open.

On the live site, 31 of the 40 corroboration links on published signals point
at sources that appear nowhere else in the pipeline. An example is "four
unrelated practitioners" on 2026-08-06-02, which counts as one piece of
evidence. In this week's drafts, a Redis newsletter that was only an analogy
appeared as corroboration on a Linear-data signal.

## What changes

- **Finder, sector and claim prompts** (`docs/ai-signals-finder-prompt.md`,
  `docs/sector-prompts/sector-prompt-instructions.md`,
  `docs/claim-prompts/claim-prompt-instructions.md`)
  - The rule now reads: the original publication is `sourceUrl`, and other
    outlets' stories about it are `corroboration`.
  - Two organisations reporting similar experiences are two items.
  - A published signal, an analogy or background never goes in `corroboration`.
  - Every link must be read before it is added.
- **`signals:promote`** (`scripts/ledger.mjs`, `scripts/promote-signals.mjs`)
  - A new `recordsFromSignal()` returns the signal's ledger record plus one per
    corroboration link, with the same id and status. Coverage of a story that
    was decided does not come back next week as a new draft.
  - Only `promote` uses it. `prepare` still uses `recordFromSignal`, so the
    older published signals' cross-organisation links are not ledgered, and
    they can still become signals of their own.
- **Drawer label** (`SignalContent.tsx`): it changes from "Independent sources
  reporting the same development." to "Other outlets reporting the same news."
- **Tests**: two new promote tests cover accepted and rejected drafts. All 286
  tests pass, and lint and build are green.

## Not in this PR

- **Published signals are not rewritten.** The signals whose corroboration
  hides separate evidence are listed for a human decision on which, if any, to
  split into their own signals.
- **The scheduled finder task is not updated.** Its `SKILL.md` is a copy of
  the finder prompt, so it needs re-copying after merge.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
