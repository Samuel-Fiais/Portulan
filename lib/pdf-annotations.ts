import { PDFArray, PDFDict, PDFDocument, PDFName, PDFString } from "pdf-lib";

/** Copies pages so Chrome link annotations survive header/footer overlay. */
export async function copyPdfPreservingAnnotations(source: Uint8Array) {
  const sourcePdf = await PDFDocument.load(source);
  const pdf = await PDFDocument.create();
  const pages = await pdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
  for (const page of pages) pdf.addPage(page);
  return pdf;
}

export function countPdfLinkAnnotations(pdf: PDFDocument) {
  let count = 0;
  for (const page of pdf.getPages()) {
    const annots = page.node.Annots();
    if (!(annots instanceof PDFArray)) continue;
    for (let index = 0; index < annots.size(); index += 1) {
      const annot = annots.lookup(index);
      if (!(annot instanceof PDFDict)) continue;
      if (annot.get(PDFName.of("Subtype")) === PDFName.of("Link")) count += 1;
    }
  }
  return count;
}

export async function createPdfWithUriLink(uri: string) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([200, 200]);
  const annot = pdf.context.register(
    pdf.context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: [10, 10, 120, 40],
      Border: [0, 0, 0],
      A: { Type: "Action", S: "URI", URI: PDFString.of(uri) },
    }),
  );
  page.node.set(PDFName.of("Annots"), pdf.context.obj([annot]));
  return pdf.save();
}
