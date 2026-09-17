import type { CollabSubjectType } from "./collab-rooms.ts";

/**
 * Modelo pragmático de coedição (Lances #67–#69): substituição de campo inteiro com
 * `baseVersion` otimista — adequado a rascunhos Markdown sem OT fino. Cada op troca
 * um campo (`content`, `title`, `summary`) pelo valor enviado; conflito quando a
 * versão do rascunho no servidor não bate com `baseVersion` (RN-120, RN-124).
 */
export const collabDocumentOpFields = ["content", "title", "summary"] as const;
export const collabTemplateOpFields = ["content"] as const;

export type CollabDocumentOpField = (typeof collabDocumentOpFields)[number];
export type CollabTemplateOpField = (typeof collabTemplateOpFields)[number];
export type CollabContentOpField = CollabDocumentOpField | CollabTemplateOpField;

export type CollabContentOpPayload = {
  field: CollabContentOpField;
  value: string;
};

export type CollabContentSnapshot = {
  contentVersion: number;
  fields: Partial<Record<CollabContentOpField, string>>;
};

export type CollabContentApplySubject =
  | { subjectType: "document"; subjectId: string }
  | { subjectType: "template"; subjectId: string };

export function collabContentOpSupported(
  subjectType: CollabSubjectType,
): subjectType is CollabContentApplySubject["subjectType"] {
  return subjectType === "document" || subjectType === "template";
}

export function parseCollabContentOpPayload(
  payload: Record<string, unknown> | null | undefined,
  subjectType: CollabContentApplySubject["subjectType"],
): { ok: true; op: CollabContentOpPayload } | { ok: false; error: string } {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Operação de conteúdo exige payload com campo e valor." };
  }

  const fieldRaw = payload.field;
  const valueRaw = payload.value;
  if (typeof fieldRaw !== "string") {
    return { ok: false, error: "Operação de conteúdo exige o campo alvo." };
  }
  if (typeof valueRaw !== "string") {
    return { ok: false, error: "Operação de conteúdo exige valor textual." };
  }

  const allowed =
    subjectType === "document"
      ? (collabDocumentOpFields as readonly string[])
      : (collabTemplateOpFields as readonly string[]);
  if (!allowed.includes(fieldRaw)) {
    return {
      ok: false,
      error:
        subjectType === "document"
          ? "Campo inválido para carta; use content, title ou summary."
          : "Campo inválido para gabarito; use content.",
    };
  }

  if (fieldRaw === "title" && valueRaw.trim().length === 0) {
    return { ok: false, error: "O título da carta não pode ficar vazio." };
  }
  if (fieldRaw === "title" && valueRaw.length > 180) {
    return { ok: false, error: "O título da carta vai até 180 caracteres." };
  }
  if (fieldRaw === "summary" && valueRaw.length > 500) {
    return { ok: false, error: "O resumo da carta vai até 500 caracteres." };
  }

  return {
    ok: true,
    op: { field: fieldRaw as CollabContentOpField, value: valueRaw },
  };
}

export function validateCollabContentBaseVersion(
  baseVersion: number | null | undefined,
): { ok: true; baseVersion: number } | { ok: false; error: string } {
  if (baseVersion == null) {
    return { ok: false, error: "Operação de conteúdo exige baseVersion do rascunho." };
  }
  if (!Number.isInteger(baseVersion) || baseVersion < 0) {
    return { ok: false, error: "baseVersion deve ser um inteiro não negativo." };
  }
  return { ok: true, baseVersion };
}

export function planOptimisticContentWrite(
  currentVersion: number,
  baseVersion: number,
): { action: "write"; nextVersion: number } | { action: "conflict" } {
  if (currentVersion !== baseVersion) return { action: "conflict" };
  return { action: "write", nextVersion: currentVersion + 1 };
}

export class CollabContentConflict extends Error {
  readonly snapshot: CollabContentSnapshot;

  constructor(message: string, snapshot: CollabContentSnapshot) {
    super(message);
    this.name = "CollabContentConflict";
    this.snapshot = snapshot;
  }
}
