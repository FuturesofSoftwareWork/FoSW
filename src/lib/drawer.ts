/**
 * Pure helpers shared by the drawer bodies. Kept out of `primitives.tsx`
 * because that file must export components only — `react-refresh/only-export-components`
 * is a warning and `npm run lint` runs with `--max-warnings 0`.
 */

/** Longest a first sentence may be and still work as a display lead. Beyond
 *  this it stops being a hook and becomes a wall of large serif text. */
const LEAD_MAX = 320;
/** Shorter than this and the "lead" is a fragment, not an opening. */
const LEAD_MIN = 60;

const isUpperLetter = (c: string): boolean => c >= "A" && c <= "Z";

/**
 * Split a summary into a display lead (first sentence) and the remainder.
 *
 * The signal corpus has no paragraph breaks — 101 of 102 summaries are a single
 * unbroken run — so the lead is derived at render time rather than authored.
 * Returns an empty lead when no suitable break exists, and callers then render
 * the summary as one uniform block.
 *
 * Deliberately conservative: a break only counts when the next sentence starts
 * with a capital *letter*, which skips both "U.S. researchers" (lowercase after)
 * and "Jan. 2026" (digit after) without needing an abbreviation list.
 */
export function splitLead(summary: string): { lead: string; rest: string } {
  const text = summary.trim();
  if (text.length <= LEAD_MIN) return { lead: "", rest: text };

  for (let i = LEAD_MIN; i < text.length - 1 && i <= LEAD_MAX; i++) {
    const c = text[i];
    if (c !== "." && c !== "!" && c !== "?") continue;

    const after = text.slice(i + 1);
    const m = after.match(/^\s+([^\s])/);
    if (!m || !isUpperLetter(m[1])) continue;

    return { lead: text.slice(0, i + 1), rest: after.trimStart() };
  }

  return { lead: "", rest: text };
}

/**
 * Open a `<details>` section by id and bring it into view.
 *
 * The Tier-1 stat chips double as navigation into the detail that backs them,
 * which is the hinge between scanning and digging. Reaching into the DOM is the
 * pragmatic way to drive a native `<details>` from outside it — the alternative
 * is lifting every section's open state into React and losing the built-in
 * find-in-page and keyboard behaviour that made `<details>` the right element.
 */
export function openDisclosure(id: string): void {
  const el = document.getElementById(id);
  if (!(el instanceof HTMLDetailsElement)) return;
  el.open = true;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
}

/** Hostname of a URL, for showing a source link as `example.com`. */
export function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** The one date format the drawer uses. */
export function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
