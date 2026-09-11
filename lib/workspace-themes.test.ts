import assert from "node:assert/strict";
import { test } from "node:test";
import { contrastRatio } from "./color-utils.ts";
import {
  CUSTOM_PAPER_ID,
  DEFAULT_CUSTOM_INK,
  parseThemePreference,
  resolveCustomActionInk,
  serializeThemePreference,
  WORKSPACE_PAPERS,
} from "./workspace-themes.ts";

test("valor legado claro/escuro vira papel Carta", () => {
  assert.deepEqual(parseThemePreference("light"), {
    paper: "carta",
    mode: "light",
    customInk: DEFAULT_CUSTOM_INK,
  });
  assert.deepEqual(parseThemePreference("dark"), {
    paper: "carta",
    mode: "dark",
    customInk: DEFAULT_CUSTOM_INK,
  });
});

test("serializa e relê papel, modo e tinta livre", () => {
  const preference = { paper: CUSTOM_PAPER_ID, mode: "dark", customInk: "#c53620" } as const;
  assert.deepEqual(parseThemePreference(serializeThemePreference(preference)), preference);
  assert.deepEqual(parseThemePreference("carta:light"), {
    paper: "carta",
    mode: "light",
    customInk: DEFAULT_CUSTOM_INK,
  });
  assert.deepEqual(parseThemePreference("costa:dark:#007f70"), {
    paper: "costa",
    mode: "dark",
    customInk: "#007f70",
  });
});

test("papel ou terceiro segmento inválido caem no padrão", () => {
  assert.deepEqual(parseThemePreference("aurora:dark"), {
    paper: "carta",
    mode: "dark",
    customInk: DEFAULT_CUSTOM_INK,
  });
  assert.deepEqual(parseThemePreference("costa:dark:neon"), {
    paper: "costa",
    mode: "dark",
    customInk: DEFAULT_CUSTOM_INK,
  });
  assert.deepEqual(parseThemePreference("carta:light:coral"), {
    paper: "carta",
    mode: "light",
    customInk: DEFAULT_CUSTOM_INK,
  });
  assert.deepEqual(parseThemePreference(null, true), {
    paper: "carta",
    mode: "dark",
    customInk: DEFAULT_CUSTOM_INK,
  });
  assert.deepEqual(parseThemePreference("pergaminho", false), {
    paper: "pergaminho",
    mode: "light",
    customInk: DEFAULT_CUSTOM_INK,
  });
});

test("tinta, muted e ação de cada papel passam WCAG AA", () => {
  const actionInk: Record<string, { light: string; dark: string }> = {
    carta: { light: "#FFFFFF", dark: "#0A1020" },
    pergaminho: { light: "#F8EEDC", dark: "#1A140C" },
    nevoa: { light: "#F3F4F6", dark: "#12141A" },
    costa: { light: "#E8FAF6", dark: "#04211C" },
    lacre: { light: "#FDF3F4", dark: "#1A080C" },
  };

  for (const paper of WORKSPACE_PAPERS) {
    for (const mode of ["light", "dark"] as const) {
      const swatch = paper[mode];
      assert.ok(
        contrastRatio(swatch.ink, swatch.paper) >= 4.5,
        `${paper.id} ${mode} ink ${swatch.ink} on ${swatch.paper}`,
      );
      assert.ok(
        contrastRatio(swatch.muted, swatch.paper) >= 4.5,
        `${paper.id} ${mode} muted ${swatch.muted} on ${swatch.paper}`,
      );
      assert.ok(
        contrastRatio(swatch.bar, swatch.paper) >= 3,
        `${paper.id} ${mode} bar ${swatch.bar} on ${swatch.paper}`,
      );
      assert.ok(
        contrastRatio(actionInk[paper.id][mode], swatch.bar) >= 4.5,
        `${paper.id} ${mode} action label on ${swatch.bar}`,
      );
    }
  }
});

test("tinta livre adaptada passa AA no papel do modo", () => {
  const light = resolveCustomActionInk("#f4d4b0", "light");
  const dark = resolveCustomActionInk("#1a140c", "dark");
  assert.ok(contrastRatio(light.ink, "#ffffff") >= 4.5);
  assert.ok(contrastRatio(dark.ink, "#111111") >= 4.5);
});
