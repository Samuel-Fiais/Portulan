import { put } from "@vercel/blob";
import { auth } from "@/auth";
import { getBlobReadWriteToken, getBlobStorageHint } from "@/lib/blob-env";
import { canEditDocument, getDocument } from "@/lib/db";
import { documentAccessContext } from "@/lib/access-context";
import {
  buildBlobPath,
  type BlobUploadPurpose,
  validateBlobFile,
  validateBlobImage,
} from "@/lib/blob-storage";

const purposes = new Set<BlobUploadPurpose>(["template-logo", "report-image", "report-file"]);

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "Faça login para enviar imagens." }, { status: 401 });
  }

  const blobToken = getBlobReadWriteToken();
  if (!blobToken) {
    return Response.json({ error: getBlobStorageHint() }, { status: 503 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const purpose = form.get("purpose");
  const documentId = String(form.get("documentId") ?? "").trim() || undefined;
  const templateId = String(form.get("templateId") ?? "").trim() || undefined;

  if (!(file instanceof File)) {
    return Response.json({ error: "Arquivo não encontrado no envio." }, { status: 400 });
  }
  if (typeof purpose !== "string" || !purposes.has(purpose as BlobUploadPurpose)) {
    return Response.json({ error: "Tipo de upload inválido." }, { status: 400 });
  }

  const validation = purpose === "report-file"
    ? validateBlobFile(file)
    : validateBlobImage(file);
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  if (purpose === "report-image" || purpose === "report-file") {
    if (!documentId) {
      return Response.json({ error: "documentId é obrigatório para arquivos de relatório." }, { status: 400 });
    }
    const ctx = await documentAccessContext(userId);
    const document = await getDocument(documentId, ctx);
    if (!document || !(await canEditDocument(document, ctx))) {
      return Response.json({ error: "Documento não encontrado ou sem permissão." }, { status: 403 });
    }
  }

  let pathname: string;
  try {
    pathname = buildBlobPath({
      purpose: purpose as BlobUploadPurpose,
      userId,
      documentId,
      templateId,
      fileName: file.name,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Caminho de upload inválido." },
      { status: 400 },
    );
  }

  try {
    const blob = await put(pathname, file, {
      access: "public",
      token: blobToken,
      contentType: file.type,
      addRandomSuffix: false,
    });

    return Response.json({ url: blob.url, pathname: blob.pathname });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível enviar a imagem.";
    return Response.json({ error: message }, { status: 502 });
  }
}
