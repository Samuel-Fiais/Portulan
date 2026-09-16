import "server-only";

import { and, desc, eq, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { coordinationThreads, implementationTasks, progressReports } from "@/lib/db/schema";
import { parseJsonArray, stringifyJsonArray } from "@/lib/db/json-text";
import {
  assignExistingBoardNumber,
  ensureEntityBoardNumber,
  ensureRowBoardNumbers,
  resolveBoardId,
} from "@/lib/db/board-numbers";
import {
  isLeaseActive,
  nextLeaseExpiry,
  nextStatusAfterProgress,
  shouldCascadeAssignment,
  validateClaimLeaf,
} from "@/lib/implementation-task-policy";
import type { ImplementationTaskStatus } from "@/lib/dev-context";

export type ImplementationTaskRecord = {
  id: string;
  packId: string;
  workspaceId: string;
  planId: string | null;
  packRevisionId: string | null;
  parentTaskId: string | null;
  objective: string;
  repositoryId: string | null;
  pathScopes: string[];
  requiredItemIds: string[];
  criterionIds: string[];
  dependsOnTaskIds: string[];
  status: ImplementationTaskStatus;
  assigneeUserId: string | null;
  assigneeAgentIdentityId: string | null;
  leaseHolderTokenId: string | null;
  leaseHolderIdentityId: string | null;
  leaseHolderUserId: string | null;
  leaseExpiresAt: string | null;
  sortOrder: number;
  boardNumber: number;
  createdAt: string;
  updatedAt: string;
};

export type ProgressReportRecord = {
  id: string;
  taskId: string;
  packRevisionId: string | null;
  kind: string;
  summary: string;
  changedScopes: string[];
  evidence: string;
  commitRef: string | null;
  pullRequestRef: string | null;
  coveredCriterionIds: string[];
  gaps: string;
  userId: string;
  agentIdentityId: string | null;
  createdAt: string;
};

function mapTask(row: typeof implementationTasks.$inferSelect): ImplementationTaskRecord {
  return {
    id: row.id,
    packId: row.packId,
    workspaceId: row.workspaceId,
    planId: row.planId,
    packRevisionId: row.packRevisionId,
    parentTaskId: row.parentTaskId,
    objective: row.objective,
    repositoryId: row.repositoryId,
    pathScopes: parseJsonArray(row.pathScopes),
    requiredItemIds: parseJsonArray(row.requiredItemIds),
    criterionIds: parseJsonArray(row.criterionIds),
    dependsOnTaskIds: parseJsonArray(row.dependsOnTaskIds),
    status: row.status as ImplementationTaskStatus,
    assigneeUserId: row.assigneeUserId,
    assigneeAgentIdentityId: row.assigneeAgentIdentityId,
    leaseHolderTokenId: row.leaseHolderTokenId,
    leaseHolderIdentityId: row.leaseHolderIdentityId,
    leaseHolderUserId: row.leaseHolderUserId,
    leaseExpiresAt: row.leaseExpiresAt,
    sortOrder: row.sortOrder,
    boardNumber: row.boardNumber,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapReport(row: typeof progressReports.$inferSelect): ProgressReportRecord {
  return {
    id: row.id,
    taskId: row.taskId,
    packRevisionId: row.packRevisionId,
    kind: row.kind,
    summary: row.summary,
    changedScopes: parseJsonArray(row.changedScopes),
    evidence: row.evidence,
    commitRef: row.commitRef,
    pullRequestRef: row.pullRequestRef,
    coveredCriterionIds: parseJsonArray(row.coveredCriterionIds),
    gaps: row.gaps,
    userId: row.userId,
    agentIdentityId: row.agentIdentityId,
    createdAt: row.createdAt,
  };
}

export async function addImplementationTask(input: {
  packId: string;
  workspaceId: string;
  planId?: string | null;
  parentTaskId?: string | null;
  objective: string;
  repositoryId?: string | null;
  pathScopes?: string[];
  requiredItemIds?: string[];
  criterionIds?: string[];
  dependsOnTaskIds?: string[];
}) {
  const db = await getDb();
  const now = new Date().toISOString();
  const [row] = await db
    .insert(implementationTasks)
    .values({
      packId: input.packId,
      workspaceId: input.workspaceId,
      planId: input.planId ?? null,
      parentTaskId: input.parentTaskId ?? null,
      objective: input.objective.trim(),
      repositoryId: input.repositoryId ?? null,
      pathScopes: stringifyJsonArray(input.pathScopes),
      requiredItemIds: stringifyJsonArray(input.requiredItemIds),
      criterionIds: stringifyJsonArray(input.criterionIds),
      dependsOnTaskIds: stringifyJsonArray(input.dependsOnTaskIds),
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  const boardNumber = await ensureEntityBoardNumber({
    workspaceId: input.workspaceId,
    kind: "task",
    targetId: row.id,
  });
  return mapTask({ ...row, boardNumber });
}

export async function getImplementationTask(id: string, workspaceId: string) {
  const resolvedId = (await resolveBoardId(workspaceId, id, "task")) ?? id;
  const db = await getDb();
  const [row] = await db
    .select()
    .from(implementationTasks)
    .where(and(eq(implementationTasks.id, resolvedId), eq(implementationTasks.workspaceId, workspaceId)))
    .limit(1);
  if (!row) return null;
  const boardNumber = await ensureEntityBoardNumber({
    workspaceId,
    kind: "task",
    targetId: row.id,
    current: row.boardNumber,
  });
  return mapTask({ ...row, boardNumber });
}

export async function listDraftTasks(packId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(implementationTasks)
    .where(and(eq(implementationTasks.packId, packId), isNull(implementationTasks.packRevisionId)))
    .orderBy(
      implementationTasks.sortOrder,
      implementationTasks.boardNumber,
      implementationTasks.createdAt,
      implementationTasks.id,
    );
  return (await ensureRowBoardNumbers(rows, "task")).map(mapTask);
}

export async function listRevisionTasks(packId: string, revisionId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(implementationTasks)
    .where(and(eq(implementationTasks.packId, packId), eq(implementationTasks.packRevisionId, revisionId)))
    .orderBy(
      implementationTasks.sortOrder,
      implementationTasks.boardNumber,
      implementationTasks.createdAt,
      implementationTasks.id,
    );
  return (await ensureRowBoardNumbers(rows, "task")).map(mapTask);
}

export async function listAvailableTasks(workspaceId: string, revisionId?: string) {
  const db = await getDb();
  const now = new Date().toISOString();
  const rows = await db
    .select()
    .from(implementationTasks)
    .where(
      and(
        eq(implementationTasks.workspaceId, workspaceId),
        revisionId ? eq(implementationTasks.packRevisionId, revisionId) : sql`true`,
        or(
          eq(implementationTasks.status, "available"),
          and(
            or(eq(implementationTasks.status, "claimed"), eq(implementationTasks.status, "in_progress")),
            or(isNull(implementationTasks.leaseExpiresAt), lt(implementationTasks.leaseExpiresAt, now)),
          ),
        ),
      ),
    )
    .orderBy(
      implementationTasks.sortOrder,
      implementationTasks.boardNumber,
      implementationTasks.createdAt,
      implementationTasks.id,
    );
  const parentIds = new Set(
    (
      await db
        .select({ parentTaskId: implementationTasks.parentTaskId })
        .from(implementationTasks)
        .where(
          and(eq(implementationTasks.workspaceId, workspaceId), isNotNull(implementationTasks.parentTaskId)),
        )
    )
      .map((row) => row.parentTaskId)
      .filter((id): id is string => Boolean(id)),
  );
  return (await ensureRowBoardNumbers(rows, "task")).map(mapTask).filter((task) => !parentIds.has(task.id));
}

export async function listClaimedTasksForToken(workspaceId: string, tokenId: string) {
  const db = await getDb();
  const now = new Date().toISOString();
  const rows = await db
    .select()
    .from(implementationTasks)
    .where(
      and(
        eq(implementationTasks.workspaceId, workspaceId),
        eq(implementationTasks.leaseHolderTokenId, tokenId),
        or(isNull(implementationTasks.leaseExpiresAt), sql`${implementationTasks.leaseExpiresAt} > ${now}`),
      ),
    );
  return (await ensureRowBoardNumbers(rows, "task")).map(mapTask);
}

export async function claimImplementationTask(input: {
  taskId: string;
  workspaceId: string;
  tokenId: string;
  identityId: string | null;
  userId: string;
}) {
  const task = await getImplementationTask(input.taskId, input.workspaceId);
  if (!task) return null;
  const leaf = validateClaimLeaf({ childCount: await countChildTasks(task.id, input.workspaceId) });
  if (!leaf.ok) return null;
  const db = await getDb();
  const now = new Date().toISOString();
  const expiresAt = nextLeaseExpiry();
  const [row] = await db
    .update(implementationTasks)
    .set({
      status: "claimed",
      leaseHolderTokenId: input.tokenId,
      leaseHolderIdentityId: input.identityId,
      leaseHolderUserId: input.userId,
      leaseExpiresAt: expiresAt,
      updatedAt: now,
    })
    .where(
      and(
        eq(implementationTasks.id, task.id),
        eq(implementationTasks.workspaceId, input.workspaceId),
        or(
          eq(implementationTasks.status, "available"),
          and(
            or(
              eq(implementationTasks.status, "claimed"),
              eq(implementationTasks.status, "in_progress"),
              eq(implementationTasks.status, "blocked"),
            ),
            or(isNull(implementationTasks.leaseExpiresAt), lt(implementationTasks.leaseExpiresAt, now)),
          ),
          and(eq(implementationTasks.leaseHolderTokenId, input.tokenId), eq(implementationTasks.status, "claimed")),
        ),
      ),
    )
    .returning();
  return row ? mapTask(row) : null;
}

export async function renewImplementationTaskLease(input: {
  taskId: string;
  workspaceId: string;
  tokenId: string;
}) {
  const db = await getDb();
  const now = new Date().toISOString();
  const [row] = await db
    .update(implementationTasks)
    .set({
      status: "in_progress",
      leaseExpiresAt: nextLeaseExpiry(),
      updatedAt: now,
    })
    .where(
      and(
        eq(implementationTasks.id, input.taskId),
        eq(implementationTasks.workspaceId, input.workspaceId),
        eq(implementationTasks.leaseHolderTokenId, input.tokenId),
      ),
    )
    .returning();
  return row ? mapTask(row) : null;
}

export async function releaseImplementationTask(input: { taskId: string; workspaceId: string; tokenId: string }) {
  const db = await getDb();
  const [row] = await db
    .update(implementationTasks)
    .set({
      status: "available",
      leaseHolderTokenId: null,
      leaseHolderIdentityId: null,
      leaseHolderUserId: null,
      leaseExpiresAt: null,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(implementationTasks.id, input.taskId),
        eq(implementationTasks.workspaceId, input.workspaceId),
        eq(implementationTasks.leaseHolderTokenId, input.tokenId),
      ),
    )
    .returning();
  return row ? mapTask(row) : null;
}

export async function setTaskStatus(
  taskId: string,
  workspaceId: string,
  status: ImplementationTaskStatus,
) {
  const db = await getDb();
  const [row] = await db
    .update(implementationTasks)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(and(eq(implementationTasks.id, taskId), eq(implementationTasks.workspaceId, workspaceId)))
    .returning();
  return row ? mapTask(row) : null;
}

export async function addProgressReport(input: {
  taskId: string;
  workspaceId: string;
  packRevisionId: string | null;
  kind: "progress" | "result";
  summary: string;
  changedScopes?: string[];
  evidence?: string;
  commitRef?: string | null;
  pullRequestRef?: string | null;
  coveredCriterionIds?: string[];
  gaps?: string;
  userId: string;
  agentIdentityId: string | null;
}) {
  const db = await getDb();
  const [row] = await db
    .insert(progressReports)
    .values({
      taskId: input.taskId,
      workspaceId: input.workspaceId,
      packRevisionId: input.packRevisionId,
      kind: input.kind,
      summary: input.summary.trim(),
      changedScopes: stringifyJsonArray(input.changedScopes),
      evidence: input.evidence?.trim() ?? "",
      commitRef: input.commitRef ?? null,
      pullRequestRef: input.pullRequestRef ?? null,
      coveredCriterionIds: stringifyJsonArray(input.coveredCriterionIds),
      gaps: input.gaps?.trim() ?? "",
      userId: input.userId,
      agentIdentityId: input.agentIdentityId,
    })
    .returning();
  return mapReport(row);
}

export async function registerAuthorizedProgress(input: {
  taskId: string;
  workspaceId: string;
  tokenId: string;
  kind: "progress" | "result";
  summary: string;
  changedScopes?: string[];
  evidence?: string;
  commitRef?: string | null;
  pullRequestRef?: string | null;
  coveredCriterionIds?: string[];
  gaps?: string;
  userId: string;
  agentIdentityId: string | null;
  packRevisionId: string | null;
}) {
  const now = new Date().toISOString();
  const task = await getImplementationTask(input.taskId, input.workspaceId);
  if (!task) return { ok: false as const, error: "Manobra não encontrada." };
  if (task.leaseHolderTokenId !== input.tokenId) {
    return { ok: false as const, error: "Só o Agente de Bordo com o comando ativo registra." };
  }
  if (!isLeaseActive(task.leaseExpiresAt)) {
    return { ok: false as const, error: "O lease desta Manobra expirou. Retome o comando antes de registrar." };
  }
  if (input.kind === "result" && (task.status === "reported" || task.status === "accepted")) {
    return { ok: false as const, error: "O resultado desta Manobra já foi registrado." };
  }
  if (task.status === "accepted") {
    return { ok: false as const, error: "Esta Manobra já foi aceita." };
  }

  const nextStatus = input.kind === "result" ? "reported" : nextStatusAfterProgress(task.status);
  const db = await getDb();
  const [updated] = await db
    .update(implementationTasks)
    .set({
      status: nextStatus,
      updatedAt: now,
    })
    .where(
      and(
        eq(implementationTasks.id, input.taskId),
        eq(implementationTasks.workspaceId, input.workspaceId),
        eq(implementationTasks.leaseHolderTokenId, input.tokenId),
        input.kind === "result"
          ? sql`${implementationTasks.status} not in ('reported', 'accepted')`
          : sql`${implementationTasks.status} <> 'accepted'`,
      ),
    )
    .returning();
  if (!updated) {
    return { ok: false as const, error: "Não foi possível registrar neste estado da Manobra." };
  }

  const report = await addProgressReport({
    taskId: input.taskId,
    workspaceId: input.workspaceId,
    packRevisionId: input.packRevisionId,
    kind: input.kind,
    summary: input.summary,
    changedScopes: input.changedScopes,
    evidence: input.evidence,
    commitRef: input.commitRef,
    pullRequestRef: input.pullRequestRef,
    coveredCriterionIds: input.coveredCriterionIds,
    gaps: input.gaps,
    userId: input.userId,
    agentIdentityId: input.agentIdentityId,
  });
  return { ok: true as const, report, task: mapTask(updated) };
}

export async function listProgressReports(taskId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(progressReports)
    .where(eq(progressReports.taskId, taskId))
    .orderBy(desc(progressReports.createdAt));
  return rows.map(mapReport);
}

export async function listChildTasks(parentTaskId: string, workspaceId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(implementationTasks)
    .where(
      and(
        eq(implementationTasks.parentTaskId, parentTaskId),
        eq(implementationTasks.workspaceId, workspaceId),
      ),
    )
    .orderBy(
      implementationTasks.sortOrder,
      implementationTasks.boardNumber,
      implementationTasks.createdAt,
      implementationTasks.id,
    );
  return (await ensureRowBoardNumbers(rows, "task")).map(mapTask);
}

export async function countChildTasks(parentTaskId: string, workspaceId: string) {
  const children = await listChildTasks(parentTaskId, workspaceId);
  return children.length;
}

export function taskHasAssignee(task: Pick<ImplementationTaskRecord, "assigneeUserId" | "assigneeAgentIdentityId">) {
  return Boolean(task.assigneeUserId || task.assigneeAgentIdentityId);
}

export async function assignImplementationTask(input: {
  taskId: string;
  workspaceId: string;
  assigneeUserId?: string | null;
  assigneeAgentIdentityId?: string | null;
}) {
  const db = await getDb();
  const task = await getImplementationTask(input.taskId, input.workspaceId);
  if (!task) return null;
  const parentHadAssignee = taskHasAssignee(task);
  const now = new Date().toISOString();
  const assigneeUserId = input.assigneeUserId ?? null;
  const assigneeAgentIdentityId = input.assigneeAgentIdentityId ?? null;
  const [updated] = await db
    .update(implementationTasks)
    .set({
      assigneeUserId,
      assigneeAgentIdentityId,
      updatedAt: now,
    })
    .where(and(eq(implementationTasks.id, task.id), eq(implementationTasks.workspaceId, input.workspaceId)))
    .returning();
  if (!updated) return null;
  if (!task.parentTaskId) {
    const children = await listChildTasks(task.id, input.workspaceId);
    for (const child of children) {
      if (
        !shouldCascadeAssignment({
          parentHadAssignee,
          childHasAssignee: taskHasAssignee(child),
          clearing: !assigneeUserId && !assigneeAgentIdentityId,
        })
      ) {
        continue;
      }
      await db
        .update(implementationTasks)
        .set({
          assigneeUserId,
          assigneeAgentIdentityId,
          updatedAt: now,
        })
        .where(and(eq(implementationTasks.id, child.id), eq(implementationTasks.workspaceId, input.workspaceId)));
    }
  }
  return mapTask(updated);
}

export async function acceptReportedChildren(parentTaskId: string, workspaceId: string) {
  const db = await getDb();
  const now = new Date().toISOString();
  await db
    .update(implementationTasks)
    .set({ status: "accepted", updatedAt: now })
    .where(
      and(
        eq(implementationTasks.parentTaskId, parentTaskId),
        eq(implementationTasks.workspaceId, workspaceId),
        eq(implementationTasks.status, "reported"),
      ),
    );
}

export async function insertTaskCopy(input: {
  task: ImplementationTaskRecord;
  packRevisionId: string | null;
  planId: string | null;
  parentTaskId: string | null;
  dependsOnTaskIds: string[];
}) {
  const db = await getDb();
  const now = new Date().toISOString();
  const [row] = await db
    .insert(implementationTasks)
    .values({
      packId: input.task.packId,
      workspaceId: input.task.workspaceId,
      planId: input.planId,
      packRevisionId: input.packRevisionId,
      parentTaskId: input.parentTaskId,
      objective: input.task.objective,
      repositoryId: input.task.repositoryId,
      pathScopes: stringifyJsonArray(input.task.pathScopes),
      requiredItemIds: stringifyJsonArray(input.task.requiredItemIds),
      criterionIds: stringifyJsonArray(input.task.criterionIds),
      dependsOnTaskIds: stringifyJsonArray(input.dependsOnTaskIds),
      status: "available",
      assigneeUserId: input.task.assigneeUserId,
      assigneeAgentIdentityId: input.task.assigneeAgentIdentityId,
      sortOrder: input.task.sortOrder,
      boardNumber: input.task.boardNumber,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (input.task.boardNumber > 0) {
    await assignExistingBoardNumber({
      workspaceId: input.task.workspaceId,
      boardNumber: input.task.boardNumber,
      kind: "task",
      targetId: row.id,
    });
  }
  return mapTask(row);
}

export async function updateImplementationTaskStatus(
  taskId: string,
  workspaceId: string,
  status: ImplementationTaskStatus,
) {
  const db = await getDb();
  const now = new Date().toISOString();
  const patch: Partial<typeof implementationTasks.$inferInsert> = {
    status,
    updatedAt: now,
  };
  if (status === "available") {
    patch.leaseHolderTokenId = null;
    patch.leaseHolderIdentityId = null;
    patch.leaseHolderUserId = null;
    patch.leaseExpiresAt = null;
  }
  const [row] = await db
    .update(implementationTasks)
    .set(patch)
    .where(and(eq(implementationTasks.id, taskId), eq(implementationTasks.workspaceId, workspaceId)))
    .returning();
  return row ? mapTask(row) : null;
}

export async function deleteImplementationTask(taskId: string, workspaceId: string) {
  const task = await getImplementationTask(taskId, workspaceId);
  if (!task) return null;
  const db = await getDb();
  const children = await listChildTasks(taskId, workspaceId);
  const taskIds = [taskId, ...children.map((child) => child.id)];

  for (const id of taskIds) {
    await db
      .delete(coordinationThreads)
      .where(
        and(
          eq(coordinationThreads.workspaceId, workspaceId),
          eq(coordinationThreads.subjectType, "task"),
          eq(coordinationThreads.subjectId, id),
        ),
      );
  }

  const packTasks = await db
    .select()
    .from(implementationTasks)
    .where(and(eq(implementationTasks.packId, task.packId), eq(implementationTasks.workspaceId, workspaceId)));
  const removeIds = new Set(taskIds);
  for (const row of packTasks) {
    const currentDepends = parseJsonArray(row.dependsOnTaskIds);
    const dependsOn = currentDepends.filter((id) => !removeIds.has(id));
    if (dependsOn.length !== currentDepends.length) {
      await db
        .update(implementationTasks)
        .set({ dependsOnTaskIds: stringifyJsonArray(dependsOn), updatedAt: new Date().toISOString() })
        .where(eq(implementationTasks.id, row.id));
    }
  }

  const [deleted] = await db
    .delete(implementationTasks)
    .where(and(eq(implementationTasks.id, taskId), eq(implementationTasks.workspaceId, workspaceId)))
    .returning();
  return deleted ? mapTask(deleted) : null;
}
