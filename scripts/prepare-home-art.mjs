import sharp from "sharp";
import { readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
const sources = JSON.parse(
  await readFile("docs/home-art-sources.json", "utf8"),
);
const root = process.argv[2] || "/workspace/generated_images";
async function crop(file, index) {
  const src = join(root, file),
    m = await sharp(src).metadata(),
    w = Math.floor(m.width / 4),
    h = Math.floor(m.height / 2);
  return sharp(src)
    .extract({
      left: (index % 4) * w,
      top: Math.floor(index / 4) * h,
      width: w,
      height: h,
    })
    .png()
    .toBuffer();
}
await mkdir("public/art/treasures/v2", { recursive: true });
for (const [i, id] of sources.treasureOrder.entries()) {
  const buf = await crop(sources.treasures, i);
  await sharp(buf)
    .trim()
    .resize(352, 352, { fit: "contain", background: "#00000000" })
    .extend({
      top: 16,
      bottom: 16,
      left: 16,
      right: 16,
      background: "#00000000",
    })
    .webp({ quality: 90 })
    .toFile(`public/art/treasures/v2/${id}.webp`);
}
for (const [id, file] of Object.entries(sources.characters)) {
  await mkdir(`public/art/characters/v1/${id}`, { recursive: true });
  for (let i = 0; i < 8; i++)
    await sharp(await crop(file, i))
      .resize(288, 384)
      .webp({ quality: 88 })
      .toFile(`public/art/characters/v1/${id}/${i + 1}.webp`);
}
