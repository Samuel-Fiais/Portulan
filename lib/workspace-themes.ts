import { adaptColorForBackground, normalizeHex, pickContrastInkColor } from "./color-utils.ts";

export const THEME_STORAGE_KEY = "portulan-theme";
export const THEME_LEGACY_STORAGE_KEY = "festpay-docs-theme";
export const DEFAULT_CUSTOM_INK = "#1a2847";

export const THEME_NAMED_PAPER_IDS = ["carta", "pergaminho", "nevoa", "costa", "lacre"] as const;
export const CUSTOM_PAPER_ID = "personalizado";
export const THEME_PAPER_IDS = [...THEME_NAMED_PAPER_IDS, CUSTOM_PAPER_ID] as const;

export type ThemeNamedPaperId = (typeof THEME_NAMED_PAPER_IDS)[number];
export type ThemePaperId = (typeof THEME_PAPER_IDS)[number];
export type ThemeMode = "light" | "dark";

export type ThemePreference = {
  paper: ThemePaperId;
  mode: ThemeMode;
  customInk: string;
};

export type ThemeSwatch = {
  paper: string;
  ink: string;
  bar: string;
  muted: string;
};

export type ThemePaperDefinition = {
  id: ThemeNamedPaperId;
  name: string;
  blurb: string;
  light: ThemeSwatch;
  dark: ThemeSwatch;
};

export const DEFAULT_THEME_PREFERENCE: ThemePreference = {
  paper: "carta",
  mode: "light",
  customInk: DEFAULT_CUSTOM_INK,
};

export const WORKSPACE_PAPERS: readonly ThemePaperDefinition[] = [
  {
    id: "carta",
    name: "Carta",
    blurb: "Navy de gráfico no papel branco",
    light: { paper: "#FFFFFF", ink: "#111111", bar: "#1A2847", muted: "#6B6B6B" },
    dark: { paper: "#111111", ink: "#EFEFEF", bar: "#9EC5F0", muted: "#C4C4C4" },
  },
  {
    id: "pergaminho",
    name: "Pergaminho",
    blurb: "Umber no velino, ferrugem na sobrancelha",
    light: { paper: "#F3E6CC", ink: "#1A140C", bar: "#4A3014", muted: "#5A4530" },
    dark: { paper: "#16110A", ink: "#F3E6CC", bar: "#E2C48A", muted: "#C9B089" },
  },
  {
    id: "nevoa",
    name: "Névoa",
    blurb: "Grafite na bruma, índigo no acento",
    light: { paper: "#E6E8EC", ink: "#14161C", bar: "#1E232B", muted: "#3E4450" },
    dark: { paper: "#0D0E11", ink: "#E6E8EC", bar: "#C8CED8", muted: "#A8AEB8" },
  },
  {
    id: "costa",
    name: "Costa",
    blurb: "Teal de sondagem, navy no acento",
    light: { paper: "#E4F3EF", ink: "#0A1614", bar: "#0A5C52", muted: "#3A5A54" },
    dark: { paper: "#051412", ink: "#D8F4EE", bar: "#3DDEC8", muted: "#8FB8B0" },
  },
  {
    id: "lacre",
    name: "Lacre",
    blurb: "Cera no botão, navy na sobrancelha",
    light: { paper: "#F7E6E8", ink: "#1A0C10", bar: "#8B2735", muted: "#6A3A40" },
    dark: { paper: "#14090B", ink: "#F7E6E8", bar: "#E88994", muted: "#D0A0A6" },
  },
];

export function isThemePaperId(value: string | null | undefined): value is ThemePaperId {
  return THEME_PAPER_IDS.includes(value as ThemePaperId);
}

export function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return value === "light" || value === "dark";
}

export function parseCustomInk(value: string | null | undefined): string {
  if (!value) return DEFAULT_CUSTOM_INK;
  return normalizeHex(value, DEFAULT_CUSTOM_INK);
}

export function serializeThemePreference(preference: ThemePreference): string {
  return `${preference.paper}:${preference.mode}:${preference.customInk}`;
}

export function parseThemePreference(
  raw: string | null | undefined,
  systemDark = false,
): ThemePreference {
  if (raw === "dark" || raw === "light") {
    return { paper: "carta", mode: raw, customInk: DEFAULT_CUSTOM_INK };
  }

  if (raw) {
    const [paperPart = "", modePart = "", inkPart = ""] = raw.split(":");
    const paper = isThemePaperId(paperPart) ? paperPart : "carta";
    const mode = isThemeMode(modePart) ? modePart : systemDark ? "dark" : "light";
    const customInk = parseCustomInk(inkPart.startsWith("#") ? inkPart : DEFAULT_CUSTOM_INK);
    return { paper, mode, customInk };
  }

  return { paper: "carta", mode: systemDark ? "dark" : "light", customInk: DEFAULT_CUSTOM_INK };
}

export function resolveCustomActionInk(hex: string, mode: ThemeMode) {
  const paper = mode === "dark" ? "#111111" : "#ffffff";
  const ink = adaptColorForBackground(hex, paper);
  return { ink, foreground: pickContrastInkColor(ink) };
}

/** Preferência de papel por pessoa e por porto, gravada neste navegador. */
export function themeOverrideStorageKey(workspaceId?: string | null) {
  return workspaceId ? `${THEME_STORAGE_KEY}:${workspaceId}` : THEME_STORAGE_KEY;
}

export function applyThemeToDocument(preference: ThemePreference) {
  if (typeof document === "undefined") return preference.customInk;
  const ink = parseCustomInk(preference.customInk);
  document.documentElement.classList.toggle("dark", preference.mode === "dark");
  document.documentElement.setAttribute("data-theme", preference.paper);
  document.documentElement.removeAttribute("data-accent");
  document.documentElement.setAttribute("data-user-ink", ink);
  document.documentElement.style.setProperty("--user-ink", ink);
  document.documentElement.style.setProperty("--user-ink-fg", pickContrastInkColor(ink));
  return ink;
}

export function applyThemePreference(preference: ThemePreference, workspaceId?: string | null) {
  if (typeof document === "undefined") return;
  const ink = applyThemeToDocument(preference);
  localStorage.setItem(
    themeOverrideStorageKey(workspaceId),
    serializeThemePreference({ ...preference, customInk: ink }),
  );
  localStorage.removeItem(THEME_LEGACY_STORAGE_KEY);
}

/** Volta ao tema definido pelo porto neste navegador. */
export function clearThemeOverride(workspaceId?: string | null) {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(themeOverrideStorageKey(workspaceId));
  if (!workspaceId) localStorage.removeItem(THEME_LEGACY_STORAGE_KEY);
}

export function hasThemeOverride(workspaceId?: string | null) {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(themeOverrideStorageKey(workspaceId)) != null;
}

export function readDocumentThemePreference(): ThemePreference {
  if (typeof document === "undefined") return DEFAULT_THEME_PREFERENCE;
  const paperAttr = document.documentElement.getAttribute("data-theme");
  return {
    paper: isThemePaperId(paperAttr) ? paperAttr : "carta",
    mode: document.documentElement.classList.contains("dark") ? "dark" : "light",
    customInk: parseCustomInk(document.documentElement.getAttribute("data-user-ink")),
  };
}
