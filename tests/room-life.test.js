import test from "node:test";
import assert from "node:assert/strict";
import { createResidents, advanceResidents } from "../src/room-life.js";
function seeded() {
  let n = 52;
  return () => (n = (n * 1664525 + 1013904223) >>> 0) / 4294967296;
}
const members = Array.from({ length: 4 }, (_, i) => ({ id: String(i) }));
test("residents act independently; conversations are local pairs and positions remain in room", () => {
  const random = seeded(),
    people = createResidents(members, random);
  const seen = new Set();
  let mixed = false,
    conversations = 0;
  const partners = new Set();
  for (let i = 0; i < 12000; i++) {
    advanceResidents(people, 0.1, [3, 4, 6], random);
    const kinds = new Set(people.map((p) => p.kind));
    if (kinds.size >= 3) mixed = true;
    for (const p of people) {
      seen.add(p.kind);
      assert.ok(p.x >= 10 && p.x <= 92 && p.y >= 65 && p.y <= 96);
      if (p.kind === "chat") {
        const peer = people.find((a) => a.id === p.partner);
        assert.ok(Math.hypot(p.x - peer.x, (p.y - peer.y) * 1.5) < 30);
        partners.add([p.id, peer.id].sort().join("-"));
        conversations++;
      }
    }
    assert.ok(people.filter((p) => p.kind === "chat").length <= 2);
  }
  assert.deepEqual([...seen].sort(), ["chat", "look", "rest", "walk"]);
  assert.ok(mixed);
  assert.ok(conversations > 0);
  assert.ok(partners.size > 1);
});
test("one resident never chats with nobody; no treasure means no looking task", () => {
  const random = seeded(),
    people = createResidents(members.slice(0, 1), random);
  for (let i = 0; i < 3000; i++) {
    advanceResidents(people, 0.1, [], random);
    assert.notEqual(people[0].kind, "chat");
    assert.notEqual(people[0].kind, "look");
  }
});

test("six characters have four distinct alpha walking frames at a shared canvas size", async () => {
  const { default: sharp } = await import("sharp");
  const { characters } = await import("../src/characters.js");
  const { walkImage } = await import("../src/room-life.js");
  const { readFile } = await import("node:fs/promises");
  const { createHash } = await import("node:crypto");
  for (const c of characters) {
    const hashes = new Set();
    for (let f = 1; f <= 4; f++) {
      const file = "public" + walkImage(c.id, f);
      const m = await sharp(file).metadata();
      assert.equal(m.width, 288);
      assert.equal(m.height, 384);
      assert.ok(m.hasAlpha);
      const a = (await sharp(file).stats()).channels[3];
      assert.equal(a.min, 0);
      assert.equal(a.max, 255);
      hashes.add(
        createHash("sha256")
          .update(await readFile(file))
          .digest("hex"),
      );
    }
    assert.equal(hashes.size, 4);
  }
});
