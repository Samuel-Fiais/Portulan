import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const input = path.join(__dirname, "../public/portulan-logo.png");
const output = input;

const { data, info } = await sharp(input)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  // Knock out light/off-white plate; preserve navy script and artwork.
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

await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(output);

console.log(`Wrote transparent logo: ${output} (${info.width}x${info.height})`);
