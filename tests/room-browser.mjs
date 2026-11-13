import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { places } from "../src/stories.js";
const b = await chromium.launch({ args: ["--no-sandbox"] });
try {
  const page = await b.newPage({ viewport: { width: 390, height: 844 } });
  const members = [
    { id: "a", name: "ひろき", avatar: "🦊" },
    { id: "b", name: "ともき", avatar: "🐻" },
    { id: "c", name: "はな", avatar: "girl-yellow" },
    { id: "d", name: "あおい", avatar: "girl-pink" },
  ];
  const data = {
    family: { name: "みんなのおうち", revealHour: 18 },
    members,
    active: "a",
    shared: true,
    parent: false,
    day: "2026-11-12",
    place: "river",
    choices: [],
    requests: [],
    adventures: places.map((p, i) => ({
      day: `2026-11-0${i + 1}`,
      place: p.id,
      treasure: p.id,
      intro: p.intro,
      ending: p.ending,
      participants: members,
    })),
    decorations: [
      { slot: 3, member_id: "b", treasure: "garden" },
      { slot: 4, member_id: "a", treasure: "river" },
      { slot: 6, member_id: "a", treasure: "cloud" },
    ],
  };
  await page.route("**/api/state", (r) => r.fulfill({ json: data }));
  await page.route("**/api/decorate", async (r) => {
    const body = r.request().postDataJSON();
    data.decorations = data.decorations.filter((d) => d.slot !== body.slot);
    data.decorations.push({
      slot: body.slot,
      member_id: "a",
      treasure: body.treasure,
    });
    await r.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/character", async (r) => {
    members[0].avatar = r.request().postDataJSON().avatar;
    await r.fulfill({ json: { ok: true } });
  });
  await page.goto("http://127.0.0.1:8788");
  await page.locator(".room-backdrop").evaluate((img) => img.decode());
  assert.equal(await page.locator(".room-spot").count(), 8);
  assert.equal(await page.locator(".room-spot.vacant small").count(), 0);
  assert.equal(await page.locator(".resident-chat").count(), 4);
  assert.equal(await page.locator(".resident small").first().textContent(), "ひろき");
  const positions = await page.locator(".resident").evaluateAll(nodes => {
    return nodes.map(n => {
      const anim = n.getAnimations()[0];
      anim.pause(); anim.currentTime = 0;
      const start = n.getBoundingClientRect().x;
      anim.currentTime = 11000;
      return { start, end:n.getBoundingClientRect().x };
    });
  });
  assert.ok(positions.every(p => Math.abs(p.start-p.end)>1));
  for (const [time, expected] of [[10000,["1","0"]],[11500,["0","1"]]]) {
    const opacities = await page.locator(".resident-chat").evaluateAll((nodes,time) => nodes.slice(0,2).map(n => {const a=n.getAnimations()[0]; a.pause(); a.currentTime=time; return getComputedStyle(n).opacity;}),time);
    assert.deepEqual(opacities,expected);
  }
  await page
    .locator(".resident img")
    .evaluateAll((imgs) => Promise.all(imgs.map((i) => i.decode())));
  await page.locator(".room-residents").evaluate(root => {
    for (const animation of root.getAnimations({subtree:true})) {
      animation.pause();
      animation.currentTime = 11000;
    }
  });
  for (const width of [320, 390, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    const boxes = await page.locator(".room-spot").evaluateAll((nodes) =>
      nodes.map((n) => {
        const r = n.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      }),
    );
    for (const r of boxes) {
      assert.ok(r.w >= 44 && r.h >= 44);
    }
    await page
      .locator(".storybook-room")
      .screenshot({ path: `test-results/room-${width}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-action=slot][data-slot="3"]').click();
  assert.equal(
    await page.locator("dialog h1").textContent(),
    "れいぞうこのうえ",
  );
  assert.ok(
    (await page.locator("dialog").textContent()).includes(
      "ともきがかざっているよ",
    ),
  );
  assert.equal(await page.locator("dialog [data-action=remove]").count(), 0);
  await page.locator("dialog [data-action=decorate][data-id=moon]").click();
  await page.waitForFunction(
    () =>
      document.querySelector('[data-slot="3"] small').textContent === "ひろきがかざった",
  );
  assert.equal(data.decorations.find((d) => d.slot === 3).member_id, "a");
  await page.locator('[data-action=slot][data-slot="3"]').click();
  assert.equal(await page.locator("dialog [data-action=remove]").count(), 1);
  await page.locator("[data-action=close]").click();
  await page.locator("[data-action=room-motion]").click();
  assert.equal(
    await page
      .locator(".resident .pose-first")
      .first()
      .evaluate((n) => getComputedStyle(n).animationName),
    "none",
  );
  await page.locator("[data-action=room-motion]").click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page
      .locator(".resident .pose-first")
      .first()
      .evaluate((n) => getComputedStyle(n).animationName),
    "none",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  assert.notEqual(
    await page
      .locator(".resident .pose-first")
      .first()
      .evaluate((n) => getComputedStyle(n).animationName),
    "none",
  );
  await page.locator("[data-action=profiles]").click();
  await page.locator("[data-action=character]").click();
  assert.equal(await page.locator("input[name=avatar]").count(), 6);
  await page
    .locator(".character-picker img")
    .evaluateAll((imgs) => Promise.all(imgs.map((i) => i.decode())));
  await page
    .locator("dialog")
    .screenshot({ path: "test-results/character-picker.png" });
  await page.locator('input[value="girl-mint"]').check();
  await page.locator("form[data-form=character] button").click();
  await page.waitForFunction(() =>
    document.querySelector(".profile img").src.includes("girl-mint"),
  );
  assert.equal(members[0].avatar, "girl-mint");
  console.log(
    "Characters: six choices, saved profile, legacy mapping, motion pause and reduced-motion passed.",
  );
  console.log(
    "Room: eight distinct touch targets, 320/390/1024 layouts, replacement flow passed.",
  );
} finally {
  await b.close();
}
