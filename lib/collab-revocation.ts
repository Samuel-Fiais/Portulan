import "server-only";

import type { CollabSubjectType } from "@/lib/collab-rooms";
import { bumpCollabRoomPolicyVersions, getCollabRoom } from "@/lib/db/collab-rooms";
import {
  revokePresenceForAgentIdentity,
  revokePresenceForMcpToken,
  revokePresenceForWorkspaceUser,
  revokePresenceSessions,
} from "@/lib/db/presence-sessions";

async function bumpRoomsAfterRevoke(roomIds: string[]) {
  if (!roomIds.length) return;
  await bumpCollabRoomPolicyVersions(roomIds);
}

/** Perda de convite nominal na carta: encerra presença e invalida clientes na sala (RN-121). */
export async function revokeCollabAccessForDocumentShare(input: {
  workspaceId: string;
  documentId: string;
  userId: string | null;
}) {
  if (!input.userId) return;

  const room = await getCollabRoom({
    workspaceId: input.workspaceId,
    subjectType: "document",
    subjectId: input.documentId,
  });
  if (!room) return;

  const roomIds = await revokePresenceSessions({
    roomId: room.id,
    userId: input.userId,
  });
  await bumpRoomsAfterRevoke(roomIds.length ? roomIds : [room.id]);
}

/** Tripulante removido do porto perde presença em todas as salas daquele porto (RN-121). */
export async function revokeCollabAccessForWorkspaceMember(workspaceId: string, userId: string) {
  const roomIds = await revokePresenceForWorkspaceUser(workspaceId, userId);
  await bumpRoomsAfterRevoke(roomIds);
}

/** Identidade de agente desativada ou excluída encerra presença nas salas do porto (RN-121). */
export async function revokeCollabAccessForAgentIdentity(workspaceId: string, agentIdentityId: string) {
  const roomIds = await revokePresenceForAgentIdentity(workspaceId, agentIdentityId);
  await bumpRoomsAfterRevoke(roomIds);
}

/** Chave MCP revogada encerra presença ligada a ela (RN-121). */
export async function revokeCollabAccessForMcpToken(mcpTokenId: string) {
  const roomIds = await revokePresenceForMcpToken(mcpTokenId);
  await bumpRoomsAfterRevoke(roomIds);
}

export async function revokeCollabAccessForSubjectActor(input: {
  workspaceId: string;
  subjectType: CollabSubjectType;
  subjectId: string;
  userId?: string | null;
  agentIdentityId?: string | null;
  mcpTokenId?: string | null;
}) {
  const room = await getCollabRoom({
    workspaceId: input.workspaceId,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
  });
  if (!room) return;

  const roomIds = await revokePresenceSessions({
    roomId: room.id,
    userId: input.userId ?? undefined,
    agentIdentityId: input.agentIdentityId ?? undefined,
    mcpTokenId: input.mcpTokenId ?? undefined,
  });
  await bumpRoomsAfterRevoke(roomIds.length ? roomIds : [room.id]);
}
