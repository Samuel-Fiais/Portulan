import { auth } from "@/auth";
import { getDocument } from "@/lib/db";
import { documentAccessContext } from "@/lib/access-context";
import { generateDocumentPdf } from "@/lib/pdf-export";
import { formatDate } from "@/lib/utils";

type Context = { params: Promise<{ id: string }> };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request, { params }: Context) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const document = await getDocument(id, await documentAccessContext(session.user.id));
  if (!document) return Response.json({ error: "Documento não encontrado" }, { status: 404 });

  const origin = new URL(request.url).origin;

  try {
    const { pdf, filename } = await generateDocumentPdf({
      origin,
      exportPath: `/documents/${encodeURIComponent(document.id)}/export`,
      sessionCookie: request.headers.get("cookie"),
      metadata: {
        slug: document.slug,
        version: document.version,
        date: formatDate(document.updatedAt),
        primaryColor: document.primaryColor,
        secondaryColor: document.secondaryColor,
        templateName: document.templateName,
        logoUrl: document.logoUrl,
      },
    });

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Falha ao gerar PDF", error);
    return Response.json({ error: "Não foi possível gerar o PDF" }, { status: 500 });
  }
}
