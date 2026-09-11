import puppeteer from "puppeteer-core";
import type { Page } from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { accessSync, constants, existsSync } from "node:fs";
import { PDFDocument, StandardFonts, rgb, type RGB } from "pdf-lib";
import { copyPdfPreservingAnnotations } from "@/lib/pdf-annotations";
import { applyPdfInternalLinks, type PdfInternalLinkLayout } from "@/lib/pdf-internal-links";
import { loadPdfLogoBytes } from "@/lib/pdf-logo";

export type PdfExportMetadata = {
  slug: string;
  version: number;
  date: string;
  primaryColor: string;
  secondaryColor: string;
  templateName: string;
  logoUrl: string | null;
};

export type GeneratePdfInput = {
  origin: string;
  exportPath: string;
  sessionCookie: string | null;
  metadata: PdfExportMetadata;
};

export async function generateDocumentPdf(input: GeneratePdfInput) {
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    if (input.sessionCookie) {
      await page.setExtraHTTPHeaders({ cookie: input.sessionCookie });
    }
    const logo = await loadPdfLogoBytes(input.metadata.logoUrl, { origin: input.origin, page });
    await page.setViewport({ width: A4_WIDTH_PX, height: A4_HEIGHT_PX, deviceScaleFactor: 1 });
    await page.emulateMediaType("screen");
    await page.goto(`${input.origin}${input.exportPath}`, {
      waitUntil: "networkidle0",
      timeout: 45_000,
    });
    await page.evaluate(async () => {
      await window.document.fonts.ready;
    });
    await page.waitForFunction(
      () => !window.document.querySelector('[data-mermaid-state="pending"]'),
      { timeout: 30_000 },
    );
    await preparePdfPage(page);
    const internalLinks = await collectPdfInternalLinkLayout(page);

    const contentPdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: `${pdfTopMarginMm()}mm`, right: "0mm", bottom: "8mm", left: "0mm" },
    });
    const pdf = await addRunningFurniture(new Uint8Array(contentPdf), {
      logo,
      primaryColor: input.metadata.primaryColor,
      secondaryColor: input.metadata.secondaryColor,
      templateName: input.metadata.templateName,
      version: input.metadata.version,
      date: input.metadata.date,
      internalLinks,
    });

    return {
      pdf,
      filename: `${safeFilename(input.metadata.slug)}.pdf`,
    };
  } finally {
    await browser.close();
  }
}

export function releasePdfFilename(slug: string, version: number) {
  return `${safeFilename(slug)}-v${version}.pdf`;
}

async function preparePdfPage(page: Page) {
  await page.addStyleTag({
    content: `
      nextjs-portal, [data-next-badge-root], [data-nextjs-dialog-overlay], [data-nextjs-toast] {
        display: none !important;
        visibility: hidden !important;
      }
      .pdf-export-page .template-document-table,
      .pdf-export-page .template-document-table > thead,
      .pdf-export-page .template-document-table > tbody,
      .pdf-export-page .template-document-table > tfoot,
      .pdf-export-page .template-document-table > thead > tr,
      .pdf-export-page .template-document-table > tbody > tr,
      .pdf-export-page .template-document-table > tfoot > tr,
      .pdf-export-page .template-document-table > thead > tr > th,
      .pdf-export-page .template-document-table > tbody > tr > td,
      .pdf-export-page .template-document-table > tfoot > tr > td {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
      }
      .pdf-export-page .template-document-table > thead,
      .pdf-export-page .template-document-table > tfoot,
      .pdf-export-page .tmpl-doc-header,
      .pdf-export-page .tmpl-header-bar,
      .pdf-export-page .tmpl-footer {
        display: none !important;
      }
      .pdf-export-page .tmpl-section,
      .pdf-export-page .tmpl-section-row,
      .pdf-export-page .report-content tr,
      .pdf-export-page .keep-together {
        break-inside: auto !important;
        page-break-inside: auto !important;
      }
    `,
  });
  await page.evaluate(() => {
    for (const selector of ["nextjs-portal", "[data-next-badge-root]", "[data-nextjs-toast]"]) {
      document.querySelectorAll(selector).forEach((node) => node.remove());
    }
    document.querySelectorAll(".pdf-export-page .template-document-table > thead, .pdf-export-page .template-document-table > tfoot").forEach((node) => node.remove());
    document.querySelectorAll("a[href]").forEach((node) => {
      const anchor = node as HTMLAnchorElement;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("javascript:")) return;
      try {
        anchor.setAttribute("href", new URL(href, window.location.href).href);
      } catch {
        /* ignore invalid href */
      }
    });
  });
}

async function collectPdfInternalLinkLayout(page: Page): Promise<PdfInternalLinkLayout> {
  await page.evaluate(() => window.scrollTo(0, 0));
  return page.evaluate(() => {
    const box = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return {
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
      };
    };

    const links = [...document.querySelectorAll('a[href^="#"]')].flatMap((node) => {
      const href = node.getAttribute("href") ?? "";
      const fragment = decodeURIComponent(href.slice(1));
      if (!fragment) return [];
      const rect = box(node);
      if (rect.width < 1 || rect.height < 1) return [];
      return [{ fragment, ...rect }];
    });

    const dests = [...document.querySelectorAll("[id]")].flatMap((node) => {
      const fragment = node.id.trim();
      if (!fragment) return [];
      const rect = box(node);
      return [{ fragment, x: rect.x, y: rect.y }];
    });

    return { links, dests };
  });
}

function isServerlessRuntime() {
  if (process.platform !== "linux") return false;

  return Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.AWS_EXECUTION_ENV,
  );
}

async function launchBrowser() {
  if (isServerlessRuntime()) {
    return puppeteer.launch({
      args: await puppeteer.defaultArgs({ args: [...chromium.args, "--hide-scrollbars"], headless: "shell" }),
      executablePath: await chromium.executablePath(),
      headless: "shell",
    });
  }

  return puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--hide-scrollbars"],
    executablePath: resolveLocalChromePath(),
  });
}

function resolveLocalChromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/Applications/Comet.app/Contents/MacOS/Comet",
    "/Applications/Arc.app/Contents/MacOS/Arc",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (isExecutableFile(candidate)) return candidate;
  }

  throw new Error(
    "Chrome not found for local PDF export. Install Chrome/Chromium or set CHROME_PATH.",
  );
}

function isExecutableFile(path: string) {
  if (!existsSync(path)) return false;

  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function safeFilename(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-");
}

async function addRunningFurniture(source: Uint8Array, input: {
  logo: { bytes: Uint8Array; mime: "png" | "jpg" };
  primaryColor: string;
  secondaryColor: string;
  templateName: string;
  version: number;
  date: string;
  internalLinks?: PdfInternalLinkLayout;
}) {
  const pdf = await copyPdfPreservingAnnotations(source);
  if (input.internalLinks) {
    applyPdfInternalLinks(pdf, input.internalLinks, {
      topMargin: mm(pdfTopMarginMm()),
      bottomMargin: mm(8),
      cssPxToPt: pdf.getPages()[0]!.getSize().width / A4_WIDTH_PX,
    });
  }
  const logo = input.logo.mime === "jpg"
    ? await pdf.embedJpg(input.logo.bytes)
    : await pdf.embedPng(input.logo.bytes);
  const regular = await pdf.embedFont(StandardFonts.Courier);
  const bold = await pdf.embedFont(StandardFonts.CourierBold);
  const primary = hexColor(input.primaryColor);
  const secondary = hexColor(input.secondaryColor);
  const surface = hexColor("#F5F5F5");
  const border = hexColor("#D4D4D4");
  const muted = hexColor("#A3A3A3");
  const headerTopPadding = mm(3);
  const headerBodyHeight = mm(10);
  const headerGradientHeight = mm(1);
  const headerHeight = headerTopPadding + headerBodyHeight;
  const coverGap = mm(PDF_CONTENT_TOP_PADDING_MM);
  const footerHeight = mm(8);
  const inset = mm(7);
  const metadata = `v${input.version} · ${input.date}`;
  const footer = `Portulan · Confidencial · ${input.date}`;

  for (const [index, page] of pdf.getPages().entries()) {
    const { width, height } = page.getSize();
    page.drawRectangle({ x: 0, y: height - headerHeight, width, height: headerHeight, color: surface });
    drawGradient(page, height - headerHeight - headerGradientHeight, width, headerGradientHeight, primary, secondary);
    if (index === 0) {
      page.drawRectangle({
        x: 0,
        y: height - headerHeight - headerGradientHeight - coverGap,
        width,
        height: coverGap,
        color: surface,
      });
    }

    const headerLogoHeight = mm(5);
    const headerLogoWidth = logo.width * (headerLogoHeight / logo.height);
    page.drawImage(logo, {
      x: inset,
      y: height - mm(7.5) - headerTopPadding,
      width: headerLogoWidth,
      height: headerLogoHeight,
    });
    drawRightText(page, input.templateName.toUpperCase(), width - inset, height - mm(3.2) - headerTopPadding, bold, 6.7, primary);
    drawRightText(page, metadata, width - inset, height - mm(6.8) - headerTopPadding, regular, 6.2, muted);

    page.drawRectangle({ x: 0, y: 0, width, height: footerHeight, color: surface });
    page.drawLine({ start: { x: 0, y: footerHeight }, end: { x: width, y: footerHeight }, thickness: 0.6, color: border });
    const footerLogoHeight = mm(4);
    const footerLogoWidth = logo.width * (footerLogoHeight / logo.height);
    page.drawImage(logo, { x: inset, y: mm(2), width: footerLogoWidth, height: footerLogoHeight });
    drawRightText(page, footer, width - inset, mm(3.1), regular, 6.2, muted);
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

const A4_WIDTH_PX = Math.round((210 * 96) / 25.4);
const A4_HEIGHT_PX = Math.round((297 * 96) / 25.4);
const PDF_HEADER_FURNITURE_MM = 3 + 10 + 1;
const PDF_CONTENT_TOP_PADDING_MM = 8.5;

function pdfTopMarginMm() {
  return PDF_HEADER_FURNITURE_MM + PDF_CONTENT_TOP_PADDING_MM;
}
