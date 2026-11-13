import { characterFor, characterImage } from "./characters.js";
// Stable, exclusive stopping places. Destinations are reserved before walking.
export const residentPositions = [68, 77, 86, 95].flatMap((y, row) =>
  [12, 37, 62, 87].map((x, column) => ({ id: row * 4 + column, x, y })),
);
const initialPositions = [0, 1, 6, 11, 12, 13, 14, 15];
export function adjacentPositions(a, b) {
  if (a === null || b === null || a === b) return false;
  const left = residentPositions[a],
    right = residentPositions[b];
  return (
    Math.abs(left.y - right.y) <= 9 &&
    Math.hypot(left.x - right.x, (left.y - right.y) * 1.5) <= 29
  );
}
const claims = (r) =>
  [r.position, r.destination].filter((id) => id !== null && id !== undefined);
function freePositions(residents, self) {
  const reserved = new Set(residents.filter((r) => r !== self).flatMap(claims));
  return residentPositions.filter(
    (p) => !reserved.has(p.id) && p.id !== self?.position,
  );
}
export function syncResidents(members, previous = [], random = Math.random) {
  const kept = previous.filter((r) => members.some((m) => m.id === r.id));
  const fresh = createResidents(members, random);
  return members.map((m, i) => {
    const old = kept.find((r) => r.id === m.id);
    if (old) return old;
    const r = fresh[i];
    const free = freePositions(kept);
    const p = free.find((p) => p.id === r.position) || free[0];
    r.position = p.id;
    r.x = p.x;
    r.y = p.y;
    r.home = p.id;
    kept.push(r);
    return r;
  });
}
export const walkImage = (avatar, frame) =>
  `/art/characters/walk-v1/${characterFor(avatar).id}/${frame}.webp`;
export function createResidents(members, random = Math.random) {
  return members.map((m, i) => {
    const position = initialPositions[i],
      p = residentPositions[position];
    return {
      id: m.id,
      x: p.x,
      y: p.y,
      position,
      destination: null,
      home: position,
      kind: "rest",
      seated: position < 2,
      wait: 2 + i * 2 + random() * 3,
      speed: 2.3 + random() * 1.2,
      clock: random() * 2,
      cooldown: 0,
      facing: 1,
    };
  });
}
function travel(r, position, next, random) {
  r.destination = position.id;
  r.target = [position.x, position.y];
  r.next = next;
  r.kind = "walk";
  r.seated = false;
  r.wait = 6 + random() * 10;
  r.waypoint = r.y < 79 ? [r.x, 81] : null;
}
export function advanceResidents(
  residents,
  seconds,
  slots,
  random = Math.random,
) {
  for (const r of residents) {
    r.clock += seconds;
    r.cooldown = Math.max(0, r.cooldown - seconds);
    if (r.kind === "walk") {
      const target = r.waypoint || r.target,
        dx = target[0] - r.x,
        dy = target[1] - r.y;
      const length = Math.hypot(dx, dy * 1.5),
        step = r.speed * seconds;
      if (Math.abs(dx) > 0.1) r.facing = dx > 0 ? 1 : -1;
      if (length <= step) {
        [r.x, r.y] = target;
        if (r.waypoint) r.waypoint = null;
        else {
          r.position = r.destination;
          r.destination = null;
          r.kind = r.next;
          if (r.kind === "look") r.facing = r.lookFacing;
          r.seated = r.kind === "rest" && r.position < 2;
        }
      } else {
        r.x += (dx / length) * step;
        r.y += (dy / length) * step;
      }
      continue;
    }
    r.wait -= seconds;
    if (r.kind === "chat") {
      if (r.wait <= 0) {
        r.kind = "rest";
        r.seated = r.position < 2;
        r.partner = null;
        r.wait = 3 + random() * 5;
        r.cooldown = 18 + random() * 16;
      }
      continue;
    }
    // Arrival at neighboring places starts a conversation, independently of rest timers.
    const peer =
      r.cooldown === 0 &&
      residents.find(
        (p) =>
          p !== r &&
          ["rest", "look"].includes(p.kind) &&
          p.cooldown === 0 &&
          adjacentPositions(r.position, p.position),
      );
    if (peer) {
      for (const [a, b, turn] of [
        [r, peer, 0],
        [peer, r, 1],
      ]) {
        a.kind = "chat";
        a.partner = b.id;
        a.turn = turn;
        a.wait = 7;
        a.clock = 0;
        a.seated = false;
        a.facing = b.x > a.x ? 1 : -1;
      }
      continue;
    }
    if (r.wait > 0) continue;
    const free = freePositions(residents, r).filter((p) =>
      residents
        .filter((a) => a !== r)
        .flatMap(claims)
        .every((id) => {
          const other = residentPositions[id];
          return Math.hypot(p.x - other.x, (p.y - other.y) * 1.5) > 18;
        }),
    );
    if (!free.length) {
      r.wait = 2 + random() * 3;
      continue;
    }
    const pick = random();
    if (pick < 0.4 && slots.length) {
      const slot = slots[Math.floor(random() * slots.length)],
        tx = [15, 78, 44, 78, 49, 74, 30, 75][slot];
      const p = [...free].sort(
        (a, b) => Math.abs(a.x - tx) - Math.abs(b.x - tx),
      )[0];
      r.lookFacing = tx > p.x ? 1 : -1;
      travel(r, p, "look", random);
    } else if (pick < 0.85)
      travel(r, free[Math.floor(random() * free.length)], "rest", random);
    else {
      r.wait = 5 + random() * 9;
      r.kind = "rest";
    }
  }
}
let saved = [];
export function mountRoomLife(root, members, decorations, enabled) {
  if (!root) return () => {};
  saved = syncResidents(members, saved);
  const residents = saved;
  const nodes = [...root.querySelectorAll(".resident")];
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  let handle,
    last,
    disposed = false;
  const paused = () => !enabled || media.matches || document.hidden;
  function paint() {
    residents.forEach((r, i) => {
      const node = nodes[i],
        walking = r.kind === "walk";
      node.style.left = `${r.x}%`;
      node.style.top = `${r.y}%`;
      node.style.zIndex = Math.round(r.y * 10);
      node.dataset.activity = r.kind;
      node.dataset.position = String(r.position);
      node.dataset.destination =
        r.destination === null ? "" : String(r.destination);
      node.setAttribute(
        "aria-label",
        `${members[i].name}：${{ walk: "おさんぽ", look: "たからものをながめている", chat: "なかまとおしゃべり", rest: "ひとやすみ" }[r.kind]}`,
      );
      const frame = walking
        ? 1 + (Math.floor(r.clock / 0.22) % 4)
        : r.kind === "look" || r.kind === "chat"
          ? 4 + (Math.floor(r.clock / 1.3) % 2)
          : r.seated
            ? 2 + (Math.floor(r.clock / 1.6) % 2)
            : 1;
      const src = walking
        ? walkImage(members[i].avatar, frame)
        : characterImage(members[i].avatar, frame);
      const img = node.querySelector("img");
      if (img.getAttribute("src") !== src) img.src = src;
      img.style.transform = walking
        ? `scaleX(${r.facing})`
        : r.kind === "chat" || r.kind === "look"
          ? `scaleX(${-r.facing})`
          : "none";
      node.querySelector(".resident-chat").style.opacity =
        r.kind === "chat" && Math.floor(r.clock / 1.4) % 2 === r.turn
          ? "1"
          : "0";
    });
  }
  function tick(now) {
    if (disposed || !root.isConnected) return;
    if (last !== undefined && !paused())
      advanceResidents(
        residents,
        Math.min((now - last) / 1000, 0.1),
        decorations.map((d) => d.slot),
      );
    last = now;
    paint();
    if (!paused()) handle = requestAnimationFrame(tick);
  }
  function resume() {
    cancelAnimationFrame(handle);
    last = undefined;
    if (!disposed) {
      root.dataset.running = String(!paused());
      paint();
      if (!paused()) handle = requestAnimationFrame(tick);
    }
  }
  document.addEventListener("visibilitychange", resume);
  media.addEventListener("change", resume);
  // Decode all four steps before switching to them to avoid flashing during a walk.
  const images = members.flatMap((m) =>
    [1, 2, 3, 4].map((f) => {
      const img = new Image();
      img.src = walkImage(m.avatar, f);
      return img.decode().catch(() => {});
    }),
  );
  paint();
  Promise.all(images).then(resume);
  return () => {
    disposed = true;
    cancelAnimationFrame(handle);
    document.removeEventListener("visibilitychange", resume);
    media.removeEventListener("change", resume);
  };
}
