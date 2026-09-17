import "server-only";

import { and, eq } from "drizzle-orm";
import type { CollabActor } from "@/lib/collab-events";
import { appendCollabEvent, getCollabEventByIdempotencyKey } from "@/lib/db/collab-events";
import { getDb } from "@/lib/db/client";
import { documents, templates } from "@/lib/db/schema";
import {
  CollabContentConflict,
  parseCollabContentOpPayload,
  planOptimisticContentWrite,
  validateCollabContentBaseVersion,
  type CollabContentApplySubject,
  type CollabContentOpField,
  type CollabContentSnapshot,
} from "@/lib/collab-content-ops";
import type { CollabRoomRecord } from "@/lib/collab-rooms";
import { mergeLivingDocumentState } from "@/lib/living-document-mutations.ts";
import type { DocumentStatus } from "@/lib/documents";

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

type DraftRow = {
  contentVersion: number;
  content: string;
  title?: string;
  summary?: string;
  status?: DocumentStatus;
  disabled?: boolean;
};

async function loadDocumentDraft(documentId: string): Promise<DraftRow | null> {
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

async function loadTemplateDraft(templateId: string): Promise<DraftRow | null> {
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

function documentDraftEditable(row: DraftRow): boolean {
  if (row.disabled) return false;
  return row.status === "draft" || row.status === "review";
}

function snapshotFromRow(row: DraftRow, field: CollabContentOpField): CollabContentSnapshot {
  const fields: CollabContentSnapshot["fields"] = {
    content: row.content,
  };
  if (row.title !== undefined) fields.title = row.title;
  if (row.summary !== undefined) fields.summary = row.summary;
  return { contentVersion: row.contentVersion, fields };
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
  const row = await loadTemplateDraft(subject.subjectId);
  if (!row) return null;
  return { contentVersion: row.contentVersion, fields: { content: row.content } };
}

function nextFieldValue(
  subjectType: CollabContentApplySubject["subjectType"],
  row: DraftRow,
  field: CollabContentOpField,
  value: string,
): string {
  if (subjectType === "document" && field === "content") {
    return mergeLivingDocumentState(row.content, value);
  }
  return value;
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
    return {
      ok: false,
      status: 409,
      conflict: new CollabContentConflict(
        "A versão base do rascunho está defasada; recalcule a operação.",
        snapshotFromRow(row, parsed.op.field),
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
      const current = await loadDocumentDraft(input.subject.subjectId);
      if (!current) {
        return { ok: false, status: 400, error: "Este rascunho não existe mais." };
      }
      return {
        ok: false,
        status: 409,
        conflict: new CollabContentConflict(
          "Outra operação avançou o rascunho; recalcule a operação.",
          snapshotFromRow(current, parsed.op.field),
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
      const current = await loadTemplateDraft(input.subject.subjectId);
      if (!current) {
        return { ok: false, status: 400, error: "Este gabarito não existe mais." };
      }
      return {
        ok: false,
        status: 409,
        conflict: new CollabContentConflict(
          "Outra operação avançou o gabarito; recalcule a operação.",
          snapshotFromRow(current, parsed.op.field),
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
