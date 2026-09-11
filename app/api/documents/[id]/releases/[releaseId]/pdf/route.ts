import { auth } from "@/auth";
import { getDocument, getDocumentRelease } from "@/lib/db";
import { documentAccessContext } from "@/lib/access-context";
import { generateDocumentPdf, releasePdfFilename } from "@/lib/pdf-export";
import { formatDate } from "@/lib/utils";

type Context = { params: Promise<{ id: string; releaseId: string }> };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request, { params }: Context) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id, releaseId } = await params;
  const ctx = await documentAccessContext(session.user.id);
  const document = await getDocument(id, ctx);
  if (!document) return Response.json({ error: "Documento não encontrado" }, { status: 404 });

  const release = await getDocumentRelease(releaseId);
  if (!release || release.documentId !== document.id) {
    return Response.json({ error: "Versão não encontrada" }, { status: 404 });
  }

  const origin = new URL(request.url).origin;

  try {
    const { pdf } = await generateDocumentPdf({
      origin,
      exportPath: `/documents/${encodeURIComponent(document.id)}/releases/${encodeURIComponent(release.id)}/export`,
      sessionCookie: request.headers.get("cookie"),
      metadata: {
        slug: document.slug,
        version: release.version,
        date: formatDate(release.publishedAt),
        primaryColor: release.primaryColor,
        secondaryColor: release.secondaryColor,
        templateName: release.templateName,
        logoUrl: release.logoUrl,
      },
    });

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${releasePdfFilename(document.slug, release.version)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Falha ao gerar PDF da versão", error);
    return Response.json({ error: "Não foi possível gerar o PDF" }, { status: 500 });
  }
}
