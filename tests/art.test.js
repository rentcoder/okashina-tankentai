import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
import {
  placeIds,
  legacyPlaceIds,
  itemIds,
  sceneImage,
  treasureImage,
  hostImage,
  equipmentImage,
} from "../src/art.js";
import { places, items } from "../src/stories.js";
test("every story and item has unique complete pre-generated imagery", async () => {
  assert.deepEqual(
    places.map((p) => p.id),
    placeIds,
    legacyPlaceIds,
  );
  assert.deepEqual(
    items.map((i) => i.id),
    itemIds,
  );
  const paths = [
    ...placeIds.flatMap((p) => [
      sceneImage(p),
      sceneImage(p, "after"),
      treasureImage(p),
      hostImage(p),
      ...(legacyPlaceIds.includes(p)
        ? itemIds.map((i) => sceneImage(p, "after", i))
        : []),
    ]),
    ...itemIds.map(equipmentImage),
  ];
  const total =
    placeIds.length * 4 +
    legacyPlaceIds.filter((p) => placeIds.includes(p)).length * itemIds.length +
    itemIds.length;
  assert.equal(paths.length, total);
  assert.equal(new Set(paths).size, total);
  const hashes = new Set();
  for (const path of paths) {
    const file = await readFile("public" + path),
      meta = await sharp(file).metadata();
    assert.ok(meta.width >= 256);
    assert.ok(meta.height >= 250);
    assert.equal(meta.format, "webp");
    hashes.add(createHash("sha256").update(file).digest("hex"));
  }
  assert.equal(hashes.size, total);
});
test("old diary records use saved choice and missing choice has an illustrated fallback", () => {
  for (const place of placeIds) {
    assert.equal(sceneImage(place, "after", null), sceneImage(place, "after"));
    for (const item of legacyPlaceIds.includes(place) ? itemIds : []) {
      assert.ok(
        sceneImage(place, "after", item).endsWith(`/after-${item}.webp`),
      );
      assert.notEqual(sceneImage(place, "after", item), sceneImage(place));
    }
  }
  assert.throws(() => sceneImage("../private"));
  assert.throws(() => equipmentImage("unknown"));
});
test("predeparture text is distinct and all authored kanji includes ruby", () => {
  for (const p of places) {
    assert.ok(p.preview);
    assert.notEqual(p.preview, p.intro);
    assert.doesNotMatch(
      p.preview.replace(/[一-龯々]+《[^》]+》/g, ""),
      /[一-龯々]/,
    );
    assert.equal(p.treasureIcon, undefined);
  }
});
