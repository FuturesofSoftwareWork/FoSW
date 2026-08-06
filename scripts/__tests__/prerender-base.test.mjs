import test from "node:test";
import assert from "node:assert/strict";
import { detectBase } from "../lib/prerender-base.mjs";

test("reads the production base from a module script tag", () => {
  const html = `<!doctype html><html><head>
    <script type="module" crossorigin src="/FoSW/assets/index-D4tK9.js"></script>
    <link rel="stylesheet" crossorigin href="/FoSW/assets/index-B2xQ1.css">
  </head><body></body></html>`;
  assert.equal(detectBase(html), "/FoSW/");
});

test("reads a nested preview base", () => {
  const html = `<script type="module" crossorigin src="/FoSW/preview/assets/index-D4tK9.js"></script>`;
  assert.equal(detectBase(html), "/FoSW/preview/");
});

test("reads the base from a stylesheet when no module script is present", () => {
  const html = `<link rel="stylesheet" crossorigin href="/FoSW/preview/assets/index-B2xQ1.css">`;
  assert.equal(detectBase(html), "/FoSW/preview/");
});

test("handles a root base", () => {
  assert.equal(detectBase(`<script src="/assets/index-D4tK9.js"></script>`), "/");
});

test("throws rather than guessing when no asset reference exists", () => {
  assert.throws(
    () => detectBase("<!doctype html><html><head></head><body></body></html>"),
    /could not determine the base path/i,
  );
});

test("ignores absolute URLs to other origins", () => {
  const html = `<meta property="og:image" content="https://example.com/assets/x.png">
    <script type="module" crossorigin src="/FoSW/assets/index-D4tK9.js"></script>`;
  assert.equal(detectBase(html), "/FoSW/");
});
