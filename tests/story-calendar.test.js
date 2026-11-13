import test from "node:test";
import assert from "node:assert/strict";
import calendar from "../src/story-calendar.json" with { type: "json" };
import { placeFor, places, items, makeAdventure } from "../src/stories.js";
const original = ["river", "cloud", "forest", "moon", "sea", "snow", "garden"];
test("all old and prepared dates retain the original seven-place assignment", () => {
  for (
    let stamp = Date.parse("2020-01-01");
    stamp < Date.parse("2026-11-14");
    stamp += 86400000
  ) {
    const day = new Date(stamp).toISOString().slice(0, 10);
    assert.equal(
      placeFor(day).id,
      original[Math.floor(stamp / 86400000) % 7],
      day,
    );
  }
  assert.equal(placeFor("2026-11-14").id, "post");
  assert.equal(placeFor("2026-11-22", calendar.slice(0, 2)).id, "post");
  const nextFrom = new Date(Date.parse(calendar.at(-1).from) + 30 * 86400000)
    .toISOString()
    .slice(0, 10);
  const later = [...calendar, { from: nextFrom, places: ["river", "post"] }];
  for (
    let stamp = Date.parse("2026-11-14");
    stamp < Date.parse(nextFrom);
    stamp += 86400000
  ) {
    const day = new Date(stamp).toISOString().slice(0, 10);
    assert.equal(placeFor(day, later).id, placeFor(day).id);
  }
});
test("calendar versions are ordered, unique and refer to complete story IDs", () => {
  let previous = "";
  for (const v of calendar) {
    assert.ok(v.from > previous);
    previous = v.from;
    assert.equal(new Set(v.places).size, v.places.length);
    for (const id of v.places) assert.ok(places.some((p) => p.id === id));
  }
});
test("new story snapshots distinct tool-specific actions and ruby", () => {
  const members = items.map((item, i) => ({
    id: String(i),
    name: "なかま",
    avatar: "boy-green",
  }));
  const choices = members.map((m, i) => ({
    member_id: m.id,
    item: items[i].id,
  }));
  const a = makeAdventure("2026-11-14", members, choices);
  assert.equal(a.place, "post");
  assert.equal(new Set(a.participants.map((p) => p.action)).size, items.length);
  const story = places.find((p) => p.id === "post");
  for (const [i, p] of a.participants.entries())
    assert.equal(p.action, story.itemActions[items[i].id]);
  for (const text of [
    story.name,
    story.preview,
    story.intro,
    story.ending,
    story.treasure,
    ...Object.values(story.itemActions),
  ])
    assert.doesNotMatch(text.replace(/[一-龯々]+《[^》]+》/g, ""), /[一-龯々]/);
  assert.equal(
    makeAdventure("2026-11-14", members, []).participants[0].action,
    null,
  );
});

// Newly appended versions must leave all previously effective dates unchanged.
test("each release preserves every date before its activation", () => {
  for (let i = 1; i < calendar.length; i++) {
    const before = calendar.slice(0, i),
      after = calendar.slice(0, i + 1);
    for (
      let stamp = Date.parse(calendar[i].from) - 30 * 86400000;
      stamp < Date.parse(calendar[i].from);
      stamp += 86400000
    ) {
      const day = new Date(stamp).toISOString().slice(0, 10);
      assert.equal(placeFor(day, before).id, placeFor(day, after).id);
    }
    assert.equal(placeFor(calendar[i].from, after).id, calendar[i].places[0]);
  }
});

test("release ledger contains only one story per Japanese date and schedules each new story", async () => {
  const { readFile } = await import("node:fs/promises");
  const releases = JSON.parse(
    await readFile("docs/story-releases.json", "utf8"),
  );
  assert.equal(new Set(releases.map((r) => r.dateJST)).size, releases.length);
  assert.equal(new Set(releases.map((r) => r.id)).size, releases.length);
  for (const release of releases) {
    assert.ok(release.availableFromJST > release.dateJST);
    assert.equal(placeFor(release.availableFromJST).id, release.id);
    assert.ok(places.some((p) => p.id === release.id));
  }
});
