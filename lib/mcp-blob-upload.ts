import { decodeBase64Content } from "@/lib/blob-base64";
import { uploadBlobAsset } from "@/lib/blob-upload-server";
import type { BlobUploadPurpose } from "@/lib/blob-storage";

const base64Field = {
  content_base64: "Conteúdo do arquivo codificado em base64 (sem quebras de linha). Aceita prefixo data URL opcional.",
  filename: "Nome original do arquivo, com extensão (ex.: diagrama.png, spec.pdf).",
  content_type: "MIME type do arquivo (ex.: image/png, application/pdf).",
};

export const mcpBlobUploadFields = {
  document_id: "ID UUID do documento (ou UUID do link /d/{uuid}). Obrigatório para imagens e anexos de relatório.",
  ...base64Field,
};

const mcpBlobUploadInputSchema = {
  document_id: "string — ID UUID do documento de destino",
  content_base64: "string — bytes do arquivo em base64",
  filename: "string — nome com extensão",
  content_type: "string — MIME type",
};

export async function runMcpBlobUpload(input: {
  userId: string;
  purpose: BlobUploadPurpose;
  documentId: string;
  contentBase64: string;
  filename: string;
  contentType: string;
}) {
  const decoded = decodeBase64Content(input.contentBase64);
  if (!decoded.ok) {
    return { error: decoded.error, status: 400 as const };
  }

  const result = await uploadBlobAsset({
    purpose: input.purpose,
    userId: input.userId,
    fileName: input.filename,
    contentType: input.contentType,
    content: decoded.buffer,
    documentId: input.documentId,
  });

  if (!result.ok) {
    return { error: result.error, status: result.status as 400 | 403 | 502 | 503 };
  }

  return { result: result.result };
}

export function mcpUploadImageDescription() {
  return [
    "Envia uma imagem (PNG, JPG, WEBP, SVG ou GIF, até 5 MB) para o Blob do usuário autenticado.",
    "Retorna url e pathname para usar em :::figure{src=\"...\"}.",
    "Envie content_base64 + filename + content_type + document_id.",
    "Faça upload antes de inserir a URL no Markdown do documento.",
  ].join(" ");
}

export function mcpUploadFileDescription() {
  return [
    "Envia um anexo de qualquer tipo (até 5 MB) para o Blob do usuário autenticado.",
    "Retorna url, name e pathname para usar em :::file{url=\"...\" name=\"...\"}.",
    "Envie content_base64 + filename + content_type + document_id.",
    "Faça upload antes de inserir a URL no Markdown do documento.",
  ].join(" ");
}

export { mcpBlobUploadInputSchema };
