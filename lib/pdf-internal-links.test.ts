import assert from "node:assert/strict";
import test from "node:test";
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFString } from "pdf-lib";
import {
  applyPdfInternalLinks,
  cssBoxToPdfPage,
  fragmentFromHref,
} from "./pdf-internal-links.ts";
import { countPdfLinkAnnotations } from "./pdf-annotations.ts";

test("fragmentFromHref lê âncora relativa e URL absoluta", () => {
  assert.equal(fragmentFromHref("#visao-geral"), "visao-geral");
  assert.equal(fragmentFromHref("https://app.local/documents/1/export#proximos-passos"), "proximos-passos");
  assert.equal(fragmentFromHref("https://example.com/x"), null);
  assert.equal(fragmentFromHref("#"), null);
});

test("cssBoxToPdfPage mapeia o fluxo contínuo para páginas A4", () => {
  const layout = { topMargin: 50, bottomMargin: 50, cssPxToPt: 1 };
  const first = cssBoxToPdfPage({ x: 10, y: 0, width: 40, height: 20 }, 800, layout);
  assert.equal(first.pageIndex, 0);
  assert.equal(first.destY, 750);
  assert.deepEqual(first.rect, [10, 730, 50, 750]);

  const second = cssBoxToPdfPage({ x: 10, y: 700, width: 40, height: 20 }, 800, layout);
  assert.equal(second.pageIndex, 1);
  assert.equal(second.destY, 750);
});

test("applyPdfInternalLinks cria GoTo e remove URI de fragmento", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage([200, 800]);
  pdf.addPage([200, 800]);
  const first = pdf.getPages()[0]!;
  const broken = pdf.context.register(
    pdf.context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: [0, 0, 10, 10],
      Border: [0, 0, 0],
      A: { Type: "Action", S: "URI", URI: PDFString.of("https://app.local/export#secao") },
    }),
  );
  first.node.addAnnot(broken);

  const added = applyPdfInternalLinks(
    pdf,
    {
      links: [{ fragment: "secao", x: 10, y: 0, width: 80, height: 16 }],
      dests: [{ fragment: "secao", x: 10, y: 700 }],
    },
    { topMargin: 50, bottomMargin: 50, cssPxToPt: 1 },
  );

  assert.equal(added, 1);
  assert.equal(countPdfLinkAnnotations(pdf), 1);
  const annots = pdf.getPages()[0]!.node.Annots();
  assert.ok(annots instanceof PDFArray);
  const annot = annots.lookup(0);
  assert.ok(annot instanceof PDFDict);
  assert.equal(annot.has(PDFName.of("Dest")), true);
});
