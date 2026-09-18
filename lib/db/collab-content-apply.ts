import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import type { CollabActor } from "@/lib/collab-events";
import { appendCollabEvent, getCollabEventByIdempotencyKey } from "@/lib/db/collab-events";
import { getDb } from "@/lib/db/client";
import {
  acceptanceCriteria,
  contextPackItems,
  contextPacks,
  documents,
  implementationPlans,
  templates,
} from "@/lib/db/schema";
import {
  CollabContentConflict,
  parseCollabContentOpPayload,
  parseCollabContextPackDynamicField,
  planOptimisticContentWrite,
  validateCollabContentBaseVersion,
  type CollabContentApplySubject,
  type CollabContentOpField,
  type CollabContentSnapshot,
} from "@/lib/collab-content-ops";
import type { CollabRoomRecord } from "@/lib/collab-rooms";
import { canEditContextPack } from "@/lib/context-pack-policy";
import { mergeLivingDocumentState } from "@/lib/living-document-mutations.ts";
import type { DocumentStatus } from "@/lib/documents";
import type { ContextPackStatus } from "@/lib/dev-context";

export type CollabContentApplyInput = {
  room: CollabRoomRecord;
  subject: CollabContentApplySubject;
  idempotencyKey: string;
  baseVersion: number | null | undefined;
  payload: Record<string, unknown> | null | undefined;
  actor: CollabActor;
  intention?: string | null;
};

export type CollabContentApplyResult =
  | {
      ok: true;
      contentVersion: number;
      event: Awaited<ReturnType<typeof appendCollabEvent>>["event"];
      deduplicated: boolean;
    }
  | { ok: false; status: 400; error: string }
  | { ok: false; status: 409; conflict: CollabContentConflict };

type DocumentDraftRow = {
  contentVersion: number;
  content: string;
  title?: string;
  summary?: string;
  status?: DocumentStatus;
  disabled?: boolean;
};

type ContextPackDraftRow = {
  contentVersion: number;
  status: ContextPackStatus;
  title: string;
  objective: string;
  expectedOutcome: string;
  scope: string;
  outOfScope: string;
};

type PlanDraftRow = {
  contentVersion: number;
  summary: string;
  revisionId: string | null;
  packId: string;
  workspaceId: string;
  packStatus: ContextPackStatus;
};

async function loadDocumentDraft(documentId: string): Promise<DocumentDraftRow | null> {
  const db = await getDb();
  const [row] = await db
    .select({
      contentVersion: documents.draftVersion,
      content: documents.content,
      title: documents.title,
      summary: documents.summary,
      status: documents.status,
      disabled: documents.disabled,
    })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);
  if (!row) return null;
  return {
    contentVersion: row.contentVersion,
    content: row.content,
    title: row.title,
    summary: row.summary,
    status: row.status as DocumentStatus,
    disabled: row.disabled,
  };
}

async function loadTemplateDraft(templateId: string): Promise<DocumentDraftRow | null> {
  const db = await getDb();
  const [row] = await db
    .select({
      contentVersion: templates.draftVersion,
      content: templates.content,
    })
    .from(templates)
    .where(eq(templates.id, templateId))
    .limit(1);
  if (!row) return null;
  return { contentVersion: row.contentVersion, content: row.content };
}

async function loadContextPackDraft(packId: string): Promise<ContextPackDraftRow | null> {
  const db = await getDb();
  const [row] = await db
    .select({
      contentVersion: contextPacks.draftVersion,
      status: contextPacks.status,
      title: contextPacks.title,
      objective: contextPacks.objective,
      expectedOutcome: contextPacks.expectedOutcome,
      scope: contextPacks.scope,
      outOfScope: contextPacks.outOfScope,
    })
    .from(contextPacks)
    .where(eq(contextPacks.id, packId))
    .limit(1);
  if (!row) return null;
  return {
    contentVersion: row.contentVersion,
    status: row.status as ContextPackStatus,
    title: row.title,
    objective: row.objective,
    expectedOutcome: row.expectedOutcome,
    scope: row.scope,
    outOfScope: row.outOfScope,
  };
}

async function loadImplementationPlanDraft(planId: string): Promise<PlanDraftRow | null> {
  const db = await getDb();
  const [row] = await db
    .select({
      contentVersion: implementationPlans.draftVersion,
      summary: implementationPlans.summary,
      revisionId: implementationPlans.revisionId,
      packId: implementationPlans.packId,
      workspaceId: implementationPlans.workspaceId,
      packStatus: contextPacks.status,
    })
    .from(implementationPlans)
    .innerJoin(contextPacks, eq(contextPacks.id, implementationPlans.packId))
    .where(eq(implementationPlans.id, planId))
    .limit(1);
  if (!row) return null;
  return {
    contentVersion: row.contentVersion,
    summary: row.summary,
    revisionId: row.revisionId,
    packId: row.packId,
    workspaceId: row.workspaceId,
    packStatus: row.packStatus as ContextPackStatus,
  };
}

function documentDraftEditable(row: DocumentDraftRow): boolean {
  if (row.disabled) return false;
  return row.status === "draft" || row.status === "review";
}

function snapshotFieldValue(
  subjectType: CollabContentApplySubject["subjectType"],
  row: DocumentDraftRow | ContextPackDraftRow | PlanDraftRow,
  field: CollabContentOpField,
): string | undefined {
  if (subjectType === "document") {
    const doc = row as DocumentDraftRow;
    if (field === "title") return doc.title;
    if (field === "summary") return doc.summary;
    if (field === "content") return doc.content;
    return undefined;
  }
  if (subjectType === "template") {
    const template = row as DocumentDraftRow;
    if (field === "content") return template.content;
    return undefined;
  }
  if (subjectType === "context_pack") {
    const pack = row as ContextPackDraftRow;
    if (field === "title") return pack.title;
    if (field === "objective") return pack.objective;
    if (field === "expectedOutcome") return pack.expectedOutcome;
    if (field === "scope") return pack.scope;
    if (field === "outOfScope") return pack.outOfScope;
    return undefined;
  }
  if (subjectType === "implementation_plan") {
    const plan = row as PlanDraftRow;
    if (field === "summary") return plan.summary;
    return undefined;
  }
  return undefined;
}

async function snapshotFromSubject(
  subject: CollabContentApplySubject,
  field: CollabContentOpField,
): Promise<CollabContentSnapshot | null> {
  const dynamic = subject.subjectType === "context_pack" ? parseCollabContextPackDynamicField(field) : null;
  if (dynamic?.kind === "item") {
    const db = await getDb();
    const [item] = await db
      .select({ body: contextPackItems.body })
      .from(contextPackItems)
      .where(
        and(
          eq(contextPackItems.id, dynamic.itemId),
          eq(contextPackItems.packId, subject.subjectId),
          isNull(contextPackItems.revisionId),
        ),
      )
      .limit(1);
    if (!item) return null;
    const pack = await loadContextPackDraft(subject.subjectId);
    if (!pack) return null;
    return {
      contentVersion: pack.contentVersion,
      fields: { [field]: item.body },
    };
  }
  if (dynamic?.kind === "criterion") {
    const db = await getDb();
    const [criterion] = await db
      .select({ description: acceptanceCriteria.description })
      .from(acceptanceCriteria)
      .where(
        and(
          eq(acceptanceCriteria.id, dynamic.criterionId),
          eq(acceptanceCriteria.packId, subject.subjectId),
          isNull(acceptanceCriteria.revisionId),
        ),
      )
      .limit(1);
    if (!criterion) return null;
    const pack = await loadContextPackDraft(subject.subjectId);
    if (!pack) return null;
    return {
      contentVersion: pack.contentVersion,
      fields: { [field]: criterion.description },
    };
  }

  if (subject.subjectType === "document") {
    const row = await loadDocumentDraft(subject.subjectId);
    if (!row) return null;
    const fields: CollabContentSnapshot["fields"] = {};
    const value = snapshotFieldValue("document", row, field);
    if (value !== undefined) fields[field] = value;
    return { contentVersion: row.contentVersion, fields };
  }
  if (subject.subjectType === "template") {
    const row = await loadTemplateDraft(subject.subjectId);
    if (!row) return null;
    return { contentVersion: row.contentVersion, fields: { content: row.content } };
  }
  if (subject.subjectType === "context_pack") {
    const row = await loadContextPackDraft(subject.subjectId);
    if (!row) return null;
    const fields: CollabContentSnapshot["fields"] = {};
    const value = snapshotFieldValue("context_pack", row, field);
    if (value !== undefined) fields[field] = value;
    return { contentVersion: row.contentVersion, fields };
  }
  const row = await loadImplementationPlanDraft(subject.subjectId);
  if (!row) return null;
  return { contentVersion: row.contentVersion, fields: { summary: row.summary } };
}

export async function getCollabContentSnapshot(
  subject: CollabContentApplySubject,
): Promise<CollabContentSnapshot | null> {
  if (subject.subjectType === "document") {
    const row = await loadDocumentDraft(subject.subjectId);
    if (!row) return null;
    return {
      contentVersion: row.contentVersion,
      fields: { content: row.content, title: row.title, summary: row.summary },
    };
  }
  if (subject.subjectType === "template") {
    const row = await loadTemplateDraft(subject.subjectId);
    if (!row) return null;
    return { contentVersion: row.contentVersion, fields: { content: row.content } };
  }
  if (subject.subjectType === "context_pack") {
    const row = await loadContextPackDraft(subject.subjectId);
    if (!row) return null;
    return {
      contentVersion: row.contentVersion,
      fields: {
        title: row.title,
        objective: row.objective,
        expectedOutcome: row.expectedOutcome,
        scope: row.scope,
        outOfScope: row.outOfScope,
      },
    };
  }
  const row = await loadImplementationPlanDraft(subject.subjectId);
  if (!row) return null;
  return { contentVersion: row.contentVersion, fields: { summary: row.summary } };
}

function nextFieldValue(
  subjectType: CollabContentApplySubject["subjectType"],
  row: DocumentDraftRow,
  field: CollabContentOpField,
  value: string,
): string {
  if (subjectType === "document" && field === "content") {
    return mergeLivingDocumentState(row.content, value);
  }
  return value;
}

async function applyContextPackMutation(
  packId: string,
  baseVersion: number,
  field: CollabContentOpField,
  value: string,
): Promise<{ ok: true; nextVersion: number } | { ok: false; conflict: CollabContentConflict }> {
  const row = await loadContextPackDraft(packId);
  if (!row) {
    return {
      ok: false,
      conflict: new CollabContentConflict("Este Rumo não existe mais.", {
        contentVersion: 0,
        fields: {},
      }),
    };
  }
  const plan = planOptimisticContentWrite(row.contentVersion, baseVersion);
  if (plan.action === "conflict") {
    const snapshot = await snapshotFromSubject({ subjectType: "context_pack", subjectId: packId }, field);
    return {
      ok: false,
      conflict: new CollabContentConflict(
        "A versão base do Rumo está defasada; recalcule a operação.",
        snapshot ?? { contentVersion: row.contentVersion, fields: {} },
      ),
    };
  }

  const nextVersion = plan.nextVersion;
  const now = new Date().toISOString();
  const db = await getDb();
  const dynamic = parseCollabContextPackDynamicField(field);

  if (dynamic?.kind === "item") {
    const updatedItem = await db
      .update(contextPackItems)
      .set({ body: value.trim() })
      .where(
        and(
          eq(contextPackItems.id, dynamic.itemId),
          eq(contextPackItems.packId, packId),
          isNull(contextPackItems.revisionId),
        ),
      )
      .returning({ id: contextPackItems.id });
    if (updatedItem.length === 0) {
      return {
        ok: false,
        conflict: new CollabContentConflict(
          "Item de rascunho não encontrado.",
          (await snapshotFromSubject({ subjectType: "context_pack", subjectId: packId }, field)) ?? {
            contentVersion: row.contentVersion,
            fields: {},
          },
        ),
      };
    }
  } else if (dynamic?.kind === "criterion") {
    const updatedCriterion = await db
      .update(acceptanceCriteria)
      .set({ description: value.trim() })
      .where(
        and(
          eq(acceptanceCriteria.id, dynamic.criterionId),
          eq(acceptanceCriteria.packId, packId),
          isNull(acceptanceCriteria.revisionId),
        ),
      )
      .returning({ id: acceptanceCriteria.id });
    if (updatedCriterion.length === 0) {
      return {
        ok: false,
        conflict: new CollabContentConflict(
          "Marco de rascunho não encontrado.",
          (await snapshotFromSubject({ subjectType: "context_pack", subjectId: packId }, field)) ?? {
            contentVersion: row.contentVersion,
            fields: {},
          },
        ),
      };
    }
  } else {
    const patch: Record<string, unknown> = { draftVersion: nextVersion, updatedAt: now };
    if (field === "title") patch.title = value.trim();
    if (field === "objective") patch.objective = value;
    if (field === "expectedOutcome") patch.expectedOutcome = value;
    if (field === "scope") patch.scope = value;
    if (field === "outOfScope") patch.outOfScope = value;

    const updated = await db
      .update(contextPacks)
      .set(patch)
      .where(and(eq(contextPacks.id, packId), eq(contextPacks.draftVersion, baseVersion)))
      .returning({ draftVersion: contextPacks.draftVersion });

    if (updated.length === 0) {
      const current = await loadContextPackDraft(packId);
      const snapshot = await snapshotFromSubject({ subjectType: "context_pack", subjectId: packId }, field);
      return {
        ok: false,
        conflict: new CollabContentConflict(
          "Outra operação avançou o Rumo; recalcule a operação.",
          snapshot ??
            (current
              ? { contentVersion: current.contentVersion, fields: {} }
              : { contentVersion: baseVersion, fields: {} }),
        ),
      };
    }
    return { ok: true, nextVersion };
  }

  const updated = await db
    .update(contextPacks)
    .set({ draftVersion: nextVersion, updatedAt: now })
    .where(and(eq(contextPacks.id, packId), eq(contextPacks.draftVersion, baseVersion)))
    .returning({ draftVersion: contextPacks.draftVersion });

  if (updated.length === 0) {
    const snapshot = await snapshotFromSubject({ subjectType: "context_pack", subjectId: packId }, field);
    return {
      ok: false,
      conflict: new CollabContentConflict(
        "Outra operação avançou o Rumo; recalcule a operação.",
        snapshot ?? { contentVersion: row.contentVersion, fields: {} },
      ),
    };
  }

  return { ok: true, nextVersion };
}

async function applyImplementationPlanMutation(
  planId: string,
  baseVersion: number,
  value: string,
): Promise<{ ok: true; nextVersion: number } | { ok: false; conflict: CollabContentConflict }> {
  const row = await loadImplementationPlanDraft(planId);
  if (!row) {
    return {
      ok: false,
      conflict: new CollabContentConflict("Este plano não existe mais.", { contentVersion: 0, fields: {} }),
    };
  }
  if (row.revisionId !== null || !canEditContextPack(row.packStatus)) {
    return {
      ok: false,
      conflict: new CollabContentConflict("Este plano não aceita operação ao vivo.", {
        contentVersion: row.contentVersion,
        fields: { summary: row.summary },
      }),
    };
  }

  const plan = planOptimisticContentWrite(row.contentVersion, baseVersion);
  if (plan.action === "conflict") {
    return {
      ok: false,
      conflict: new CollabContentConflict(
        "A versão base do plano está defasada; recalcule a operação.",
        { contentVersion: row.contentVersion, fields: { summary: row.summary } },
      ),
    };
  }

  const nextVersion = plan.nextVersion;
  const db = await getDb();
  const updated = await db
    .update(implementationPlans)
    .set({ summary: value.trim(), draftVersion: nextVersion })
    .where(and(eq(implementationPlans.id, planId), eq(implementationPlans.draftVersion, baseVersion)))
    .returning({ draftVersion: implementationPlans.draftVersion });

  if (updated.length === 0) {
    const current = await loadImplementationPlanDraft(planId);
    return {
      ok: false,
      conflict: new CollabContentConflict(
        "Outra operação avançou o plano; recalcule a operação.",
        current
          ? { contentVersion: current.contentVersion, fields: { summary: current.summary } }
          : { contentVersion: baseVersion, fields: {} },
      ),
    };
  }

  return { ok: true, nextVersion };
}

export async function applyCollabContentOperation(
  input: CollabContentApplyInput,
): Promise<CollabContentApplyResult> {
  const idempotencyKey = input.idempotencyKey.trim();
  const known = await getCollabEventByIdempotencyKey(input.room.id, idempotencyKey);
  if (known) {
    const snapshot = await getCollabContentSnapshot(input.subject);
    return {
      ok: true,
      contentVersion: snapshot?.contentVersion ?? known.baseVersion ?? 0,
      event: known,
      deduplicated: true,
    };
  }

  const base = validateCollabContentBaseVersion(input.baseVersion);
  if (!base.ok) return { ok: false, status: 400, error: base.error };

  const parsed = parseCollabContentOpPayload(input.payload, input.subject.subjectType);
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error };

  if (input.subject.subjectType === "context_pack") {
    const packRow = await loadContextPackDraft(input.subject.subjectId);
    if (!packRow) {
      return { ok: false, status: 400, error: "Este Rumo não existe mais." };
    }
    if (!canEditContextPack(packRow.status)) {
      return { ok: false, status: 400, error: "Este Rumo não aceita operação no rascunho." };
    }

    const applied = await applyContextPackMutation(
      input.subject.subjectId,
      base.baseVersion,
      parsed.op.field,
      parsed.op.value,
    );
    if (!applied.ok) {
      return { ok: false, status: 409, conflict: applied.conflict };
    }

    const raced = await getCollabEventByIdempotencyKey(input.room.id, idempotencyKey);
    if (raced) {
      return {
        ok: true,
        contentVersion: applied.nextVersion,
        event: raced,
        deduplicated: true,
      };
    }

    const appended = await appendCollabEvent({
      roomId: input.room.id,
      workspaceId: input.room.workspaceId,
      type: "content.operation",
      actor: input.actor,
      intention: (input.intention as import("@/lib/collab-presence").CollabIntention | null) ?? null,
      baseVersion: base.baseVersion,
      payload: {
        field: parsed.op.field,
        contentVersion: applied.nextVersion,
        valueLength: parsed.op.value.length,
      },
      idempotencyKey,
    });

    return {
      ok: true,
      contentVersion: applied.nextVersion,
      event: appended.event,
      deduplicated: appended.deduplicated,
    };
  }

  if (input.subject.subjectType === "implementation_plan") {
    const planRow = await loadImplementationPlanDraft(input.subject.subjectId);
    if (!planRow) {
      return { ok: false, status: 400, error: "Este plano não existe mais." };
    }
    if (planRow.revisionId !== null || !canEditContextPack(planRow.packStatus)) {
      return { ok: false, status: 400, error: "Este plano não aceita operação ao vivo." };
    }

    const applied = await applyImplementationPlanMutation(
      input.subject.subjectId,
      base.baseVersion,
      parsed.op.value,
    );
    if (!applied.ok) {
      return { ok: false, status: 409, conflict: applied.conflict };
    }

    const raced = await getCollabEventByIdempotencyKey(input.room.id, idempotencyKey);
    if (raced) {
      return {
        ok: true,
        contentVersion: applied.nextVersion,
        event: raced,
        deduplicated: true,
      };
    }

    const appended = await appendCollabEvent({
      roomId: input.room.id,
      workspaceId: input.room.workspaceId,
      type: "content.operation",
      actor: input.actor,
      intention: (input.intention as import("@/lib/collab-presence").CollabIntention | null) ?? null,
      baseVersion: base.baseVersion,
      payload: {
        field: parsed.op.field,
        contentVersion: applied.nextVersion,
        valueLength: parsed.op.value.length,
      },
      idempotencyKey,
    });

    return {
      ok: true,
      contentVersion: applied.nextVersion,
      event: appended.event,
      deduplicated: appended.deduplicated,
    };
  }

  const row =
    input.subject.subjectType === "document"
      ? await loadDocumentDraft(input.subject.subjectId)
      : await loadTemplateDraft(input.subject.subjectId);
  if (!row) {
    return { ok: false, status: 400, error: "Este rascunho não existe mais." };
  }
  if (input.subject.subjectType === "document" && !documentDraftEditable(row)) {
    return { ok: false, status: 400, error: "Esta carta não aceita operação no rascunho." };
  }

  const plan = planOptimisticContentWrite(row.contentVersion, base.baseVersion);
  if (plan.action === "conflict") {
    const snapshot = await snapshotFromSubject(input.subject, parsed.op.field);
    return {
      ok: false,
      status: 409,
      conflict: new CollabContentConflict(
        "A versão base do rascunho está defasada; recalcule a operação.",
        snapshot ?? { contentVersion: row.contentVersion, fields: {} },
      ),
    };
  }

  const nextValue = nextFieldValue(input.subject.subjectType, row, parsed.op.field, parsed.op.value);
  const nextVersion = plan.nextVersion;
  const now = new Date().toISOString();
  const db = await getDb();

  if (input.subject.subjectType === "document") {
    const patch: Record<string, unknown> = {
      draftVersion: nextVersion,
      updatedAt: now,
    };
    if (parsed.op.field === "content") patch.content = nextValue;
    if (parsed.op.field === "title") patch.title = nextValue;
    if (parsed.op.field === "summary") patch.summary = nextValue;

    const updated = await db
      .update(documents)
      .set(patch)
      .where(and(eq(documents.id, input.subject.subjectId), eq(documents.draftVersion, base.baseVersion)))
      .returning({ draftVersion: documents.draftVersion });

    if (updated.length === 0) {
      const snapshot = await snapshotFromSubject(input.subject, parsed.op.field);
      return {
        ok: false,
        status: 409,
        conflict: new CollabContentConflict(
          "Outra operação avançou o rascunho; recalcule a operação.",
          snapshot ?? { contentVersion: row.contentVersion, fields: {} },
        ),
      };
    }
  } else {
    const updated = await db
      .update(templates)
      .set({
        content: nextValue,
        draftVersion: nextVersion,
      })
      .where(and(eq(templates.id, input.subject.subjectId), eq(templates.draftVersion, base.baseVersion)))
      .returning({ draftVersion: templates.draftVersion });

    if (updated.length === 0) {
      const snapshot = await snapshotFromSubject(input.subject, parsed.op.field);
      return {
        ok: false,
        status: 409,
        conflict: new CollabContentConflict(
          "Outra operação avançou o gabarito; recalcule a operação.",
          snapshot ?? { contentVersion: row.contentVersion, fields: {} },
        ),
      };
    }
  }

  const raced = await getCollabEventByIdempotencyKey(input.room.id, idempotencyKey);
  if (raced) {
    return {
      ok: true,
      contentVersion: nextVersion,
      event: raced,
      deduplicated: true,
    };
  }

  const eventPayload = {
    field: parsed.op.field,
    contentVersion: nextVersion,
    valueLength: parsed.op.value.length,
  };

  const appended = await appendCollabEvent({
    roomId: input.room.id,
    workspaceId: input.room.workspaceId,
    type: "content.operation",
    actor: input.actor,
    intention: (input.intention as import("@/lib/collab-presence").CollabIntention | null) ?? null,
    baseVersion: base.baseVersion,
    payload: eventPayload,
    idempotencyKey,
  });

  return {
    ok: true,
    contentVersion: nextVersion,
    event: appended.event,
    deduplicated: appended.deduplicated,
  };
}
