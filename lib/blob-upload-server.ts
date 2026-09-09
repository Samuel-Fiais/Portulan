import { put } from "@vercel/blob";
import { writeBlobCache } from "@/lib/blob-cache";
import { formatBlobStorageError, getBlobReadWriteToken, getBlobStorageHint, isBlobStoreUnavailableError } from "@/lib/blob-env";
import {
  buildBlobPath,
  buildLocalBlobAssetUrl,
  type BlobUploadPurpose,
  validateBlobFile,
  validateBlobImage,
} from "@/lib/blob-storage";
import { canEditDocument, getDocument } from "@/lib/db";
import { documentAccessContext } from "@/lib/access-context";

export const BLOB_UPLOAD_PURPOSES = ["template-logo", "report-image", "report-file"] as const;

export type BlobUploadInput = {
  purpose: BlobUploadPurpose;
  userId: string;
  fileName: string;
  contentType: string;
  content: Buffer;
  documentId?: string;
  templateId?: string;
};

export type BlobUploadResult = {
  url: string;
  pathname: string;
  purpose: BlobUploadPurpose;
  name: string;
};

function validatePurpose(purpose: string): purpose is BlobUploadPurpose {
  return (BLOB_UPLOAD_PURPOSES as readonly string[]).includes(purpose);
}

function canUseLocalBlobFallback() {
  return process.env.NODE_ENV !== "production" || process.env.BLOB_LOCAL_FALLBACK === "1";
}

async function storeLocalBlobAsset(
  pathname: string,
  content: Buffer,
  input: Pick<BlobUploadInput, "fileName" | "purpose">,
): Promise<{ ok: true; result: BlobUploadResult }> {
  await writeBlobCache(pathname, content);
  return {
    ok: true,
    result: {
      url: buildLocalBlobAssetUrl(pathname),
      pathname,
      purpose: input.purpose,
      name: input.fileName,
    },
  };
}

export async function uploadBlobAsset(input: BlobUploadInput): Promise<
  | { ok: true; result: BlobUploadResult }
  | { ok: false; status: number; error: string }
> {
  if (!validatePurpose(input.purpose)) {
    return { ok: false, status: 400, error: "Tipo de upload inválido." };
  }

  const fileLike = {
    name: input.fileName,
    type: input.contentType,
    size: input.content.length,
  };

  const validation = input.purpose === "report-file"
    ? validateBlobFile(fileLike)
    : validateBlobImage(fileLike);
  if (!validation.ok) {
    return { ok: false, status: 400, error: validation.error };
  }

  if (input.purpose === "report-image" || input.purpose === "report-file") {
    if (!input.documentId?.trim()) {
      return { ok: false, status: 400, error: "documentId é obrigatório para arquivos de relatório." };
    }
    const ctx = await documentAccessContext(input.userId);
    const document = await getDocument(input.documentId, ctx);
    if (!document || !(await canEditDocument(document, ctx))) {
      return { ok: false, status: 403, error: "Documento não encontrado ou sem permissão." };
    }
  }

  let pathname: string;
  try {
    pathname = buildBlobPath({
      purpose: input.purpose,
      userId: input.userId,
      documentId: input.documentId,
      templateId: input.templateId,
      fileName: input.fileName,
    });
  } catch (error) {
    return {
      ok: false,
      status: 400,
      error: error instanceof Error ? error.message : "Caminho de upload inválido.",
    };
  }

  const blobToken = getBlobReadWriteToken();
  if (!blobToken) {
    if (canUseLocalBlobFallback()) {
      return storeLocalBlobAsset(pathname, input.content, input);
    }
    return { ok: false, status: 503, error: getBlobStorageHint() ?? "Blob storage indisponível." };
  }

  try {
    const blob = await put(pathname, input.content, {
      access: "public",
      token: blobToken,
      contentType: input.contentType,
      addRandomSuffix: false,
    });

    await writeBlobCache(pathname, input.content).catch((error) => {
      console.warn("Não foi possível gravar cache local do blob", { pathname, error });
    });

    return {
      ok: true,
      result: {
        url: blob.url,
        pathname: blob.pathname,
        purpose: input.purpose,
        name: input.fileName,
      },
    };
  } catch (error) {
    if (canUseLocalBlobFallback() && isBlobStoreUnavailableError(error)) {
      console.warn("Vercel Blob indisponível; usando cache local.", { pathname, error });
      return storeLocalBlobAsset(pathname, input.content, input);
    }
    return { ok: false, status: 502, error: formatBlobStorageError(error) };
  }
}
