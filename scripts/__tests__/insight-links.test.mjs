import test from "node:test";
import assert from "node:assert/strict";
import { validateInsightLinks } from "../validate-phenomena.mjs";

const phenomenonIds = new Set(["known-phenomenon", "another-phenomenon"]);

test("a post with no relatedPhenomena is valid — the field is optional", () => {
  assert.deepEqual(validateInsightLinks({ id: "post" }, phenomenonIds), []);
});

test("a post may link to phenomena that exist", () => {
  const post = { id: "post", relatedPhenomena: ["known-phenomenon", "another-phenomenon"] };
  assert.deepEqual(validateInsightLinks(post, phenomenonIds), []);
});

test("a link to a phenomenon that does not exist is an error naming the id", () => {
  const errors = validateInsightLinks(
    { id: "post", relatedPhenomena: ["known-phenomenon", "typo-phenomenon"] },
    phenomenonIds,
  );
  assert.equal(errors.length, 1);
  assert.match(errors[0], /typo-phenomenon/);
});

test("relatedPhenomena must be an array", () => {
  const errors = validateInsightLinks(
    { id: "post", relatedPhenomena: "known-phenomenon" },
    phenomenonIds,
  );
  assert.equal(errors.length, 1);
  assert.match(errors[0], /must be an array/);
});

test("the same phenomenon listed twice is an error", () => {
  const errors = validateInsightLinks(
    { id: "post", relatedPhenomena: ["known-phenomenon", "known-phenomenon"] },
    phenomenonIds,
  );
  assert.equal(errors.length, 1);
  assert.match(errors[0], /more than once/);
});
