import test from "node:test";
import assert from "node:assert/strict";
import { readIndex, readItems, indexById } from "../lib/content.mjs";

const SIGNALS = "public/content/ai-signals";

test("readIndex returns the parsed index", () => {
  const index = readIndex(SIGNALS);
  assert.ok(Array.isArray(index.items), "index.items should be an array");
  assert.ok(index.items.length > 0, "index should not be empty");
});

test("readIndex throws a one-line message for a missing directory", () => {
  assert.throws(() => readIndex("public/content/does-not-exist"), /could not read/);
});

test("readItems loads every published signal without errors", () => {
  const index = readIndex(SIGNALS);
  const published = { items: index.items.filter((e) => e.status === "published") };
  const { items, errors } = readItems(SIGNALS, published);
  assert.deepEqual(errors, []);
  assert.equal(items.length, published.items.length);
  assert.ok(items[0].data.id, "each loaded item should carry its id");
});

test("indexById maps ids to data", () => {
  const index = readIndex(SIGNALS);
  const { items } = readItems(SIGNALS, index);
  const byId = indexById(items);
  const first = items[0].data;
  assert.equal(byId.get(first.id), first);
});
