import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import {
  copyPdfPreservingAnnotations,
  countPdfLinkAnnotations,
  createPdfWithUriLink,
} from "./pdf-annotations.ts";

test("copyPdfPreservingAnnotations mantém anotações de link", async () => {
  const source = await createPdfWithUriLink("https://example.com/docs");
  const copied = await copyPdfPreservingAnnotations(source);
  assert.equal(countPdfLinkAnnotations(copied), 1);
});

test("redesenhar a página como imagem perde o link", async () => {
  const source = await createPdfWithUriLink("https://example.com/docs");
  const flattened = await PDFDocument.create();
  const [embedded] = await flattened.embedPdf(source, [0]);
  const page = flattened.addPage([200, 200]);
  page.drawPage(embedded, { x: 0, y: 0, width: 200, height: 200 });
  assert.equal(countPdfLinkAnnotations(flattened), 0);
});
