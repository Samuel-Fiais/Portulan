"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  addDocumentShare,
  canReadDocument,
  createDocument,
  createMcpToken,
  createTemplate,
  deleteDocument,
  setDocumentCommentResolved,
  deleteTemplate,
  duplicateTemplate,
  getDocument,
  isDocumentOwner,
  listDocumentCollaborators,
  listDocumentComments,
  listDocumentShares,
  listLinkableDocuments,
  listMcpTokens,
  publishDocument,
  restoreDocumentRelease,
  revokeDocumentShare,
  revokeMcpToken,
  setDocumentDisabled,
  setDocumentPublic,
  setDocumentReleaseDisabled,
  updateDocument,
  updateDocumentLivingContent,
  updateDocumentShareRole,
  updateTemplate,
} from "@/lib/db";
import { documentAccessContext } from "@/lib/access-context";
import {
  createDocumentCommentForAccess,
  deleteDocumentCommentForAccess,
  listDocumentCommentThreadsForAccess,
} from "@/lib/document-comment-ops";
import { validateDocumentCommentResolveInput } from "@/lib/document-comment-resolve-policy";
import {
  disconnectSignedInGitHub,
  registerPasswordAccount,
  removeSignedInPassword,
  setSignedInPassword,
  updateSignedInProfile,
} from "@/lib/account-ops";
import { setGitHubLinkCookie } from "@/lib/github-link-cookie";
import { getUserById, toPublicAccount } from "@/lib/users";
import {
  documentCommentInputSchema,
  documentCommentResolveInputSchema,
  documentInputSchema,
  documentShareInputSchema,
  documentShareUpdateSchema,
  documentUpdateSchema,
  mcpTokenInputSchema,
  templateInputSchema,
} from "@/lib/validation";

async function accessContext(userId?: string) {
  return documentAccessContext(userId);
}

export async function createDocumentAction(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para criar documentos." };
  }

  const parsed = documentInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Revise os campos obrigatórios." };

  const document = await createDocument(
    {
      ...parsed.data,
      author: parsed.data.author || session.user.login || session.user.name || "",
    },
    { userId: session.user.id },
  );
  revalidatePath("/");
  return { ok: true as const, document };
}

export async function updateDocumentAction(id: string, input: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para editar documentos." };
  }

  const parsed = documentUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Não foi possível validar o documento." };

  const document = await updateDocument(id, parsed.data, await accessContext(session.user.id));
  if (!document) return { ok: false as const, error: "Documento não encontrado ou sem permissão." };
  revalidatePath("/");
  revalidatePath(`/documents/${id}`);
  revalidatePath(`/documents/${document.slug}`);
  return { ok: true as const, document };
}

export async function updateDocumentContentAction(
  documentId: string,
  content: string,
  releaseId?: string | null,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para editar documentos." };
  }

  const parsed = documentUpdateSchema.safeParse({ content });
  if (!parsed.success) return { ok: false as const, error: "Conteúdo inválido." };

  const ctx = await accessContext(session.user.id);
  const document = await updateDocumentLivingContent(documentId, parsed.data.content!, ctx, releaseId);
  if (!document) return { ok: false as const, error: "Documento não encontrado ou sem permissão." };
  revalidatePath("/");
  revalidatePath(`/documents/${documentId}`);
  revalidatePath(`/documents/${document.slug}`);
  revalidatePath(`/documents/${document.id}/preview`);
  revalidatePath(`/d/${document.slug}`);
  if (releaseId) revalidatePath(`/p/${releaseId}`);
  return { ok: true as const, document };
}

export async function deleteDocumentAction(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para excluir documentos." };
  }

  const deleted = await deleteDocument(id, await accessContext(session.user.id));
  if (!deleted) return { ok: false as const, error: "Documento não encontrado ou sem permissão." };
  revalidatePath("/");
  return { ok: true as const };
}

export async function publishDocumentAction(id: string, input: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para publicar documentos." };
  }

  const parsed = documentUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Não foi possível validar o documento." };

  const result = await publishDocument(id, parsed.data, await accessContext(session.user.id));
  if (!result) return { ok: false as const, error: "Documento não encontrado ou sem permissão." };
  if ("noChanges" in result) {
    return { ok: false as const, error: "Não há alterações em relação à última versão publicada." };
  }
  revalidatePath("/");
  revalidatePath(`/documents/${id}`);
  revalidatePath(`/documents/${result.document.slug}`);
  revalidatePath(`/p/${result.release.id}`);
  revalidatePath(`/d/${result.document.slug}`);
  return { ok: true as const, document: result.document, release: result.release };
}

export async function setDocumentDisabledAction(id: string, disabled: boolean) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para alterar o acesso público." };
  }

  const document = await setDocumentDisabled(id, disabled, await accessContext(session.user.id));
  if (!document) return { ok: false as const, error: "Documento não encontrado ou sem permissão." };

  revalidatePath("/");
  revalidatePath(`/documents/${id}`);
  revalidatePath(`/documents/${document.slug}`);
  revalidatePath(`/d/${document.slug}`);
  return { ok: true as const, document };
}

export async function setDocumentPublicAction(id: string, isPublic: boolean) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para alterar o acesso público." };
  }

  const document = await setDocumentPublic(id, isPublic, await accessContext(session.user.id));
  if (!document) return { ok: false as const, error: "Documento não encontrado ou sem permissão." };

  revalidatePath("/");
  revalidatePath(`/documents/${id}`);
  revalidatePath(`/documents/${document.slug}`);
  revalidatePath(`/d/${document.slug}`);
  return { ok: true as const, document };
}

export async function restoreDocumentReleaseAction(documentId: string, releaseId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para restaurar versões." };
  }

  const document = await restoreDocumentRelease(documentId, releaseId, await accessContext(session.user.id));
  if (!document) return { ok: false as const, error: "Versão não encontrada ou sem permissão." };

  revalidatePath("/");
  revalidatePath(`/documents/${documentId}`);
  revalidatePath(`/documents/${document.slug}`);
  revalidatePath(`/documents/${document.id}/preview`);
  revalidatePath(`/d/${document.slug}`);
  return { ok: true as const, document };
}

export async function setDocumentReleaseDisabledAction(documentId: string, releaseId: string, disabled: boolean) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para alterar o acesso público." };
  }

  const document = await getDocument(documentId, await accessContext(session.user.id));
  if (!document) return { ok: false as const, error: "Documento não encontrado ou sem permissão." };

  const release = await setDocumentReleaseDisabled(documentId, releaseId, disabled, await accessContext(session.user.id));
  if (!release) return { ok: false as const, error: "Versão não encontrada ou sem permissão." };

  revalidatePath(`/documents/${documentId}`);
  revalidatePath(`/documents/${document.slug}`);
  revalidatePath(`/p/${releaseId}`);
  revalidatePath(`/d/${document.slug}`);
  return { ok: true as const, release };
}

export async function listLinkableDocumentsAction(excludeDocumentId?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para listar documentos." };
  }

  const documents = await listLinkableDocuments(await accessContext(session.user.id), { excludeDocumentId });
  return { ok: true as const, documents };
}

export async function createTemplateAction(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para criar templates." };
  }

  const parsed = templateInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Revise nome e cores do template." };

  const template = await createTemplate(session.user.id, {
    ...parsed.data,
    logoUrl: parsed.data.logoUrl ?? null,
  });
  revalidatePath("/");
  return { ok: true as const, template };
}

export async function updateTemplateAction(id: string, input: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para editar templates." };
  }

  const parsed = templateInputSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Não foi possível validar o template." };

  const template = await updateTemplate(session.user.id, id, parsed.data);
  if (!template) return { ok: false as const, error: "Template não encontrado ou sem permissão." };
  revalidatePath("/");
  return { ok: true as const, template };
}

export async function deleteTemplateAction(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para excluir templates." };
  }

  const deleted = await deleteTemplate(session.user.id, id);
  if (!deleted) return { ok: false as const, error: "Template não encontrado ou sem permissão." };
  revalidatePath("/");
  return { ok: true as const };
}

export async function duplicateTemplateAction(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para duplicar templates." };
  }

  const template = await duplicateTemplate(session.user.id, id);
  if (!template) return { ok: false as const, error: "Template não encontrado ou sem permissão." };
  revalidatePath("/");
  return { ok: true as const, template };
}

export async function createMcpTokenAction(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para gerar tokens MCP." };
  }

  const parsed = mcpTokenInputSchema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false as const, error: "Dados do token inválidos." };

  const result = await createMcpToken(session.user.id, parsed.data.name, parsed.data.expiration);
  revalidatePath("/");
  return { ok: true as const, token: result.token, record: result.record };
}

export async function listMcpTokensAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para listar tokens MCP." };
  }

  return { ok: true as const, tokens: await listMcpTokens(session.user.id) };
}

export async function revokeMcpTokenAction(tokenId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para revogar tokens MCP." };
  }

  const revoked = await revokeMcpToken(session.user.id, tokenId);
  if (!revoked) return { ok: false as const, error: "Token não encontrado." };
  revalidatePath("/");
  return { ok: true as const };
}

export async function listDocumentSharesAction(documentId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para gerenciar compartilhamentos." };
  }

  const document = await getDocument(documentId, await accessContext(session.user.id));
  if (!document) return { ok: false as const, error: "Documento não encontrado ou sem permissão." };
  if (!isDocumentOwner(document, { userId: session.user.id })) {
    return { ok: false as const, error: "Apenas o responsável pode gerenciar compartilhamentos." };
  }

  const [shares, collaborators] = await Promise.all([
    listDocumentShares(documentId),
    listDocumentCollaborators(documentId, document.userId),
  ]);
  return { ok: true as const, shares, collaborators };
}

export async function addDocumentShareAction(documentId: string, input: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para compartilhar documentos." };
  }

  const parsed = documentShareInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Informe um e-mail válido." };

  const document = await getDocument(documentId, await accessContext(session.user.id));
  if (!document) return { ok: false as const, error: "Documento não encontrado ou sem permissão." };
  if (!isDocumentOwner(document, { userId: session.user.id })) {
    return { ok: false as const, error: "Apenas o responsável pode compartilhar este documento." };
  }

  const result = await addDocumentShare(documentId, parsed.data.email, parsed.data.role, session.user.id);
  if (!result.ok) return { ok: false as const, error: result.error };

  revalidatePath(`/documents/${documentId}`);
  revalidatePath(`/documents/${document.slug}`);
  return { ok: true as const, share: result.share };
}

export async function updateDocumentShareAction(documentId: string, shareId: string, input: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para alterar compartilhamentos." };
  }

  const parsed = documentShareUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Papel inválido." };

  const document = await getDocument(documentId, await accessContext(session.user.id));
  if (!document) return { ok: false as const, error: "Documento não encontrado ou sem permissão." };
  if (!isDocumentOwner(document, { userId: session.user.id })) {
    return { ok: false as const, error: "Apenas o responsável pode alterar compartilhamentos." };
  }

  const share = await updateDocumentShareRole(shareId, documentId, parsed.data.role);
  if (!share.ok) return { ok: false as const, error: share.error };

  revalidatePath(`/documents/${documentId}`);
  revalidatePath(`/documents/${document.slug}`);
  return { ok: true as const, share: share.share };
}

export async function revokeDocumentShareAction(documentId: string, shareId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para revogar compartilhamentos." };
  }

  const document = await getDocument(documentId, await accessContext(session.user.id));
  if (!document) return { ok: false as const, error: "Documento não encontrado ou sem permissão." };
  if (!isDocumentOwner(document, { userId: session.user.id })) {
    return { ok: false as const, error: "Apenas o responsável pode revogar compartilhamentos." };
  }

  const revoked = await revokeDocumentShare(shareId, documentId);
  if (!revoked) return { ok: false as const, error: "Compartilhamento não encontrado." };

  revalidatePath(`/documents/${documentId}`);
  revalidatePath(`/documents/${document.slug}`);
  return { ok: true as const };
}

export async function listDocumentCommentsAction(documentId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para ver comentários de revisão." };
  }

  const ctx = await accessContext(session.user.id);
  const result = await listDocumentCommentThreadsForAccess(documentId, ctx);
  if (!result.ok) return result;

  return {
    ok: true as const,
    comments: result.threads.flatMap((thread) => [thread.root, ...thread.replies]),
  };
}

export async function addDocumentCommentAction(documentId: string, input: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para comentar." };
  }

  const parsed = documentCommentInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Comentário inválido." };

  const ctx = await accessContext(session.user.id);
  const result = await createDocumentCommentForAccess(documentId, session.user.id, ctx, parsed.data);
  if (!result.ok) return result;

  revalidatePath(`/documents/${documentId}`);
  return { ok: true as const, comment: result.comment };
}

export async function deleteDocumentCommentAction(documentId: string, commentId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para remover comentários." };
  }

  const ctx = await accessContext(session.user.id);
  const result = await deleteDocumentCommentForAccess(documentId, commentId, session.user.id, ctx);
  if (!result.ok) return result;

  revalidatePath(`/documents/${documentId}`);
  return { ok: true as const };
}

export async function setDocumentCommentResolvedAction(
  documentId: string,
  commentId: string,
  input: unknown,
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para resolver comentários." };
  }

  const parsed = documentCommentResolveInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Estado inválido." };

  const ctx = await accessContext(session.user.id);
  const document = await getDocument(documentId, ctx);
  if (!document || !(await canReadDocument(document, ctx))) {
    return { ok: false as const, error: "Documento não encontrado ou sem permissão." };
  }

  const existing = await listDocumentComments(documentId);
  const comment = existing.find((item) => item.id === commentId);
  const validated = validateDocumentCommentResolveInput({ comment, resolved: parsed.data.resolved });
  if (!validated.ok) return { ok: false as const, error: validated.error };

  const updated = await setDocumentCommentResolved(commentId, documentId, parsed.data.resolved);
  if (!updated) return { ok: false as const, error: "Não foi possível atualizar o fio." };

  revalidatePath(`/documents/${documentId}`);
  return { ok: true as const, comment: updated };
}

export async function getAccountAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para ver a conta." };
  }
  const user = await getUserById(session.user.id);
  if (!user) return { ok: false as const, error: "Conta não encontrada." };
  return { ok: true as const, user: toPublicAccount(user) };
}

export async function registerAccountAction(input: unknown) {
  return registerPasswordAccount(input);
}

export async function updateAccountProfileAction(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para editar a conta." };
  }
  const result = await updateSignedInProfile(session.user.id, input);
  if (result.ok) revalidatePath("/");
  return result;
}

export async function setAccountPasswordAction(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para alterar a senha." };
  }
  const result = await setSignedInPassword(session.user.id, input);
  if (result.ok) revalidatePath("/");
  return result;
}

export async function removeAccountPasswordAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para alterar a senha." };
  }
  const result = await removeSignedInPassword(session.user.id);
  if (result.ok) revalidatePath("/");
  return result;
}

export async function disconnectGitHubAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para alterar a conta." };
  }
  const result = await disconnectSignedInGitHub(session.user.id);
  if (result.ok) revalidatePath("/");
  return result;
}

export async function startGitHubLinkAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para conectar o GitHub." };
  }
  await setGitHubLinkCookie(session.user.id);
  return { ok: true as const };
}
