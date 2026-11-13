import sharp from "sharp";
import { readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
const manifest = JSON.parse(
  await readFile("docs/walk-art-sources.json", "utf8"),
);
for (const [id, file] of Object.entries(manifest.sources)) {
  const source = join(process.argv[2] || "/workspace/generated_images", file);
  const meta = await sharp(source).metadata();
  const w = Math.floor(meta.width / 2),
    h = Math.floor(meta.height / 2),
    parts = [];
  for (let i = 0; i < 4; i++) {
    const raw = await sharp(source)
      .extract({
        left: (i % 2) * w + 3,
        top: Math.floor(i / 2) * h + 3,
        width: w - 6,
        height: h - 6,
      })
      .png()
      .toBuffer();
    const trimmed = await sharp(raw).trim({ threshold: 20 }).png().toBuffer();
    parts.push({ data: trimmed, meta: await sharp(trimmed).metadata() });
  }
  const scale = Math.min(
    350 / Math.max(...parts.map((p) => p.meta.height)),
    250 / Math.max(...parts.map((p) => p.meta.width)),
  );
  await mkdir(`public/art/characters/walk-v1/${id}`, { recursive: true });
  for (const [i, p] of parts.entries()) {
    const width = Math.round(p.meta.width * scale),
      height = Math.round(p.meta.height * scale);
    const input = await sharp(p.data).resize(width, height).toBuffer();
    await sharp({
      create: { width: 288, height: 384, channels: 4, background: "#00000000" },
    })
      .composite([
        { input, left: Math.floor((288 - width) / 2), top: 368 - height },
      ])
      .webp({ quality: 90 })
      .toFile(`public/art/characters/walk-v1/${id}/${i + 1}.webp`);
  }
}
