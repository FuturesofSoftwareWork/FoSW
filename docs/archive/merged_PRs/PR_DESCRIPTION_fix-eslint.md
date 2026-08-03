# Make `npm run lint` actually work

## Why

`package.json` has defined a `lint` script since the project started, and
`CLAUDE.md` documents it as a project command with "zero warnings allowed". But
ESLint was never installed: it was not a declared dependency, not present in
`node_modules`, and had no config file. The command failed immediately for
anyone who ran it, so the documented standard was unenforceable — this surfaced
while implementing the signal-types feature, where lint had to be dropped from
every task's verification steps.

## What changed

- Installed ESLint 10 with flat config, plus `typescript-eslint`,
  `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` and `globals`.
  All are devDependencies; nothing ships to the browser.
- Added `eslint.config.js` covering the repo's two environments separately:
  `src/**` (browser React + TypeScript) and `scripts/**/*.mjs` (Node ESM).
  `dist/`, `node_modules/`, `data/` and `public/` are ignored.
- Updated the `lint` script: `--ext ts,tsx` was removed in flat config, and file
  selection now comes from the config itself.

`npm run lint` exits 0 with zero warnings.

## Fixing the 35 findings

The first run reported 35 errors. They were **not** suppressed wholesale:

**18 × `no-explicit-any` — fixed properly, rule kept on.** All were in the
react-markdown component overrides, written as `({ node, ...props }: any)`.
`react-markdown` exports a `Components` type, so the object literal passed to
`components={{…}}` is contextually typed: deleting the annotations gives every
override real prop types. The six remaining `as any` casts became precise:
`props.id` / `props.className` exist on the typed props; `data-*` attributes use
`Record<string, unknown>`; and the footnote child lookup uses
`isValidElement<{ href?: string }>(c)` instead of casting. `tsc --noEmit` is
clean and `no-explicit-any` remains an error, so new `any` cannot creep in.

**12 × `no-unused-vars` — fixed by config.** `({ node, ...props })` destructures
`node` specifically to strip it before spreading the rest onto a DOM element.
The binding is unused on purpose, which is exactly what `ignoreRestSiblings`
describes. Also set `argsIgnorePattern`/`varsIgnorePattern` to `^_`.

**2 × `preserve-caught-error` — fixed properly.** `collect-candidates.mjs`
rethrew wrapped errors without preserving the original; both now pass
`{ cause: err }`.

**3 × `react-hooks/set-state-in-effect` — rule turned off, documented, with a
follow-up.** This is a react-hooks v7 rule aimed at React Compiler readiness. It
flags three pre-existing effects (two reset state on prop change, one reads a
media query on mount) that are working, idiomatic React 18. Rewriting them is a
behavioural change that needs its own visual verification; doing it inside the
PR that merely installs the linter would smuggle UI changes in under a tooling
banner. The `off` in `eslint.config.js` carries that reasoning inline.

## Verification

- `npm run lint` → exit 0, zero warnings
- `npx tsc --noEmit` → clean
- `npm run build` → PASS
- `npm run signals:validate` → `OK — 89 signals valid`

The `any` removal touched the markdown renderer, so it was checked in a browser
against the footnote-heavy article ("Faster coding, thinner understanding?").
Note that `as any` is compile-time only — the single runtime change was the
`isValidElement` swap, which drives footnote hover tooltips. Measured before and
after by restoring the original file:

| | baseline | after |
|---|---|---|
| `<sup>` elements | 12 | 12 |
| with tooltip | 8 | 8 |
| backrefs | 11 | 11 |
| article text length | 14315 | 14315 |

Identical, and no console errors. (8 of 12 is pre-existing, not introduced here.)
