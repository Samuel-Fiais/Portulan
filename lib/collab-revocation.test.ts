import assert from "node:assert/strict";
import test from "node:test";
import {
  isPresenceSessionActive,
  PRESENCE_STALE_MS,
  type PresenceSessionRecord,
} from "./collab-presence.ts";
import { validateCollabPolicyVersion } from "./collab-room-policy.ts";

const now = Date.UTC(2026, 8, 17, 14, 0, 0);

function session(partial: Partial<PresenceSessionRecord>): PresenceSessionRecord {
  return {
    id: "sess-1",
    roomId: "room-1",
    workspaceId: "ws-1",
    userId: "user-1",
    agentIdentityId: null,
    mcpTokenId: null,
    intention: "viewing",
    clientInfo: null,
    joinedAt: new Date(now).toISOString(),
    lastSeenAt: new Date(now).toISOString(),
    revokedAt: null,
    ...partial,
  };
}

test("RN-121: revogação tira o participante da lista ativa", () => {
  const active = session({});
  assert.equal(isPresenceSessionActive(active, now), true);

  const revoked = session({ revokedAt: new Date(now).toISOString() });
  assert.equal(isPresenceSessionActive(revoked, now), false);
});

test("RN-121: após revogação e bump de policy, eventos com versão antiga são recusados", () => {
  const beforeRevoke = 3;
  const afterRevoke = beforeRevoke + 1;
  assert.equal(validateCollabPolicyVersion(beforeRevoke, afterRevoke).ok, false);
  assert.equal(validateCollabPolicyVersion(afterRevoke, afterRevoke).ok, true);
});

test("presença expirada não conta como alguém na sala", () => {
  const stale = session({
    lastSeenAt: new Date(now - PRESENCE_STALE_MS - 5_000).toISOString(),
  });
  assert.equal(isPresenceSessionActive(stale, now), false);
});
