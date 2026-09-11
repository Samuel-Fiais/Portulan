import type { DocumentCommentRecord } from "./documents.ts";

export function validateDocumentCommentResolveInput(input: {
  comment: Pick<DocumentCommentRecord, "id" | "parentId"> | undefined;
  resolved: boolean;
}): { ok: true } | { ok: false; error: string } {
  if (!input.comment) {
    return { ok: false, error: "Comentário não encontrado." };
  }

  if (input.comment.parentId) {
    return { ok: false, error: "Só o comentário-raiz do fio pode ser resolvido ou reaberto." };
  }

  return { ok: true };
}
