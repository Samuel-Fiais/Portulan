import { normalizeHex } from "./color-utils.ts";

export type MermaidPalette = {
  primary: string;
  secondary: string;
};

function mixHex(from: string, to: string, amount: number) {
  const parse = (hex: string) => {
    const value = normalizeHex(hex, "#000000").slice(1);
    return [
      Number.parseInt(value.slice(0, 2), 16),
      Number.parseInt(value.slice(2, 4), 16),
      Number.parseInt(value.slice(4, 6), 16),
    ];
  };
  const [fromRed, fromGreen, fromBlue] = parse(from);
  const [toRed, toGreen, toBlue] = parse(to);
  const mix = (left: number, right: number) => Math.round(left + (right - left) * amount);
  return `#${[mix(fromRed, toRed), mix(fromGreen, toGreen), mix(fromBlue, toBlue)]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Mermaid `themeVariables` derived from the report template palette. */
export function mermaidThemeVariables({ primary, secondary }: MermaidPalette) {
  const accent = normalizeHex(primary, "#7c2be3");
  const accent2 = normalizeHex(secondary, "#3d3580");
  const nodeFill = mixHex(accent, "#ffffff", 0.88);
  const stateFill = mixHex(accent2, "#ffffff", 0.85);
  const noteFill = mixHex(accent, "#fff0ee", 0.35);

  return {
    background: "#FFFFFF",
    primaryColor: nodeFill,
    primaryTextColor: "#1A1750",
    primaryBorderColor: accent,
    secondaryColor: "#F5F5F5",
    secondaryTextColor: "#0A0A0A",
    secondaryBorderColor: "#D4D4D4",
    tertiaryColor: mixHex(accent2, "#ffffff", 0.9),
    tertiaryTextColor: "#0A0A0A",
    tertiaryBorderColor: accent2,
    lineColor: accent,
    edgeLabelBackground: "#FFFFFF",
    clusterBkg: "#F5F5F5",
    fontFamily: "JetBrains Mono, monospace",
    fontSize: "13px",
    actorLineColor: "#D4D4D4",
    signalColor: accent,
    signalTextColor: "#0A0A0A",
    labelBoxBkgColor: nodeFill,
    labelBoxBorderColor: accent,
    labelTextColor: "#0A0A0A",
    loopTextColor: "#0A0A0A",
    noteBkgColor: noteFill,
    noteTextColor: accent2,
    noteBorderColor: accent2,
    activationBkgColor: nodeFill,
    activationBorderColor: accent,
    transitionColor: accent2,
    stateLabelColor: "#1A1750",
    labelColor: "#1A1750",
    stateBkg: stateFill,
    labelBackgroundColor: "#FFFFFF",
    altBackground: "#F5F5F5",
    compositeBackground: "#F5F5F5",
    compositeBorder: "#D4D4D4",
    nodeBorder: accent2,
    mainBkg: stateFill,
  };
}

/** Prepend a palette-aware init block when the author did not supply one. */
export function withMermaidInit(source: string, palette: MermaidPalette) {
  const trimmed = source.trim();
  if (/^%%\{init:/m.test(trimmed)) return trimmed;

  const init = `%%{init: ${JSON.stringify({
    theme: "base",
    themeVariables: mermaidThemeVariables(palette),
  })}}%%`;

  return `${init}\n${trimmed}`;
}
