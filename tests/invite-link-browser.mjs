import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const member = { id: "owner", name: "おとな", avatar: "boy-green" };
  const data = {
    family: { name: "テストのおうち", revealHour: 18 },
    members: [member],
    active: "owner",
    parent: true,
    shared: true,
    day: "2026-11-14",
    place: "post",
    choices: [],
    requests: [],
    adventures: [],
    decorations: [],
  };
  const token = "test-invitation-token-for-browser-only";
  await page.route("**/api/state", (r) => r.fulfill({ json: data }));
  await page.route("**/api/invite", (r) => r.fulfill({ json: { token } }));
  await page.addInitScript(() => {
    navigator.share = async (data) => {
      window.sharedInvite = data;
    };
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value) => {
          window.copiedInvite = value;
        },
      },
    });
  });
  await page.goto("http://127.0.0.1:8788");
  await page.locator("[data-action=settings]").first().click();
  await page
    .getByRole("button", { name: "リンク・QRでしょうたいする" })
    .click();
  await page.locator("form[data-form=invite] button").click();
  const url = await page.locator("#invite-link").inputValue();
  assert.ok(url.endsWith("#invite=" + token));
  await page.locator("[data-action=share-invite]").click();
  assert.equal((await page.evaluate(() => window.sharedInvite)).url, url);
  await page.locator("[data-action=copy]").click();
  assert.equal(await page.evaluate(() => window.copiedInvite), url);
  await page.evaluate(() => {
    navigator.share = undefined;
    window.copiedInvite = null;
  });
  await page.locator("[data-action=share-invite]").click();
  assert.equal(await page.evaluate(() => window.copiedInvite), url);
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => {
      throw new Error("denied");
    };
  });
  await page.locator("[data-action=copy]").click();
  assert.equal(
    await page
      .locator("#invite-link")
      .evaluate((n) => n.selectionEnd - n.selectionStart),
    url.length,
  );
  await page.screenshot({ path: "test-results/invite-link.png" });
  const guest = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  let joined,
    claimed = false;
  await guest.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new Error("camera must not be used");
    };
  });
  await guest.route("**/api/state", (r) =>
    r.fulfill(
      claimed
        ? { json: { ...data, parent: false, shared: false } }
        : { status: 401, json: { error: "not joined" } },
    ),
  );
  await guest.route("**/api/join", (r) => {
    joined = r.request().postDataJSON();
    return r.fulfill({ json: { receipt: "test-receipt" } });
  });
  await guest.route("**/api/claim", (r) => {
    claimed = true;
    return r.fulfill({ json: { status: "claimed" } });
  });
  await guest.goto(url);
  await expect(guest.locator("form[data-form=join]")).toBeVisible();
  assert.equal(await guest.locator("input[name=token]").inputValue(), token);
  assert.equal(new URL(guest.url()).hash, "");
  await guest.locator("input[name=name]").fill("こども");
  await guest.locator("form[data-form=join] button").click();
  await expect(
    guest.getByRole("heading", { name: "おとなのかくにんをまっているよ" }),
  ).toBeVisible();
  assert.equal(joined.token, token);
  await expect(guest.locator(".house-card")).toBeVisible();
  assert.ok(claimed);
  console.log(
    "URL sharing, clipboard/fallback, camera-free link join and approval-wait flow passed",
  );
} finally {
  await browser.close();
}
