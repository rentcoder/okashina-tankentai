import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { places, items, makeAdventure } from "../src/stories.js";
import { sceneImage, treasureImage, legacyPlaceIds } from "../src/art.js";
const b = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
try {
  const c = await b.newContext({ viewport: { width: 390, height: 844 } }),
    page = await c.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const members = items.map((item, i) => ({
    id: "m" + i,
    name: item.name,
    avatar: "🐰",
  }));
  let data;
  await page.route("**/api/state", (route) => route.fulfill({ json: data }));
  await mkdir("test-results", { recursive: true });
  const legacyPlaces = places.filter((p) => legacyPlaceIds.includes(p.id));
  for (const [index, place] of legacyPlaces.entries()) {
    const a = {
      day: "2026-11-11",
      place: place.id,
      intro: place.intro,
      ending: place.ending,
      treasure: place.id,
      participants: members.map((m, i) => ({
        ...m,
        item: items[i].id,
        action: place.itemActions?.[items[i].id],
      })),
    };
    data = {
      family: { name: "テストのおうち", revealHour: 18 },
      members,
      active: "m0",
      shared: true,
      parent: false,
      day: "2026-11-12",
      place: place.id,
      choices: [],
      adventures: [a],
      decorations: [{ slot: 0, member_id: "m0", treasure: place.id }],
      requests: [],
    };
    await page.goto("http://127.0.0.1:8788");
    await page.locator("[data-action=tab][data-id=adventure]").click();
    assert.equal(
      await page.locator(".story-scene img").getAttribute("src"),
      sceneImage(place.id),
    );
    await page.locator(".story-scene img").evaluate((img) => img.decode());
    assert.equal(await page.locator(".items .equipment-image").count(), 6);
    if (place.id === "garden" || place.id === "post")
      await page.screenshot({
        path: `test-results/${place.id}-before.png`,
        fullPage: true,
      });
    await page.locator("[data-action=tab][data-id=journal]").click();
    for (const [i, item] of items.entries()) {
      await page.locator(`[data-action=book][data-id=m${i}]`).click();
      assert.equal(
        await page.locator(".entry-art").getAttribute("src"),
        sceneImage(place.id, "after", item.id),
      );
      await page.locator("[data-action=entry]").click();
      const img = page.locator("dialog .story-scene img");
      assert.equal(
        await img.getAttribute("src"),
        sceneImage(place.id, "after", item.id),
      );
      await img.evaluate((img) => img.decode());
      if (place.itemActions)
        assert.ok(
          (await page.locator(".diary-action").first().textContent()).includes(
            place.itemActions[item.id],
          ),
        );
      assert.equal(
        await page.locator(".souvenir .treasure-image").getAttribute("src"),
        treasureImage(place.id),
      );
      if (["garden", "post"].includes(place.id) && item.id === "umbrella")
        await page.screenshot({
          path: `test-results/${place.id}-diary-umbrella.png`,
        });
      await page.locator("[data-action=close]").click();
    }
    await page.locator("[data-action=tab][data-id=collection]").click();
    assert.equal(
      await page.locator(".collection .treasure-image").getAttribute("src"),
      treasureImage(place.id),
    );
    await page
      .locator(".collection .treasure-image")
      .evaluate((img) => img.decode());
    if (place.id === "garden" || place.id === "post")
      await page.screenshot({
        path: `test-results/${place.id}-treasure.png`,
        fullPage: true,
      });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
  }
  // No selected equipment: old/absent participant record uses the common ending.
  data.adventures[0].participants[0].item = null;
  await page.reload();
  await page.locator("[data-action=tab][data-id=journal]").click();
  await page.locator("[data-action=entry]").click();
  assert.equal(
    await page.locator("dialog .story-scene img").getAttribute("src"),
    sceneImage(legacyPlaces.at(-1).id, "after"),
  );
  assert.deepEqual(errors, []);
  console.log(
    `PASS: ${legacyPlaces.length} departures, ${legacyPlaces.length * items.length} personalized diaries, ${legacyPlaces.length} treasures, ${items.length} equipment, historical fallback, mobile layout`,
  );
} finally {
  await b.close();
}
