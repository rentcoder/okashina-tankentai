import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/state", (r) =>
    r.fulfill({
      json: {
        family: { name: "テスト", revealHour: 18 },
        members: [{ id: "m0", name: "テスト", avatar: "boy-green" }],
        active: "m0",
        shared: true,
        parent: false,
        day: "2026-11-16",
        place: null,
        itemIds: [],
        choices: [],
        adventures: [],
        decorations: [],
        requests: [],
      },
    }),
  );
  await page.goto(process.env.TEST_URL || "http://127.0.0.1:8789");
  await expect(page.getByText("つぎのぼうけんをおたのしみに")).toBeVisible();
  await page.locator("[data-action=tab][data-id=adventure]").click();
  await expect(page.getByText("つぎのぼうけんをおたのしみに")).toBeVisible();
  assert.equal(await page.locator("[data-action=choose]").count(), 0);
  await page.screenshot({ path: "test-results/stock-empty.png" });
  await page
    .getByRole("button", { name: "えにっきをみる", exact: true })
    .click();
  assert.deepEqual(errors, []);
  console.log(
    "Mobile stock exhaustion: home, adventure, journal navigation passed",
  );
} finally {
  await browser.close();
}
