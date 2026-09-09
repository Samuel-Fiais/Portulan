import assert from "node:assert/strict";
import { test } from "node:test";
import { validateDocumentCommentInput } from "./document-comment-policy.ts";

const validAnchors = ["visao-geral", "proximos-passos"];

test("validateDocumentCommentInput rejeita corpo vazio", () => {
  const result = validateDocumentCommentInput({ body: "   ", validSectionAnchors: validAnchors });
  assert.equal(result.ok, false);
});

test("validateDocumentCommentInput aceita comentário sem seção", () => {
  const result = validateDocumentCommentInput({
    body: "Precisamos revisar o escopo.",
    validSectionAnchors: validAnchors,
  });
  assert.equal(result.ok, true);
});

test("validateDocumentCommentInput valida âncora de seção", () => {
  const valid = validateDocumentCommentInput({
    body: "Comentário na seção",
    sectionAnchor: "visao-geral",
    validSectionAnchors: validAnchors,
  });
  assert.equal(valid.ok, true);

  const invalid = validateDocumentCommentInput({
    body: "Comentário na seção",
    sectionAnchor: "secao-inexistente",
    validSectionAnchors: validAnchors,
  });
  assert.equal(invalid.ok, false);
});
