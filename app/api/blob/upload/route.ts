import { auth } from "@/auth";
import { uploadBlobAsset } from "@/lib/blob-upload-server";
import type { BlobUploadPurpose } from "@/lib/blob-storage";

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "Faça login para enviar imagens." }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const purpose = form.get("purpose");
  const documentId = String(form.get("documentId") ?? "").trim() || undefined;
  const templateId = String(form.get("templateId") ?? "").trim() || undefined;

  if (!(file instanceof File)) {
    return Response.json({ error: "Arquivo não encontrado no envio." }, { status: 400 });
  }

  if (typeof purpose !== "string") {
    return Response.json({ error: "Tipo de upload inválido." }, { status: 400 });
  }

  const content = Buffer.from(await file.arrayBuffer());
  const result = await uploadBlobAsset({
    purpose: purpose as BlobUploadPurpose,
    userId,
    fileName: file.name,
    contentType: file.type,
    content,
    documentId,
    templateId,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ url: result.result.url, pathname: result.result.pathname });
}
