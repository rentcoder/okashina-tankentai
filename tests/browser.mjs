import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import jsQR from "jsqr";
import { mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
function localSQL(sql) {
  execFileSync(
    process.execPath,
    [
      "node_modules/wrangler/bin/wrangler.js",
      "d1",
      "execute",
      "DB",
      "--local",
      "--command",
      sql,
    ],
    { env: process.env, stdio: "pipe" },
  );
}
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:8787");
await page.getByRole("button", { name: "🏡 おうちをつくる" }).click();
await page.locator("[name=name]").fill("テストのおとな");
await page.locator("[name=pin]").fill("123456");
await page.locator("form .primary").click();
await page.getByRole("button", { name: "＋ なかまをつくる" }).waitFor();
const ownerId = await page.evaluate(
  async () => (await (await fetch("/api/state")).json()).active,
);
assert.match(ownerId, /^[a-f0-9-]{36}$/);
const familyWhere = `family_id=(SELECT family_id FROM members WHERE id='${ownerId}')`;
localSQL(
  `UPDATE families SET reveal_hour=24 WHERE id=(SELECT family_id FROM members WHERE id='${ownerId}'); DELETE FROM adventures WHERE ${familyWhere};`,
);
await page.getByRole("button", { name: "＋ なかまをつくる" }).click();
await page.locator("[name=name]").fill("こども");
await page.locator("select[name=avatar]").selectOption("🐰");
await page.locator("form .primary").click();
await page.getByRole("button", { name: "🔒 ロックしてとじる" }).click();
await page.waitForFunction(
  () => document.body.getAttribute("aria-busy") !== "true",
);
await page.locator(".profile").click();
await page.getByRole("button", { name: "🐰 こども" }).click();
await page.locator("[data-action=prepare]").click();
await page.locator("[data-id=pudding]").click();
await page.waitForFunction(
  () =>
    document
      .querySelector("[data-id=pudding]")
      ?.getAttribute("aria-pressed") === "true",
);
await page.waitForFunction(
  () => document.body.getAttribute("aria-busy") !== "true",
);
localSQL(
  `UPDATE families SET reveal_hour=0 WHERE id=(SELECT family_id FROM members WHERE id='${ownerId}');`,
);
await page.reload();
await page.locator("[data-action=read-today]").waitFor();
await mkdir("test-results", { recursive: true });
await page.locator('[data-action=slot][data-slot="0"]').click();
await page.locator("dialog [data-action=decorate]").first().click();
await page.waitForFunction(
  () => document.body.getAttribute("aria-busy") !== "true",
);
await page.locator("#toast").evaluate((el) => el.classList.remove("show"));
await page.screenshot({ path: "test-results/mobile-home.png", fullPage: true });
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  false,
  "mobile overflow",
);
await page.locator("[data-action=tab][data-id=journal]").click();
await page.locator("[data-action=entry]").first().click();
await page.screenshot({
  path: "test-results/mobile-diary.png",
  fullPage: true,
});
assert.ok((await page.locator("dialog ruby").count()) > 0);
await page.locator("[data-action=close]").click();
await page.waitForFunction(
  () => document.body.getAttribute("aria-busy") !== "true",
);
await page.locator(".profile").click();
await page.getByRole("button", { name: "⚙ おとなのせってい" }).click();
await page.locator("[name=pin]").fill("123456");
await page.locator("form .primary").click();
await page.getByRole("button", { name: "▦ QRでしょうたいする" }).click();
await page.locator("form .primary").click();
await page.locator("#invite-link").waitFor();
const invite = await page.locator("#invite-link").inputValue();
const pixels = await page.locator(".qr").evaluate((img) => {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0);
  return {
    data: Array.from(ctx.getImageData(0, 0, c.width, c.height).data),
    width: c.width,
    height: c.height,
  };
});
assert.equal(
  jsQR(new Uint8ClampedArray(pixels.data), pixels.width, pixels.height).data,
  invite,
);
const childContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
});
const child = await childContext.newPage();
await child.goto(invite);
await child.locator("[name=name]").fill("べつのスマホ");
await child.locator("form .primary").click();
await page.getByRole("button", { name: "よみこめたら、かくにんする" }).click();
await page
  .getByRole("button", { name: "かぞくです" })
  .click({ timeout: 20000 });
await child.locator(".profile").waitFor({ timeout: 15000 });
assert.match(await child.locator(".profile").innerText(), /べつのスマホ/);
await child.reload();
await child.locator(".profile").waitFor();
await child.locator(".profile").click();
assert.equal(await child.locator(".profiles button:disabled").count(), 2);
await page.locator("[data-action=close]").click();
await page.setViewportSize({ width: 1280, height: 900 });
await page.locator("[data-action=tab][data-id=home]").click();
await page.screenshot({
  path: "test-results/desktop-home.png",
  fullPage: true,
});
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  false,
  "desktop overflow",
);
assert.deepEqual(errors, []);
console.log(
  "PASS: mobile onboarding, shared profiles, selection persistence, ruby, QR-link join approval, personal device isolation, reload and responsive layout",
);
await browser.close();
