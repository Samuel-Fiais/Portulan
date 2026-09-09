import { auth } from "@/auth";
import { parseBlobAssetPathname } from "@/lib/blob-storage";
import { readPortulanBlobAsset } from "@/lib/blob-read-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const pathname = params.get("pathname")?.trim();
  const url = params.get("url")?.trim();
  const reference = pathname
    ? `/api/blob/asset?pathname=${encodeURIComponent(pathname)}`
    : url;

  if (!reference || !parseBlobAssetPathname(reference)) {
    return Response.json({ error: "Referência de blob inválida." }, { status: 400 });
  }

  const asset = await readPortulanBlobAsset(reference);
  if (!asset) {
    return Response.json(
      { error: "Arquivo indisponível. Reenvie a imagem ou reative o Vercel Blob." },
      { status: 404 },
    );
  }

  return new Response(asset.bytes, {
    headers: {
      "Content-Type": asset.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
