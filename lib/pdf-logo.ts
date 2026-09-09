import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Page } from "puppeteer-core";
import { isResolvableBlobAssetReference } from "./blob-storage.ts";

export type PdfLogoBytes = { bytes: Uint8Array; mime: "png" | "jpg" };

type PdfLogoFormat = "png" | "jpg" | "webp" | "gif" | "svg" | "unknown";

export function resolveAbsoluteLogoUrl(logoUrl: string, origin: string) {
  if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://") || logoUrl.startsWith("data:")) {
    return logoUrl;
  }
  if (logoUrl.startsWith("/")) {
    return `${origin}${logoUrl}`;
  }
  return logoUrl;
}

export function detectPdfLogoFormat(bytes: Uint8Array, hint = ""): PdfLogoFormat {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpg";
  }
  if (
    bytes.length >= 8
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
  ) {
    return "png";
  }
  if (
    bytes.length >= 12
    && bytes[0] === 0x52
    && bytes[1] === 0x49
    && bytes[2] === 0x46
    && bytes[3] === 0x46
    && bytes[8] === 0x57
    && bytes[9] === 0x45
    && bytes[10] === 0x42
    && bytes[11] === 0x50
  ) {
    return "webp";
  }
  if (
    bytes.length >= 6
    && bytes[0] === 0x47
    && bytes[1] === 0x49
    && bytes[2] === 0x46
  ) {
    return "gif";
  }

  const trimmed = new TextDecoder().decode(bytes.slice(0, Math.min(bytes.length, 256))).trimStart();
  if (trimmed.startsWith("<svg") || trimmed.startsWith("<?xml")) {
    return "svg";
  }

  const lowerHint = hint.toLowerCase();
  if (lowerHint.includes("jpeg") || lowerHint.includes("jpg")) return "jpg";
  if (lowerHint.includes("png")) return "png";
  if (lowerHint.includes("webp")) return "webp";
  if (lowerHint.includes("gif")) return "gif";
  if (lowerHint.includes("svg")) return "svg";
  return "unknown";
}

export function toPdfEmbedMime(format: PdfLogoFormat): "png" | "jpg" | null {
  if (format === "jpg") return "jpg";
  if (format === "png") return "png";
  return null;
}

export async function loadDefaultPdfLogoBytes(): Promise<PdfLogoBytes> {
  const fallbackPath = join(process.cwd(), "public", "portulan-logo.png");
  return { bytes: await readFile(fallbackPath), mime: "png" };
}

async function readLogoBytesFromSource(logoUrl: string, origin: string) {
  if (isResolvableBlobAssetReference(logoUrl)) {
    const { readPortulanBlobAsset } = await import("@/lib/blob-read-server");
    const blobAsset = await readPortulanBlobAsset(logoUrl);
    if (blobAsset) {
      return { bytes: blobAsset.bytes, contentType: blobAsset.contentType };
    }
  }

  if (logoUrl.startsWith("data:")) {
    const response = await fetch(logoUrl);
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") ?? logoUrl.slice(5, logoUrl.indexOf(";"));
    return { bytes, contentType };
  }

  if (logoUrl.startsWith("/") && !logoUrl.startsWith("/api/")) {
    const localPath = join(process.cwd(), "public", logoUrl.replace(/^\//, ""));
    try {
      const bytes = await readFile(localPath);
      return { bytes: new Uint8Array(bytes), contentType: guessContentTypeFromPath(logoUrl) };
    } catch {
      // Relative app routes (ex.: /api/brand/navy) live outside /public.
    }
  }

  const response = await fetch(resolveAbsoluteLogoUrl(logoUrl, origin), {
    headers: { Accept: "image/*" },
  });
  if (!response.ok) return null;

  const bytes = new Uint8Array(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") ?? guessContentTypeFromPath(logoUrl);
  return { bytes, contentType };
}

function guessContentTypeFromPath(value: string) {
  const lower = value.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "image/png";
}

export async function rasterizeLogoToPng(page: Page, logoUrl: string) {
  const dataUrl = await page.evaluate(async (url) => {
    const image = new Image();
    image.decoding = "async";
    image.crossOrigin = "anonymous";

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Não foi possível carregar a logo."));
      image.src = url;
    });

    const width = Math.max(image.naturalWidth, 1);
    const height = Math.max(image.naturalHeight, 1);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas indisponível.");
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/png");
  }, logoUrl);

  const base64 = dataUrl.split(",")[1];
  if (!base64) throw new Error("Rasterização da logo inválida.");
  return { bytes: Uint8Array.from(Buffer.from(base64, "base64")), mime: "png" as const };
}

export async function loadPdfLogoBytes(
  logoUrl: string | null | undefined,
  input: { origin: string; page?: Page },
): Promise<PdfLogoBytes> {
  const fallback = await loadDefaultPdfLogoBytes();
  if (!logoUrl?.trim()) return fallback;

  const absoluteUrl = resolveAbsoluteLogoUrl(logoUrl.trim(), input.origin);

  try {
    const source = await readLogoBytesFromSource(logoUrl.trim(), input.origin);
    if (source) {
      const format = detectPdfLogoFormat(source.bytes, source.contentType);
      const embedMime = toPdfEmbedMime(format);
      if (embedMime) {
        return { bytes: source.bytes, mime: embedMime };
      }

      if (input.page) {
        const dataUrl = `data:${source.contentType || "image/png"};base64,${Buffer.from(source.bytes).toString("base64")}`;
        return await rasterizeLogoToPng(input.page, dataUrl);
      }
    }
  } catch (error) {
    console.warn("Falha ao carregar logo via servidor para PDF", error);
  }

  if (input.page) {
    try {
      return await rasterizeLogoToPng(input.page, absoluteUrl);
    } catch (error) {
      console.warn("Falha ao rasterizar logo para PDF", { logoUrl: absoluteUrl, error });
    }
  }

  console.warn("Usando logo padrão no PDF; logo customizada indisponível.", { logoUrl: absoluteUrl });
  return fallback;
}
