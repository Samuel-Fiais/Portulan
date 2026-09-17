import { sanitizeAuditPayload } from "./audit-policy.ts";
import type { CollabIntention } from "./collab-presence.ts";

export type PolicyResult = { ok: true } | { ok: false; error: string };

const ok: PolicyResult = { ok: true };

function deny(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

/**
 * Eventos versionados de uma sala. Operação colaborativa muda conteúdo mutável;
 * `command.applied` só replica comando atômico já autorizado no servidor (RN-120).
 */
export const collabEventTypes = [
  "presence.joined",
  "presence.updated",
  "presence.left",
  "content.operation",
  "content.saved",
  "command.applied",
  "room.closed",
] as const;

export type CollabEventType = (typeof collabEventTypes)[number];

/**
 * O que um cliente autorizado publica na sala. `command.applied` e `room.closed` são
 * anúncio do servidor depois do comando atômico — cliente não os forja (RN-120).
 */
export const collabClientEventTypes = [
  "presence.joined",
  "presence.updated",
  "presence.left",
  "content.operation",
  "content.saved",
] as const satisfies readonly CollabEventType[];

export type CollabClientEventType = (typeof collabClientEventTypes)[number];

export const COLLAB_IDEMPOTENCY_KEY_MIN = 8;
export const COLLAB_IDEMPOTENCY_KEY_MAX = 200;
export const COLLAB_FIRST_SEQ = 1;
export const COLLAB_APPEND_MAX_ATTEMPTS = 5;

/** Janela de releitura da sala: quem reconecta pede a partir do último `seq` visto (RN-124). */
export const COLLAB_PAGE_LIMIT_DEFAULT = 100;
export const COLLAB_PAGE_LIMIT_MAX = 500;

/** Texto solto no payload é rótulo curto, nunca o Markdown da carta (RN-122). */
export const COLLAB_PAYLOAD_TEXT_MAX = 240;
const COLLAB_PAYLOAD_MAX_DEPTH = 2;
const COLLAB_PAYLOAD_MAX_ITEMS = 20;
const CONTENT_KEYS = ["content", "markdown", "body", "snapshot", "draft", "diff", "patch"];

export type CollabActor = {
  userId: string | null;
  agentIdentityId?: string | null;
  mcpTokenId?: string | null;
};

export type CollabEventDraft = {
  roomId: string;
  workspaceId: string;
  type: CollabEventType;
  actor: CollabActor;
  intention?: CollabIntention | null;
  /** Versão do conteúdo em que a operação se baseia; resolve reconexão e conflito (RN-124). */
  baseVersion?: number | null;
  payload?: Record<string, unknown> | null;
  idempotencyKey: string;
};

export type CollabEventRecord = {
  id: string;
  roomId: string;
  workspaceId: string;
  seq: number;
  type: CollabEventType;
  userId: string | null;
  agentIdentityId: string | null;
  mcpTokenId: string | null;
  intention: CollabIntention | null;
  baseVersion: number | null;
  payload: Record<string, unknown> | null;
  idempotencyKey: string;
  createdAt: string;
};

export type CollabEventInsert = {
  roomId: string;
  workspaceId: string;
  seq: number;
  type: CollabEventType;
  userId: string | null;
  agentIdentityId: string | null;
  mcpTokenId: string | null;
  intention: CollabIntention | null;
  baseVersion: number | null;
  payload: Record<string, unknown> | null;
  idempotencyKey: string;
};

/** Retomada da sala: a posição já vista e quantos eventos cabem na resposta. */
export type CollabEventCursor = {
  afterSeq: number;
  limit: number;
};

/**
 * Persistência do log de uma sala. Postgres é a implementação real (RN-124);
 * `insert` devolve `null` quando (sala, seq) ou (sala, chave de idempotência) já existe.
 */
export type CollabEventStore = {
  findByIdempotencyKey(roomId: string, idempotencyKey: string): Promise<CollabEventRecord | null>;
  latestSeq(roomId: string): Promise<number | null>;
  insert(row: CollabEventInsert): Promise<CollabEventRecord | null>;
  listSince(roomId: string, cursor: CollabEventCursor): Promise<CollabEventRecord[]>;
};

export type CollabAppendResult = {
  event: CollabEventRecord;
  /** `true` quando a chave de idempotência já tinha evento: nada novo foi gravado. */
  deduplicated: boolean;
};

export class CollabEventRejected extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CollabEventRejected";
  }
}

export function isCollabEventType(value: string): value is CollabEventType {
  return (collabEventTypes as readonly string[]).includes(value);
}

export function isCollabClientEventType(value: string): value is CollabClientEventType {
  return (collabClientEventTypes as readonly string[]).includes(value);
}

/** Só operação de conteúdo exige sala que aceite operar; presença basta ler (RN-120). */
export function collabEventRequiresOperate(type: CollabEventType): boolean {
  return type === "content.operation" || type === "content.saved";
}

function isContentKey(key: string) {
  const lower = key.toLowerCase();
  return CONTENT_KEYS.some((contentKey) => lower === contentKey || lower.endsWith(contentKey));
}

function redactValue(key: string, value: unknown, depth: number): unknown {
  if (typeof value === "string") {
    if (isContentKey(key)) {
      return { omitted: "content", length: value.length };
    }
    if (value.length > COLLAB_PAYLOAD_TEXT_MAX) {
      return { omitted: "text", length: value.length };
    }
    return value;
  }
  if (value === null || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    if (depth >= COLLAB_PAYLOAD_MAX_DEPTH) return { omitted: "nested" };
    return value.slice(0, COLLAB_PAYLOAD_MAX_ITEMS).map((item) => redactValue(key, item, depth + 1));
  }
  if (typeof value === "object") {
    if (depth >= COLLAB_PAYLOAD_MAX_DEPTH) return { omitted: "nested" };
    const nested: Record<string, unknown> = {};
    for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      nested[nestedKey] = redactValue(nestedKey, nestedValue, depth + 1);
    }
    return nested;
  }
  return null;
}

/** Payload de evento nunca leva token, segredo nem Markdown integral (RN-122, RN-106). */
export function sanitizeCollabPayload(
  payload: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  const base = sanitizeAuditPayload(payload);
  if (!base) return null;
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(base)) {
    next[key] = redactValue(key, value, 0);
  }
  return next;
}

export function validateCollabActor(actor: CollabActor): PolicyResult {
  if (!actor.userId && !actor.agentIdentityId) {
    return deny("Evento de sala exige responsável humano ou identidade de agente.");
  }
  return ok;
}

export function validateCollabIdempotencyKey(key: string): PolicyResult {
  const trimmed = key.trim();
  if (trimmed.length < COLLAB_IDEMPOTENCY_KEY_MIN) {
    return deny(`A chave de idempotência tem pelo menos ${COLLAB_IDEMPOTENCY_KEY_MIN} caracteres.`);
  }
  if (trimmed.length > COLLAB_IDEMPOTENCY_KEY_MAX) {
    return deny(`A chave de idempotência vai até ${COLLAB_IDEMPOTENCY_KEY_MAX} caracteres.`);
  }
  return ok;
}

export function validateCollabEvent(draft: CollabEventDraft): PolicyResult {
  if (!draft.roomId) return deny("Evento de sala exige sala.");
  if (!draft.workspaceId) return deny("Evento de sala exige porto.");
  if (!isCollabEventType(draft.type)) return deny("Tipo de evento de sala desconhecido.");
  const actor = validateCollabActor(draft.actor);
  if (!actor.ok) return actor;
  const key = validateCollabIdempotencyKey(draft.idempotencyKey);
  if (!key.ok) return key;
  if (draft.baseVersion != null && (!Number.isInteger(draft.baseVersion) || draft.baseVersion < 0)) {
    return deny("A versão base do evento é um inteiro não negativo.");
  }
  return ok;
}

/** Cada sala tem sua própria sequência, começando em 1 e sempre crescendo de um em um. */
export function nextCollabSeq(latestSeq: number | null | undefined): number {
  if (typeof latestSeq !== "number" || !Number.isFinite(latestSeq) || latestSeq < COLLAB_FIRST_SEQ) {
    return COLLAB_FIRST_SEQ;
  }
  return Math.floor(latestSeq) + 1;
}

export function collabEventInsertFromDraft(draft: CollabEventDraft, seq: number): CollabEventInsert {
  return {
    roomId: draft.roomId,
    workspaceId: draft.workspaceId,
    seq,
    type: draft.type,
    userId: draft.actor.userId ?? null,
    agentIdentityId: draft.actor.agentIdentityId ?? null,
    mcpTokenId: draft.actor.mcpTokenId ?? null,
    intention: draft.intention ?? null,
    baseVersion: draft.baseVersion ?? null,
    payload: sanitizeCollabPayload(draft.payload),
    idempotencyKey: draft.idempotencyKey.trim(),
  };
}

/**
 * Grava o evento na próxima posição da sala. Repetir a mesma chave de idempotência
 * devolve o evento já gravado, sem segunda linha; corrida de `seq` tenta a posição
 * seguinte em vez de sobrescrever (RN-120, RN-124).
 */
export async function appendCollabEvent(
  store: CollabEventStore,
  draft: CollabEventDraft,
): Promise<CollabAppendResult> {
  const valid = validateCollabEvent(draft);
  if (!valid.ok) throw new CollabEventRejected(valid.error);

  const idempotencyKey = draft.idempotencyKey.trim();
  const known = await store.findByIdempotencyKey(draft.roomId, idempotencyKey);
  if (known) return { event: known, deduplicated: true };

  for (let attempt = 0; attempt < COLLAB_APPEND_MAX_ATTEMPTS; attempt += 1) {
    const seq = nextCollabSeq(await store.latestSeq(draft.roomId));
    const inserted = await store.insert(collabEventInsertFromDraft(draft, seq));
    if (inserted) return { event: inserted, deduplicated: false };

    const raced = await store.findByIdempotencyKey(draft.roomId, idempotencyKey);
    if (raced) return { event: raced, deduplicated: true };
  }

  throw new CollabEventRejected("Não foi possível ordenar o evento nesta sala. Tente novamente.");
}

export type CollabCursorResult =
  | { ok: true; cursor: CollabEventCursor }
  | { ok: false; error: string };

/** `since` é a última posição já vista; 0 (ou ausente) devolve a sala desde o começo. */
export function parseCollabCursor(input: {
  since?: string | number | null;
  limit?: string | number | null;
}): CollabCursorResult {
  const afterSeq = parseCursorNumber(input.since, 0);
  if (afterSeq === null || afterSeq < 0) {
    return { ok: false, error: "A posição de retomada é um inteiro não negativo." };
  }

  const limit = parseCursorNumber(input.limit, COLLAB_PAGE_LIMIT_DEFAULT);
  if (limit === null || limit < 1 || limit > COLLAB_PAGE_LIMIT_MAX) {
    return { ok: false, error: `O lote de eventos vai de 1 a ${COLLAB_PAGE_LIMIT_MAX}.` };
  }

  return { ok: true, cursor: { afterSeq, limit } };
}

function parseCursorNumber(value: string | number | null | undefined, fallback: number): number | null {
  if (value == null || value === "") return fallback;
  const parsed = typeof value === "number" ? value : Number(value.trim());
  return Number.isInteger(parsed) ? parsed : null;
}

export type CollabEventPage = {
  events: CollabEventRecord[];
  /** Última posição gravada na sala, mesmo quando a página para antes dela. */
  latestSeq: number;
  /** Onde o cliente retoma na próxima leitura. */
  nextSince: number;
  hasMore: boolean;
};

/**
 * Lê a sala em ordem crescente de posição, a partir do último `seq` visto (RN-124).
 * A ordenação e o corte são garantidos aqui: quem reconecta nunca recebe evento
 * repetido nem fora de ordem, qualquer que seja a ordem devolvida pela persistência.
 */
export async function readCollabEventsSince(
  store: CollabEventStore,
  roomId: string,
  cursor: CollabEventCursor,
): Promise<CollabEventPage> {
  const rows = await store.listSince(roomId, cursor);
  const events = rows
    .filter((row) => row.roomId === roomId && row.seq > cursor.afterSeq)
    .sort((left, right) => left.seq - right.seq)
    .slice(0, cursor.limit);

  const latestSeq = (await store.latestSeq(roomId)) ?? 0;
  const nextSince = events.length > 0 ? events[events.length - 1].seq : cursor.afterSeq;

  return { events, latestSeq, nextSince, hasMore: latestSeq > nextSince };
}
