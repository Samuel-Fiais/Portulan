import { commentTargetIds } from "@/lib/comment-targets";
import { groupCommentThreads } from "@/lib/comment-threads";
import { addDocumentComment, deleteDocumentComment, listDocumentComments } from "@/lib/db/document-comments";
import { canReadDocument, getDocument, type DocumentAccessContext } from "@/lib/db/documents";
import { prepareDocumentCommentSubmission, type DocumentCommentInput } from "@/lib/document-comment-policy";

export type { DocumentCommentInput };

export async function listDocumentCommentThreadsForAccess(documentId: string, ctx: DocumentAccessContext) {
  const document = await getDocument(documentId, ctx);
  if (!document || !(await canReadDocument(document, ctx))) {
    return { ok: false as const, error: "Documento não encontrado ou sem permissão." };
  }

  const comments = await listDocumentComments(document.id);
  return {
    ok: true as const,
    documentId: document.id,
    threads: groupCommentThreads(comments),
  };
}

export async function createDocumentCommentForAccess(
  documentId: string,
  userId: string,
  ctx: DocumentAccessContext,
  input: DocumentCommentInput,
) {
  const document = await getDocument(documentId, ctx);
  if (!document || !(await canReadDocument(document, ctx))) {
    return { ok: false as const, error: "Documento não encontrado ou sem permissão." };
  }

  const existing = await listDocumentComments(document.id);
  const prepared = prepareDocumentCommentSubmission(input, existing, commentTargetIds(document.content));
  if (!prepared.ok) return prepared;

  const comment = await addDocumentComment(document.id, userId, {
    body: prepared.body,
    sectionAnchor: prepared.sectionAnchor,
    quotedText: prepared.quotedText,
    parentId: prepared.parentId,
  });
  if (!comment) return { ok: false as const, error: "Não foi possível salvar o comentário." };

  return { ok: true as const, documentId: document.id, comment };
}

export async function deleteDocumentCommentForAccess(
  documentId: string,
  commentId: string,
  userId: string,
  ctx: DocumentAccessContext,
) {
  const document = await getDocument(documentId, ctx);
  if (!document || !(await canReadDocument(document, ctx))) {
    return { ok: false as const, error: "Documento não encontrado ou sem permissão." };
  }

  const deleted = await deleteDocumentComment(commentId, document.id, userId);
  if (!deleted) return { ok: false as const, error: "Comentário não encontrado ou sem permissão." };

  return { ok: true as const, documentId: document.id };
}
