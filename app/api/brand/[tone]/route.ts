import { brandTones, getBrandLogo, type BrandTone } from "@/lib/brand-assets";

const allowedTones = new Set<string>(brandTones);

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ tone: string }> }) {
  const { tone } = await params;
  if (!allowedTones.has(tone)) return new Response("Logo não encontrado", { status: 404 });

  return new Response(new Uint8Array(await getBrandLogo(tone as BrandTone)), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
