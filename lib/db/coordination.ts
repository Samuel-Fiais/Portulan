import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { coordinationMessages, coordinationThreads } from "@/lib/db/schema";
import { parseJsonArray, stringifyJsonArray } from "@/lib/db/json-text";
import { ensureEntityBoardNumber, ensureRowBoardNumbers, resolveBoardId } from "@/lib/db/board-numbers";
import type { CoordinationSubjectType } from "@/lib/dev-context";

export type CoordinationThreadRecord = {
  id: string;
  workspaceId: string;
  subjectType: CoordinationSubjectType;
  subjectId: string;
  isBlocker: boolean;
  resolvedAt: string | null;
  createdBy: string | null;
  boardNumber: number;
  createdAt: string;
};

export type CoordinationMessageRecord = {
  id: string;
  threadId: string;
  userId: string;
  agentIdentityId: string | null;
  body: string;
  parentId: string | null;
  mentionedUserIds: string[];
  mentionedAgentIdentityIds: string[];
  boardNumber: number;
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
    boardNumber: row.boardNumber,
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
    mentionedUserIds: parseJsonArray(row.mentionedUserIds),
    mentionedAgentIdentityIds: parseJsonArray(row.mentionedAgentIdentityIds),
    boardNumber: row.boardNumber,
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
  return (await ensureRowBoardNumbers(rows, "thread")).map(mapThread);
}

export async function getCoordinationThread(id: string, workspaceId: string) {
  const resolvedId = (await resolveBoardId(workspaceId, id, "thread")) ?? id;
  const db = await getDb();
  const [row] = await db
    .select()
    .from(coordinationThreads)
    .where(and(eq(coordinationThreads.id, resolvedId), eq(coordinationThreads.workspaceId, workspaceId)))
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
    .where(and(eq(coordinationMessages.threadId, thread.id), eq(coordinationMessages.workspaceId, workspaceId)))
    .orderBy(coordinationMessages.createdAt);
  return (await ensureRowBoardNumbers(rows, "message")).map(mapMessage);
}

export async function findOpenDiscussionThread(
  workspaceId: string,
  subjectType: CoordinationSubjectType,
  subjectId: string,
) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(coordinationThreads)
    .where(
      and(
        eq(coordinationThreads.workspaceId, workspaceId),
        eq(coordinationThreads.subjectType, subjectType),
        eq(coordinationThreads.subjectId, subjectId),
        eq(coordinationThreads.isBlocker, false),
        isNull(coordinationThreads.resolvedAt),
      ),
    )
    .orderBy(coordinationThreads.createdAt)
    .limit(1);
  return row ? mapThread(row) : null;
}

export async function createCoordinationThread(input: {
  workspaceId: string;
  subjectType: CoordinationSubjectType;
  subjectId: string;
  isBlocker?: boolean;
  createdBy: string;
  body: string;
  agentIdentityId?: string | null;
  mentionedUserIds?: string[];
  mentionedAgentIdentityIds?: string[];
}) {
  if (!input.isBlocker) {
    const existing = await findOpenDiscussionThread(input.workspaceId, input.subjectType, input.subjectId);
    if (existing) {
      const message = await addCoordinationMessage({
        threadId: existing.id,
        workspaceId: input.workspaceId,
        userId: input.createdBy,
        agentIdentityId: input.agentIdentityId,
        body: input.body,
        mentionedUserIds: input.mentionedUserIds,
        mentionedAgentIdentityIds: input.mentionedAgentIdentityIds,
      });
      return { thread: existing, message: message! };
    }
  }
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
  const threadNumber = await ensureEntityBoardNumber({
    workspaceId: input.workspaceId,
    kind: "thread",
    targetId: thread.id,
  });
  const [message] = await db
    .insert(coordinationMessages)
    .values({
      threadId: thread.id,
      workspaceId: input.workspaceId,
      userId: input.createdBy,
      agentIdentityId: input.agentIdentityId ?? null,
      body: input.body.trim(),
      mentionedUserIds: stringifyJsonArray(input.mentionedUserIds),
      mentionedAgentIdentityIds: stringifyJsonArray(input.mentionedAgentIdentityIds),
    })
    .returning();
  const messageNumber = await ensureEntityBoardNumber({
    workspaceId: input.workspaceId,
    kind: "message",
    targetId: message.id,
  });
  return {
    thread: mapThread({ ...thread, boardNumber: threadNumber }),
    message: mapMessage({ ...message, boardNumber: messageNumber }),
  };
}

export async function addCoordinationMessage(input: {
  threadId: string;
  workspaceId: string;
  userId: string;
  agentIdentityId?: string | null;
  body: string;
  parentId?: string | null;
  mentionedUserIds?: string[];
  mentionedAgentIdentityIds?: string[];
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
      mentionedUserIds: stringifyJsonArray(input.mentionedUserIds),
      mentionedAgentIdentityIds: stringifyJsonArray(input.mentionedAgentIdentityIds),
    })
    .returning();
  const boardNumber = await ensureEntityBoardNumber({
    workspaceId: input.workspaceId,
    kind: "message",
    targetId: row.id,
  });
  return mapMessage({ ...row, boardNumber });
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

export async function listMentionsForActor(input: {
  workspaceId: string;
  userId: string;
  agentIdentityId?: string | null;
  limit?: number;
}) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(coordinationMessages)
    .where(eq(coordinationMessages.workspaceId, input.workspaceId))
    .orderBy(desc(coordinationMessages.createdAt))
    .limit(200);
  return rows
    .map(mapMessage)
    .filter((message) => {
      const mentionedUser = message.mentionedUserIds.includes(input.userId);
      const mentionedAgent = input.agentIdentityId
        ? message.mentionedAgentIdentityIds.includes(input.agentIdentityId)
        : false;
      return mentionedUser || mentionedAgent;
    })
    .slice(0, input.limit ?? 20);
}
