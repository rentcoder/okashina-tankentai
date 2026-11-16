import { places, placeFor } from "./stories.js";
import { adventureEquipment } from "./equipment.js";

// Only migration of already prepared days uses the historical calendar.
export async function preservePrepared(db, family) {
  const { results } = await db
    .prepare(
      `SELECT day,item FROM choices
    WHERE family_id=? AND NOT EXISTS (SELECT 1 FROM story_assignments s
      WHERE s.family_id=choices.family_id AND s.day=choices.day) ORDER BY day`,
    )
    .bind(family)
    .all();
  for (const row of results) {
    const id =
      Object.keys(adventureEquipment).find((id) =>
        adventureEquipment[id].some((item) => item.id === row.item),
      ) || placeFor(row.day).id;
    await db
      .prepare(
        "INSERT OR IGNORE INTO story_assignments(family_id,day,place) VALUES(?,?,?)",
      )
      .bind(family, row.day, id)
      .run();
  }
}

export async function assignedStory(db, family, day) {
  // Also covers diaries finalized by the old worker during rollout.
  await db
    .prepare(
      `INSERT OR IGNORE INTO story_assignments(family_id,day,place)
    SELECT family_id,day,json_extract(payload,'$.place') FROM adventures
    WHERE family_id=? AND day=?`,
    )
    .bind(family, day)
    .run();
  // Selection and reservation are a single SQL statement: simultaneous phones
  // cannot consume two stories, or choose an already issued story.
  await db
    .prepare(
      `INSERT OR IGNORE INTO story_assignments(family_id,day,place)
    SELECT ?,?,value FROM json_each(?)
    WHERE NOT EXISTS (SELECT 1 FROM story_assignments WHERE family_id=? AND day=?)
      AND NOT EXISTS (SELECT 1 FROM story_assignments WHERE family_id=? AND place=value)
      AND NOT EXISTS (SELECT 1 FROM adventures WHERE family_id=? AND json_extract(payload,'$.place')=value)
    ORDER BY random() LIMIT 1`,
    )
    .bind(
      family,
      day,
      JSON.stringify(places.map((p) => p.id)),
      family,
      day,
      family,
      family,
    )
    .run();
  const saved = await db
    .prepare("SELECT place FROM story_assignments WHERE family_id=? AND day=?")
    .bind(family, day)
    .first();
  return places.find((p) => p.id === saved?.place) || null;
}
