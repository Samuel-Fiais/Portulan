export const BLOB_ROOT = "portulan";

export const BLOB_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/gif",
] as const;

export const BLOB_MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type BlobUploadPurpose = "template-logo" | "report-image";

export function sanitizeBlobFileName(fileName: string) {
  const base = fileName.trim().split(/[\\/]/).pop() ?? "image";
  const normalized = base
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return normalized || "image";
}

export function buildBlobPath(input: {
  purpose: BlobUploadPurpose;
  userId: string;
  documentId?: string;
  templateId?: string;
  fileName: string;
}) {
  const safeName = sanitizeBlobFileName(input.fileName);
  const stamp = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

  if (input.purpose === "template-logo") {
    const templateSegment = input.templateId?.trim() || "draft";
    return `${BLOB_ROOT}/users/${input.userId}/templates/${templateSegment}/logo/${stamp}-${safeName}`;
  }

  if (!input.documentId?.trim()) {
    throw new Error("documentId é obrigatório para imagens de relatório.");
  }

  return `${BLOB_ROOT}/users/${input.userId}/documents/${input.documentId}/images/${stamp}-${safeName}`;
}

export function validateBlobImage(file: Pick<File, "type" | "size" | "name">) {
  if (!BLOB_IMAGE_TYPES.includes(file.type as (typeof BLOB_IMAGE_TYPES)[number])) {
    return { ok: false as const, error: "Envie PNG, JPG, WEBP, SVG ou GIF." };
  }
  if (file.size > BLOB_MAX_IMAGE_BYTES) {
    return { ok: false as const, error: "A imagem deve ter no máximo 5 MB." };
  }
  if (!file.name.trim()) {
    return { ok: false as const, error: "Arquivo inválido." };
  }
  return { ok: true as const };
}

export function isPortulanBlobUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.endsWith(".public.blob.vercel-storage.com")
      && parsed.pathname.startsWith(`/${BLOB_ROOT}/`);
  } catch {
    return false;
  }
}
