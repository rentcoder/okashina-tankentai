CREATE TABLE story_assignments (
  family_id TEXT NOT NULL REFERENCES families(id),
  day TEXT NOT NULL,
  place TEXT NOT NULL,
  PRIMARY KEY(family_id, day)
);
CREATE INDEX story_assignments_seen ON story_assignments(family_id, place);
INSERT OR IGNORE INTO story_assignments(family_id,day,place)
SELECT family_id,day,json_extract(payload,'$.place') FROM adventures;
