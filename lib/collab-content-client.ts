import type { CollabContentOpField, CollabContentSnapshot, CollabDocumentOpField } from "./collab-content-ops.ts";
import type { CollabIntention } from "./collab-presence.ts";

export const COLLAB_CONTENT_DEBOUNCE_MS = 750;

export type CollabContentRoom = {
  id: string;
  policyVersion: number;
  canOperate: boolean;
};

export type CollabContentOperationResult =
  | {
      ok: true;
      contentVersion: number;
      deduplicated: boolean;
      room: CollabContentRoom;
    }
  | {
      ok: false;
      status: number;
      error: string;
      conflict?: boolean;
      contentVersion?: number;
      snapshot?: CollabContentSnapshot;
      room?: CollabContentRoom;
    };

export function collabRoomApiPath(subjectType: string, subjectId: string) {
  return `/api/collab/rooms/${encodeURIComponent(subjectType)}/${encodeURIComponent(subjectId)}`;
}

export function collabEventsApiPath(subjectType: string, subjectId: string) {
  return `${collabRoomApiPath(subjectType, subjectId)}/events`;
}

export function collabContentQuery(
  workspaceId?: string | null,
  policyVersion?: number | null,
): string {
  const params = new URLSearchParams();
  if (workspaceId) params.set("workspace_id", workspaceId);
  if (policyVersion != null) params.set("policy_version", String(policyVersion));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function createCollabContentIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `op-${crypto.randomUUID()}`;
  }
  return `op-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function isCollabDocumentOpField(field: string): field is CollabDocumentOpField {
  return field === "content" || field === "title" || field === "summary";
}

/** Mescla snapshot do servidor no rascunho local sem tocar metadados. */
export function applyCollabContentSnapshot<
  T extends { draftVersion: number; title: string; summary: string; content: string },
>(document: T, snapshot: CollabContentSnapshot): T {
  const fields = snapshot.fields;
  return {
    ...document,
    draftVersion: snapshot.contentVersion,
    title: fields.title ?? document.title,
    summary: fields.summary ?? document.summary,
    content: fields.content ?? document.content,
  };
}

export function collabSnapshotFieldValue(
  snapshot: CollabContentSnapshot,
  field: CollabContentOpField,
): string | undefined {
  return snapshot.fields[field];
}

export async function fetchCollabContentRoom(
  subjectType: string,
  subjectId: string,
  workspaceId?: string | null,
  policyVersion?: number | null,
): Promise<
  | { ok: true; room: CollabContentRoom; contentSnapshot: CollabContentSnapshot | null }
  | { ok: false; status: number; error: string }
> {
  const response = await fetch(
    `${collabRoomApiPath(subjectType, subjectId)}${collabContentQuery(workspaceId, policyVersion)}`,
  );
  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    room?: CollabContentRoom;
    contentSnapshot?: CollabContentSnapshot;
  } | null;
  if (!response.ok) {
    return { ok: false, status: response.status, error: payload?.error ?? "Não foi possível abrir a sala." };
  }
  if (!payload?.room) {
    return { ok: false, status: response.status, error: "Resposta da sala inválida." };
  }
  return {
    ok: true,
    room: payload.room,
    contentSnapshot: payload.contentSnapshot ?? null,
  };
}

export async function postCollabContentOperation(input: {
  subjectType: string;
  subjectId: string;
  workspaceId?: string | null;
  policyVersion?: number | null;
  intention: CollabIntention;
  field: CollabContentOpField;
  value: string;
  baseVersion: number;
  idempotencyKey?: string;
}): Promise<CollabContentOperationResult> {
  const idempotencyKey = input.idempotencyKey ?? createCollabContentIdempotencyKey();
  const response = await fetch(
    `${collabEventsApiPath(input.subjectType, input.subjectId)}${collabContentQuery(
      input.workspaceId,
      input.policyVersion,
    )}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "content.operation",
        idempotencyKey,
        intention: input.intention,
        baseVersion: input.baseVersion,
        payload: { field: input.field, value: input.value },
      }),
    },
  );

  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    conflict?: boolean;
    contentVersion?: number;
    snapshot?: CollabContentSnapshot;
    room?: CollabContentRoom;
    deduplicated?: boolean;
  } | null;

  if (response.status === 409 || payload?.conflict) {
    return {
      ok: false,
      status: 409,
      error: payload?.error ?? "Conflito de versão no rascunho.",
      conflict: true,
      contentVersion: payload?.contentVersion,
      snapshot: payload?.snapshot,
      room: payload?.room,
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: payload?.error ?? "Não foi possível aplicar a operação.",
      room: payload?.room,
    };
  }

  if (payload?.room == null || payload.contentVersion == null) {
    return { ok: false, status: response.status, error: "Resposta da operação inválida." };
  }

  return {
    ok: true,
    contentVersion: payload.contentVersion,
    deduplicated: Boolean(payload.deduplicated),
    room: payload.room,
  };
}
