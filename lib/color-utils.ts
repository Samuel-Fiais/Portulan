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
