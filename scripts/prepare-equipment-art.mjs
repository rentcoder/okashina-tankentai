import sharp from "sharp";
import { readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import sets from "../src/adventure-equipment.json" with { type: "json" };
const sources = JSON.parse(
  await readFile("docs/equipment-art-sources.json", "utf8"),
);
const root = process.argv[2] || "/workspace/generated_images";
async function crop(file, index) {
  const src = join(root, file),
    m = await sharp(src).metadata(),
    w = Math.floor(m.width / 3),
    h = Math.floor(m.height / 2);
  return sharp(src)
    .extract({
      left: (index % 3) * w + 2,
      top: Math.floor(index / 3) * h + 2,
      width: w - 4,
      height: h - 4,
    })
    .png()
    .toBuffer();
}
await mkdir("public/art/adventures/v1/equipment", { recursive: true });
for (const [place, files] of Object.entries(sources)) {
  if (process.argv[3] && place !== process.argv[3]) continue;
  await mkdir(`public/art/adventures/v1/${place}`, { recursive: true });
  for (const [i, item] of sets[place].entries()) {
    await sharp(await crop(files.icons, i))
      .resize(256, 256)
      .webp({ quality: 88 })
      .toFile(`public/art/adventures/v1/equipment/${item.id}.webp`);
    await sharp(await crop(files.outcomes, i))
      .resize(512, 512)
      .webp({ quality: 88 })
      .toFile(`public/art/adventures/v1/${place}/after-${item.id}.webp`);
  }
}
