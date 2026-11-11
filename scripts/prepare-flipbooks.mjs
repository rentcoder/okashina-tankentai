import sharp from "sharp";
import { readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
const sources = JSON.parse(
  await readFile("docs/flipbook-sources.json", "utf8"),
);
const input = process.argv[2] || "/workspace/generated_images";
for (const [id, file] of Object.entries(sources)) {
  const source = join(input, file),
    meta = await sharp(source).metadata();
  const width = Math.floor(meta.width / 3),
    height = Math.floor(meta.height / 2);
  const dir = `public/art/flipbooks/v1/${id}`;
  await mkdir(dir, { recursive: true });
  for (let i = 0; i < 5; i++) {
    await sharp(source)
      .extract({
        left: (i % 3) * width + 2,
        top: Math.floor(i / 3) * height + 2,
        width: width - 4,
        height: height - 4,
      })
      .resize(512, 512)
      .webp({ quality: 85 })
      .toFile(`${dir}/frame-${i + 1}.webp`);
  }
}
