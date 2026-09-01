import { deleteDocument, getDocument, updateDocument } from "@/lib/db";
import { documentUpdateSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const document = getDocument(id);
  if (!document) return Response.json({ error: "Documento não encontrado" }, { status: 404 });
  return Response.json({ document });
}

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const parsed = documentUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Alterações inválidas", issues: parsed.error.issues }, { status: 400 });
  }
  const document = updateDocument(id, parsed.data);
  if (!document) return Response.json({ error: "Documento não encontrado" }, { status: 404 });
  return Response.json({ document });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params;
  if (!deleteDocument(id)) return Response.json({ error: "Documento não encontrado" }, { status: 404 });
  return new Response(null, { status: 204 });
}
