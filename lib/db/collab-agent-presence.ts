import "server-only";

import type { CollabActor } from "@/lib/collab-events";
import { collabRealtimeScopeEnabled } from "@/lib/collab-feature-flags";
import type { CollabIntention } from "@/lib/collab-presence";
import type { CollabSubjectType } from "@/lib/collab-rooms";
import { appendCollabEvent } from "@/lib/db/collab-events";
import { ensureCollabRoom } from "@/lib/db/collab-rooms";
import { joinOrHeartbeatPresence } from "@/lib/db/presence-sessions";

/**
 * Agente de bordo declara presença e intenção na sala do artefato (RN-123).
 * Chamado a partir do MCP quando o agente opera Manobra/Lance/Rumo.
 */
export async function touchAgentCollabPresence(input: {
  workspaceId: string;
  subjectType: CollabSubjectType;
  subjectId: string;
  actor: CollabActor;
  intention: CollabIntention;
}) {
  if (!collabRealtimeScopeEnabled("presence")) return null;
  if (!input.actor.agentIdentityId || !input.actor.userId) return null;

  const room = await ensureCollabRoom({
    workspaceId: input.workspaceId,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
  });
  const session = await joinOrHeartbeatPresence({
    roomId: room.id,
    workspaceId: input.workspaceId,
    actor: input.actor,
    intention: input.intention,
  });
  await appendCollabEvent({
    roomId: room.id,
    workspaceId: input.workspaceId,
    type: "presence.updated",
    actor: input.actor,
    intention: input.intention,
    payload: { source: "mcp" },
    idempotencyKey: `agent-presence-${session.id}-${session.lastSeenAt}`,
  }).catch(() => null);
  return session;
}
