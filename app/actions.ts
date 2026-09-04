"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  addDocumentShare,
  createDocument,
  createMcpToken,
  createTemplate,
  deleteDocument,
  deleteTemplate,
  getDocument,
  isDocumentOwner,
  listDocumentCollaborators,
  listDocumentShares,
  listLinkableDocuments,
  listMcpTokens,
  publishDocument,
  revokeDocumentShare,
  revokeMcpToken,
  setDocumentDisabled,
  setDocumentReleaseDisabled,
  updateDocument,
  updateDocumentShareRole,
  updateTemplate,
} from "@/lib/db";
import { documentAccessContext } from "@/lib/access-context";
import {
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
    return { ok: false as const, error: "Faça login com GitHub para criar documentos." };
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

export async function updateDocumentContentAction(documentId: string, content: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para editar documentos." };
  }

  const parsed = documentUpdateSchema.safeParse({ content });
  if (!parsed.success) return { ok: false as const, error: "Conteúdo inválido." };

  const document = await updateDocument(documentId, parsed.data, await accessContext(session.user.id));
  if (!document) return { ok: false as const, error: "Documento não encontrado ou sem permissão." };
  revalidatePath("/");
  revalidatePath(`/documents/${documentId}`);
  revalidatePath(`/documents/${document.slug}`);
  revalidatePath(`/documents/${document.id}/preview`);
  revalidatePath(`/d/${document.slug}`);
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
