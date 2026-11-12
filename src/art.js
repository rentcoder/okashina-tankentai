import { adventureEquipment } from "./equipment.js";
import { places, items, allItems } from "./stories.js";
export const legacyPlaceIds = [
  "river",
  "cloud",
  "forest",
  "moon",
  "sea",
  "snow",
  "garden",
  "post",
];
export const placeIds = places.map((p) => p.id);
export const itemIds = items.map((i) => i.id);
const allItemIds = allItems.map((i) => i.id);
const root = "/art/adventures/v1";
export function sceneImage(place, phase = "before", item = null) {
  if (!placeIds.includes(place))
    throw new Error("Unknown illustrated adventure");
  const file =
    phase === "after"
      ? (legacyPlaceIds.includes(place) && itemIds.includes(item)) ||
        adventureEquipment[place]?.some((i) => i.id === item)
        ? `after-${item}`
        : "after"
      : "before";
  return `${root}/${place}/${file}.webp`;
}
export function treasureImage(place) {
  if (!placeIds.includes(place)) throw new Error("Unknown treasure");
  return `/art/treasures/v2/${place}.webp`;
}
export function hostImage(place) {
  if (!placeIds.includes(place)) throw new Error("Unknown host");
  return `${root}/${place}/host.webp`;
}
export function equipmentImage(item) {
  if (!allItemIds.includes(item)) throw new Error("Unknown equipment");
  return `${root}/equipment/${item}.webp`;
}
