import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import {
  validateCollabSubject,
  type CollabRoomRecord,
  type CollabRoomSubject,
  type CollabSubjectType,
} from "@/lib/collab-rooms";
import { getDb } from "@/lib/db/client";
import { collabRooms } from "@/lib/db/schema";

function mapRoom(row: typeof collabRooms.$inferSelect): CollabRoomRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    subjectType: row.subjectType as CollabSubjectType,
    subjectId: row.subjectId,
    policyVersion: row.policyVersion,
    createdAt: row.createdAt,
  };
}

export async function getCollabRoom(subject: CollabRoomSubject): Promise<CollabRoomRecord | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(collabRooms)
    .where(
      and(
        eq(collabRooms.workspaceId, subject.workspaceId),
        eq(collabRooms.subjectType, subject.subjectType),
        eq(collabRooms.subjectId, subject.subjectId),
      ),
    )
    .limit(1);
  return row ? mapRoom(row) : null;
}

export async function getCollabRoomById(
  id: string,
  workspaceId: string,
): Promise<CollabRoomRecord | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(collabRooms)
    .where(and(eq(collabRooms.id, id), eq(collabRooms.workspaceId, workspaceId)))
    .limit(1);
  return row ? mapRoom(row) : null;
}

/** Uma sala por porto + assunto (RN-119). Chamadas concorrentes reusam a mesma sala. */
export async function ensureCollabRoom(subject: CollabRoomSubject): Promise<CollabRoomRecord> {
  const valid = validateCollabSubject(subject);
  if (!valid.ok) throw new Error(valid.error);

  const db = await getDb();
  const [inserted] = await db
    .insert(collabRooms)
    .values({
      workspaceId: subject.workspaceId,
      subjectType: subject.subjectType,
      subjectId: subject.subjectId,
    })
    .onConflictDoNothing({
      target: [collabRooms.workspaceId, collabRooms.subjectType, collabRooms.subjectId],
    })
    .returning();
  if (inserted) return mapRoom(inserted);

  const existing = await getCollabRoom(subject);
  if (!existing) throw new Error("Não foi possível abrir a sala deste artefato.");
  return existing;
}

/** Avança o carimbo quando a autorização da sala muda (RN-121). */
export async function bumpCollabRoomPolicyVersion(roomId: string): Promise<number | null> {
  const db = await getDb();
  const [row] = await db
    .update(collabRooms)
    .set({ policyVersion: sql`${collabRooms.policyVersion} + 1` })
    .where(eq(collabRooms.id, roomId))
    .returning({ policyVersion: collabRooms.policyVersion });
  return row?.policyVersion ?? null;
}

export async function bumpCollabRoomPolicyVersions(roomIds: readonly string[]): Promise<void> {
  const unique = [...new Set(roomIds.filter(Boolean))];
  for (const roomId of unique) {
    await bumpCollabRoomPolicyVersion(roomId);
  }
}

export async function listCollabRooms(
  workspaceId: string,
  filter?: { subjectType?: CollabSubjectType },
): Promise<CollabRoomRecord[]> {
  const db = await getDb();
  const conditions = [eq(collabRooms.workspaceId, workspaceId)];
  if (filter?.subjectType) conditions.push(eq(collabRooms.subjectType, filter.subjectType));
  const rows = await db
    .select()
    .from(collabRooms)
    .where(and(...conditions))
    .orderBy(desc(collabRooms.createdAt));
  return rows.map(mapRoom);
}
