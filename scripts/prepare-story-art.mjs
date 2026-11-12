// Reproduce only one release's optimized assets from its original generated sheets.
import sharp from "sharp";
import { readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { adventureEquipment } from "../src/equipment.js";
const manifest = JSON.parse(await readFile(process.argv[2], "utf8"));
const input = process.argv[3] || "/workspace/generated_images";
const id = manifest.id;
const itemIds = manifest.itemIds || adventureEquipment[id].map((i) => i.id);
if (!/^[a-z][a-z0-9-]*$/.test(id)) throw new Error("Invalid story ID");
const root = `public/art/adventures/v1/${id}`;
await mkdir(root, { recursive: true });
async function cell(file, cols, rows, index, out, width) {
  const src = join(input, file),
    m = await sharp(src).metadata();
  const w = Math.floor(m.width / cols),
    h = Math.floor(m.height / rows);
  await sharp(src)
    .extract({
      left: (index % cols) * w + 2,
      top: Math.floor(index / cols) * h + 2,
      width: w - 4,
      height: h - 4,
    })
    .resize({ width })
    .webp({ quality: 88 })
    .toFile(out);
}
await cell(manifest.scenes, 2, 2, 0, `${root}/before.webp`, 768);
await cell(manifest.scenes, 2, 2, 1, `${root}/after.webp`, 768);
await cell(manifest.scenes, 2, 2, 3, `${root}/host.webp`, 384);
for (const [i, item] of itemIds.entries())
  await cell(manifest.outcomes, 3, 2, i, `${root}/after-${item}.webp`, 512);
await mkdir(`public/art/flipbooks/v1/${id}`, { recursive: true });
for (let i = 0; i < 5; i++)
  await cell(
    manifest.flipbook,
    3,
    2,
    i,
    `public/art/flipbooks/v1/${id}/frame-${i + 1}.webp`,
    512,
  );
await mkdir("public/art/treasures/v2", { recursive: true });
await sharp(join(input, manifest.treasure))
  .trim()
  .resize(352, 352, { fit: "contain", background: "#00000000" })
  .extend({ top: 16, bottom: 16, left: 16, right: 16, background: "#00000000" })
  .webp({ quality: 90 })
  .toFile(`public/art/treasures/v2/${id}.webp`);
console.log(`Prepared 15 assets for ${id}.`);
