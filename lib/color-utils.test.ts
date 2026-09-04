import assert from "node:assert/strict";
import { test } from "node:test";
import {
  REPORT_PAPER_DARK_BG,
  REPORT_PAPER_LIGHT_BG,
  adaptColorForBackground,
  contrastRatio,
  pickContrastInkColor,
  reportPaletteStyle,
} from "./color-utils.ts";

test("navy keeps contrast on white and is lightened on dark paper", () => {
  const navy = "#1a2847";
  const onLight = adaptColorForBackground(navy, REPORT_PAPER_LIGHT_BG);
  const onDark = adaptColorForBackground(navy, REPORT_PAPER_DARK_BG);

  assert.equal(onLight, navy);
  assert.ok(contrastRatio(onLight, REPORT_PAPER_LIGHT_BG) >= 4.5);
  assert.notEqual(onDark, navy);
  assert.ok(contrastRatio(onDark, REPORT_PAPER_DARK_BG) >= 4.5);
});

test("gold is darkened on white and keeps contrast on dark paper", () => {
  const gold = "#c5a572";
  const onLight = adaptColorForBackground(gold, REPORT_PAPER_LIGHT_BG);
  const onDark = adaptColorForBackground(gold, REPORT_PAPER_DARK_BG);

  assert.notEqual(onLight, gold);
  assert.ok(contrastRatio(onLight, REPORT_PAPER_LIGHT_BG) >= 4.5);
  assert.ok(contrastRatio(onDark, REPORT_PAPER_DARK_BG) >= 4.5);
});

test("reportPaletteStyle exposes opposite-screen accents and matching ink", () => {
  const palette = reportPaletteStyle("#1a2847", "#c5a572");

  assert.ok(contrastRatio(palette["--report-accent-light"], REPORT_PAPER_LIGHT_BG) >= 4.5);
  assert.ok(contrastRatio(palette["--report-accent-dark"], REPORT_PAPER_DARK_BG) >= 4.5);
  assert.ok(contrastRatio(palette["--report-accent-2-light"], REPORT_PAPER_LIGHT_BG) >= 4.5);
  assert.ok(contrastRatio(palette["--report-accent-2-dark"], REPORT_PAPER_DARK_BG) >= 4.5);
  assert.equal(palette["--report-ink-light"], pickContrastInkColor(palette["--report-accent-light"]));
  assert.equal(palette["--report-ink-dark"], pickContrastInkColor(palette["--report-accent-dark"]));
});
