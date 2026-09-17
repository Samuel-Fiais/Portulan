export type PolicyResult = { ok: true } | { ok: false; error: string };

/** Intenção declarada na sala: aparece na presença e na atividade, humano ou agente (RN-123). */
export const collabIntentions = ["viewing", "editing", "reviewing", "automating"] as const;

export type CollabIntention = (typeof collabIntentions)[number];

export const COLLAB_INTENTION_LABELS: Record<CollabIntention, string> = {
  viewing: "Lendo",
  editing: "Editando",
  reviewing: "Revisando",
  automating: "Automatizando",
};

export const PRESENCE_HEARTBEAT_MS = 20_000;
export const PRESENCE_STALE_MS = 60_000;

export type PresenceSessionRecord = {
  id: string;
  roomId: string;
  workspaceId: string;
  userId: string | null;
  agentIdentityId: string | null;
  mcpTokenId: string | null;
  intention: CollabIntention;
  clientInfo: string | null;
  joinedAt: string;
  lastSeenAt: string;
  revokedAt: string | null;
};

export function isCollabIntention(value: string): value is CollabIntention {
  return (collabIntentions as readonly string[]).includes(value);
}

export function validatePresenceIntention(value: string): PolicyResult {
  if (!isCollabIntention(value)) {
    return { ok: false, error: "Intenção de presença inválida." };
  }
  return { ok: true };
}

/** Presença revogada (RN-121) ou sem batida recente não conta como alguém na sala. */
export function isPresenceSessionActive(
  session: Pick<PresenceSessionRecord, "lastSeenAt" | "revokedAt">,
  now = Date.now(),
): boolean {
  if (session.revokedAt) return false;
  const lastSeen = new Date(session.lastSeenAt).getTime();
  if (!Number.isFinite(lastSeen)) return false;
  return now - lastSeen <= PRESENCE_STALE_MS;
}
