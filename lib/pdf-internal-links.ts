import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNull,
  PDFString,
} from "pdf-lib";

export type PdfCssBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PdfInternalLinkLayout = {
  links: Array<{ fragment: string } & PdfCssBox>;
  dests: Array<{ fragment: string; x: number; y: number }>;
};

export type PdfPageLayout = {
  topMargin: number;
  bottomMargin: number;
  cssPxToPt: number;
};

export function fragmentFromHref(href: string) {
  const trimmed = href.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("#")) {
    return trimmed.length > 1 ? decodeURIComponent(trimmed.slice(1)) : null;
  }
  try {
    const hash = new URL(trimmed, "https://pdf.local/").hash;
    return hash.length > 1 ? decodeURIComponent(hash.slice(1)) : null;
  } catch {
    const hashAt = trimmed.indexOf("#");
    if (hashAt < 0 || hashAt === trimmed.length - 1) return null;
    try {
      return decodeURIComponent(trimmed.slice(hashAt + 1));
    } catch {
      return trimmed.slice(hashAt + 1);
    }
  }
}

export function cssBoxToPdfPage(
  box: PdfCssBox,
  pageHeight: number,
  layout: PdfPageLayout,
) {
  const contentHeight = Math.max(1, pageHeight - layout.topMargin - layout.bottomMargin);
  const yFromTop = box.y * layout.cssPxToPt;
  const pageIndex = Math.max(0, Math.floor(yFromTop / contentHeight));
  const yInContent = yFromTop - pageIndex * contentHeight;
  const top = pageHeight - layout.topMargin - yInContent;
  const height = box.height * layout.cssPxToPt;
  const width = box.width * layout.cssPxToPt;
  const x = box.x * layout.cssPxToPt;
  return {
    pageIndex,
    rect: [x, top - height, x + width, top] as [number, number, number, number],
    destY: top,
  };
}

function pdfStringValue(value: unknown) {
  if (value instanceof PDFString || value instanceof PDFHexString) return value.decodeText();
  if (value instanceof PDFName) return value.decodeText();
  return null;
}

function annotUri(annot: PDFDict) {
  const action = annot.lookup(PDFName.of("A"));
  if (!(action instanceof PDFDict)) return null;
  if (action.get(PDFName.of("S")) !== PDFName.of("URI")) return null;
  return pdfStringValue(action.lookup(PDFName.of("URI")));
}

function removeFragmentUriAnnotations(pdf: PDFDocument) {
  for (const page of pdf.getPages()) {
    const annots = page.node.Annots();
    if (!(annots instanceof PDFArray)) continue;
    const kept = [];
    for (let index = 0; index < annots.size(); index += 1) {
      const annot = annots.lookup(index);
      const uri = annot instanceof PDFDict ? annotUri(annot) : null;
      if (uri && fragmentFromHref(uri)) continue;
      kept.push(annots.get(index));
    }
    page.node.set(PDFName.of("Annots"), pdf.context.obj(kept));
  }
}

export function applyPdfInternalLinks(
  pdf: PDFDocument,
  collected: PdfInternalLinkLayout,
  layout: PdfPageLayout,
) {
  const pages = pdf.getPages();
  if (pages.length === 0) return 0;

  const pageHeight = pages[0]!.getSize().height;
  const destByFragment = new Map<string, { pageIndex: number; y: number }>();
  for (const dest of collected.dests) {
    if (destByFragment.has(dest.fragment)) continue;
    const placed = cssBoxToPdfPage({ ...dest, width: 1, height: 1 }, pageHeight, layout);
    destByFragment.set(dest.fragment, {
      pageIndex: Math.min(placed.pageIndex, pages.length - 1),
      y: placed.destY,
    });
  }

  removeFragmentUriAnnotations(pdf);

  let added = 0;
  for (const link of collected.links) {
    const dest = destByFragment.get(link.fragment);
    if (!dest || link.width < 1 || link.height < 1) continue;
    const destPage = pages[dest.pageIndex];
    const placed = cssBoxToPdfPage(link, pageHeight, layout);
    const linkPage = pages[Math.min(placed.pageIndex, pages.length - 1)];
    if (!destPage || !linkPage) continue;

    const annot = pdf.context.register(
      pdf.context.obj({
        Type: "Annot",
        Subtype: "Link",
        Rect: placed.rect,
        Border: [0, 0, 0],
        F: 4,
        Dest: [destPage.ref, "XYZ", PDFNull, dest.y, PDFNull],
      }),
    );
    linkPage.node.addAnnot(annot);
    added += 1;
  }
  return added;
}
