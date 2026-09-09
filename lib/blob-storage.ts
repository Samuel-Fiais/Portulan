export const BLOB_ROOT = "portulan";

export const BLOB_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/gif",
] as const;

export const BLOB_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const BLOB_MAX_FILE_BYTES = 5 * 1024 * 1024;

export type BlobUploadPurpose = "template-logo" | "report-image" | "report-file";

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
    throw new Error("documentId é obrigatório para arquivos de relatório.");
  }

  const folder = input.purpose === "report-file" ? "files" : "images";
  return `${BLOB_ROOT}/users/${input.userId}/documents/${input.documentId}/${folder}/${stamp}-${safeName}`;
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

export function validateBlobFile(file: Pick<File, "size" | "name">) {
  if (file.size > BLOB_MAX_FILE_BYTES) {
    return { ok: false as const, error: "O arquivo deve ter no máximo 5 MB." };
  }
  if (!file.name.trim()) {
    return { ok: false as const, error: "Arquivo inválido." };
  }
  return { ok: true as const };
}

export function fileExtensionLabel(fileName: string) {
  const base = fileName.trim().split(/[\\/]/).pop() ?? fileName;
  const match = base.match(/\.([^.]+)$/);
  return match?.[1]?.toUpperCase() ?? "FILE";
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

export function parsePortulanBlobPathname(url: string) {
  if (!isPortulanBlobUrl(url)) return null;
  return new URL(url).pathname.replace(/^\//, "");
}

export function parseBlobAssetPathname(reference: string) {
  const fromVercel = parsePortulanBlobPathname(reference);
  if (fromVercel) return fromVercel;

  const parseAssetParams = (value: string) => {
    try {
      const parsed = value.startsWith("/")
        ? new URL(value, "http://portulan.local")
        : new URL(value);
      if (parsed.pathname !== "/api/blob/asset") return null;
      const pathname = parsed.searchParams.get("pathname");
      if (!pathname?.startsWith(`${BLOB_ROOT}/`)) return null;
      return pathname;
    } catch {
      return null;
    }
  };

  return parseAssetParams(reference);
}

export function buildLocalBlobAssetUrl(pathname: string) {
  return `/api/blob/asset?pathname=${encodeURIComponent(pathname)}`;
}

export function isResolvableBlobAssetReference(reference: string) {
  if (isPortulanBlobUrl(reference)) return true;
  if (reference.startsWith("/api/blob/asset")) return true;
  return parseBlobAssetPathname(reference) !== null;
}

export function portulanBlobAssetUrl(url: string) {
  if (url.startsWith("/api/blob/asset")) return url;
  return `/api/blob/asset?url=${encodeURIComponent(url)}`;
}

export function shouldProxyPortulanBlobUrl(url: string | null | undefined) {
  // Public Vercel Blob URLs are served directly in preview/PDF.
  // Only local cache fallbacks use /api/blob/asset (auth-protected).
  if (!url) return false;
  return url.startsWith("/api/blob/asset");
}
