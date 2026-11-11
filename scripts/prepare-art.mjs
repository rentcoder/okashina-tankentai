// Crop generated asset sheets into exact game assets; no artwork is redrawn here.
import sharp from "sharp";
import { readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { itemIds } from "../src/art.js";
const sources = JSON.parse(await readFile("docs/art-sources.json", "utf8"));
const input = process.argv[2] || "/workspace/generated_images";
const root = "public/art/adventures/v1";
async function cell(file, cols, rows, index, target, width) {
  const source = join(input, file),
    meta = await sharp(source).metadata();
  const w = Math.floor(meta.width / cols),
    h = Math.floor(meta.height / rows);
  await sharp(source)
    .extract({
      left: (index % cols) * w + 2,
      top: Math.floor(index / cols) * h + 2,
      width: w - 4,
      height: h - 4,
    })
    .resize({ width })
    .webp({ quality: 85 })
    .toFile(target);
}
for (const [id, file] of Object.entries(sources.scenes)) {
  const dir = join(root, id);
  await mkdir(dir, { recursive: true });
  for (const [i, key] of ["before", "after", "treasure", "host"].entries())
    await cell(file, 2, 2, i, join(dir, key + ".webp"), i < 2 ? 768 : 384);
  for (const [i, item] of itemIds.entries())
    await cell(
      sources.outcomes[id],
      3,
      2,
      i,
      join(dir, "after-" + item + ".webp"),
      512,
    );
}
await mkdir(join(root, "equipment"), { recursive: true });
for (const [i, item] of itemIds.entries())
  await cell(
    sources.equipment,
    3,
    2,
    i,
    join(root, "equipment", item + ".webp"),
    256,
  );
console.log("Prepared 76 illustrated game assets.");
