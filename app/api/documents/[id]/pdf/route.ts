import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { accessSync, constants, existsSync } from "node:fs";
import { PDFDocument, StandardFonts, rgb, type RGB } from "pdf-lib";
import { auth } from "@/auth";
import { getDocument } from "@/lib/db";
import { documentAccessContext } from "@/lib/access-context";
import { loadPdfLogoBytes } from "@/lib/pdf-logo";
import { formatDate } from "@/lib/utils";

type Context = { params: Promise<{ id: string }> };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request, { params }: Context) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const document = await getDocument(id, await documentAccessContext(session.user.id));
  if (!document) return Response.json({ error: "Documento não encontrado" }, { status: 404 });

  const date = formatDate(document.updatedAt);
  const sessionCookie = request.headers.get("cookie");
  const origin = new URL(request.url).origin;

  try {
    const browser = await launchBrowser();

    try {
      const page = await browser.newPage();
      if (sessionCookie) {
        await page.setExtraHTTPHeaders({ cookie: sessionCookie });
      }
      const logo = await loadPdfLogoBytes(document.logoUrl, { origin, page });
      await page.emulateMediaType("print");
      await page.goto(`${origin}/documents/${encodeURIComponent(document.id)}/export`, {
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

      const contentPdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: `${pdfTopMarginMm()}mm`, right: "0", bottom: "8mm", left: "0" },
      });
      const pdf = await addRunningFurniture(new Uint8Array(contentPdf), {
        logo,
        primaryColor: document.primaryColor,
        secondaryColor: document.secondaryColor,
        templateName: document.templateName,
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
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error("Falha ao gerar PDF", error);
    return Response.json({ error: "Não foi possível gerar o PDF" }, { status: 500 });
  }
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
      args: await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
      executablePath: await chromium.executablePath(),
      headless: "shell",
    });
  }

  return puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
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
}) {
  // Draw directly on the Puppeteer PDF so internal/external link annotations survive.
  const pdf = await PDFDocument.load(source);
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
  const headerTotalHeight = headerHeight + headerGradientHeight;
  const footerHeight = mm(8);
  const inset = mm(7);
  const metadata = `v${input.version} · ${input.date}`;
  const footer = `Portulan · Confidencial · ${input.date}`;

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    page.drawRectangle({ x: 0, y: height - headerTotalHeight, width, height: headerTotalHeight, color: surface });
    drawGradient(page, height - headerTotalHeight, width, headerGradientHeight, primary, secondary);

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

/** Must match the running header block drawn in addRunningFurniture (3 + 10 + 1 mm). */
const PDF_HEADER_FURNITURE_MM = 3 + 10 + 1;

function pdfTopMarginMm() {
  return PDF_HEADER_FURNITURE_MM;
}
