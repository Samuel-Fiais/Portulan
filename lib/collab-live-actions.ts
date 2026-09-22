import "server-only";

import type { CollabActor } from "@/lib/collab-events";
import type { CollabSubjectType } from "@/lib/collab-rooms";
import {
  announceCollabCommandApplied,
  announceCollabCommandWithWorkspaceFeed,
} from "@/lib/db/collab-command-announce";

export type LiveCommandActor = CollabActor & { correlationId?: string | null };

export async function liveAnnounceCommand(input: {
  workspaceId: string;
  subjectType: CollabSubjectType;
  subjectId: string;
  command: string;
  actor: LiveCommandActor;
  payload?: Record<string, unknown> | null;
  idempotencyKey?: string;
  mirrorToWorkspaceFeed?: boolean;
}) {
  const { correlationId, ...actor } = input.actor;
  const base = {
    workspaceId: input.workspaceId,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    command: input.command,
    actor,
    payload: { ...(input.payload ?? {}), correlationId: correlationId ?? null },
    idempotencyKey: input.idempotencyKey,
    correlationId: correlationId ?? null,
  };
  if (input.mirrorToWorkspaceFeed) {
    await announceCollabCommandWithWorkspaceFeed(base);
    return;
  }
  await announceCollabCommandApplied(base);
}
