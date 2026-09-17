import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { collabSubjectTypes } from "./collab-rooms.ts";
import { collabIntentions } from "./collab-presence.ts";

const ddl = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "schema.sql"),
  "utf8",
);

function tableDdl(table: string): string {
  const match = ddl.match(
    new RegExp(`CREATE TABLE IF NOT EXISTS portulan\\.${table} \\(([\\s\\S]*?)\\n\\);`),
  );
  assert.ok(match, `schema.sql precisa declarar portulan.${table}`);
  return match[1];
}

test("RN-124: as travas do log de sala vivem no banco, não só no código", () => {
  const events = tableDdl("collab_events");
  assert.match(events, /UNIQUE \(room_id, idempotency_key\)/);
  assert.match(events, /UNIQUE \(room_id, seq\)/);
  assert.match(tableDdl("collab_rooms"), /UNIQUE \(workspace_id, subject_type, subject_id\)/);
});

test("os assuntos e intenções do código são os aceitos pelo banco", () => {
  const rooms = tableDdl("collab_rooms");
  for (const subject of collabSubjectTypes) {
    assert.match(rooms, new RegExp(`'${subject}'`));
  }
  const presence = tableDdl("presence_sessions");
  for (const intention of collabIntentions) {
    assert.match(presence, new RegExp(`'${intention}'`));
  }
});

test("presence_sessions nasce com sala, intenção, última batida e revogação", () => {
  const presence = tableDdl("presence_sessions");
  for (const column of ["room_id", "workspace_id", "intention", "last_seen_at", "revoked_at"]) {
    assert.match(presence, new RegExp(`\\n {2}${column} `));
  }
});

test("RN-121: a sala carrega o carimbo da autorização vigente", () => {
  assert.match(tableDdl("collab_rooms"), /\n {2}policy_version INTEGER NOT NULL DEFAULT 1/);
});
