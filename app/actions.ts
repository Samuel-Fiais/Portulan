"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  createDocument,
  createMcpToken,
  createTemplate,
  deleteDocument,
  deleteTemplate,
  listLinkableDocuments,
  listMcpTokens,
  publishDocument,
  revokeMcpToken,
  updateDocument,
  updateTemplate,
} from "@/lib/db";
import { documentInputSchema, documentUpdateSchema, mcpTokenInputSchema, templateInputSchema } from "@/lib/validation";

function accessContext(userId?: string) {
  return { userId: userId ?? null };
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

  const document = await updateDocument(id, parsed.data, accessContext(session.user.id));
  if (!document) return { ok: false as const, error: "Documento não encontrado ou sem permissão." };
  revalidatePath("/");
  revalidatePath(`/documents/${id}`);
  revalidatePath(`/documents/${document.slug}`);
  return { ok: true as const, document };
}

export async function deleteDocumentAction(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para excluir documentos." };
  }

  const deleted = await deleteDocument(id, accessContext(session.user.id));
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

  const result = await publishDocument(id, parsed.data, accessContext(session.user.id));
  if (!result) return { ok: false as const, error: "Documento não encontrado ou sem permissão." };
  revalidatePath("/");
  revalidatePath(`/documents/${id}`);
  revalidatePath(`/documents/${result.document.slug}`);
  revalidatePath(`/p/${result.release.id}`);
  revalidatePath(`/d/${result.document.slug}`);
  return { ok: true as const, document: result.document, release: result.release };
}

export async function listLinkableDocumentsAction(excludeDocumentId?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para listar documentos." };
  }

  const documents = await listLinkableDocuments(accessContext(session.user.id), { excludeDocumentId });
  return { ok: true as const, documents };
}

export async function createTemplateAction(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Faça login para criar templates." };
  }

  const parsed = templateInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Revise nome e cores do template." };

  const template = await createTemplate(session.user.id, parsed.data);
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
