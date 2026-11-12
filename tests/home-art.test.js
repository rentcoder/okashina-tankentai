import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import {
  characters,
  characterImage,
  characterFor,
  legacyAvatars,
} from "../src/characters.js";
import { placeIds, treasureImage } from "../src/art.js";
test("all characters and treasures use true alpha cutouts", async () => {
  for (const path of [
    ...characters.flatMap((c) =>
      Array.from({ length: 8 }, (_, i) => characterImage(c.id, i + 1)),
    ),
    ...placeIds.map(treasureImage),
  ]) {
    const img = sharp("public" + path),
      meta = await img.metadata(),
      stats = await img.stats();
    assert.ok(meta.hasAlpha, path);
    const alpha = stats.channels.at(-1);
    assert.equal(alpha.min, 0, path);
    assert.ok(alpha.max > 240, path);
    assert.ok(alpha.mean < 220, path);
  }
  for (const old of legacyAvatars)
    assert.ok(characters.includes(characterFor(old)));
  assert.equal(characterFor("../private").id, characters[0].id);
});
