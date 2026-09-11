import assert from "node:assert/strict";
import { test } from "node:test";
import { prepareDocumentCommentSubmission, validateDocumentCommentInput } from "./document-comment-policy.ts";
import type { DocumentCommentRecord } from "./documents.ts";

function comment(partial: Partial<DocumentCommentRecord> & Pick<DocumentCommentRecord, "id">): DocumentCommentRecord {
  return {
    documentId: "doc-1",
    userId: "user-1",
    body: "ok",
    sectionAnchor: null,
    quotedText: null,
    parentId: null,
    createdAt: "2026-09-11T12:00:00.000Z",
    userLogin: "ana",
    userName: "Ana",
    userAvatarUrl: null,
    ...partial,
  };
}

const validAnchors = ["visao-geral", "block-0-0", "cover-title"];

test("validateDocumentCommentInput rejeita corpo vazio", () => {
  const result = validateDocumentCommentInput({ body: "   ", validAnchors });
  assert.equal(result.ok, false);
});

test("validateDocumentCommentInput aceita comentário sem âncora", () => {
  const result = validateDocumentCommentInput({
    body: "Precisamos revisar o escopo.",
    validAnchors,
  });
  assert.equal(result.ok, true);
});

test("validateDocumentCommentInput aceita bloco da prévia e rejeita âncora inexistente", () => {
  const valid = validateDocumentCommentInput({
    body: "Comentário no bloco",
    sectionAnchor: "block-0-0",
    quotedText: "Parágrafo de contexto.",
    validAnchors,
  });
  assert.equal(valid.ok, true);

  const invalid = validateDocumentCommentInput({
    body: "Comentário no bloco",
    sectionAnchor: "secao-inexistente",
    validAnchors,
  });
  assert.equal(invalid.ok, false);
});

test("validateDocumentCommentInput rejeita trecho citado longo demais", () => {
  const result = validateDocumentCommentInput({
    body: "Ok",
    quotedText: "a".repeat(281),
    validAnchors,
  });
  assert.equal(result.ok, false);
});

test("validateDocumentCommentInput aceita resposta sem validar âncora", () => {
  const result = validateDocumentCommentInput({
    body: "Concordo.",
    parentId: "11111111-1111-4111-8111-111111111111",
    sectionAnchor: "secao-inexistente",
    validAnchors,
  });
  assert.equal(result.ok, true);
});

test("prepareDocumentCommentSubmission aceita comentário-raiz com âncora válida", () => {
  const result = prepareDocumentCommentSubmission(
    {
      body: "Revisar escopo.",
      sectionAnchor: "block-0-0",
      quotedText: "Trecho citado.",
    },
    [],
    validAnchors,
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.parentId, null);
  assert.equal(result.sectionAnchor, "block-0-0");
});

test("prepareDocumentCommentSubmission resolve resposta para o raiz do fio", () => {
  const root = comment({ id: "root" });
  const reply = comment({ id: "reply", parentId: "root", body: "concordo" });

  const result = prepareDocumentCommentSubmission(
    { body: "Mais contexto.", parentId: "reply" },
    [root, reply],
    validAnchors,
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.parentId, "root");
  assert.equal(result.sectionAnchor, null);
});

test("prepareDocumentCommentSubmission rejeita parent inexistente", () => {
  const result = prepareDocumentCommentSubmission(
    { body: "Resposta.", parentId: "11111111-1111-4111-8111-111111111111" },
    [],
    validAnchors,
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.error, /não encontrado/i);
});
