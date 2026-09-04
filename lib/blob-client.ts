import type { BlobUploadPurpose } from "@/lib/blob-storage";

async function uploadBlobAsset(input: {
  file: File;
  purpose: BlobUploadPurpose;
  documentId?: string;
  templateId?: string;
}) {
  const form = new FormData();
  form.append("file", input.file);
  form.append("purpose", input.purpose);
  if (input.documentId) form.append("documentId", input.documentId);
  if (input.templateId) form.append("templateId", input.templateId);

  const response = await fetch("/api/blob/upload", {
    method: "POST",
    body: form,
  });

  const payload = await response.json().catch(() => ({})) as { url?: string; error?: string };
  if (!response.ok || !payload.url) {
    throw new Error(payload.error ?? "Não foi possível enviar o arquivo.");
  }

  return payload.url;
}

export async function uploadBlobImage(input: {
  file: File;
  purpose: Extract<BlobUploadPurpose, "template-logo" | "report-image">;
  documentId?: string;
  templateId?: string;
}) {
  return uploadBlobAsset(input);
}

export async function uploadBlobFile(input: {
  file: File;
  documentId: string;
}) {
  return uploadBlobAsset({
    file: input.file,
    purpose: "report-file",
    documentId: input.documentId,
  });
}
