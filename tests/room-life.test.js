import test from "node:test";
import assert from "node:assert/strict";
import {
  createResidents,
  advanceResidents,
  adjacentPositions,
  syncResidents,
  residentPositions,
} from "../src/room-life.js";
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
        assert.ok(adjacentPositions(p.position, peer.position));
        partners.add([p.id, peer.id].sort().join("-"));
        conversations++;
      }
    }
    const occupied = people.flatMap((p) =>
      [p.position, p.destination].filter((id) => id !== null),
    );
    assert.equal(new Set(occupied).size, occupied.length);
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

test("eight residents never share occupied or reserved positions, including arrivals", () => {
  const random = seeded();
  let people = createResidents(
    Array.from({ length: 8 }, (_, i) => ({ id: String(i) })),
    random,
  );
  for (let i = 0; i < 15000; i++) {
    advanceResidents(people, 0.1, [0, 1, 2, 3, 4, 5, 6, 7], random);
    const claims = people.flatMap((r) =>
      [r.position, r.destination].filter((id) => id !== null),
    );
    assert.equal(new Set(claims).size, claims.length);
    for (const r of people)
      if (r.kind !== "walk") {
        assert.equal(r.x, residentPositions[r.position].x);
        assert.equal(r.y, residentPositions[r.position].y);
      }
  }
  const updated = syncResidents(
    [...people.slice(1).map((r) => ({ id: r.id })), { id: "new" }],
    people,
    random,
  );
  const claims = updated.flatMap((r) =>
    [r.position, r.destination].filter((id) => id !== null),
  );
  assert.equal(new Set(claims).size, claims.length);
});
test("adjacent settled residents start talking; non-neighbors and walkers do not", () => {
  const people = createResidents(members.slice(0, 2), () => 0.5);
  people.forEach((r) => (r.wait = 100));
  advanceResidents(people, 0.1, [], () => 0.5);
  assert.ok(people.every((r) => r.kind === "chat"));
  assert.equal(people[0].partner, people[1].id);
  const apart = createResidents(members.slice(0, 2), () => 0.5);
  Object.assign(apart[1], { position: 15, x: 87, y: 95 });
  advanceResidents(apart, 0.1, [], () => 0.5);
  assert.ok(apart.every((r) => r.kind === "rest"));
  const moving = createResidents(members.slice(0, 2), () => 0.5);
  Object.assign(moving[1], {
    kind: "walk",
    destination: 5,
    target: [37, 77],
    next: "rest",
  });
  advanceResidents(moving, 0.1, [], () => 0.5);
  assert.equal(moving[0].kind, "rest");
});
