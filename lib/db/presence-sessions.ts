import "server-only";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { CollabActor } from "@/lib/collab-events";
import {
  isPresenceSessionActive,
  type CollabIntention,
  type PresenceSessionRecord,
} from "@/lib/collab-presence";
import { getDb } from "@/lib/db/client";
import { agentIdentities, presenceSessions, users } from "@/lib/db/schema";

export type PresenceSessionView = {
  id: string;
  intention: CollabIntention;
  joinedAt: string;
  lastSeenAt: string;
  kind: "human" | "agent";
  displayName: string;
  viaAgent: string | null;
  avatarUrl: string | null;
  userId: string | null;
  agentIdentityId: string | null;
};

function mapSession(row: typeof presenceSessions.$inferSelect): PresenceSessionRecord {
  return {
    id: row.id,
    roomId: row.roomId,
    workspaceId: row.workspaceId,
    userId: row.userId,
    agentIdentityId: row.agentIdentityId,
    mcpTokenId: row.mcpTokenId,
    intention: row.intention as CollabIntention,
    clientInfo: row.clientInfo,
    joinedAt: row.joinedAt,
    lastSeenAt: row.lastSeenAt,
    revokedAt: row.revokedAt,
  };
}

function actorConditions(roomId: string, actor: CollabActor) {
  if (actor.agentIdentityId) {
    return and(
      eq(presenceSessions.roomId, roomId),
      eq(presenceSessions.agentIdentityId, actor.agentIdentityId),
      actor.mcpTokenId
        ? eq(presenceSessions.mcpTokenId, actor.mcpTokenId)
        : isNull(presenceSessions.mcpTokenId),
    );
  }
  if (actor.userId) {
    return and(
      eq(presenceSessions.roomId, roomId),
      eq(presenceSessions.userId, actor.userId),
      isNull(presenceSessions.agentIdentityId),
    );
  }
  return sql`false`;
}

export async function findPresenceSessionForActor(
  roomId: string,
  actor: CollabActor,
): Promise<PresenceSessionRecord | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(presenceSessions)
    .where(actorConditions(roomId, actor))
    .limit(1);
  return row ? mapSession(row) : null;
}

export async function joinOrHeartbeatPresence(input: {
  roomId: string;
  workspaceId: string;
  actor: CollabActor;
  intention: CollabIntention;
  clientInfo?: string | null;
}): Promise<PresenceSessionRecord> {
  const now = new Date().toISOString();
  const db = await getDb();
  const existing = await findPresenceSessionForActor(input.roomId, input.actor);

  if (existing && !existing.revokedAt) {
    const [updated] = await db
      .update(presenceSessions)
      .set({
        intention: input.intention,
        lastSeenAt: now,
        clientInfo: input.clientInfo ?? existing.clientInfo,
      })
      .where(eq(presenceSessions.id, existing.id))
      .returning();
    return mapSession(updated);
  }

  const [inserted] = await db
    .insert(presenceSessions)
    .values({
      roomId: input.roomId,
      workspaceId: input.workspaceId,
      userId: input.actor.userId,
      agentIdentityId: input.actor.agentIdentityId ?? null,
      mcpTokenId: input.actor.mcpTokenId ?? null,
      intention: input.intention,
      clientInfo: input.clientInfo ?? null,
      joinedAt: now,
      lastSeenAt: now,
    })
    .returning();
  return mapSession(inserted);
}

export async function leavePresenceSession(roomId: string, actor: CollabActor): Promise<boolean> {
  const db = await getDb();
  const deleted = await db
    .delete(presenceSessions)
    .where(actorConditions(roomId, actor))
    .returning({ id: presenceSessions.id });
  return deleted.length > 0;
}

export async function listPresenceSessionsForRoom(roomId: string): Promise<PresenceSessionRecord[]> {
  const db = await getDb();
  const rows = await db.select().from(presenceSessions).where(eq(presenceSessions.roomId, roomId));
  return rows.map(mapSession);
}

export async function listActivePresenceViews(roomId: string, now = Date.now()): Promise<PresenceSessionView[]> {
  const sessions = (await listPresenceSessionsForRoom(roomId)).filter((session) =>
    isPresenceSessionActive(session, now),
  );
  if (!sessions.length) return [];

  const db = await getDb();
  const userIds = [...new Set(sessions.map((session) => session.userId).filter(Boolean))] as string[];
  const agentIds = [
    ...new Set(sessions.map((session) => session.agentIdentityId).filter(Boolean)),
  ] as string[];

  const userRows =
    userIds.length > 0
      ? await db
          .select({
            id: users.id,
            name: users.name,
            login: users.login,
            avatarUrl: users.avatarUrl,
          })
          .from(users)
          .where(inArray(users.id, userIds))
      : [];

  const agentRows =
    agentIds.length > 0
      ? await db
          .select({ id: agentIdentities.id, name: agentIdentities.name })
          .from(agentIdentities)
          .where(inArray(agentIdentities.id, agentIds))
      : [];

  const userById = new Map(userRows.map((row) => [row.id, row]));
  const agentById = new Map(agentRows.map((row) => [row.id, row.name]));

  return sessions.map((session) => {
    const user = session.userId ? userById.get(session.userId) : null;
    const agentName = session.agentIdentityId ? agentById.get(session.agentIdentityId) : null;
    const humanName = user?.name ?? user?.login ?? "Tripulante";
    const isAgent = Boolean(session.agentIdentityId);

    return {
      id: session.id,
      intention: session.intention,
      joinedAt: session.joinedAt,
      lastSeenAt: session.lastSeenAt,
      kind: isAgent ? "agent" : "human",
      displayName: isAgent ? (agentName ?? "Agente") : humanName,
      viaAgent: isAgent ? humanName : null,
      avatarUrl: user?.avatarUrl ?? null,
      userId: session.userId,
      agentIdentityId: session.agentIdentityId,
    };
  });
}

export async function revokePresenceSessions(input: {
  roomId?: string;
  workspaceId?: string;
  userId?: string | null;
  agentIdentityId?: string | null;
  mcpTokenId?: string | null;
}): Promise<string[]> {
  const db = await getDb();
  const now = new Date().toISOString();
  const clauses = [isNull(presenceSessions.revokedAt)];

  if (input.roomId) clauses.push(eq(presenceSessions.roomId, input.roomId));
  if (input.workspaceId) clauses.push(eq(presenceSessions.workspaceId, input.workspaceId));
  if (input.userId) clauses.push(eq(presenceSessions.userId, input.userId));
  if (input.agentIdentityId) clauses.push(eq(presenceSessions.agentIdentityId, input.agentIdentityId));
  if (input.mcpTokenId) clauses.push(eq(presenceSessions.mcpTokenId, input.mcpTokenId));

  const updated = await db
    .update(presenceSessions)
    .set({ revokedAt: now })
    .where(and(...clauses))
    .returning({ roomId: presenceSessions.roomId });

  return [...new Set(updated.map((row) => row.roomId))];
}

export async function revokePresenceForWorkspaceUser(workspaceId: string, userId: string) {
  return revokePresenceSessions({ workspaceId, userId });
}

export async function revokePresenceForAgentIdentity(workspaceId: string, agentIdentityId: string) {
  return revokePresenceSessions({ workspaceId, agentIdentityId });
}

export async function revokePresenceForMcpToken(mcpTokenId: string) {
  return revokePresenceSessions({ mcpTokenId });
}
