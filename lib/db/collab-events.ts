import "server-only";

import { and, asc, eq, gt, sql } from "drizzle-orm";
import {
  appendCollabEvent as appendToCollabLog,
  readCollabEventsSince as readFromCollabLog,
  type CollabAppendResult,
  type CollabEventCursor,
  type CollabEventDraft,
  type CollabEventInsert,
  type CollabEventPage,
  type CollabEventRecord,
  type CollabEventStore,
  type CollabEventType,
} from "@/lib/collab-events";
import type { CollabIntention } from "@/lib/collab-presence";
import { getDb } from "@/lib/db/client";
import { parseJsonObject } from "@/lib/db/json-text";
import { collabEvents } from "@/lib/db/schema";

function mapEvent(row: typeof collabEvents.$inferSelect): CollabEventRecord {
  return {
    id: row.id,
    roomId: row.roomId,
    workspaceId: row.workspaceId,
    seq: Number(row.seq),
    type: row.type as CollabEventType,
    userId: row.userId,
    agentIdentityId: row.agentIdentityId,
    mcpTokenId: row.mcpTokenId,
    intention: (row.intention as CollabIntention | null) ?? null,
    baseVersion: row.baseVersion,
    payload: parseJsonObject(row.payload),
    idempotencyKey: row.idempotencyKey,
    createdAt: row.createdAt,
  };
}

async function findByIdempotencyKey(
  roomId: string,
  idempotencyKey: string,
): Promise<CollabEventRecord | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(collabEvents)
    .where(and(eq(collabEvents.roomId, roomId), eq(collabEvents.idempotencyKey, idempotencyKey)))
    .limit(1);
  return row ? mapEvent(row) : null;
}

export async function getLatestCollabSeq(roomId: string): Promise<number | null> {
  const db = await getDb();
  const [row] = await db
    .select({ seq: sql<number>`coalesce(max(${collabEvents.seq}), 0)` })
    .from(collabEvents)
    .where(eq(collabEvents.roomId, roomId));
  const seq = Number(row?.seq ?? 0);
  return seq > 0 ? seq : null;
}

async function insertEvent(row: CollabEventInsert): Promise<CollabEventRecord | null> {
  const db = await getDb();
  const [inserted] = await db
    .insert(collabEvents)
    .values({
      roomId: row.roomId,
      workspaceId: row.workspaceId,
      seq: row.seq,
      type: row.type,
      userId: row.userId,
      agentIdentityId: row.agentIdentityId,
      mcpTokenId: row.mcpTokenId,
      intention: row.intention,
      baseVersion: row.baseVersion,
      payload: row.payload ? JSON.stringify(row.payload) : null,
      idempotencyKey: row.idempotencyKey,
    })
    .onConflictDoNothing()
    .returning();
  return inserted ? mapEvent(inserted) : null;
}

export async function listCollabEvents(
  roomId: string,
  options?: { afterSeq?: number; limit?: number },
): Promise<CollabEventRecord[]> {
  const db = await getDb();
  const conditions = [eq(collabEvents.roomId, roomId)];
  if (options?.afterSeq != null) conditions.push(gt(collabEvents.seq, options.afterSeq));
  const rows = await db
    .select()
    .from(collabEvents)
    .where(and(...conditions))
    .orderBy(asc(collabEvents.seq))
    .limit(options?.limit ?? 200);
  return rows.map(mapEvent);
}

/** Postgres é a fonte do log da sala; o canal ao vivo só replica (RN-124). */
export const collabEventStore: CollabEventStore = {
  findByIdempotencyKey,
  latestSeq: getLatestCollabSeq,
  insert: insertEvent,
  listSince: (roomId, cursor) => listCollabEvents(roomId, cursor),
};

export function appendCollabEvent(draft: CollabEventDraft): Promise<CollabAppendResult> {
  return appendToCollabLog(collabEventStore, draft);
}

export function readCollabEventsSince(
  roomId: string,
  cursor: CollabEventCursor,
): Promise<CollabEventPage> {
  return readFromCollabLog(collabEventStore, roomId, cursor);
}

export async function getCollabEventByIdempotencyKey(roomId: string, idempotencyKey: string) {
  return findByIdempotencyKey(roomId, idempotencyKey.trim());
}
