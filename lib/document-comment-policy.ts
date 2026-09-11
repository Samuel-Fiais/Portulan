import { resolveThreadRootId } from "./comment-threads.ts";
import type { DocumentCommentRecord } from "./documents.ts";

export type DocumentCommentInput = {
  body: string;
  sectionAnchor?: string | null;
  quotedText?: string | null;
  parentId?: string | null;
};

export function prepareDocumentCommentSubmission(
  input: DocumentCommentInput,
  existingComments: DocumentCommentRecord[],
  validAnchors: Iterable<string>,
):
  | {
      ok: true;
      parentId: string | null;
      body: string;
      sectionAnchor: string | null;
      quotedText: string | null;
    }
  | { ok: false; error: string } {
  let parentId: string | null = null;
  if (input.parentId?.trim()) {
    const parent = existingComments.find((comment) => comment.id === input.parentId);
    if (!parent) {
      return { ok: false, error: "Comentário original não encontrado." };
    }
    parentId = resolveThreadRootId(parent);
  }

  const validated = validateDocumentCommentInput({
    body: input.body,
    sectionAnchor: input.sectionAnchor,
    quotedText: input.quotedText,
    parentId,
    validAnchors,
  });
  if (!validated.ok) return validated;

  return {
    ok: true,
    parentId,
    body: input.body.trim(),
    sectionAnchor: parentId ? null : input.sectionAnchor?.trim() || null,
    quotedText: parentId ? null : input.quotedText?.trim() || null,
  };
}

export function validateDocumentCommentInput(input: {
  body: string;
  sectionAnchor?: string | null;
  quotedText?: string | null;
  parentId?: string | null;
  validAnchors: Iterable<string>;
}): { ok: true } | { ok: false; error: string } {
  const body = input.body.trim();
  if (!body) {
    return { ok: false, error: "Escreva um comentário antes de enviar." };
  }
  if (body.length > 2_000) {
    return { ok: false, error: "O comentário pode ter no máximo 2.000 caracteres." };
  }

  const quotedText = input.quotedText?.trim() ?? "";
  if (quotedText.length > 280) {
    return { ok: false, error: "O trecho citado pode ter no máximo 280 caracteres." };
  }

  if (input.parentId?.trim()) {
    return { ok: true };
  }

  const anchor = input.sectionAnchor?.trim();
  if (!anchor) return { ok: true };

  const validAnchors = new Set(input.validAnchors);
  if (!validAnchors.has(anchor)) {
    return { ok: false, error: "Trecho inválido. Comente de novo na prévia atual." };
  }

  return { ok: true };
}
