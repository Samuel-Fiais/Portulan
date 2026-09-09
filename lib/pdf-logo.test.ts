import assert from "node:assert/strict";
import test from "node:test";
import {
  detectPdfLogoFormat,
  resolveAbsoluteLogoUrl,
  toPdfEmbedMime,
} from "./pdf-logo.ts";

test("resolveAbsoluteLogoUrl preserves absolute and data URLs", () => {
  assert.equal(
    resolveAbsoluteLogoUrl("https://example.com/logo.png", "http://localhost:3000"),
    "https://example.com/logo.png",
  );
  assert.equal(
    resolveAbsoluteLogoUrl("/api/brand/navy", "http://localhost:3000"),
    "http://localhost:3000/api/brand/navy",
  );
});

test("detectPdfLogoFormat identifies png and jpeg from magic bytes", () => {
  const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const jpg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  assert.equal(detectPdfLogoFormat(png), "png");
  assert.equal(detectPdfLogoFormat(jpg), "jpg");
});

test("detectPdfLogoFormat identifies webp and svg", () => {
  const webp = Uint8Array.from([
    0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
    0x57, 0x45, 0x42, 0x50,
  ]);
  const svg = Uint8Array.from(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>"));
  assert.equal(detectPdfLogoFormat(webp), "webp");
  assert.equal(detectPdfLogoFormat(svg), "svg");
});

test("toPdfEmbedMime only allows png and jpg", () => {
  assert.equal(toPdfEmbedMime("png"), "png");
  assert.equal(toPdfEmbedMime("jpg"), "jpg");
  assert.equal(toPdfEmbedMime("webp"), null);
  assert.equal(toPdfEmbedMime("svg"), null);
});
