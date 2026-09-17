import type { CollabIntention } from "@/lib/collab-presence";
import { PRESENCE_HEARTBEAT_MS } from "@/lib/collab-presence";

export type CollabPresenceParticipant = {
  id: string;
  intention: CollabIntention;
  kind: "human" | "agent";
  displayName: string;
  viaAgent: string | null;
  avatarUrl: string | null;
};

export type CollabPresenceRoom = {
  id: string;
  policyVersion: number;
};

export function collabPresenceApiPath(subjectType: string, subjectId: string) {
  return `/api/collab/rooms/${encodeURIComponent(subjectType)}/${encodeURIComponent(subjectId)}/presence`;
}

export function collabPresencePollMs() {
  return PRESENCE_HEARTBEAT_MS;
}

export function collabPresenceQuery(
  workspaceId?: string | null,
  policyVersion?: number | null,
): string {
  const params = new URLSearchParams();
  if (workspaceId) params.set("workspace_id", workspaceId);
  if (policyVersion != null) params.set("policy_version", String(policyVersion));
  const query = params.toString();
  return query ? `?${query}` : "";
}
