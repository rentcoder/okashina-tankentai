import sharp from "sharp";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { cp, mkdir, rm, readFile, writeFile } from "node:fs/promises";
await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await cp("public", "dist", { recursive: true });
await build({
  entryPoints: ["src/app.js"],
  outfile: "dist/app.js",
  bundle: true,
  minify: true,
  format: "esm",
  target: "es2022",
});

await mkdir("dist/icons", { recursive: true });
const icon = await readFile("public/icon.svg");
for (const size of [192, 512])
  await sharp(icon)
    .resize(size, size)
    .png()
    .toFile(`dist/icons/icon-${size}.png`);
await sharp(icon)
  .resize(180, 180)
  .flatten({ background: "#f6f2e8" })
  .png()
  .toFile("dist/icons/apple-touch-icon.png");
const safeIcon = await sharp(icon).resize(320, 320).png().toBuffer();
await sharp({
  create: { width: 512, height: 512, channels: 4, background: "#f6f2e8" },
})
  .composite([{ input: safeIcon, gravity: "centre" }])
  .png()
  .toFile("dist/icons/maskable-512.png");
const sw = await readFile("public/sw.js", "utf8");
const offline = await readFile("public/offline.html", "utf8");
const version = createHash("sha256")
  .update(sw + offline)
  .digest("hex")
  .slice(0, 12);
await writeFile("dist/sw.js", sw.replace("__VERSION__", version));
