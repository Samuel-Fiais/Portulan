import type { DocumentAccessLevel } from "./documents.ts";
import type { WorkspaceRole } from "./workspaces.ts";

export type PolicyResult = { ok: true } | { ok: false; error: string };

const ok: PolicyResult = { ok: true };

function deny(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

/** Assuntos de sala: carta, gabarito e o porto (tripulação e convites). */
export const collabSubjectTypes = [
  "document",
  "template",
  "workspace",
] as const;

export type CollabSubjectType = (typeof collabSubjectTypes)[number];

export const COLLAB_SUBJECT_TYPE_LABELS: Record<CollabSubjectType, string> = {
  document: "Carta",
  template: "Gabarito",
  workspace: "Porto",
};

export type CollabRoomSubject = {
  workspaceId: string;
  subjectType: CollabSubjectType;
  subjectId: string;
};

export type CollabRoomRecord = CollabRoomSubject & {
  id: string;
  /** Carimbo da autorização vigente; avança quando papel, convite, visibilidade ou porto muda (RN-121). */
  policyVersion: number;
  createdAt: string;
};

export function isCollabSubjectType(value: string): value is CollabSubjectType {
  return (collabSubjectTypes as readonly string[]).includes(value);
}

export function validateCollabSubject(input: { subjectType: string; subjectId: string }): PolicyResult {
  if (!isCollabSubjectType(input.subjectType)) {
    return deny("Sala ao vivo só existe para artefatos do porto.");
  }
  if (!input.subjectId.trim()) {
    return deny("Sala ao vivo exige o artefato de origem.");
  }
  return ok;
}

/** Nome estável da sala. O canal ao vivo transporta; Postgres continua a fonte (RN-124). */
export function collabRoomKey(subject: CollabRoomSubject): string {
  return `porto:${subject.workspaceId}:${subject.subjectType}:${subject.subjectId}`;
}

export function validateCollabRoomScope(input: {
  roomWorkspaceId: string | null | undefined;
  actorWorkspaceId: string;
}): PolicyResult {
  if (!input.roomWorkspaceId || input.roomWorkspaceId !== input.actorWorkspaceId) {
    return deny("Esta sala não pertence a este porto.");
  }
  return ok;
}

export type CollabRoomAuthorizationInput = {
  room: CollabRoomSubject;
  actorWorkspaceId: string;
  /** Papel na tripulação do porto da sala; `null` quando a participação não existe mais (RN-104). */
  workspaceRole: WorkspaceRole | null;
  /** Acesso à carta quando o assunto é `document`: cartógrafo, convite nominal ou porto (RN-17, RN-121). */
  documentAccess?: DocumentAccessLevel;
  /** `false` quando o conteúdo é release publicada ou revisão aprovada (RN-03, RN-99, RN-120). */
  contentMutable?: boolean;
};

export type CollabRoomAuthorization =
  | { ok: false; error: string }
  | { ok: true; canOperate: boolean };

const DOCUMENT_WRITE_LEVELS: DocumentAccessLevel[] = ["owner", "editor", "legacy"];

/**
 * Autoriza a sala por porto + entidade + papel (e convite nominal, na carta) — RN-121.
 * `canOperate` diz se a sala aceita operações colaborativas naquele conteúdo (RN-120);
 * comando atômico (publicar, aprovar, lease, aceite) continua sendo autorizado à parte.
 */
export function authorizeCollabRoom(input: CollabRoomAuthorizationInput): CollabRoomAuthorization {
  const subject = validateCollabSubject(input.room);
  if (!subject.ok) return subject;

  const scope = validateCollabRoomScope({
    roomWorkspaceId: input.room.workspaceId,
    actorWorkspaceId: input.actorWorkspaceId,
  });
  if (!scope.ok) return scope;

  const mutable = input.contentMutable ?? true;

  if (input.room.subjectType === "document") {
    const level = input.documentAccess ?? null;
    if (!level) return deny("Sem acesso a esta carta.");
    const canWrite = DOCUMENT_WRITE_LEVELS.includes(level);
    return { ok: true, canOperate: canWrite && mutable };
  }

  if (!input.workspaceRole) {
    return deny("Só a tripulação do porto entra nesta sala.");
  }

  return { ok: true, canOperate: mutable };
}
