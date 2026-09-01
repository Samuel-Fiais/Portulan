import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const input = path.join(__dirname, "../public/portulan-logo.png");
const output = input;
const PAD = 20;

function knockOutBackground(data) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const maxChannel = Math.max(r, g, b);
    const minChannel = Math.min(r, g, b);
    const saturation = maxChannel === 0 ? 0 : (maxChannel - minChannel) / maxChannel;

    if (luminance > 235 || (luminance > 210 && saturation < 0.12)) {
      data[i + 3] = 0;
    } else if (luminance > 200 && saturation < 0.08) {
      data[i + 3] = Math.min(data[i + 3], Math.round(255 * (1 - (luminance - 200) / 35)));
    }
  }
}

function findOpaqueBounds(data, width, height) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 8) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    throw new Error("No opaque pixels found after background knockout.");
  }

  return {
    left: Math.max(0, minX - PAD),
    top: Math.max(0, minY - PAD),
    width: Math.min(width, maxX - minX + 1 + PAD * 2),
    height: Math.min(height, maxY - minY + 1 + PAD * 2),
  };
}

const source = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const data = Buffer.from(source.data);
knockOutBackground(data);

const crop = findOpaqueBounds(data, source.info.width, source.info.height);
const cropped = await sharp(data, {
  raw: { width: source.info.width, height: source.info.height, channels: 4 },
})
  .extract(crop)
  .png({ compressionLevel: 9 })
  .toFile(output);

console.log(
  `Wrote transparent logo: ${output} (${crop.width}x${crop.height}, cropped from ${source.info.width}x${source.info.height})`,
);
