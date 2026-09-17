import assert from "node:assert/strict";
import test from "node:test";
import {
  isPresenceSessionActive,
  PRESENCE_STALE_MS,
  validatePresenceIntention,
} from "./collab-presence.ts";

const now = Date.UTC(2026, 8, 17, 12, 0, 0);

test("RN-123: intenção da presença é declarada e fechada", () => {
  assert.equal(validatePresenceIntention("editing").ok, true);
  assert.equal(validatePresenceIntention("automating").ok, true);
  assert.equal(validatePresenceIntention("publicando").ok, false);
});

test("RN-121: presença revogada ou sem batida recente não conta", () => {
  const lastSeen = new Date(now - 1_000).toISOString();
  assert.equal(isPresenceSessionActive({ lastSeenAt: lastSeen, revokedAt: null }, now), true);
  assert.equal(
    isPresenceSessionActive({ lastSeenAt: lastSeen, revokedAt: new Date(now).toISOString() }, now),
    false,
  );
  assert.equal(
    isPresenceSessionActive(
      { lastSeenAt: new Date(now - PRESENCE_STALE_MS - 1).toISOString(), revokedAt: null },
      now,
    ),
    false,
  );
});
