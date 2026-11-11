import { placeIds } from "./art.js";
// Milliseconds per frame; the reveal and final tableau have room to breathe.
export const timings = {
  river: [500, 500, 700, 500, 1000],
  cloud: [500, 500, 500, 800, 1000],
  forest: [500, 800, 500, 500, 1000],
  moon: [500, 700, 500, 500, 1000],
  sea: [500, 500, 700, 500, 1000],
  snow: [500, 700, 500, 500, 1000],
  garden: [500, 500, 700, 700, 1000],
};
export function frames(place) {
  if (!placeIds.includes(place)) throw new Error("Unknown flipbook");
  return timings[place].map((duration, i) => ({
    src: `/art/flipbooks/v1/${place}/frame-${i + 1}.webp`,
    duration,
  }));
}
let cancel = () => {};
export function stopFlipbook() {
  cancel();
  cancel = () => {};
}
export async function playFlipbook(button) {
  const box = button.closest("[data-flipbook]");
  if (box.dataset.playing === "true") {
    stopFlipbook();
    return;
  }
  stopFlipbook();
  const sequence = frames(box.dataset.flipbook);
  const picture = box.querySelector("img");
  const status = box.querySelector("[role=status]");
  let stopped = false,
    timer;
  box.dataset.playing = "true";
  button.textContent = "とめる";
  status.textContent = "えをよういしているよ…";
  cancel = () => {
    stopped = true;
    clearTimeout(timer);
    box.dataset.playing = "false";
    button.textContent = "もういちどみる";
    status.textContent = "";
  };
  try {
    await Promise.all(
      sequence.map(
        ({ src }) =>
          new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = reject;
            img.src = src;
          }),
      ),
    );
    if (stopped || !box.isConnected) return;
    status.textContent = "";
    let index = 0;
    const show = () => {
      if (stopped || !box.isConnected) return;
      picture.src = sequence[index].src;
      box.querySelector(".flipbook-count").textContent =
        `${index + 1} / ${sequence.length}`;
      timer = setTimeout(() => {
        if (++index < sequence.length) show();
        else {
          stopFlipbook();
          status.textContent = "おしまい";
        }
      }, sequence[index].duration);
    };
    show();
  } catch {
    if (stopped) return;
    stopFlipbook();
    status.textContent = "えをよみこめなかったよ。もういちどためしてね。";
  }
}
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopFlipbook();
  });
  window.addEventListener("pagehide", stopFlipbook);
}
