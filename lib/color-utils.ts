export function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function rgbToHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue]
    .map((channel) => Math.round(Math.max(0, Math.min(255, channel))).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function rgbToHsv(red: number, green: number, blue: number): [number, number, number] {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let hue = 0;
  const saturation = max === 0 ? 0 : (delta / max) * 100;
  const value = max * 100;

  if (delta !== 0) {
    switch (max) {
      case r:
        hue = ((g - b) / delta + (g < b ? 6 : 0)) * 60;
        break;
      case g:
        hue = ((b - r) / delta + 2) * 60;
        break;
      default:
        hue = ((r - g) / delta + 4) * 60;
        break;
    }
  }

  return [hue, saturation, value];
}

export function hsvToRgb(hue: number, saturation: number, value: number): [number, number, number] {
  const s = saturation / 100;
  const v = value / 100;
  const chroma = v * s;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = v - chroma;

  let redPrime = 0;
  let greenPrime = 0;
  let bluePrime = 0;

  if (hue < 60) {
    redPrime = chroma;
    greenPrime = x;
  } else if (hue < 120) {
    redPrime = x;
    greenPrime = chroma;
  } else if (hue < 180) {
    greenPrime = chroma;
    bluePrime = x;
  } else if (hue < 240) {
    greenPrime = x;
    bluePrime = chroma;
  } else if (hue < 300) {
    redPrime = x;
    bluePrime = chroma;
  } else {
    redPrime = chroma;
    bluePrime = x;
  }

  return [(redPrime + m) * 255, (greenPrime + m) * 255, (bluePrime + m) * 255];
}

export function normalizeHex(value: string, fallback: string) {
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return /^#[0-9A-Fa-f]{6}$/.test(withHash) ? withHash.toLowerCase() : fallback;
}

function channelToLinear(channel: number) {
  const normalized = channel / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string) {
  const [red, green, blue] = hexToRgb(normalizeHex(hex, "#000000"));
  return 0.2126 * channelToLinear(red) + 0.7152 * channelToLinear(green) + 0.0722 * channelToLinear(blue);
}

export const REPORT_PAPER_LIGHT_BG = "#ffffff";
export const REPORT_PAPER_DARK_BG = "#111111";
export const MIN_ACCENT_CONTRAST = 4.5;

export function contrastRatio(foreground: string, background: string) {
  const left = relativeLuminance(foreground);
  const right = relativeLuminance(background);
  const [lighter, darker] = left > right ? [left, right] : [right, left];
  return (lighter + 0.05) / (darker + 0.05);
}

function mixHex(from: string, to: string, amount: number) {
  const [fromRed, fromGreen, fromBlue] = hexToRgb(normalizeHex(from, "#000000"));
  const [toRed, toGreen, toBlue] = hexToRgb(normalizeHex(to, "#000000"));
  return rgbToHex(
    fromRed + (toRed - fromRed) * amount,
    fromGreen + (toGreen - fromGreen) * amount,
    fromBlue + (toBlue - fromBlue) * amount,
  );
}

/** Keep hue, shift value (then mix) until the color meets WCAG contrast on a paper background. */
export function adaptColorForBackground(hex: string, background: string, minRatio = MIN_ACCENT_CONTRAST) {
  const color = normalizeHex(hex, "#000000");
  if (contrastRatio(color, background) >= minRatio) return color;

  const [hue, saturation, value] = rgbToHsv(...hexToRgb(color));
  const lighten = relativeLuminance(background) < 0.45;
  const step = lighten ? 1 : -1;

  for (let delta = 1; delta <= 100; delta += 1) {
    const nextValue = Math.max(0, Math.min(100, value + step * delta));
    const candidate = rgbToHex(...hsvToRgb(hue, saturation, nextValue));
    if (contrastRatio(candidate, background) >= minRatio) return candidate;
    if (nextValue === 0 || nextValue === 100) break;
  }

  const mixTarget = lighten ? "#ffffff" : "#000000";
  for (let amount = 0.04; amount <= 1; amount += 0.04) {
    const candidate = mixHex(color, mixTarget, amount);
    if (contrastRatio(candidate, background) >= minRatio) return candidate;
  }

  return mixTarget;
}

export function reportPaletteStyle(primaryColor: string, secondaryColor: string) {
  const primaryLight = adaptColorForBackground(primaryColor, REPORT_PAPER_LIGHT_BG);
  const primaryDark = adaptColorForBackground(primaryColor, REPORT_PAPER_DARK_BG);
  const secondaryLight = adaptColorForBackground(secondaryColor, REPORT_PAPER_LIGHT_BG);
  const secondaryDark = adaptColorForBackground(secondaryColor, REPORT_PAPER_DARK_BG);

  return {
    "--report-accent-light": primaryLight,
    "--report-accent-dark": primaryDark,
    "--report-accent-2-light": secondaryLight,
    "--report-accent-2-dark": secondaryDark,
    "--report-ink-light": pickContrastInkColor(primaryLight),
    "--report-ink-dark": pickContrastInkColor(primaryDark),
  };
}

/** Ink color for text on a solid or gradient badge background (white on dark, near-black on light). */
export function pickContrastInkColor(...colors: string[]) {
  const normalized = colors.map((color) => normalizeHex(color, "#000000"));
  const [avgRed, avgGreen, avgBlue] = normalized.reduce<[number, number, number]>(
    (totals, color) => {
      const [red, green, blue] = hexToRgb(color);
      return [totals[0] + red, totals[1] + green, totals[2] + blue];
    },
    [0, 0, 0],
  ).map((total) => total / normalized.length) as [number, number, number];

  const luminance =
    0.2126 * channelToLinear(avgRed) + 0.7152 * channelToLinear(avgGreen) + 0.0722 * channelToLinear(avgBlue);

  return luminance >= 0.45 ? "#0a0a0a" : "#ffffff";
}
