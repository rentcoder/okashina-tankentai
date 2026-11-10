import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
const manifest = JSON.parse(
  await readFile("dist/manifest.webmanifest", "utf8"),
);
assert.equal(manifest.display, "standalone");
assert.equal(manifest.scope, "/");
for (const icon of manifest.icons) {
  const meta = await sharp("dist" + icon.src).metadata();
  assert.equal(`${meta.width}x${meta.height}`, icon.sizes);
}
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    page = await context.newPage();
  await page.goto("http://127.0.0.1:8788");
  await page.locator("[data-action=install]").waitFor();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const cdp = await context.newCDPSession(page);
  const { installabilityErrors } = await cdp.send(
    "Page.getInstallabilityErrors",
  );
  assert.deepEqual(installabilityErrors, []);
  await page.locator("[data-action=install]").click();
  // A browser that already offers installation may show its native prompt.
  if (await page.locator("dialog").isVisible())
    await page.locator("[data-action=close]").click();
  await page.evaluate(() => {
    const e = new Event("beforeinstallprompt", { cancelable: true });
    e.prompt = async () => {
      window.testPrompted = true;
    };
    e.userChoice = Promise.resolve({ outcome: "accepted" });
    window.dispatchEvent(e);
  });
  await page.locator("[data-action=install]").click();
  assert.equal(await page.evaluate(() => window.testPrompted), true);
  const cached = await page.evaluate(async () => {
    const urls = [];
    for (const k of await caches.keys())
      for (const req of await (await caches.open(k)).keys())
        urls.push(new URL(req.url).pathname);
    return urls;
  });
  assert.deepEqual(cached, ["/offline"]);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("heading", { name: "いまは、ひとやすみ。" }).waitFor();
  await context.setOffline(false);
  await page.getByRole("link", { name: "もういちどひらく" }).click();
  await page.locator("[data-action=install]").waitFor();
  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  assert.equal(await page.locator("[data-action=install]").isVisible(), false);
  const ios = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1",
  });
  const ip = await ios.newPage();
  await ip.goto("http://127.0.0.1:8788");
  await ip.locator("[data-action=install]").click();
  await ip.getByText("Safariでこのゲームをひらく。").waitFor();
  console.log(
    "PASS: manifest installability, PNG icons, install prompt, iPhone instructions, offline fallback, reconnection, private API cache exclusion",
  );
} finally {
  await browser.close();
}
