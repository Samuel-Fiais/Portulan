import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const CACHE_ROOT = join(process.cwd(), "data", "blob-cache");

function cachePathForPathname(pathname: string) {
  const hash = createHash("sha256").update(pathname).digest("hex");
  return join(CACHE_ROOT, hash);
}

export async function writeBlobCache(pathname: string, content: Buffer | Uint8Array) {
  await mkdir(CACHE_ROOT, { recursive: true });
  await writeFile(cachePathForPathname(pathname), content);
}

export async function readBlobCache(pathname: string) {
  try {
    return new Uint8Array(await readFile(cachePathForPathname(pathname)));
  } catch {
    return null;
  }
}
