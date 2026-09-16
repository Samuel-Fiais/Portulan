import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { implementationTaskSources } from "@/lib/db/schema";
import { ensureEntityBoardNumber, ensureRowBoardNumbers } from "@/lib/db/board-numbers";
import type { DocumentSourceRole } from "@/lib/dev-context";

export type ImplementationTaskSourceRecord = {
  id: string;
  taskId: string;
  documentId: string;
  releaseId: string | null;
  sourceRole: DocumentSourceRole;
  section: string | null;
  reason: string;
  required: boolean;
  boardNumber: number;
};

function mapSource(row: typeof implementationTaskSources.$inferSelect): ImplementationTaskSourceRecord {
  return {
    id: row.id,
    taskId: row.taskId,
    documentId: row.documentId,
    releaseId: row.releaseId,
    sourceRole: row.sourceRole as DocumentSourceRole,
    section: row.section,
    reason: row.reason,
    required: row.required,
    boardNumber: row.boardNumber,
  };
}

export async function listTaskSources(taskId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(implementationTaskSources)
    .where(eq(implementationTaskSources.taskId, taskId))
    .orderBy(implementationTaskSources.createdAt);
  return (await ensureRowBoardNumbers(rows, "source")).map(mapSource);
}

export async function addImplementationTaskSource(input: {
  taskId: string;
  workspaceId: string;
  documentId: string;
  releaseId?: string | null;
  sourceRole: DocumentSourceRole;
  section?: string | null;
  reason: string;
  required?: boolean;
}) {
  const db = await getDb();
  const [row] = await db
    .insert(implementationTaskSources)
    .values({
      taskId: input.taskId,
      workspaceId: input.workspaceId,
      documentId: input.documentId,
      releaseId: input.releaseId ?? null,
      sourceRole: input.sourceRole,
      section: input.section ?? null,
      reason: input.reason.trim(),
      required: input.required ?? false,
    })
    .returning();
  const boardNumber = await ensureEntityBoardNumber({
    workspaceId: input.workspaceId,
    kind: "source",
    targetId: row.id,
  });
  return mapSource({ ...row, boardNumber });
}

export async function deleteImplementationTaskSource(id: string, taskId: string) {
  const db = await getDb();
  const deleted = await db
    .delete(implementationTaskSources)
    .where(and(eq(implementationTaskSources.id, id), eq(implementationTaskSources.taskId, taskId)))
    .returning({ id: implementationTaskSources.id });
  return deleted.length > 0;
}
