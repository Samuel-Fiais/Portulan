import assert from "node:assert/strict";
import { test } from "node:test";
import { validateDocumentCommentResolveInput } from "./document-comment-resolve-policy.ts";

test("validateDocumentCommentResolveInput rejeita comentário inexistente", () => {
  const result = validateDocumentCommentResolveInput({ comment: undefined, resolved: true });
  assert.equal(result.ok, false);
});

test("validateDocumentCommentResolveInput rejeita resposta", () => {
  const result = validateDocumentCommentResolveInput({
    comment: { id: "reply", parentId: "root" },
    resolved: true,
  });
  assert.equal(result.ok, false);
});

test("validateDocumentCommentResolveInput aceita raiz para resolver e reabrir", () => {
  const resolve = validateDocumentCommentResolveInput({
    comment: { id: "root", parentId: null },
    resolved: true,
  });
  assert.equal(resolve.ok, true);

  const reopen = validateDocumentCommentResolveInput({
    comment: { id: "root", parentId: null },
    resolved: false,
  });
  assert.equal(reopen.ok, true);
});
