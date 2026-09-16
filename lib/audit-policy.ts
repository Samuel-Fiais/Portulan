export type PolicyResult = { ok: true } | { ok: false; error: string };

function deny(error: string): PolicyResult {
  return { ok: false, error };
}

const SECRET_KEYS = ["token", "authorization", "secret", "password", "apiKey", "api_key"];

export type AuditEventDraft = {
  workspaceId: string;
  userId: string;
  agentIdentityId: string | null;
  mcpTokenId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  correlationId?: string | null;
  clientInfo?: unknown;
  payload?: Record<string, unknown> | null;
};

export function sanitizeAuditPayload(payload: Record<string, unknown> | null | undefined) {
  if (!payload) return null;
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (SECRET_KEYS.some((secret) => key.toLowerCase().includes(secret))) continue;
    if (typeof value === "string" && value.startsWith("ptl_")) continue;
    next[key] = value;
  }
  return next;
}

export function validateAuditEvent(input: AuditEventDraft): PolicyResult {
  if (!input.workspaceId) return deny("Evento de Diário de bordo exige porto.");
  if (!input.userId) return deny("Evento de Diário de bordo exige responsável humano.");
  if (!input.action.trim()) return deny("Evento de Diário de bordo exige ação.");
  return { ok: true };
}

export function actorDisplayName(input: {
  userName: string;
  agentName?: string | null;
}) {
  if (input.agentName?.trim()) return `${input.userName} via ${input.agentName.trim()}`;
  return input.userName;
}
