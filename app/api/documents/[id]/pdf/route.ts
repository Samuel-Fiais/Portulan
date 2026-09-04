import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, StandardFonts, rgb, type RGB } from "pdf-lib";
import { auth } from "@/auth";
import { getDocument } from "@/lib/db";
import { documentAccessContext } from "@/lib/access-context";
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

  const logo = await loadLogoBytes(document.logoUrl);
  const date = formatDate(document.updatedAt);
  const sessionCookie = request.headers.get("cookie");

  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    if (sessionCookie) {
      await page.setExtraHTTPHeaders({ cookie: sessionCookie });
    }
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
  } catch (error) {
    console.error("Falha ao gerar PDF", error);
    return Response.json({ error: "Não foi possível gerar o PDF" }, { status: 500 });
  } finally {
    await browser.close();
  }
}

function isServerlessRuntime() {
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
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  throw new Error(
    "Chrome not found for local PDF export. Install Chrome/Chromium or set CHROME_PATH.",
  );
}

function safeFilename(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-");
}

async function loadLogoBytes(logoUrl: string | null): Promise<{ bytes: Uint8Array; mime: "png" | "jpg" }> {
  const fallbackPath = join(process.cwd(), "public", "portulan-logo.png");
  const fallback = { bytes: await readFile(fallbackPath), mime: "png" as const };

  if (!logoUrl) return fallback;

  try {
    if (logoUrl.startsWith("/")) {
      const localPath = join(process.cwd(), "public", logoUrl.replace(/^\//, ""));
      const bytes = await readFile(localPath);
      return { bytes, mime: guessImageMime(logoUrl) };
    }

    const response = await fetch(logoUrl, { headers: { Accept: "image/*" } });
    if (!response.ok) return fallback;

    const bytes = new Uint8Array(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("jpeg") || contentType.includes("jpg")) {
      return { bytes, mime: "jpg" };
    }
    if (contentType.includes("png") || logoUrl.toLowerCase().endsWith(".png")) {
      return { bytes, mime: "png" };
    }
    if (logoUrl.toLowerCase().endsWith(".jpg") || logoUrl.toLowerCase().endsWith(".jpeg")) {
      return { bytes, mime: "jpg" };
    }
    return { bytes, mime: "png" };
  } catch {
    return fallback;
  }
}

function guessImageMime(value: string): "png" | "jpg" {
  const lower = value.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "jpg";
  return "png";
}

async function addRunningFurniture(source: Uint8Array, input: {
  logo: { bytes: Uint8Array; mime: "png" | "jpg" };
  primaryColor: string;
  secondaryColor: string;
  templateName: string;
  version: number;
  date: string;
}) {
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
  const headerHeight = mm(10);
  const footerHeight = mm(8);
  const inset = mm(7);
  const metadata = `v${input.version} · ${input.date}`;
  const footer = `Portulan · Confidencial · ${input.date}`;

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    page.drawRectangle({ x: 0, y: height - headerHeight, width, height: headerHeight, color: surface });
    drawGradient(page, height - headerHeight - mm(1), width, mm(1), primary, secondary);

    const headerLogoHeight = mm(5);
    const headerLogoWidth = logo.width * (headerLogoHeight / logo.height);
    page.drawImage(logo, { x: inset, y: height - mm(7.5), width: headerLogoWidth, height: headerLogoHeight });
    drawRightText(page, input.templateName.toUpperCase(), width - inset, height - mm(3.2), bold, 6.7, primary);
    drawRightText(page, metadata, width - inset, height - mm(6.8), regular, 6.2, muted);

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
