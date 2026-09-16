import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { coordinationMessages, coordinationThreads } from "@/lib/db/schema";
import type { CoordinationSubjectType } from "@/lib/dev-context";

export type CoordinationThreadRecord = {
  id: string;
  workspaceId: string;
  subjectType: CoordinationSubjectType;
  subjectId: string;
  isBlocker: boolean;
  resolvedAt: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type CoordinationMessageRecord = {
  id: string;
  threadId: string;
  userId: string;
  agentIdentityId: string | null;
  body: string;
  parentId: string | null;
  createdAt: string;
};

function mapThread(row: typeof coordinationThreads.$inferSelect): CoordinationThreadRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    subjectType: row.subjectType as CoordinationSubjectType,
    subjectId: row.subjectId,
    isBlocker: row.isBlocker,
    resolvedAt: row.resolvedAt,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  };
}

function mapMessage(row: typeof coordinationMessages.$inferSelect): CoordinationMessageRecord {
  return {
    id: row.id,
    threadId: row.threadId,
    userId: row.userId,
    agentIdentityId: row.agentIdentityId,
    body: row.body,
    parentId: row.parentId,
    createdAt: row.createdAt,
  };
}

export async function listCoordinationThreads(
  workspaceId: string,
  filter?: { subjectType?: CoordinationSubjectType; subjectId?: string },
) {
  const db = await getDb();
  const conditions = [eq(coordinationThreads.workspaceId, workspaceId)];
  if (filter?.subjectType) conditions.push(eq(coordinationThreads.subjectType, filter.subjectType));
  if (filter?.subjectId) conditions.push(eq(coordinationThreads.subjectId, filter.subjectId));
  const rows = await db
    .select()
    .from(coordinationThreads)
    .where(and(...conditions))
    .orderBy(desc(coordinationThreads.createdAt));
  return rows.map(mapThread);
}

export async function getCoordinationThread(id: string, workspaceId: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(coordinationThreads)
    .where(and(eq(coordinationThreads.id, id), eq(coordinationThreads.workspaceId, workspaceId)))
    .limit(1);
  return row ? mapThread(row) : null;
}

export async function listCoordinationMessages(threadId: string, workspaceId: string) {
  const thread = await getCoordinationThread(threadId, workspaceId);
  if (!thread) return [];
  const db = await getDb();
  const rows = await db
    .select()
    .from(coordinationMessages)
    .where(and(eq(coordinationMessages.threadId, threadId), eq(coordinationMessages.workspaceId, workspaceId)))
    .orderBy(coordinationMessages.createdAt);
  return rows.map(mapMessage);
}

export async function createCoordinationThread(input: {
  workspaceId: string;
  subjectType: CoordinationSubjectType;
  subjectId: string;
  isBlocker?: boolean;
  createdBy: string;
  body: string;
  agentIdentityId?: string | null;
}) {
  const db = await getDb();
  const [thread] = await db
    .insert(coordinationThreads)
    .values({
      workspaceId: input.workspaceId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      isBlocker: input.isBlocker ?? false,
      createdBy: input.createdBy,
    })
    .returning();
  const [message] = await db
    .insert(coordinationMessages)
    .values({
      threadId: thread.id,
      workspaceId: input.workspaceId,
      userId: input.createdBy,
      agentIdentityId: input.agentIdentityId ?? null,
      body: input.body.trim(),
    })
    .returning();
  return { thread: mapThread(thread), message: mapMessage(message) };
}

export async function addCoordinationMessage(input: {
  threadId: string;
  workspaceId: string;
  userId: string;
  agentIdentityId?: string | null;
  body: string;
  parentId?: string | null;
}) {
  const thread = await getCoordinationThread(input.threadId, input.workspaceId);
  if (!thread) return null;
  const db = await getDb();
  const [row] = await db
    .insert(coordinationMessages)
    .values({
      threadId: input.threadId,
      workspaceId: input.workspaceId,
      userId: input.userId,
      agentIdentityId: input.agentIdentityId ?? null,
      body: input.body.trim(),
      parentId: input.parentId ?? null,
    })
    .returning();
  return mapMessage(row);
}

export async function countOpenBlockerThreads(
  workspaceId: string,
  subjectType: CoordinationSubjectType,
  subjectId: string,
) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(coordinationThreads)
    .where(
      and(
        eq(coordinationThreads.workspaceId, workspaceId),
        eq(coordinationThreads.subjectType, subjectType),
        eq(coordinationThreads.subjectId, subjectId),
        eq(coordinationThreads.isBlocker, true),
      ),
    );
  return rows.filter((row) => !row.resolvedAt).length;
}

export async function resolveCoordinationThread(
  id: string,
  workspaceId: string,
  resolved: boolean,
) {
  const db = await getDb();
  const [row] = await db
    .update(coordinationThreads)
    .set({ resolvedAt: resolved ? new Date().toISOString() : null })
    .where(and(eq(coordinationThreads.id, id), eq(coordinationThreads.workspaceId, workspaceId)))
    .returning();
  return row ? mapThread(row) : null;
}
