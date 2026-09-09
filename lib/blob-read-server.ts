import "server-only";

import { get } from "@vercel/blob";
import { readBlobCache, writeBlobCache } from "@/lib/blob-cache";
import { getBlobReadWriteToken, isBlobStoreUnavailableError } from "@/lib/blob-env";
import { isPortulanBlobUrl, parseBlobAssetPathname } from "@/lib/blob-storage";

function guessContentTypeFromPath(value: string) {
  const lower = value.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "image/png";
}

export async function readPortulanBlobAsset(reference: string) {
  const pathname = parseBlobAssetPathname(reference);
  if (!pathname) return null;

  const cached = await readBlobCache(pathname);
  if (cached) {
    return { bytes: cached, contentType: guessContentTypeFromPath(pathname) };
  }

  const token = getBlobReadWriteToken();
  if (token && isPortulanBlobUrl(reference)) {
    try {
      const result = await get(reference, { access: "public", token });
      if (result?.statusCode === 200 && result.stream) {
        const bytes = new Uint8Array(await new Response(result.stream).arrayBuffer());
        await writeBlobCache(pathname, bytes).catch(() => undefined);
        return {
          bytes,
          contentType: result.blob.contentType || guessContentTypeFromPath(pathname),
        };
      }
    } catch (error) {
      if (!isBlobStoreUnavailableError(error)) {
        console.warn("Falha ao ler blob com token", { reference, error });
      }
    }
  }

  if (isPortulanBlobUrl(reference)) {
    try {
      const response = await fetch(reference, { headers: { Accept: "image/*" } });
      if (response.ok) {
        const bytes = new Uint8Array(await response.arrayBuffer());
        await writeBlobCache(pathname, bytes).catch(() => undefined);
        return {
          bytes,
          contentType: response.headers.get("content-type") || guessContentTypeFromPath(pathname),
        };
      }
    } catch (error) {
      console.warn("Falha ao ler blob publicamente", { reference, error });
    }
  }

  return null;
}
