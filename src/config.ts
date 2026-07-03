// Single source of truth for the production origin and site-wide meta defaults.
// prerender.mjs keeps a matching literal (it cannot import this TS module).
export const SITE_URL = "https://futuresofsoftwarework.github.io/FoSW";

export const SITE_DEFAULTS = {
  title: "Alternative Futures of Software Work",
  description:
    "How AI is reshaping software work — curated weekly signals, expert insights, and scenario research from VTT, University of Helsinki, and Business Finland.",
} as const;

// Turn a relative asset path or an already-absolute URL into an absolute URL.
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}/${pathOrUrl.replace(/^\//, "")}`;
}
