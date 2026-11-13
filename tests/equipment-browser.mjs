import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { places } from "../src/stories.js";
import { adventureEquipment } from "../src/equipment.js";
import { equipmentImage, sceneImage } from "../src/art.js";
const b = await chromium.launch({ args: ["--no-sandbox"] });
try {
  const page = await b.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  let data;
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/state", (r) => r.fulfill({ json: data }));
  for (const place of places) {
    const entries = adventureEquipment[place.id],
      members = entries.map((item, i) => ({
        id: "m" + i,
        name: "なかま" + i,
        avatar: "boy-green",
      }));
    data = {
      family: { name: "テスト", revealHour: 18 },
      members,
      active: "m0",
      shared: true,
      parent: false,
      day: "2026-11-14",
      place: place.id,
      itemIds: entries.map((i) => i.id),
      choices: [],
      requests: [],
      decorations: [],
      adventures: [
        {
          day: "2026-11-13",
          place: place.id,
          intro: place.intro,
          ending: place.ending,
          treasure: place.id,
          participants: members.map((m, i) => ({
            ...m,
            item: entries[i].id,
            action: entries[i].action,
          })),
        },
      ],
    };
    await page.goto("http://127.0.0.1:8788");
    await page.locator("[data-action=prepare]").click();
    assert.deepEqual(
      await page
        .locator("[data-action=choose]")
        .evaluateAll((ns) => ns.map((n) => n.dataset.id)),
      entries.map((i) => i.id),
    );
    await page
      .locator(".items img")
      .evaluateAll((ns) => Promise.all(ns.map((n) => n.decode())));
    if (place.id === places.at(-1).id)
      await page.screenshot({
        path: `test-results/${place.id}-equipment.png`,
        fullPage: true,
      });
    await page.locator("[data-action=tab][data-id=journal]").click();
    for (const [i, item] of entries.entries()) {
      await page.locator(`[data-action=book][data-id=m${i}]`).click();
      await page.locator("[data-action=entry]").click();
      await expect(page.locator(".diary-action").first()).toContainText(
        item.action,
      );
      await expect(page.locator("dialog .story-scene img")).toHaveAttribute(
        "src",
        sceneImage(place.id, "after", item.id),
      );
      await page.locator("dialog .story-scene img").evaluate((n) => n.decode());
      await expect(
        page.locator(".diary-action .equipment-image").first(),
      ).toHaveAttribute("src", equipmentImage(item.id));
      if (place.id === places.at(-1).id && i === 1)
        await page.screenshot({
          path: `test-results/${place.id}-new-diary.png`,
          fullPage: true,
        });
      await page.locator("[data-action=close]").click();
    }
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    `${places.length} story-specific menus and ${places.length * 6} matching illustrated outcomes passed.`,
  );
} finally {
  await b.close();
}
