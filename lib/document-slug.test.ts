import assert from "node:assert/strict";
import test from "node:test";
import { createDocumentSlug, isUuidSlug } from "./document-slug.ts";

test("isUuidSlug reconhece UUID válido", () => {
  assert.equal(isUuidSlug("550e8400-e29b-41d4-a716-446655440000"), true);
  assert.equal(isUuidSlug("roadmap-trimestral"), false);
  assert.equal(isUuidSlug("roadmap-2"), false);
});

test("createDocumentSlug usa id existente ou gera UUID", () => {
  const id = "a1b2c3d4-e5f6-4789-a012-3456789abcde";
  assert.equal(createDocumentSlug(id), id);
  const generated = createDocumentSlug();
  assert.equal(isUuidSlug(generated), true);
});
