import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { frames } from "../src/flipbook.js";
import { placeIds } from "../src/art.js";
test("all seven flipbooks have five complete frames with brisk, adjustable timing", async () => {
  const paths = new Set();
  for (const id of placeIds) {
    const sequence = frames(id);
    assert.equal(sequence.length, 5);
    assert.ok(sequence.some((f) => f.duration === 500));
    assert.equal(sequence.at(-1).duration, 1000);
    assert.ok(sequence.reduce((sum, f) => sum + f.duration, 0) < 5000);
    for (const frame of sequence) {
      assert.ok(!paths.has(frame.src));
      paths.add(frame.src);
      const meta = await sharp(`public${frame.src}`).metadata();
      assert.equal(meta.width, 512);
      assert.equal(meta.height, 512);
    }
  }
});
