import puppeteer from "puppeteer";
import { PDFDocument, StandardFonts, rgb, type RGB } from "pdf-lib";
import { getBrandLogo, type BrandTone } from "@/lib/brand-assets";
import { getDocument } from "@/lib/db";
import { typeMeta, type DocumentType } from "@/lib/documents";
import { formatDate } from "@/lib/utils";

type Context = { params: Promise<{ id: string }> };

const toneByType: Record<DocumentType, BrandTone> = {
  feature: "purple",
  incident: "coral",
  report: "teal",
  reference: "indigo",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  const document = getDocument(id);
  if (!document) return Response.json({ error: "Documento não encontrado" }, { status: 404 });

  const { primary: accent, secondary: accent2 } = typeMeta[document.type];
  const logo = await getBrandLogo(toneByType[document.type]);
  const date = formatDate(document.updatedAt);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.emulateMediaType("print");
    const origin = new URL(request.url).origin;
    await page.goto(`${origin}/documents/${encodeURIComponent(document.id)}/export`, {
      waitUntil: "networkidle0",
      timeout: 45_000,
    });
    await page.evaluate(async () => {
      await window.document.fonts.ready;
    });

    const contentPdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "11mm", right: "0", bottom: "8mm", left: "0" },
    });
    const pdf = await decoratePdf(new Uint8Array(contentPdf), {
      logo,
      accent,
      accent2,
      type: typeMeta[document.type].label,
      version: document.version,
      date,
    });

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFilename(document.slug)}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Falha ao gerar PDF", error);
    return Response.json({ error: "Não foi possível gerar o PDF" }, { status: 500 });
  } finally {
    await browser.close();
  }
}

function safeFilename(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-");
}

async function decoratePdf(source: Uint8Array, input: { logo: Buffer; accent: string; accent2: string; type: string; version: number; date: string }) {
  const sourcePdf = await PDFDocument.load(source);
  const normalizedPdf = await PDFDocument.create();
  const sourcePages = sourcePdf.getPages();
  const embeddedPages = await normalizedPdf.embedPdf(source, sourcePages.map((_, index) => index));
  for (let index = 0; index < sourcePages.length; index += 1) {
    const { width, height } = sourcePages[index].getSize();
    const page = normalizedPdf.addPage([width, height]);
    page.drawPage(embeddedPages[index], { x: 0, y: 0, width, height });
  }
  const pdf = await PDFDocument.load(await normalizedPdf.save());
  const logo = await pdf.embedPng(input.logo);
  const regular = await pdf.embedFont(StandardFonts.Courier);
  const bold = await pdf.embedFont(StandardFonts.CourierBold);
  const accent = hexColor(input.accent);
  const accent2 = hexColor(input.accent2);
  const surface = hexColor("#F5F5F5");
  const border = hexColor("#D4D4D4");
  const muted = hexColor("#A3A3A3");
  const headerHeight = mm(10);
  const footerHeight = mm(8);
  const inset = mm(7);
  const type = input.type.toUpperCase();
  const version = `v${input.version} · ${input.date}`;
  const footerCopy = `Portulan · Confidencial · ${input.date}`;

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    page.drawRectangle({ x: 0, y: height - headerHeight, width, height: headerHeight, color: surface });
    drawGradient(page, height - headerHeight - mm(1), width, mm(1), accent, accent2);

    const headerLogoHeight = mm(5);
    const headerLogoWidth = logo.width * (headerLogoHeight / logo.height);
    page.drawImage(logo, { x: inset, y: height - (headerHeight + headerLogoHeight) / 2, width: headerLogoWidth, height: headerLogoHeight });
    drawRightText(page, type, width - inset, height - mm(3.2), bold, 6.7, accent);
    drawRightText(page, version, width - inset, height - mm(6.8), regular, 6.2, muted);

    page.drawRectangle({ x: 0, y: 0, width, height: footerHeight, color: surface });
    page.drawLine({ start: { x: 0, y: footerHeight }, end: { x: width, y: footerHeight }, thickness: 0.6, color: border });
    const footerLogoHeight = mm(4);
    const footerLogoWidth = logo.width * (footerLogoHeight / logo.height);
    page.drawImage(logo, { x: inset, y: (footerHeight - footerLogoHeight) / 2, width: footerLogoWidth, height: footerLogoHeight });
    drawRightText(page, footerCopy, width - inset, mm(3.1), regular, 6.2, muted);
  }

  return pdf.save();
}

function drawRightText(page: ReturnType<PDFDocument["getPages"]>[number], text: string, right: number, y: number, font: Awaited<ReturnType<PDFDocument["embedFont"]>>, size: number, color: RGB) {
  page.drawText(text, { x: right - font.widthOfTextAtSize(text, size), y, font, size, color });
}

function drawGradient(page: ReturnType<PDFDocument["getPages"]>[number], y: number, width: number, height: number, start: RGB, end: RGB) {
  const segments = 36;
  for (let index = 0; index < segments; index += 1) {
    const ratio = index / (segments - 1);
    page.drawRectangle({
      x: width * index / segments,
      y,
      width: width / segments + 0.5,
      height,
      color: rgb(
        start.red + (end.red - start.red) * ratio,
        start.green + (end.green - start.green) * ratio,
        start.blue + (end.blue - start.blue) * ratio,
      ),
    });
  }
}

function hexColor(value: string) {
  const hex = value.replace("#", "");
  return rgb(Number.parseInt(hex.slice(0, 2), 16) / 255, Number.parseInt(hex.slice(2, 4), 16) / 255, Number.parseInt(hex.slice(4, 6), 16) / 255);
}

function mm(value: number) {
  return value * 72 / 25.4;
}
