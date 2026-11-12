import { itemIdsFor } from "./equipment.js";
import { characters, legacyAvatars } from "./characters.js";
import {
  allItems,
  places,
  dayInfo,
  placeFor,
  makeAdventure,
} from "./stories.js";
const now = () => Math.floor(Date.now() / 1000),
  random = () => crypto.randomUUID() + crypto.randomUUID();
const hash = async (s) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
    ),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
async function pinHash(pin, salt) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return Array.from(
    new Uint8Array(
      await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          hash: "SHA-256",
          salt: new TextEncoder().encode(salt),
          iterations: 100000,
        },
        key,
        256,
      ),
    ),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
const json = (data, status = 200, headers = {}) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}
const avatarList = characters.map((c) => c.id);
function name(s) {
  if (typeof s !== "string" || s.trim().length < 1 || s.trim().length > 16)
    fail("なまえは１〜１６もじにしてね。");
  return s.trim();
}
function avatar(a) {
  return [...avatarList, ...legacyAvatars].includes(a) ? a : avatarList[0];
}
function pin(p) {
  if (typeof p !== "string" || !/^\d{6,12}$/.test(p))
    fail("おとなのあんしょうばんごうは６〜１２けたにしてね。");
  return p;
}
function cookie(token, secure) {
  return `session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${secure ? "; Secure" : ""}`;
}
async function session(db, req) {
  const token = req.headers
    .get("Cookie")
    ?.match(/(?:^|; )session=([^;]+)/)?.[1];
  if (!token) fail("おうちにつながっていません。", 401);
  const s = await db
    .prepare("SELECT * FROM sessions WHERE hash=? AND expires>?")
    .bind(await hash(token), now())
    .first();
  if (!s) fail("もういちど、おうちにしょうたいしてもらってね。", 401);
  return s;
}
function parent(s) {
  if (s.parent_until < now())
    fail("おとなのあんしょうばんごうをいれてね。", 403);
}
async function rate(db, key, limit) {
  const window = Math.floor(now() / 600);
  const k = await hash(key + window);
  const r = await db
    .prepare(
      "INSERT INTO rate_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",
    )
    .bind(k, now() + 600)
    .first();
  if (r.count > limit) fail("すこしまってから、もういちどためしてね。", 429);
}
async function members(db, f) {
  return (
    await db
      .prepare(
        "SELECT id,name,avatar FROM members WHERE family_id=? ORDER BY rowid",
      )
      .bind(f)
      .all()
  ).results;
}
async function settle(db, f) {
  const info = dayInfo();
  const pending = (
    await db
      .prepare(
        "SELECT DISTINCT day FROM choices WHERE family_id=? AND day<? AND NOT EXISTS(SELECT 1 FROM adventures a WHERE a.family_id=choices.family_id AND a.day=choices.day)",
      )
      .bind(f.id, info.day)
      .all()
  ).results.map((r) => r.day);
  if (info.hour >= f.reveal_hour) pending.push(info.day);
  const ms = await members(db, f.id);
  for (const day of pending) {
    if (
      await db
        .prepare("SELECT day FROM adventures WHERE family_id=? AND day=?")
        .bind(f.id, day)
        .first()
    )
      continue;
    const cs = (
      await db
        .prepare(
          "SELECT member_id,item FROM choices WHERE family_id=? AND day=?",
        )
        .bind(f.id, day)
        .all()
    ).results;
    await db
      .prepare(
        "INSERT OR IGNORE INTO adventures(family_id,day,payload) VALUES(?,?,?)",
      )
      .bind(f.id, day, JSON.stringify(makeAdventure(day, ms, cs)))
      .run();
  }
}
async function api(req, env) {
  const db = env.DB,
    u = new URL(req.url),
    path = u.pathname.slice(4),
    secure = u.protocol === "https:";
  let b = {};
  if (req.method === "POST") {
    if (req.headers.get("Origin") !== u.origin)
      fail("このがめんから、もういちどためしてね。", 403);
    if (!req.headers.get("Content-Type")?.startsWith("application/json"))
      fail("JSON required", 415);
    const text = await req.text();
    if (text.length > 8192) fail("Too large", 413);
    try {
      b = JSON.parse(text);
    } catch {
      fail("Invalid JSON");
    }
    if (!b || typeof b !== "object" || Array.isArray(b)) fail("Invalid JSON");
  } else if (req.method !== "GET") fail("Method not allowed", 405);
  if (path === "/catalog" && req.method === "GET")
    return json({ items: allItems, places, avatars: avatarList });
  if (path === "/create" && req.method === "POST") {
    await rate(db, "create:" + req.headers.get("CF-Connecting-IP"), 8);
    const n = name(b.name),
      p = pin(b.pin),
      id = crypto.randomUUID(),
      mid = crypto.randomUUID(),
      salt = random(),
      token = random();
    await db.batch([
      db
        .prepare(
          "INSERT INTO families(id,name,pin_hash,salt,created_at) VALUES(?,?,?,?,?)",
        )
        .bind(id, "みんなのおうち", await pinHash(p, salt), salt, now()),
      db
        .prepare(
          "INSERT INTO members(id,family_id,name,avatar) VALUES(?,?,?,?)",
        )
        .bind(mid, id, n, avatar(b.avatar)),
      db
        .prepare(
          "INSERT INTO sessions(hash,family_id,member_id,shared,parent_until,expires) VALUES(?,?,?,1,?,?)",
        )
        .bind(await hash(token), id, mid, now() + 600, now() + 2592000),
    ]);
    return json({ ok: true }, 201, { "Set-Cookie": cookie(token, secure) });
  }
  if (path === "/join" && req.method === "POST") {
    await rate(db, "join:" + req.headers.get("CF-Connecting-IP"), 30);
    if (typeof b.token !== "string" || b.token.length > 100)
      fail("しょうたいがみつかりません。");
    const ih = await hash(b.token),
      invite = await db
        .prepare("SELECT * FROM invites WHERE hash=? AND used=0 AND expires>?")
        .bind(ih, now())
        .first();
    if (!invite) fail("しょうたいのきげんがきれたか、つかわれています。");
    const receipt = random(),
      id = crypto.randomUUID(),
      n = invite.member_id ? "つづきから" : name(b.name);
    try {
      await db
        .prepare(
          "INSERT INTO requests(id,invite_hash,family_id,name,avatar,receipt_hash,member_id,expires) VALUES(?,?,?,?,?,?,?,?)",
        )
        .bind(
          id,
          ih,
          invite.family_id,
          n,
          avatar(b.avatar),
          await hash(receipt),
          invite.member_id,
          invite.expires,
        )
        .run();
    } catch {
      fail("このしょうたいは、すでにつかわれています。");
    }
    return json({ receipt }, 201);
  }
  if (path === "/claim" && req.method === "POST") {
    if (typeof b.receipt !== "string" || b.receipt.length > 100)
      fail("しょうたいをよみこんでね。");
    const r = await db
      .prepare(
        "SELECT r.*,i.used FROM requests r JOIN invites i ON i.hash=r.invite_hash WHERE receipt_hash=?",
      )
      .bind(await hash(b.receipt))
      .first();
    if (!r || r.expires < now() || r.status === "rejected")
      fail(
        "しょうたいがとりけされました。もういちどしょうたいしてもらってね。",
      );
    if (r.status !== "approved") return json({ status: r.status });
    const token = random();
    const result = await db.batch([
      db
        .prepare(
          "INSERT INTO sessions(hash,family_id,member_id,expires) SELECT ?,family_id,member_id,? FROM requests WHERE id=? AND status='approved'",
        )
        .bind(await hash(token), now() + 2592000, r.id),
      db
        .prepare(
          "UPDATE requests SET status='claimed' WHERE id=? AND status='approved'",
        )
        .bind(r.id),
    ]);
    if (result[0].meta.changes !== 1)
      fail("このしょうたいはつかわれています。");
    return json({ status: "claimed" }, 200, {
      "Set-Cookie": cookie(token, secure),
    });
  }
  const s = await session(db, req),
    f = await db
      .prepare("SELECT * FROM families WHERE id=?")
      .bind(s.family_id)
      .first();
  if (path === "/state" && req.method === "GET") {
    await settle(db, f);
    const ms = await members(db, f.id),
      adventures = (
        await db
          .prepare(
            "SELECT payload FROM adventures WHERE family_id=? ORDER BY day DESC LIMIT 3660",
          )
          .bind(f.id)
          .all()
      ).results.map((x) => JSON.parse(x.payload));
    return json({
      family: { name: f.name, revealHour: f.reveal_hour },
      members: ms,
      active: s.member_id,
      shared: !!s.shared,
      parent: s.parent_until > now(),
      day: dayInfo().day,
      place: placeFor(dayInfo().day).id,
      itemIds: itemIdsFor(placeFor(dayInfo().day).id, dayInfo().day),
      choices: (
        await db
          .prepare(
            "SELECT member_id,item FROM choices WHERE family_id=? AND day=?",
          )
          .bind(f.id, dayInfo().day)
          .all()
      ).results,
      adventures,
      decorations: (
        await db
          .prepare(
            "SELECT slot,member_id,treasure FROM decorations WHERE family_id=? ORDER BY slot",
          )
          .bind(f.id)
          .all()
      ).results,
      requests:
        s.parent_until > now()
          ? (
              await db
                .prepare(
                  "SELECT id,name,avatar,member_id FROM requests WHERE family_id=? AND status='pending' AND expires>?",
                )
                .bind(f.id, now())
                .all()
            ).results
          : [],
    });
  }
  if (req.method !== "POST") fail("Not found", 404);
  if (path === "/unlock") {
    if (f.locked_until > now())
      fail("１０ぷんまってから、もういちどためしてね。", 429);
    if (typeof b.pin !== "string" || b.pin.length > 12)
      fail("あんしょうばんごうをたしかめてね。");
    if ((await pinHash(b.pin, f.salt)) !== f.pin_hash) {
      await db
        .prepare(
          "UPDATE families SET pin_failures=pin_failures+1,locked_until=CASE WHEN pin_failures>=4 THEN ? ELSE locked_until END WHERE id=?",
        )
        .bind(now() + 600, f.id)
        .run();
      fail("あんしょうばんごうがちがうよ。", 403);
    }
    await db.batch([
      db
        .prepare("UPDATE families SET pin_failures=0,locked_until=0 WHERE id=?")
        .bind(f.id),
      db
        .prepare("UPDATE sessions SET parent_until=? WHERE hash=?")
        .bind(now() + 600, s.hash),
    ]);
    return json({ ok: true });
  }
  if (path === "/lock") {
    await db
      .prepare("UPDATE sessions SET parent_until=0 WHERE hash=?")
      .bind(s.hash)
      .run();
    return json({ ok: true });
  }
  if (path === "/switch") {
    if (!s.shared) fail("このスマホは、ひとりようです。", 403);
    if (
      !(await db
        .prepare("SELECT id FROM members WHERE id=? AND family_id=?")
        .bind(b.member, f.id)
        .first())
    )
      fail("なかまがみつかりません。");
    await db
      .prepare("UPDATE sessions SET member_id=? WHERE hash=?")
      .bind(b.member, s.hash)
      .run();
    return json({ ok: true });
  }
  if (path === "/choice") {
    const info = dayInfo();
    if (info.hour >= f.reveal_hour)
      fail("きょうのぼうけんはおしまい。またあした！");
    if (!itemIdsFor(placeFor(info.day).id, info.day).includes(b.item))
      fail("きょうのぼうけんのもちものをえらんでね。");
    await db
      .prepare(
        "INSERT INTO choices(family_id,member_id,day,item) VALUES(?,?,?,?) ON CONFLICT(family_id,member_id,day) DO UPDATE SET item=excluded.item",
      )
      .bind(f.id, s.member_id, info.day, b.item)
      .run();
    return json({ ok: true });
  }
  if (path === "/character") {
    if (!avatarList.includes(b.avatar)) fail("キャラクターをえらんでね。");
    await db
      .prepare("UPDATE members SET avatar=? WHERE id=? AND family_id=?")
      .bind(b.avatar, s.member_id, f.id)
      .run();
    return json({ ok: true });
  }
  if (path === "/decorate") {
    if (!Number.isInteger(b.slot) || b.slot < 0 || b.slot > 7)
      fail("ばしょをえらんでね。");
    if (b.treasure === null) {
      await db
        .prepare(
          "DELETE FROM decorations WHERE family_id=? AND slot=? AND member_id=?",
        )
        .bind(f.id, b.slot, s.member_id)
        .run();
      return json({ ok: true });
    }
    if (!places.some((p) => p.id === b.treasure))
      fail("たからものがみつかりません。");
    const a = (
      await db
        .prepare("SELECT payload FROM adventures WHERE family_id=?")
        .bind(f.id)
        .all()
    ).results.map((x) => JSON.parse(x.payload));
    if (
      !a.some(
        (x) =>
          x.treasure === b.treasure &&
          x.participants.some((m) => m.id === s.member_id),
      )
    )
      fail("まだみつけていないたからものです。");
    await db
      .prepare(
        "INSERT INTO decorations(family_id,slot,member_id,treasure) VALUES(?,?,?,?) ON CONFLICT(family_id,slot) DO UPDATE SET treasure=excluded.treasure,member_id=excluded.member_id",
      )
      .bind(f.id, b.slot, s.member_id, b.treasure)
      .run();

    return json({ ok: true });
  }
  parent(s);
  if (path === "/member") {
    const ms = await members(db, f.id);
    if (ms.length >= 8) fail("なかまは８にんまでです。");
    await db
      .prepare("INSERT INTO members(id,family_id,name,avatar) VALUES(?,?,?,?)")
      .bind(crypto.randomUUID(), f.id, name(b.name), avatar(b.avatar))
      .run();
    return json({ ok: true });
  }
  if (path === "/shared") {
    await db
      .prepare("UPDATE sessions SET shared=? WHERE hash=?")
      .bind(b.shared ? 1 : 0, s.hash)
      .run();
    return json({ ok: true });
  }
  if (path === "/invite") {
    const mid = b.member || null;
    if (
      mid &&
      !(await db
        .prepare("SELECT id FROM members WHERE id=? AND family_id=?")
        .bind(mid, f.id)
        .first())
    )
      fail("なかまがみつかりません。");
    const token = random();
    await db
      .prepare(
        "INSERT INTO invites(hash,family_id,member_id,expires) VALUES(?,?,?,?)",
      )
      .bind(await hash(token), f.id, mid, now() + 600)
      .run();
    return json({ token, expires: now() + 600 });
  }
  if (path === "/approve") {
    const r = await db
      .prepare(
        "SELECT r.* FROM requests r JOIN invites i ON i.hash=r.invite_hash WHERE r.id=? AND r.family_id=? AND r.status='pending' AND r.expires>? AND i.used=0",
      )
      .bind(b.id, f.id, now())
      .first();
    if (!r) fail("しょうたいのきげんがきれています。");
    if (!b.approve) {
      await db.batch([
        db
          .prepare("UPDATE requests SET status='rejected' WHERE id=?")
          .bind(r.id),
        db
          .prepare("UPDATE invites SET used=1 WHERE hash=?")
          .bind(r.invite_hash),
      ]);
      return json({ ok: true });
    }
    const mid = r.member_id || crypto.randomUUID();
    const stmts = [];
    if (!r.member_id) {
      if ((await members(db, f.id)).length >= 8)
        fail("なかまは８にんまでです。");
      stmts.push(
        db
          .prepare(
            "INSERT INTO members(id,family_id,name,avatar) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM requests WHERE id=? AND status='pending')",
          )
          .bind(mid, f.id, r.name, r.avatar, r.id),
      );
    }
    stmts.push(
      db
        .prepare(
          "UPDATE requests SET status='approved',member_id=? WHERE id=? AND status='pending'",
        )
        .bind(mid, r.id),
      db.prepare("UPDATE invites SET used=1 WHERE hash=?").bind(r.invite_hash),
    );
    await db.batch(stmts);
    return json({ ok: true });
  }
  if (path === "/revoke-invites") {
    await db.batch([
      db.prepare("UPDATE invites SET used=1 WHERE family_id=?").bind(f.id),
      db
        .prepare(
          "UPDATE requests SET status='rejected' WHERE family_id=? AND status IN ('pending','approved')",
        )
        .bind(f.id),
    ]);
    return json({ ok: true });
  }
  if (path === "/revoke-devices") {
    await db
      .prepare("DELETE FROM sessions WHERE family_id=? AND hash<>?")
      .bind(f.id, s.hash)
      .run();
    return json({ ok: true });
  }
  fail("Not found", 404);
}
export default {
  async fetch(req, env) {
    let res;
    try {
      res = new URL(req.url).pathname.startsWith("/api/")
        ? await api(req, env)
        : await env.ASSETS.fetch(req);
    } catch (e) {
      res = json(
        {
          error: e.status
            ? e.message
            : "うまくつながりませんでした。もういちどためしてね。",
        },
        e.status || 500,
      );
      if (!e.status) console.error("request failed", e.message);
    }
    res = new Response(res.body, res);
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("Referrer-Policy", "no-referrer");
    res.headers.set("X-Frame-Options", "DENY");
    res.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; media-src 'self' blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    );
    return res;
  },
};
