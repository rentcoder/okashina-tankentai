import sets from "./adventure-equipment.json" with { type: "json" };
// Preserve IDs and images referenced by old diaries and by today's preparation.
export const equipmentStart = "2026-11-14";
export const legacyItemIds = [
  "pudding",
  "umbrella",
  "rope",
  "flute",
  "pillow",
  "banana",
];
export const adventureEquipment = Object.fromEntries(
  Object.entries(sets).map(([place, entries]) => [
    place,
    entries.map(({ id, name, action }) => ({ id, name, action })),
  ]),
);
export function itemIdsFor(place, day) {
  return day < equipmentStart
    ? legacyItemIds
    : (adventureEquipment[place] || []).map((i) => i.id);
}
