import "server-only";

import { and, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  acceptanceCriteria,
  contextPackItems,
  contextPackRevisions,
  contextPackSources,
  contextPacks,
  implementationPlans,
  implementationTasks,
} from "@/lib/db/schema";
import { parseJsonArray, stringifyJsonArray } from "@/lib/db/json-text";
import {
  assignExistingBoardNumber,
  backfillWorkspaceBoardNumbers,
  ensureEntityBoardNumber,
  ensureRowBoardNumbers,
  resolveBoardId,
} from "@/lib/db/board-numbers";
import type {
  ContextItemStrength,
  ContextItemType,
  ContextPackStatus,
  ContextPackValidity,
  DocumentSourceRole,
} from "@/lib/dev-context";

export type ContextPackRecord = {
  id: string;
  workspaceId: string;
  projectId: string;
  title: string;
  objective: string;
  expectedOutcome: string;
  scope: string;
  outOfScope: string;
  status: ContextPackStatus;
  validity: ContextPackValidity;
  ownerUserId: string;
  currentRevisionId: string | null;
  boardNumber: number;
  createdAt: string;
  updatedAt: string;
};

export type ContextPackItemRecord = {
  id: string;
  packId: string;
  revisionId: string | null;
  type: ContextItemType;
  strength: ContextItemStrength;
  body: string;
  blocking: boolean;
  sortOrder: number;
  boardNumber: number;
};

export type ContextPackSourceRecord = {
  id: string;
  packId: string;
  revisionId: string | null;
  documentId: string;
  releaseId: string | null;
  sourceRole: DocumentSourceRole;
  section: string | null;
  reason: string;
  required: boolean;
  boardNumber: number;
};

export type AcceptanceCriterionRecord = {
  id: string;
  packId: string;
  revisionId: string | null;
  description: string;
  sortOrder: number;
  boardNumber: number;
};

export type ImplementationPlanRecord = {
  id: string;
  packId: string;
  revisionId: string | null;
  summary: string;
};

export type ContextPackRevisionRecord = {
  id: string;
  packId: string;
  revisionNumber: number;
  snapshot: string;
  approvedBy: string | null;
  approvedAt: string;
};

function mapPack(row: typeof contextPacks.$inferSelect): ContextPackRecord {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    projectId: row.projectId,
    title: row.title,
    objective: row.objective,
    expectedOutcome: row.expectedOutcome,
    scope: row.scope,
    outOfScope: row.outOfScope,
    status: row.status as ContextPackStatus,
    validity: row.validity as ContextPackValidity,
    ownerUserId: row.ownerUserId,
    currentRevisionId: row.currentRevisionId,
    boardNumber: row.boardNumber,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapItem(row: typeof contextPackItems.$inferSelect): ContextPackItemRecord {
  return {
    id: row.id,
    packId: row.packId,
    revisionId: row.revisionId,
    type: row.type as ContextItemType,
    strength: row.strength as ContextItemStrength,
    body: row.body,
    blocking: row.blocking,
    sortOrder: row.sortOrder,
    boardNumber: row.boardNumber,
  };
}

function mapSource(row: typeof contextPackSources.$inferSelect): ContextPackSourceRecord {
  return {
    id: row.id,
    packId: row.packId,
    revisionId: row.revisionId,
    documentId: row.documentId,
    releaseId: row.releaseId,
    sourceRole: row.sourceRole as DocumentSourceRole,
    section: row.section,
    reason: row.reason,
    required: row.required,
    boardNumber: row.boardNumber,
  };
}

function mapCriterion(row: typeof acceptanceCriteria.$inferSelect): AcceptanceCriterionRecord {
  return {
    id: row.id,
    packId: row.packId,
    revisionId: row.revisionId,
    description: row.description,
    sortOrder: row.sortOrder,
    boardNumber: row.boardNumber,
  };
}

export async function listContextPacks(workspaceId: string, projectId?: string) {
  const db = await getDb();
  const rows = projectId
    ? await db
        .select()
        .from(contextPacks)
        .where(and(eq(contextPacks.workspaceId, workspaceId), eq(contextPacks.projectId, projectId)))
        .orderBy(desc(contextPacks.updatedAt))
    : await db
        .select()
        .from(contextPacks)
        .where(eq(contextPacks.workspaceId, workspaceId))
        .orderBy(desc(contextPacks.updatedAt));
  if (rows.some((row) => row.boardNumber <= 0)) {
    await backfillWorkspaceBoardNumbers(workspaceId);
    const refreshed = projectId
      ? await db
          .select()
          .from(contextPacks)
          .where(and(eq(contextPacks.workspaceId, workspaceId), eq(contextPacks.projectId, projectId)))
          .orderBy(desc(contextPacks.updatedAt))
      : await db
          .select()
          .from(contextPacks)
          .where(eq(contextPacks.workspaceId, workspaceId))
          .orderBy(desc(contextPacks.updatedAt));
    return (await ensureRowBoardNumbers(refreshed, "pack")).map(mapPack);
  }
  return (await ensureRowBoardNumbers(rows, "pack")).map(mapPack);
}

export async function getContextPack(id: string, workspaceId: string) {
  const resolvedId = (await resolveBoardId(workspaceId, id, "pack")) ?? id;
  const db = await getDb();
  const [row] = await db
    .select()
    .from(contextPacks)
    .where(and(eq(contextPacks.id, resolvedId), eq(contextPacks.workspaceId, workspaceId)))
    .limit(1);
  if (!row) return null;
  const boardNumber = await ensureEntityBoardNumber({
    workspaceId,
    kind: "pack",
    targetId: row.id,
    current: row.boardNumber,
  });
  return mapPack({ ...row, boardNumber });
}

export async function createContextPack(input: {
  workspaceId: string;
  projectId: string;
  title: string;
  objective?: string;
  expectedOutcome?: string;
  scope?: string;
  outOfScope?: string;
  ownerUserId: string;
}) {
  const db = await getDb();
  const now = new Date().toISOString();
  const [row] = await db
    .insert(contextPacks)
    .values({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      title: input.title.trim(),
      objective: input.objective?.trim() ?? "",
      expectedOutcome: input.expectedOutcome?.trim() ?? "",
      scope: input.scope?.trim() ?? "",
      outOfScope: input.outOfScope?.trim() ?? "",
      ownerUserId: input.ownerUserId,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  const boardNumber = await ensureEntityBoardNumber({
    workspaceId: input.workspaceId,
    kind: "pack",
    targetId: row.id,
  });
  return mapPack({ ...row, boardNumber });
}

export async function updateContextPack(
  id: string,
  workspaceId: string,
  input: Partial<Pick<ContextPackRecord, "title" | "objective" | "expectedOutcome" | "scope" | "outOfScope" | "status">>,
) {
  const db = await getDb();
  const [row] = await db
    .update(contextPacks)
    .set({
      ...(input.title ? { title: input.title.trim() } : {}),
      ...(input.objective !== undefined ? { objective: input.objective } : {}),
      ...(input.expectedOutcome !== undefined ? { expectedOutcome: input.expectedOutcome } : {}),
      ...(input.scope !== undefined ? { scope: input.scope } : {}),
      ...(input.outOfScope !== undefined ? { outOfScope: input.outOfScope } : {}),
      ...(input.status ? { status: input.status } : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(contextPacks.id, id), eq(contextPacks.workspaceId, workspaceId)))
    .returning();
  return row ? mapPack(row) : null;
}

export async function listDraftItems(packId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(contextPackItems)
    .where(and(eq(contextPackItems.packId, packId), isNull(contextPackItems.revisionId)))
    .orderBy(contextPackItems.sortOrder);
  return (await ensureRowBoardNumbers(rows, "item")).map(mapItem);
}

export async function listRevisionItems(packId: string, revisionId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(contextPackItems)
    .where(and(eq(contextPackItems.packId, packId), eq(contextPackItems.revisionId, revisionId)))
    .orderBy(contextPackItems.sortOrder);
  return (await ensureRowBoardNumbers(rows, "item")).map(mapItem);
}

export async function addContextPackItem(input: {
  packId: string;
  workspaceId: string;
  type: ContextItemType;
  strength: ContextItemStrength;
  body: string;
  blocking?: boolean;
}) {
  const db = await getDb();
  const [row] = await db
    .insert(contextPackItems)
    .values({
      packId: input.packId,
      workspaceId: input.workspaceId,
      type: input.type,
      strength: input.strength,
      body: input.body.trim(),
      blocking: input.blocking ?? input.type === "question",
    })
    .returning();
  const boardNumber = await ensureEntityBoardNumber({
    workspaceId: input.workspaceId,
    kind: "item",
    targetId: row.id,
  });
  return mapItem({ ...row, boardNumber });
}

export async function listDraftSources(packId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(contextPackSources)
    .where(and(eq(contextPackSources.packId, packId), isNull(contextPackSources.revisionId)));
  return (await ensureRowBoardNumbers(rows, "source")).map(mapSource);
}

export async function listRevisionSources(packId: string, revisionId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(contextPackSources)
    .where(and(eq(contextPackSources.packId, packId), eq(contextPackSources.revisionId, revisionId)));
  return (await ensureRowBoardNumbers(rows, "source")).map(mapSource);
}

export async function deleteContextPackItem(id: string, packId: string) {
  const db = await getDb();
  const deleted = await db
    .delete(contextPackItems)
    .where(and(eq(contextPackItems.id, id), eq(contextPackItems.packId, packId), isNull(contextPackItems.revisionId)))
    .returning({ id: contextPackItems.id });
  return deleted.length > 0;
}

export async function deleteContextPackSource(id: string, packId: string) {
  const db = await getDb();
  const deleted = await db
    .delete(contextPackSources)
    .where(and(eq(contextPackSources.id, id), eq(contextPackSources.packId, packId), isNull(contextPackSources.revisionId)))
    .returning({ id: contextPackSources.id });
  return deleted.length > 0;
}

export async function deleteAcceptanceCriterion(id: string, packId: string) {
  const db = await getDb();
  const deleted = await db
    .delete(acceptanceCriteria)
    .where(and(eq(acceptanceCriteria.id, id), eq(acceptanceCriteria.packId, packId), isNull(acceptanceCriteria.revisionId)))
    .returning({ id: acceptanceCriteria.id });
  return deleted.length > 0;
}

export async function addContextPackSource(input: {
  packId: string;
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
    .insert(contextPackSources)
    .values({
      packId: input.packId,
      workspaceId: input.workspaceId,
      documentId: input.documentId,
      releaseId: input.releaseId ?? null,
      sourceRole: input.sourceRole,
      section: input.section ?? null,
      reason: input.reason.trim(),
      required: input.required ?? true,
    })
    .returning();
  const boardNumber = await ensureEntityBoardNumber({
    workspaceId: input.workspaceId,
    kind: "source",
    targetId: row.id,
  });
  return mapSource({ ...row, boardNumber });
}

export async function listDraftCriteria(packId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(acceptanceCriteria)
    .where(and(eq(acceptanceCriteria.packId, packId), isNull(acceptanceCriteria.revisionId)))
    .orderBy(acceptanceCriteria.sortOrder);
  return (await ensureRowBoardNumbers(rows, "criterion")).map(mapCriterion);
}

export async function listRevisionCriteria(packId: string, revisionId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(acceptanceCriteria)
    .where(and(eq(acceptanceCriteria.packId, packId), eq(acceptanceCriteria.revisionId, revisionId)))
    .orderBy(acceptanceCriteria.sortOrder);
  return (await ensureRowBoardNumbers(rows, "criterion")).map(mapCriterion);
}

export async function addAcceptanceCriterion(input: { packId: string; workspaceId: string; description: string }) {
  const db = await getDb();
  const [row] = await db
    .insert(acceptanceCriteria)
    .values({
      packId: input.packId,
      workspaceId: input.workspaceId,
      description: input.description.trim(),
    })
    .returning();
  const boardNumber = await ensureEntityBoardNumber({
    workspaceId: input.workspaceId,
    kind: "criterion",
    targetId: row.id,
  });
  return mapCriterion({ ...row, boardNumber });
}

export async function getImplementationPlan(id: string, workspaceId: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(implementationPlans)
    .where(and(eq(implementationPlans.id, id), eq(implementationPlans.workspaceId, workspaceId)))
    .limit(1);
  return row
    ? {
        id: row.id,
        packId: row.packId,
        workspaceId: row.workspaceId,
        revisionId: row.revisionId,
        summary: row.summary,
      }
    : null;
}

export async function getDraftPlan(packId: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(implementationPlans)
    .where(and(eq(implementationPlans.packId, packId), isNull(implementationPlans.revisionId)))
    .limit(1);
  return row
    ? { id: row.id, packId: row.packId, revisionId: row.revisionId, summary: row.summary }
    : null;
}

export async function upsertDraftPlan(input: { packId: string; workspaceId: string; summary: string }) {
  const existing = await getDraftPlan(input.packId);
  const db = await getDb();
  if (existing) {
    const [row] = await db
      .update(implementationPlans)
      .set({ summary: input.summary.trim() })
      .where(eq(implementationPlans.id, existing.id))
      .returning();
    return { id: row.id, packId: row.packId, revisionId: row.revisionId, summary: row.summary };
  }
  const [row] = await db
    .insert(implementationPlans)
    .values({
      packId: input.packId,
      workspaceId: input.workspaceId,
      summary: input.summary.trim(),
    })
    .returning();
  return { id: row.id, packId: row.packId, revisionId: row.revisionId, summary: row.summary };
}

export async function listPacksUsingDocument(documentId: string, workspaceId: string) {
  const db = await getDb();
  const sourceRows = await db
    .select({ packId: contextPackSources.packId })
    .from(contextPackSources)
    .where(eq(contextPackSources.documentId, documentId));
  const ids = [...new Set(sourceRows.map((row) => row.packId))];
  if (ids.length === 0) return [];
  const rows = await db
    .select()
    .from(contextPacks)
    .where(and(eq(contextPacks.workspaceId, workspaceId), inArray(contextPacks.id, ids)));
  return rows.map(mapPack);
}

export async function listRevisions(packId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(contextPackRevisions)
    .where(eq(contextPackRevisions.packId, packId))
    .orderBy(desc(contextPackRevisions.revisionNumber));
  return rows.map(
    (row): ContextPackRevisionRecord => ({
      id: row.id,
      packId: row.packId,
      revisionNumber: row.revisionNumber,
      snapshot: row.snapshot,
      approvedBy: row.approvedBy,
      approvedAt: row.approvedAt,
    }),
  );
}

export async function getRevision(id: string) {
  const db = await getDb();
  const [row] = await db.select().from(contextPackRevisions).where(eq(contextPackRevisions.id, id)).limit(1);
  return row
    ? {
        id: row.id,
        packId: row.packId,
        revisionNumber: row.revisionNumber,
        snapshot: row.snapshot,
        approvedBy: row.approvedBy,
        approvedAt: row.approvedAt,
      }
    : null;
}

export async function approveContextPack(input: {
  pack: ContextPackRecord;
  approvedBy: string;
  snapshot: unknown;
}) {
  const db = await getDb();
  const revisions = await listRevisions(input.pack.id);
  const revisionNumber = (revisions[0]?.revisionNumber ?? 0) + 1;
  const [revision] = await db
    .insert(contextPackRevisions)
    .values({
      packId: input.pack.id,
      workspaceId: input.pack.workspaceId,
      revisionNumber,
      snapshot: JSON.stringify(input.snapshot),
      approvedBy: input.approvedBy,
    })
    .returning();

  const draftItems = await listDraftItems(input.pack.id);
  for (const item of draftItems) {
    await db.insert(contextPackItems).values({
      packId: item.packId,
      workspaceId: input.pack.workspaceId,
      revisionId: revision.id,
      type: item.type,
      strength: item.strength,
      body: item.body,
      blocking: item.blocking,
      sortOrder: item.sortOrder,
      boardNumber: item.boardNumber,
    });
  }
  const draftSources = await listDraftSources(input.pack.id);
  for (const source of draftSources) {
    await db.insert(contextPackSources).values({
      packId: source.packId,
      workspaceId: input.pack.workspaceId,
      revisionId: revision.id,
      documentId: source.documentId,
      releaseId: source.releaseId,
      sourceRole: source.sourceRole,
      section: source.section,
      reason: source.reason,
      required: source.required,
      boardNumber: source.boardNumber,
    });
  }
  const draftCriteria = await listDraftCriteria(input.pack.id);
  for (const criterion of draftCriteria) {
    await db.insert(acceptanceCriteria).values({
      packId: criterion.packId,
      workspaceId: input.pack.workspaceId,
      revisionId: revision.id,
      description: criterion.description,
      sortOrder: criterion.sortOrder,
      boardNumber: criterion.boardNumber,
    });
  }
  const draftPlan = await getDraftPlan(input.pack.id);
  let planRevisionId: string | null = null;
  if (draftPlan) {
    const [plan] = await db
      .insert(implementationPlans)
      .values({
        packId: draftPlan.packId,
        workspaceId: input.pack.workspaceId,
        revisionId: revision.id,
        summary: draftPlan.summary,
      })
      .returning();
    planRevisionId = plan.id;
  }

  const draftTasks = await db
    .select()
    .from(implementationTasks)
    .where(and(eq(implementationTasks.packId, input.pack.id), isNull(implementationTasks.packRevisionId)));
  const idMap = new Map<string, string>();
  const ordered = [
    ...draftTasks.filter((task) => !task.parentTaskId),
    ...draftTasks.filter((task) => task.parentTaskId),
  ];
  for (const task of ordered) {
    const dependsOn = parseJsonArray(task.dependsOnTaskIds).map((id) => idMap.get(id) ?? id);
    const [copy] = await db
      .insert(implementationTasks)
      .values({
        packId: task.packId,
        workspaceId: task.workspaceId,
        planId: planRevisionId ?? task.planId,
        packRevisionId: revision.id,
        parentTaskId: task.parentTaskId ? (idMap.get(task.parentTaskId) ?? null) : null,
        objective: task.objective,
        repositoryId: task.repositoryId,
        pathScopes: task.pathScopes,
        requiredItemIds: task.requiredItemIds,
        criterionIds: task.criterionIds,
        dependsOnTaskIds: stringifyJsonArray(dependsOn),
        status: "available",
        assigneeUserId: task.assigneeUserId,
        assigneeAgentIdentityId: task.assigneeAgentIdentityId,
        sortOrder: task.sortOrder,
        boardNumber: task.boardNumber,
      })
      .returning();
    idMap.set(task.id, copy.id);
    if (task.boardNumber > 0) {
      await assignExistingBoardNumber({
        workspaceId: task.workspaceId,
        boardNumber: task.boardNumber,
        kind: "task",
        targetId: copy.id,
      });
    }
  }

  const [updated] = await db
    .update(contextPacks)
    .set({
      status: "approved",
      validity: "current",
      currentRevisionId: revision.id,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(contextPacks.id, input.pack.id))
    .returning();

  return { pack: mapPack(updated), revision };
}

export async function startNewContextPackRevision(pack: ContextPackRecord) {
  const revisionId = pack.currentRevisionId;
  if (!revisionId) return pack;
  const db = await getDb();

  await db.delete(contextPackItems).where(and(eq(contextPackItems.packId, pack.id), isNull(contextPackItems.revisionId)));
  await db.delete(contextPackSources).where(and(eq(contextPackSources.packId, pack.id), isNull(contextPackSources.revisionId)));
  await db.delete(acceptanceCriteria).where(and(eq(acceptanceCriteria.packId, pack.id), isNull(acceptanceCriteria.revisionId)));
  await db.delete(implementationPlans).where(and(eq(implementationPlans.packId, pack.id), isNull(implementationPlans.revisionId)));

  const items = await listRevisionItems(pack.id, revisionId);
  for (const item of items) {
    await db.insert(contextPackItems).values({
      packId: item.packId,
      workspaceId: pack.workspaceId,
      type: item.type,
      strength: item.strength,
      body: item.body,
      blocking: item.blocking,
      sortOrder: item.sortOrder,
      boardNumber: item.boardNumber,
    });
  }
  const sources = await listRevisionSources(pack.id, revisionId);
  for (const source of sources) {
    await db.insert(contextPackSources).values({
      packId: source.packId,
      workspaceId: pack.workspaceId,
      documentId: source.documentId,
      releaseId: source.releaseId,
      sourceRole: source.sourceRole,
      section: source.section,
      reason: source.reason,
      required: source.required,
      boardNumber: source.boardNumber,
    });
  }
  const criteria = await listRevisionCriteria(pack.id, revisionId);
  for (const criterion of criteria) {
    await db.insert(acceptanceCriteria).values({
      packId: criterion.packId,
      workspaceId: pack.workspaceId,
      description: criterion.description,
      sortOrder: criterion.sortOrder,
      boardNumber: criterion.boardNumber,
    });
  }
  const [plan] = await db
    .select()
    .from(implementationPlans)
    .where(and(eq(implementationPlans.packId, pack.id), eq(implementationPlans.revisionId, revisionId)))
    .limit(1);
  if (plan) {
    await db.insert(implementationPlans).values({
      packId: plan.packId,
      workspaceId: pack.workspaceId,
      summary: plan.summary,
    });
  }

  const [updated] = await db
    .update(contextPacks)
    .set({
      status: "draft",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(contextPacks.id, pack.id))
    .returning();
  return updated ? mapPack(updated) : pack;
}

export async function markPacksNeedingReviewForDocument(documentId: string) {
  const db = await getDb();
  const sources = await db
    .select({ packId: contextPackSources.packId, releaseId: contextPackSources.releaseId })
    .from(contextPackSources)
    .where(and(eq(contextPackSources.documentId, documentId), isNotNull(contextPackSources.releaseId)));
  const packIds = [...new Set(sources.map((row) => row.packId))];
  if (packIds.length === 0) return 0;
  await db
    .update(contextPacks)
    .set({ validity: "needs_review", updatedAt: new Date().toISOString() })
    .where(and(inArray(contextPacks.id, packIds), eq(contextPacks.status, "approved"), eq(contextPacks.validity, "current")));
  return packIds.length;
}

export { parseJsonArray, stringifyJsonArray };
