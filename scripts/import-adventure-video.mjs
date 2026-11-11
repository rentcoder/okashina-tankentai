// Import a real generated clip. Never creates placeholder or panning-still videos.
import { execFileSync } from "node:child_process";
import {
  readFile,
  writeFile,
  mkdtemp,
  rm,
  mkdir,
  copyFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { placeIds } from "../src/art.js";
const [place, input] = process.argv.slice(2);
if (!placeIds.includes(place) || !input)
  throw new Error(
    "Usage: node scripts/import-adventure-video.mjs <adventure-id> <generated-video-path>",
  );
const source = resolve(input);
const probe = JSON.parse(
  execFileSync(
    "ffprobe",
    ["-v", "error", "-show_streams", "-show_format", "-of", "json", source],
    { encoding: "utf8" },
  ),
);
const stream = probe.streams.find((s) => s.codec_type === "video");
if (
  !stream ||
  Math.abs(stream.width / stream.height - 9 / 16) > 0.025 ||
  Number(probe.format.duration) < 4.95
)
  throw new Error(
    "Input must be a portrait 9:16 video, at least 5 seconds long.",
  );
const temp = await mkdtemp(join(tmpdir(), "tankentai-video-"));
try {
  const out = join(temp, "clip.mp4");
  execFileSync("ffmpeg", [
    "-v",
    "error",
    "-i",
    source,
    "-map",
    "0:v:0",
    "-t",
    "5",
    "-vf",
    "scale=720:1280,setsar=1",
    "-r",
    "24",
    "-an",
    "-c:v",
    "libx264",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-y",
    out,
  ]);
  const bytes = await readFile(out),
    hash = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
  const root = "public/art/adventure-videos",
    file = `${place}-${hash}.mp4`;
  await mkdir(root, { recursive: true });
  await copyFile(out, join(root, file));
  const path = join(root, "manifest.json"),
    manifest = JSON.parse(await readFile(path, "utf8"));
  manifest[place] = {
    src: `/art/adventure-videos/${file}`,
    duration: 5,
    width: 720,
    height: 1280,
  };
  await writeFile(path, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Imported ${place}: 5 seconds, 720x1280, silent H.264 MP4`);
} finally {
  await rm(temp, { recursive: true, force: true });
}
