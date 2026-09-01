import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const brandTones = ["navy", "burgundy", "gold", "coral", "purple", "indigo", "teal"] as const;
export type BrandTone = (typeof brandTones)[number];

export async function getBrandLogo(tone: BrandTone) {
  const html = await readFile(join(process.cwd(), "festpaydocs-3.html"), "utf8");
  const match = html.match(new RegExp(`<img class="fp-logo fp-logo-${tone}"\\s+src="data:image/png;base64,([^"]+)"`));
  if (!match) throw new Error(`Logo Portulan não encontrado para o tom ${tone}`);
  return Buffer.from(match[1], "base64");
}

export async function getBrandLogoDataUri(tone: BrandTone) {
  return `data:image/png;base64,${(await getBrandLogo(tone)).toString("base64")}`;
}
