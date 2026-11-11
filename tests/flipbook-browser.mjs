import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { places } from "../src/stories.js";
import { frames } from "../src/flipbook.js";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const member = { id: "m0", name: "テスト", avatar: "🐰", item: "pudding" };
  await page.clock.install();
  let place = places[0];
  await page.route("**/api/state", (route) =>
    route.fulfill({
      json: {
        family: { name: "テスト", revealHour: 18 },
        members: [member],
        active: "m0",
        shared: true,
        parent: false,
        day: "2026-11-12",
        place: place.id,
        choices: [],
        adventures: [
          {
            day: "2026-11-11",
            place: place.id,
            intro: place.intro,
            ending: place.ending,
            treasure: place.id,
            participants: [member],
          },
        ],
        decorations: [],
        requests: [],
      },
    }),
  );
  for (place of places) {
    console.log("Checking", place.id);
    await page.goto("http://127.0.0.1:8788");
    await page.locator("[data-action=tab][data-id=journal]").click();
    await page.locator("[data-action=book]").click();
    await page.locator("[data-action=entry]").click();
    const box = page.locator("[data-flipbook]"),
      button = box.locator("button");
    await button.click();
    await page.waitForFunction(
      () =>
        document.querySelector("[data-flipbook] [role=status]").textContent ===
        "",
    );

    assert.equal(
      await box.locator("img").getAttribute("src"),
      frames(place.id)[0].src,
    );
    for (let i = 0; i < 4; i++) {
      await page.clock.runFor(frames(place.id)[i].duration);
      assert.equal(
        await box.locator("img").getAttribute("src"),
        frames(place.id)[i + 1].src,
      );
    }
    await page.clock.runFor(1000);
    assert.equal(await box.locator("[role=status]").textContent(), "おしまい");
    await page.clock.runFor(2000);
    assert.equal(
      await box.locator("img").getAttribute("src"),
      frames(place.id)[4].src,
    );
    await button.click();
    await page.waitForFunction(() =>
      document
        .querySelector("[data-flipbook] img")
        .src.endsWith("frame-1.webp"),
    );
    await button.click();
    await page.clock.runFor(4000);
    assert.equal(await box.getAttribute("data-playing"), "false");
    await button.click();
    await page.locator("[data-action=close]").click();
    await page.clock.runFor(4000);
  }
  // Failed preload can be retried; closing during preload must never restart playback.
  await page.route("**/art/flipbooks/**/frame-3.webp", (route) =>
    route.abort(),
  );
  await page.goto("http://127.0.0.1:8788");
  await page.locator("[data-action=tab][data-id=journal]").click();
  await page.locator("[data-action=book]").click();
  await page.locator("[data-action=entry]").click();
  await page.locator("[data-action=flipbook]").click();
  await page.waitForFunction(() =>
    document
      .querySelector("[data-flipbook] [role=status]")
      .textContent.includes("よみこめなかった"),
  );
  assert.equal(
    await page.locator("[data-flipbook]").getAttribute("data-playing"),
    "false",
  );
  await page.unroute("**/art/flipbooks/**/frame-3.webp");
  await page.locator("[data-action=flipbook]").click();
  await page.waitForFunction(
    () =>
      document.querySelector("[data-flipbook] [role=status]").textContent ===
      "",
  );
  await page.clock.runFor(4000);
  assert.equal(
    await page.locator("[data-flipbook] [role=status]").textContent(),
    "おしまい",
  );
  await page
    .locator("[data-flipbook]")
    .screenshot({ path: "test-results/flipbook.png" });
  assert.deepEqual(errors, []);
  console.log(
    "Seven flipbooks: frame timing, final hold, replay, stop, close passed.",
  );
} finally {
  await browser.close();
}
