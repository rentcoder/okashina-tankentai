import manifest from "../public/art/adventure-videos/manifest.json" with { type: "json" };

// One completed result video per adventure, independent of equipment or member.
// Null entries intentionally render nothing until a real clip has been imported.
export function resultVideo(place) {
  const clip = Object.hasOwn(manifest, place) ? manifest[place] : null;
  if (!clip) return null;
  if (
    clip.duration !== 5 ||
    clip.width !== 720 ||
    clip.height !== 1280 ||
    !/^\/art\/adventure-videos\/[a-z]+-[a-f0-9]{12}\.mp4$/.test(clip.src)
  ) {
    return null;
  }
  return clip;
}
