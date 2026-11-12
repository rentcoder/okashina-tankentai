import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { places } from "../src/stories.js";
import { frames } from "../src/flipbook.js";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const member = {
    id: "m0",
    name: "テスト",
    avatar: "boy-green",
    item: "pudding",
  };
  let place = places[0];
  await page.route("**/api/state", (r) =>
    r.fulfill({
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
  async function open() {
    await page.goto("http://127.0.0.1:8788");
    await page.locator("[data-action=tab][data-id=journal]").click();
    await page.locator("[data-action=book]").click();
    await page.locator("[data-action=entry]").click();
  }
  for (place of places) {
    await open();
    const box = page.locator("[data-flipbook]"),
      img = box.locator("img"),
      button = box.locator("button");
    await expect(button).toHaveText("とめる");
    await expect(box.locator("[role=status]")).toHaveText("");
    for (let round = 0; round < 2; round++) {
      await expect(img).toHaveAttribute("src", frames(place.id)[0].src);
      for (let i = 0; i < 4; i++) {
        await page.clock.runFor(frames(place.id)[i].duration);
        await expect(img).toHaveAttribute("src", frames(place.id)[i + 1].src);
      }
      await page.clock.runFor(2999);
      await expect(img).toHaveAttribute("src", frames(place.id)[4].src);
      await page.clock.runFor(1);
    }
    await expect(img).toHaveAttribute("src", frames(place.id)[0].src);
    await button.click();
    await page.clock.runFor(15000);
    await expect(img).toHaveAttribute("src", frames(place.id)[0].src);
    await expect(box).toHaveAttribute("data-playing", "false");
    await button.click();
    await expect(box.locator("[role=status]")).toHaveText("");
    await page.locator("[data-action=close]").click();
    await page.clock.runFor(15000);
    assert.equal(await page.locator("[data-flipbook]").count(), 0);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open();
  await expect(page.locator("[data-action=flipbook]")).toHaveText(
    "うごくえほんをみる",
  );
  await page.clock.runFor(15000);
  await expect(page.locator("[data-flipbook] img")).toHaveAttribute(
    "src",
    frames(place.id)[0].src,
  );
  await page.locator("[data-action=flipbook]").click();
  await expect(page.locator("[data-flipbook] [role=status]")).toHaveText("");
  await page.clock.runFor(500);
  await expect(page.locator("[data-flipbook] img")).toHaveAttribute(
    "src",
    frames(place.id)[1].src,
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.route("**/art/flipbooks/**/frame-3.webp", (r) => r.abort());
  await open();
  await expect(page.locator("[data-flipbook] [role=status]")).toContainText(
    "よみこめなかった",
  );
  await page.unroute("**/art/flipbooks/**/frame-3.webp");
  await page.locator("[data-action=flipbook]").click();
  await expect(page.locator("[data-flipbook] [role=status]")).toHaveText("");
  assert.deepEqual(errors, []);
  console.log(
    `${places.length} flipbooks: autoplay, two loops, exact 3s hold, stop, close, reduced motion and retry passed.`,
  );
} finally {
  await browser.close();
}
