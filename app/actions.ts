"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createDocument, deleteDocument, publishDocument, updateDocument } from "@/lib/db";
import { documentInputSchema, documentUpdateSchema } from "@/lib/validation";

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
  return { ok: true as const, document: result.document, release: result.release };
}
