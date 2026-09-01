import { auth } from "@/auth";
import { createDocument, listDocuments } from "@/lib/db";
import { documentInputSchema } from "@/lib/validation";
import { documentStatuses, documentTypes } from "@/lib/documents";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  const ctx = { userId: session?.user?.id ?? null };
  const params = new URL(request.url).searchParams;
  const typeValue = params.get("type");
  const statusValue = params.get("status");
  const type = documentTypes.find((item) => item === typeValue);
  const status = documentStatuses.find((item) => item === statusValue);
  return Response.json({
    documents: await listDocuments({ query: params.get("q") || undefined, type, status }, ctx),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const parsed = documentInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Documento inválido", issues: parsed.error.issues }, { status: 400 });
  }

  return Response.json(
    { document: await createDocument(parsed.data, { userId: session.user.id }) },
    { status: 201 },
  );
}
