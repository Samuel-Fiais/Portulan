import "server-only";

import { randomUUID } from "node:crypto";
import type { CollabActor } from "@/lib/collab-events";
import { collabRealtimeScopeEnabled } from "@/lib/collab-feature-flags";
import { trackCollabCommandAnnounced, trackCollabCommandFailed } from "@/lib/collab-telemetry";
import type { CollabRoomSubject, CollabSubjectType } from "@/lib/collab-rooms";
import { appendCollabEvent } from "@/lib/db/collab-events";
import { ensureCollabRoom } from "@/lib/db/collab-rooms";

export type CollabCommandAnnounceInput = {
  workspaceId: string;
  subjectType: CollabSubjectType;
  subjectId: string;
  /** Verbo estável do produto (`task.claimed`, `workspace.member.removed`, …). */
  command: string;
  actor: CollabActor;
  payload?: Record<string, unknown> | null;
  /** Chave de idempotência do comando atômico (RN-120). */
  idempotencyKey?: string;
  /** Liga atividade ao evento de auditoria (RN-122). */
  correlationId?: string | null;
};

function buildIdempotencyKey(input: CollabCommandAnnounceInput): string {
  const base = input.idempotencyKey?.trim();
  if (base && base.length >= 8) return base;
  return `cmd-${input.command}-${input.subjectType}-${input.subjectId}-${randomUUID()}`;
}

/**
 * Anuncia na sala o resultado de um comando atômico já transacionado (RN-120).
 * Falha silenciosa quando flags desligadas — o comando no Postgres já vale.
 */
export async function announceCollabCommandApplied(input: CollabCommandAnnounceInput) {
  if (!collabRealtimeScopeEnabled("commands")) return null;

  const roomSubject: CollabRoomSubject = {
    workspaceId: input.workspaceId,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
  };

  try {
    const room = await ensureCollabRoom(roomSubject);
    const payload = {
      ...(input.payload ?? {}),
      command: input.command,
      correlationId: input.correlationId ?? null,
    };
    const result = await appendCollabEvent({
      roomId: room.id,
      workspaceId: input.workspaceId,
      type: "command.applied",
      actor: input.actor,
      payload,
      idempotencyKey: buildIdempotencyKey(input),
    });
    trackCollabCommandAnnounced();
    return result;
  } catch {
    trackCollabCommandFailed();
    return null;
  }
}

/** Espelha o mesmo comando na sala do porto (feed transversal RN-119). */
export async function announceCollabCommandWithWorkspaceFeed(
  input: CollabCommandAnnounceInput,
) {
  await announceCollabCommandApplied(input);
  if (input.subjectType === "workspace" && input.subjectId === input.workspaceId) {
    return null;
  }
  return announceCollabCommandApplied({
    ...input,
    subjectType: "workspace",
    subjectId: input.workspaceId,
    idempotencyKey: input.idempotencyKey ? `${input.idempotencyKey}:porto` : undefined,
  });
}
