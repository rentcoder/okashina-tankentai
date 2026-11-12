import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { dayInfo, makeAdventure, places } from "../src/stories.js";
let mf, db;
before(async () => {
  await build({
    entryPoints: ["src/worker.js"],
    outfile: ".test-build/worker.mjs",
    bundle: true,
    format: "esm",
    platform: "browser",
  });
  mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      scriptPath: ".test-build/worker.mjs",
      compatibilityDate: "2026-11-01",
      d1Databases: ["DB"],
    }),
  );
  db = await mf.getD1Database("DB");
  const sql = await readFile("migrations/0001_initial.sql", "utf8");
  await db.batch(
    sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => db.prepare(s)),
  );
});
after(async () => {
  await mf?.dispose();
});
const origin = "https://example.com";
async function call(path, data, cookie, extra = {}) {
  const response = await mf.dispatchFetch(origin + "/api/" + path, {
    method: data === undefined ? "GET" : "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "CF-Connecting-IP": crypto.randomUUID(),
      ...(cookie ? { Cookie: cookie } : {}),
      ...extra,
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  return {
    status: response.status,
    body: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0],
    headers: response.headers,
  };
}
async function create(n = "parent") {
  const r = await call("create", { name: n, pin: "123456", avatar: "🐻" });
  assert.equal(r.status, 201);
  return r.cookie;
}
async function current(cookie) {
  const r = await call("state", undefined, cookie);
  assert.equal(r.status, 200);
  return r.body;
}
async function family(cookie) {
  const s = await current(cookie);
  return (
    await db
      .prepare("SELECT family_id FROM members WHERE id=?")
      .bind(s.active)
      .first()
  ).family_id;
}
test("JST dates and absent participants are deterministic", () => {
  assert.deepEqual(dayInfo(Date.parse("2026-11-10T15:00:00Z")), {
    day: "2026-11-11",
    hour: 0,
  });
  const a = makeAdventure(
    "2026-11-11",
    [{ id: "x", name: "x", avatar: "🐻" }],
    [],
  );
  assert.equal(a.participants[0].item, null);
  assert.ok(places.some((p) => p.id === a.place));
});
test("unauthenticated state and cross-origin writes are rejected", async () => {
  assert.equal((await call("state")).status, 401);
  assert.equal(
    (
      await call("create", { name: "x", pin: "123456" }, null, {
        Origin: "https://evil.test",
      })
    ).status,
    403,
  );
});
test("new families do not share members, diaries or room changes", async () => {
  const a = await create("a"),
    b = await create("b"),
    sa = await current(a),
    sb = await current(b);
  assert.notEqual(sa.active, sb.active);
  assert.equal(sa.members.length, 1);
  assert.equal((await call("switch", { member: sb.active }, a)).status, 400);
  assert.equal((await call("invite", { member: sb.active }, a)).status, 400);
});
test("invites require approval, are single use and isolate personal devices", async () => {
  const a = await create(),
    b = await create("outsider");
  const invite = await call("invite", {}, a);
  const join = await call("join", {
    token: invite.body.token,
    name: "child",
    avatar: "🐰",
  });
  assert.equal(join.status, 201);
  assert.equal(
    (await call("claim", { receipt: join.body.receipt })).body.status,
    "pending",
  );
  assert.equal(
    (await call("join", { token: invite.body.token, name: "other" })).status,
    400,
  );
  const request = (await current(a)).requests[0];
  assert.equal(
    (await call("approve", { id: request.id, approve: true }, b)).status,
    400,
  );
  assert.equal(
    (await call("approve", { id: request.id, approve: true }, a)).status,
    200,
  );
  const claim = await call("claim", { receipt: join.body.receipt });
  assert.equal(claim.body.status, "claimed");
  assert.match(claim.headers.get("set-cookie"), /HttpOnly/);
  assert.match(claim.headers.get("set-cookie"), /Secure/);
  const child = await current(claim.cookie);
  assert.equal(child.members.length, 2);
  assert.equal(child.shared, false);
  assert.equal(
    (await call("switch", { member: child.members[0].id }, claim.cookie))
      .status,
    403,
  );
  assert.equal((await call("invite", {}, claim.cookie)).status, 403);
  assert.equal(
    (await call("claim", { receipt: join.body.receipt })).cookie,
    undefined,
  );
});
test("concurrent claims issue at most one session", async () => {
  const a = await create();
  const invite = await call("invite", {}, a),
    j = await call("join", { token: invite.body.token, name: "race" });
  const req = (await current(a)).requests[0];
  await call("approve", { id: req.id, approve: true }, a);
  const rs = await Promise.all([
    call("claim", { receipt: j.body.receipt }),
    call("claim", { receipt: j.body.receipt }),
  ]);
  assert.equal(rs.filter((r) => r.cookie).length, 1);
});
test("expired and revoked invitations cannot be claimed", async () => {
  const a = await create(),
    f = await family(a);
  const inv = await call("invite", {}, a);
  await db
    .prepare("UPDATE invites SET expires=0 WHERE family_id=?")
    .bind(f)
    .run();
  assert.equal(
    (await call("join", { token: inv.body.token, name: "expired" })).status,
    400,
  );
  const inv2 = await call("invite", {}, a),
    j = await call("join", { token: inv2.body.token, name: "revoked" });
  await call("revoke-invites", {}, a);
  assert.equal((await call("claim", { receipt: j.body.receipt })).status, 400);
});
test("parent PIN lock and attempt limits are enforced server-side", async () => {
  const a = await create();
  await call("lock", {}, a);
  assert.equal((await call("member", { name: "no" }, a)).status, 403);
  for (let i = 0; i < 5; i++)
    assert.equal((await call("unlock", { pin: "000000" }, a)).status, 403);
  assert.equal((await call("unlock", { pin: "123456" }, a)).status, 429);
});
test("daily results are immutable, personalized, and survive tidying", async () => {
  const a = await create(),
    f = await family(a);
  await db
    .prepare("UPDATE families SET reveal_hour=24 WHERE id=?")
    .bind(f)
    .run();
  await db.prepare("DELETE FROM adventures WHERE family_id=?").bind(f).run();
  await call("member", { name: "child", avatar: "🐰" }, a);
  const first = await current(a);
  assert.equal((await call("choice", { item: "invalid" }, a)).status, 400);
  assert.equal((await call("choice", { item: "pudding" }, a)).status, 200);
  await db
    .prepare("UPDATE families SET reveal_hour=0 WHERE id=?")
    .bind(f)
    .run();
  const [one, two] = await Promise.all([current(a), current(a)]);
  assert.equal(one.adventures.length, 1);
  assert.deepEqual(one.adventures, two.adventures);
  const result = one.adventures[0];
  assert.equal(
    result.participants.find((m) => m.id === first.active).item,
    "pudding",
  );
  assert.equal(
    result.participants.find((m) => m.id !== first.active).item,
    null,
  );
  assert.equal((await call("choice", { item: "rope" }, a)).status, 400);
  assert.equal(
    (await call("decorate", { slot: 8, treasure: result.treasure }, a)).status,
    400,
  );
  await call("decorate", { slot: 0, treasure: result.treasure }, a);
  assert.equal((await current(a)).decorations.length, 1);
  const child = one.members.find((m) => m.id !== first.active);
  await call("switch", { member: child.id }, a);
  assert.equal(
    (await call("decorate", { slot: 0, treasure: result.treasure }, a)).status,
    200,
  );
  const taken = await current(a);
  assert.equal(taken.decorations.length, 1);
  assert.equal(taken.decorations[0].member_id, child.id);
  assert.deepEqual(taken.adventures, one.adventures);
  await call("switch", { member: first.active }, a);
  await call("decorate", { slot: 0, treasure: null }, a);
  assert.equal((await current(a)).decorations[0].member_id, child.id);
  // Reclaiming a spot changes its owner without changing the diary/collection.
  await call("decorate", { slot: 0, treasure: result.treasure }, a);
  assert.equal((await current(a)).decorations[0].member_id, first.active);
  await call("decorate", { slot: 0, treasure: null }, a);
  const clean = await current(a);
  assert.equal(clean.decorations.length, 0);
  assert.deepEqual(clean.adventures, one.adventures);
  await call("decorate", { slot: 0, treasure: result.treasure }, a);
  assert.equal((await current(a)).decorations.length, 1);
});
test("existing member joins on another phone without losing identity", async () => {
  const a = await create(),
    s = await current(a),
    invite = await call("invite", { member: s.active }, a),
    j = await call("join", { token: invite.body.token, name: "ignored" });
  const request = (await current(a)).requests[0];
  await call("approve", { id: request.id, approve: true }, a);
  const claim = await call("claim", { receipt: j.body.receipt });
  assert.equal((await current(claim.cookie)).active, s.active);
  await call("revoke-devices", {}, a);
  assert.equal((await call("state", undefined, claim.cookie)).status, 401);
  assert.equal((await current(a)).active, s.active);
});
test("kanji in authored adventure prose always has ruby", () => {
  for (const place of places) {
    for (const key of ["name", "intro", "treasure", "ending"])
      assert.doesNotMatch(
        place[key].replace(/[一-龯々]+《[^》]+》/g, ""),
        /[一-龯々]/,
      );
  }
});

test("illustrated character changes affect only the active member and preserve diary snapshots", async () => {
  const a = await create(),
    b = await create("other family");
  const before = await current(a),
    other = await current(b);
  assert.equal((await call("character", { avatar: "missing" }, a)).status, 400);
  assert.equal(
    (await call("character", { avatar: "girl-pink", member: other.active }, a))
      .status,
    200,
  );
  const changed = await current(a);
  assert.equal(
    changed.members.find((m) => m.id === before.active).avatar,
    "girl-pink",
  );
  assert.deepEqual(changed.adventures, before.adventures);
  assert.deepEqual((await current(b)).members, other.members);
  assert.equal((await call("character", { avatar: "boy-blue" })).status, 401);
});
