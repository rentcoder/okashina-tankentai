import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { places, allItems, makeAdventure } from "../src/stories.js";
import {
  adventureEquipment,
  itemIdsFor,
  legacyItemIds,
} from "../src/equipment.js";
import { sceneImage, equipmentImage } from "../src/art.js";
import calendar from "../src/story-calendar.json" with { type: "json" };
test("each adventure has six distinct illustrated choices and matching outcomes", async () => {
  const used = new Set();
  for (const p of places) {
    const entries = adventureEquipment[p.id];
    assert.equal(entries.length, 6);
    assert.deepEqual(itemIdsFor(p.id, "2026-11-13"), legacyItemIds);
    assert.deepEqual(
      itemIdsFor(p.id, "2026-11-14"),
      entries.map((i) => i.id),
    );
    for (const i of entries) {
      assert.ok(!used.has(i.id));
      used.add(i.id);
      assert.ok(allItems.some((a) => a.id === i.id));
      for (const t of [i.name, i.action])
        assert.doesNotMatch(
          t.replace(/[一-龯々]+《[^》]+》/g, ""),
          /[一-龯々]/,
        );
      const icon = sharp("public" + equipmentImage(i.id));
      assert.ok((await icon.metadata()).hasAlpha);
      const alpha = (await icon.stats()).channels.at(-1);
      assert.equal(alpha.min, 0);
      assert.ok(alpha.max > 240);
      const outcome = await sharp(
        "public" + sceneImage(p.id, "after", i.id),
      ).metadata();
      assert.equal(outcome.width, 512);
      assert.equal(outcome.height, 512);
    }
  }
  assert.equal(used.size, places.length * 6);
});
test("new diary snapshots the selected tool while old diaries retain legacy paths", () => {
  const member = { id: "m", name: "こども", avatar: "boy-green" };
  for (let n = 0; n < calendar.at(-1).places.length; n++) {
    const day = new Date(Date.parse("2026-11-14") + n * 86400000)
      .toISOString()
      .slice(0, 10);
    const p = calendar.at(-1).places[n];
    for (const i of adventureEquipment[p]) {
      const a = makeAdventure(day, [member], [{ member_id: "m", item: i.id }]);
      assert.equal(a.place, p);
      assert.equal(a.participants[0].action, i.action);
    }
  }
  assert.equal(
    sceneImage("river", "after", "pudding"),
    "/art/adventures/v1/river/after-pudding.webp",
  );
  assert.equal(
    sceneImage("river", "after", "sea-baton"),
    sceneImage("river", "after"),
  );
});
