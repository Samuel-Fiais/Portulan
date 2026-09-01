import { auth } from "@/auth";
import { deleteDocument, getDocument, updateDocument } from "@/lib/db";
import { documentUpdateSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: Context) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const ctx = { userId: session.user.id };
  const { id } = await params;
  const document = await getDocument(id, ctx);
  if (!document) return Response.json({ error: "Documento não encontrado" }, { status: 404 });
  return Response.json({ document });
}

export async function PATCH(request: Request, { params }: Context) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const parsed = documentUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Alterações inválidas", issues: parsed.error.issues }, { status: 400 });
  }

  const document = await updateDocument(id, parsed.data, { userId: session.user.id });
  if (!document) return Response.json({ error: "Documento não encontrado" }, { status: 404 });
  return Response.json({ document });
}

export async function DELETE(_request: Request, { params }: Context) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  if (!(await deleteDocument(id, { userId: session.user.id }))) {
    return Response.json({ error: "Documento não encontrado" }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}
