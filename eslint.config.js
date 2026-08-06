import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

/**
 * Flat config (ESLint 9+). Two environments live in this repo:
 *   - src/**      browser React + TypeScript
 *   - scripts/**  Node ESM pipeline scripts (plain .mjs, no TypeScript)
 * They need different globals, so they get separate blocks.
 */
export default tseslint.config(
  {
    // Build output, deps, and generated pipeline artifacts.
    // `.claude/**` holds git worktrees — full checkouts of this repo. Without
    // it, ESLint lints every worktree's src/ as well as this one's and fails
    // with "multiple candidate TSConfigRootDirs", so `npm run lint` breaks
    // locally for anyone with a worktree open. CI never saw it: a fresh
    // checkout has no worktrees.
    ignores: ["dist/**", "node_modules/**", "data/**", "public/**", ".claude/**"],
  },

  // --- Browser React + TypeScript ---
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

      // `({ node, ...props })` in the react-markdown component overrides exists
      // precisely to strip `node` before spreading the rest onto a DOM element.
      // The binding is unused on purpose; that is the point of the pattern.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { ignoreRestSiblings: true, argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // OFF, deliberately, and tracked as follow-up work.
      // This is a react-hooks v7 rule aimed at React Compiler readiness. It flags
      // three pre-existing effects that reset state on prop change or read a media
      // query on mount — all working, idiomatic React 18. Rewriting them is a
      // behavioural change that needs its own PR and its own visual verification;
      // doing it inside the PR that merely installs the linter would smuggle UI
      // changes in under a tooling banner.
      "react-hooks/set-state-in-effect": "off",
    },
  },

  // --- Node ESM scripts ---
  {
    files: ["scripts/**/*.mjs", "*.config.js", "*.config.mjs"],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.node,
    },
  },
);
