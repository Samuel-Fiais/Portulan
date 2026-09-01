"use server";

import { revalidatePath } from "next/cache";
import { createDocument, deleteDocument, publishDocument, updateDocument } from "@/lib/db";
import { documentInputSchema, documentUpdateSchema } from "@/lib/validation";

export async function createDocumentAction(input: unknown) {
  const parsed = documentInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Revise os campos obrigatórios." };
  const document = createDocument(parsed.data);
  revalidatePath("/");
  return { ok: true as const, document };
}

export async function updateDocumentAction(id: string, input: unknown) {
  const parsed = documentUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Não foi possível validar o documento." };
  const document = updateDocument(id, parsed.data);
  if (!document) return { ok: false as const, error: "Documento não encontrado." };
  revalidatePath("/");
  revalidatePath(`/documents/${id}`);
  revalidatePath(`/documents/${document.slug}`);
  return { ok: true as const, document };
}

export async function deleteDocumentAction(id: string) {
  const deleted = deleteDocument(id);
  if (!deleted) return { ok: false as const, error: "Documento não encontrado." };
  revalidatePath("/");
  return { ok: true as const };
}

export async function publishDocumentAction(id: string, input: unknown) {
  const parsed = documentUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Não foi possível validar o documento." };
  const result = publishDocument(id, parsed.data);
  if (!result) return { ok: false as const, error: "Documento não encontrado." };
  revalidatePath("/");
  revalidatePath(`/documents/${id}`);
  revalidatePath(`/documents/${result.document.slug}`);
  revalidatePath(`/p/${result.release.id}`);
  return { ok: true as const, document: result.document, release: result.release };
}
