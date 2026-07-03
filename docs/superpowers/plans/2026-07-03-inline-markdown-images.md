# Inline Markdown Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let expert-insight authors embed one or more images anywhere in an article using plain markdown image syntax, rendered as styled figures with optional captions.

**Architecture:** Add a single `img` renderer to the `react-markdown` `components` map in `ContentDrawer.tsx`. It resolves a bare filename to the `public/content/expert-insights/` folder (via the Vite base), passes external URLs through unchanged, and renders a span-based figure with the alt text as a caption. No schema change, no new files, no prerender change.

**Tech Stack:** React 18 + TypeScript (strict), `react-markdown` + `remark-gfm`, Vite 5 (`base: '/FoSW/'`), Tailwind CSS.

## Global Constraints

- Vite base is `/FoSW/` — resolve relative image paths via `import.meta.env.BASE_URL`, never a hardcoded `/FoSW/`.
- Images live in `public/content/expert-insights/`; markdown references them by bare filename: `![caption](file.png)`.
- Alt text = the visible caption AND the `<img alt>` attribute. Empty alt = no caption.
- External images (`^https?://`) are used verbatim.
- Tailwind: only full static class names (no dynamic interpolation).
- Strict TypeScript: no unused imports/vars.
- **The committed diff is ONLY `src/components/ContentDrawer.tsx`.** All test content (image file + markdown line) is temporary and reverted before commit.
- Verify with `npm run build` (tsc + vite + prerender); it must exit 0.
- Avoid invalid DOM nesting: `react-markdown` wraps a lone image in a `<p>`, so the figure must be built from phrasing elements (`<span>`), not `<figure>`/`<figcaption>` (block elements invalid inside `<p>`).

---

### Task 1: Add the `img` renderer to ContentDrawer

**Files:**
- Modify: `src/components/ContentDrawer.tsx` (add an `img` entry to the `<Markdown>` `components` map, right after the existing `p:` renderer)
- Temporary (reverted before commit): `public/content/expert-insights/_imgtest.png`, one line in `public/content/expert-insights/productivity-systems-lens.md`

**Interfaces:**
- Consumes: `import.meta.env.BASE_URL` (already used elsewhere in this file).
- Produces: no exported symbols — a local renderer in the component map.

- [ ] **Step 1: Add the `img` renderer**

In `src/components/ContentDrawer.tsx`, locate the existing `p:` renderer inside the `<Markdown components={{ ... }}>` map:

```tsx
              p: ({ node, ...props }: any) => (
                <p className="mb-8" {...props} />
              ),
```

Insert the following `img:` renderer immediately after it (before `strong:`):

```tsx
              img: ({ node, src, alt, ...props }: any) => {
                const rawSrc = typeof src === "string" ? src : "";
                const resolved = /^https?:\/\//.test(rawSrc)
                  ? rawSrc
                  : `${import.meta.env.BASE_URL}content/expert-insights/${rawSrc.replace(/^\.?\//, "")}`;
                const caption = typeof alt === "string" ? alt.trim() : "";
                return (
                  <span className="block my-10">
                    <img
                      src={resolved}
                      alt={caption}
                      loading="lazy"
                      decoding="async"
                      className="block w-full rounded-lg border border-white/10"
                      {...props}
                    />
                    {caption && (
                      <span className="block mt-3 text-center text-sm font-sans text-gray-400 italic">
                        {caption}
                      </span>
                    )}
                  </span>
                );
              },
```

Rationale: `<span>` elements (with `display:block` via Tailwind's `block`) are valid inside the `<p>` that `react-markdown` wraps around a lone image, avoiding an invalid-DOM-nesting warning. The alt text is applied to both the `<img alt>` (accessibility/SEO) and the visible caption.

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: exit 0 (tsc strict + vite + prerender all succeed). No image is referenced yet, so nothing else changes.

- [ ] **Step 3: Add temporary test artifacts**

Copy an existing image into the content folder and reference it from a real article (both reverted later):

```bash
cp public/logo.png public/content/expert-insights/_imgtest.png
printf '\n![Test caption for image rendering](_imgtest.png)\n' >> public/content/expert-insights/productivity-systems-lens.md
```

- [ ] **Step 4: Build and verify the prerendered output**

Run: `npm run build`
Expected: exit 0.

Then verify the prerendered page contains the resolved image src and the caption:

Run (Git Bash):
```bash
grep -o 'src="/FoSW/content/expert-insights/_imgtest.png"' dist/insights/productivity-systems-lens/index.html
grep -o 'Test caption for image rendering' dist/insights/productivity-systems-lens/index.html
```
Expected: the first prints `src="/FoSW/content/expert-insights/_imgtest.png"` (path resolved through the base); the second prints the caption text (rendered into the page). Both non-empty.

- [ ] **Step 5: Manual dev check (interactive)**

Run: `npm run dev`, open the site, open the "Your Developers Are More Productive…" insight, scroll to the end.
Expected: the test image renders full-width with rounded corners and a subtle border, the caption sits centered and muted beneath it, and the browser console shows **no** invalid-DOM-nesting warning.

If running headless (no browser), skip this step and rely on Steps 2 and 4; note the deferral in the report.

- [ ] **Step 6: Revert the temporary test artifacts**

```bash
rm public/content/expert-insights/_imgtest.png
git checkout -- public/content/expert-insights/productivity-systems-lens.md
```

Confirm only the renderer remains staged/changed:

Run: `git status --short`
Expected: shows only `src/components/ContentDrawer.tsx` as modified (plus pre-existing untracked scratch like `.claude/`, `.superpowers/`). No `_imgtest.png`, no markdown change.

- [ ] **Step 7: Final build and commit**

Run: `npm run build`
Expected: exit 0 (clean tree, only the renderer changed).

```bash
git add src/components/ContentDrawer.tsx
git commit -m "feat: render inline markdown images with captions in expert insights"
```

---

### Task 2: Push to main and verify live

Per the user's direction, this change goes directly to `main` (no PR), which triggers the GitHub Pages deploy.

**Files:** none (deploy + verification only)

- [ ] **Step 1: Push**

```bash
git push origin main
```

- [ ] **Step 2: Confirm the deploy goes green**

Run: `gh run list --limit 3`
Expected: the "Deploy to GitHub Pages" run for this commit succeeds, followed by a successful `pages-build-deployment`. (Wait for the pages build with `gh run watch <id> --exit-status` if needed; `gh api repos/{owner}/{repo}/pages -q '.status'` should read `built`.)

- [ ] **Step 3: Report**

Report the deploy status and note that authors can now add images by dropping `<id>_<n>.png` into `public/content/expert-insights/` and writing `![caption](<id>_<n>.png)` in the article markdown.

---

## Notes for the implementer

- Do NOT add a markdown/rehype dependency (e.g. `rehype-unwrap-images`); the span-based figure intentionally avoids that.
- Do NOT ship `_imgtest.png` or the test markdown line — Step 6 reverts them; Step 7 must show a clean one-file diff.
- The `image` JSON field is unrelated — it remains the social share-card image and is not touched here.
