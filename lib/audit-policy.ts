export type PolicyResult = { ok: true } | { ok: false; error: string };

function deny(error: string): PolicyResult {
  return { ok: false, error };
}

const SECRET_KEYS = ["token", "authorization", "secret", "password", "apiKey", "api_key"];
const CONTENT_KEYS = ["content", "markdown", "body", "snapshot", "draft", "diff", "patch", "html"];
const MAX_AUDIT_TEXT = 240;

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

function redactAuditValue(key: string, value: unknown): unknown {
  const lower = key.toLowerCase();
  if (SECRET_KEYS.some((secret) => lower.includes(secret))) return undefined;
  if (typeof value === "string") {
    if (value.startsWith("ptl_")) return undefined;
    if (CONTENT_KEYS.some((contentKey) => lower === contentKey || lower.endsWith(contentKey))) {
      return { omitted: "content", length: value.length };
    }
    if (value.length > MAX_AUDIT_TEXT) {
      return { omitted: "text", length: value.length };
    }
    return value;
  }
  if (value === null || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redactAuditValue(key, item));
  }
  if (typeof value === "object") {
    const nested: Record<string, unknown> = {};
    for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      const redacted = redactAuditValue(nestedKey, nestedValue);
      if (redacted !== undefined) nested[nestedKey] = redacted;
    }
    return nested;
  }
  return null;
}

export function sanitizeAuditPayload(payload: Record<string, unknown> | null | undefined) {
  if (!payload) return null;
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    const redacted = redactAuditValue(key, value);
    if (redacted !== undefined) next[key] = redacted;
  }
  return Object.keys(next).length ? next : null;
}

export function validateAuditEvent(input: AuditEventDraft): PolicyResult {
  if (!input.workspaceId) return deny("Evento de auditoria exige porto.");
  if (!input.userId) return deny("Evento de auditoria exige responsável humano.");
  if (!input.action.trim()) return deny("Evento de auditoria exige ação.");
  return { ok: true };
}

export function actorDisplayName(input: {
  userName: string;
  agentName?: string | null;
}) {
  if (input.agentName?.trim()) return `${input.userName} via ${input.agentName.trim()}`;
  return input.userName;
}
