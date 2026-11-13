import { characterFor, characterImage } from "./characters.js";
const homes = [
  [29, 71],
  [12, 68],
  [57, 77],
  [86, 80],
  [90, 91],
  [31, 94],
  [57, 94],
  [83, 80],
];
// Standing viewpoints stay on the floor, below the painted furniture.
const viewpoints = [
  [19, 78],
  [74, 78],
  [42, 79],
  [85, 82],
  [42, 82],
  [74, 86],
  [40, 94],
  [81, 94],
];
export const walkImage = (avatar, frame) =>
  `/art/characters/walk-v1/${characterFor(avatar).id}/${frame}.webp`;
export function createResidents(members, random = Math.random) {
  return members.map((m, i) => ({
    id: m.id,
    x: homes[i][0],
    y: homes[i][1],
    home: homes[i],
    kind: "rest",
    seated: true,
    wait: 2 + i * 2 + random() * 3,
    speed: 2.3 + random() * 1.2,
    clock: random() * 2,
    cooldown: 0,
    facing: 1,
  }));
}
const distance = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * 1.5);
function travel(r, target, next, random) {
  r.target = target;
  r.next = next;
  r.kind = "walk";
  r.seated = false;
  r.wait = 6 + random() * 10;
  // First step out onto the floor; do not cross the table or sofa diagonally.
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
      const target = r.waypoint || r.target;
      const dx = target[0] - r.x,
        dy = target[1] - r.y;
      const length = Math.hypot(dx, dy * 1.5),
        step = r.speed * seconds;
      if (Math.abs(dx) > 0.1) r.facing = dx > 0 ? 1 : -1;
      if (length <= step) {
        [r.x, r.y] = target;
        if (r.waypoint) r.waypoint = null;
        else {
          r.kind = r.next;
          if (r.next === "look") r.facing = r.lookFacing;
          r.seated =
            r.next === "rest" && r.x === r.home[0] && r.y === r.home[1];
        }
      } else {
        r.x += (dx / length) * step;
        r.y += (dy / length) * step;
      }
      continue;
    }
    r.wait -= seconds;
    if (r.wait > 0) continue;
    if (r.kind === "chat") {
      r.kind = "rest";
      r.seated = r.x === r.home[0] && r.y === r.home[1];
      r.partner = null;
      r.wait = 3 + random() * 5;
      r.cooldown = 18 + random() * 16;
      continue;
    }
    // At most one pair chats. Nobody is summoned to a fixed meeting point.
    const peer =
      !residents.some((p) => p.kind === "chat") &&
      r.cooldown === 0 &&
      residents.find(
        (p) =>
          p !== r &&
          ["rest", "look"].includes(p.kind) &&
          p.cooldown === 0 &&
          distance(r, p) > 10 &&
          distance(r, p) < 30 &&
          Math.abs(r.y - p.y) < 10,
      );
    if (peer && random() < 0.65) {
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
    const pick = random();
    if (pick < 0.4 && slots.length) {
      const slot = slots[Math.floor(random() * slots.length)];
      const target = viewpoints[slot];
      const x = target[0] + (random() - 0.5) * 6;
      r.lookFacing = [15, 78, 44, 78, 49, 74, 30, 75][slot] > x ? 1 : -1;
      travel(r, [x, target[1]], "look", random);
    } else if (pick < 0.8) {
      // Avoid choosing an already occupied resting spot.
      let target;
      for (let attempt = 0; attempt < 8; attempt++) {
        target = [16 + random() * 69, 82 + random() * 13];
        if (
          residents.every(
            (p) => p === r || distance(p, { x: target[0], y: target[1] }) > 14,
          )
        )
          break;
      }
      travel(r, target, "rest", random);
    } else if (random() < 0.5) travel(r, r.home, "rest", random);
    else {
      r.wait = 5 + random() * 9;
      r.kind = "rest";
    }
  }
}
let saved = [];
export function mountRoomLife(root, members, decorations, enabled) {
  if (!root) return () => {};
  const fresh = createResidents(members);
  saved = fresh.map((r) => saved.find((old) => old.id === r.id) || r);
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
