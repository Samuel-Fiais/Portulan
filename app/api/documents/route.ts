import { createDocument, listDocuments } from "@/lib/db";
import { documentInputSchema } from "@/lib/validation";
import { documentStatuses, documentTypes } from "@/lib/documents";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const typeValue = params.get("type");
  const statusValue = params.get("status");
  const type = documentTypes.find((item) => item === typeValue);
  const status = documentStatuses.find((item) => item === statusValue);
  return Response.json({
    documents: listDocuments({ query: params.get("q") || undefined, type, status }),
  });
}

export async function POST(request: Request) {
  const parsed = documentInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Documento inválido", issues: parsed.error.issues }, { status: 400 });
  }
  return Response.json({ document: createDocument(parsed.data) }, { status: 201 });
}
