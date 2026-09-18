import type { CollabSubjectType } from "./collab-rooms.ts";
import { canEditContextPack } from "./context-pack-policy.ts";
import type { ContextPackStatus } from "./dev-context.ts";

/**
 * Modelo pragmático de coedição (Lances #67–#69): substituição de campo inteiro com
 * `baseVersion` otimista — adequado a rascunhos Markdown sem OT fino. Cada op troca
 * um campo (`content`, `title`, `summary`) pelo valor enviado; conflito quando a
 * versão do rascunho no servidor não bate com `baseVersion` (RN-120, RN-124).
 */
export const collabDocumentOpFields = ["content", "title", "summary"] as const;
export const collabTemplateOpFields = ["content"] as const;
export const collabContextPackRecorteFields = [
  "title",
  "objective",
  "expectedOutcome",
  "scope",
  "outOfScope",
] as const;
export const collabImplementationPlanOpFields = ["summary"] as const;

export type CollabDocumentOpField = (typeof collabDocumentOpFields)[number];
export type CollabTemplateOpField = (typeof collabTemplateOpFields)[number];
export type CollabContextPackRecorteField = (typeof collabContextPackRecorteFields)[number];
export type CollabImplementationPlanOpField = (typeof collabImplementationPlanOpFields)[number];
export type CollabContextPackItemOpField = `item.${string}.body`;
export type CollabContextPackCriterionOpField = `criterion.${string}.description`;
export type CollabContextPackOpField =
  | CollabContextPackRecorteField
  | CollabContextPackItemOpField
  | CollabContextPackCriterionOpField;
export type CollabContentOpField =
  | CollabDocumentOpField
  | CollabTemplateOpField
  | CollabContextPackOpField
  | CollabImplementationPlanOpField;

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
  | { subjectType: "template"; subjectId: string }
  | { subjectType: "context_pack"; subjectId: string }
  | { subjectType: "implementation_plan"; subjectId: string };

export function collabContentOpSupported(
  subjectType: CollabSubjectType,
): subjectType is CollabContentApplySubject["subjectType"] {
  return (
    subjectType === "document" ||
    subjectType === "template" ||
    subjectType === "context_pack" ||
    subjectType === "implementation_plan"
  );
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseCollabContextPackDynamicField(
  field: string,
): { kind: "item"; itemId: string } | { kind: "criterion"; criterionId: string } | null {
  const itemMatch = /^item\.([0-9a-f-]{36})\.body$/i.exec(field);
  if (itemMatch && UUID_PATTERN.test(itemMatch[1])) {
    return { kind: "item", itemId: itemMatch[1] };
  }
  const criterionMatch = /^criterion\.([0-9a-f-]{36})\.description$/i.exec(field);
  if (criterionMatch && UUID_PATTERN.test(criterionMatch[1])) {
    return { kind: "criterion", criterionId: criterionMatch[1] };
  }
  return null;
}

export function contextPackAcceptsContentOperation(status: ContextPackStatus): boolean {
  return canEditContextPack(status);
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

  if (subjectType === "document") {
    if (!(collabDocumentOpFields as readonly string[]).includes(fieldRaw)) {
      return { ok: false, error: "Campo inválido para carta; use content, title ou summary." };
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
    return { ok: true, op: { field: fieldRaw as CollabContentOpField, value: valueRaw } };
  }

  if (subjectType === "template") {
    if (!(collabTemplateOpFields as readonly string[]).includes(fieldRaw)) {
      return { ok: false, error: "Campo inválido para gabarito; use content." };
    }
    return { ok: true, op: { field: fieldRaw as CollabContentOpField, value: valueRaw } };
  }

  if (subjectType === "context_pack") {
    if ((collabContextPackRecorteFields as readonly string[]).includes(fieldRaw)) {
      if (fieldRaw === "title") {
        const trimmed = valueRaw.trim();
        if (trimmed.length < 3) {
          return { ok: false, error: "O título do Rumo precisa de pelo menos 3 caracteres." };
        }
        if (trimmed.length > 180) {
          return { ok: false, error: "O título do Rumo vai até 180 caracteres." };
        }
      }
      return { ok: true, op: { field: fieldRaw as CollabContentOpField, value: valueRaw } };
    }
    const dynamic = parseCollabContextPackDynamicField(fieldRaw);
    if (dynamic?.kind === "item") {
      if (valueRaw.trim().length === 0) {
        return { ok: false, error: "O texto do item não pode ficar vazio." };
      }
      return { ok: true, op: { field: fieldRaw as CollabContentOpField, value: valueRaw } };
    }
    if (dynamic?.kind === "criterion") {
      if (valueRaw.trim().length === 0) {
        return { ok: false, error: "A descrição do Marco não pode ficar vazia." };
      }
      return { ok: true, op: { field: fieldRaw as CollabContentOpField, value: valueRaw } };
    }
    return {
      ok: false,
      error:
        "Campo inválido para Rumo; use recorte (title, objective, expectedOutcome, scope, outOfScope) ou item./criterion.",
    };
  }

  if (subjectType === "implementation_plan") {
    if (!(collabImplementationPlanOpFields as readonly string[]).includes(fieldRaw)) {
      return { ok: false, error: "Campo inválido para plano; use summary." };
    }
    if (valueRaw.length > 8_000) {
      return { ok: false, error: "O plano de navegação vai até 8000 caracteres." };
    }
    return { ok: true, op: { field: fieldRaw as CollabContentOpField, value: valueRaw } };
  }

  return { ok: false, error: "Assunto não aceita operação de conteúdo." };
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
