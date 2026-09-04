import assert from "node:assert/strict";
import { test } from "node:test";
import { buildBlobPath, fileExtensionLabel, isPortulanBlobUrl, validateBlobFile, validateBlobImage } from "./blob-storage.ts";

test("buildBlobPath organiza logos de template por usuário", () => {
  const path = buildBlobPath({
    purpose: "template-logo",
    userId: "user-1",
    templateId: "tpl-9",
    fileName: "Logo ACME.png",
  });
  assert.match(path, /^portulan\/users\/user-1\/templates\/tpl-9\/logo\//);
  assert.match(path, /logo-acme\.png$/);
});

test("buildBlobPath organiza imagens de relatório por documento", () => {
  const path = buildBlobPath({
    purpose: "report-image",
    userId: "user-1",
    documentId: "doc-7",
    fileName: "diagrama.webp",
  });
  assert.match(path, /^portulan\/users\/user-1\/documents\/doc-7\/images\//);
  assert.match(path, /diagrama\.webp$/);
});

test("buildBlobPath organiza anexos de relatório em files/", () => {
  const path = buildBlobPath({
    purpose: "report-file",
    userId: "user-1",
    documentId: "doc-7",
    fileName: "contrato.pdf",
  });
  assert.match(path, /^portulan\/users\/user-1\/documents\/doc-7\/files\//);
  assert.match(path, /contrato\.pdf$/);
});

test("validateBlobImage rejeita tipos não suportados", () => {
  const result = validateBlobImage({ type: "application/pdf", size: 1000, name: "file.pdf" });
  assert.equal(result.ok, false);
});

test("validateBlobFile aceita qualquer tipo dentro do limite", () => {
  const result = validateBlobFile({ size: 1000, name: "file.pdf" });
  assert.equal(result.ok, true);
});

test("fileExtensionLabel extrai extensão em maiúsculas", () => {
  assert.equal(fileExtensionLabel("relatorio.Q3.pdf"), "PDF");
  assert.equal(fileExtensionLabel("archive"), "FILE");
});

test("isPortulanBlobUrl reconhece URLs do store", () => {
  assert.equal(
    isPortulanBlobUrl("https://abc.public.blob.vercel-storage.com/portulan/users/u1/documents/d1/images/x.png"),
    true,
  );
  assert.equal(isPortulanBlobUrl("https://example.com/logo.png"), false);
});
