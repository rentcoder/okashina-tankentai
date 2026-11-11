export const placeIds = [
  "river",
  "cloud",
  "forest",
  "moon",
  "sea",
  "snow",
  "garden",
];
export const itemIds = [
  "pudding",
  "umbrella",
  "rope",
  "flute",
  "pillow",
  "banana",
];
const root = "/art/adventures/v1";
export function sceneImage(place, phase = "before", item = null) {
  if (!placeIds.includes(place))
    throw new Error("Unknown illustrated adventure");
  const file =
    phase === "after"
      ? itemIds.includes(item)
        ? `after-${item}`
        : "after"
      : "before";
  return `${root}/${place}/${file}.webp`;
}
export function treasureImage(place) {
  if (!placeIds.includes(place)) throw new Error("Unknown treasure");
  return `${root}/${place}/treasure.webp`;
}
export function hostImage(place) {
  if (!placeIds.includes(place)) throw new Error("Unknown host");
  return `${root}/${place}/host.webp`;
}
export function equipmentImage(item) {
  if (!itemIds.includes(item)) throw new Error("Unknown equipment");
  return `${root}/equipment/${item}.webp`;
}
