import {
  authorizeCollabRoom,
  type CollabRoomAuthorization,
  type CollabSubjectType,
} from "./collab-rooms.ts";
import type { ContextPackStatus, ImplementationTaskStatus } from "./dev-context.ts";
import type { DocumentAccessLevel, DocumentStatus } from "./documents.ts";
import type { WorkspaceRole } from "./workspaces.ts";

/**
 * Retrato mínimo do artefato para autorizar a sala: só o porto onde ele vive e o
 * que decide leitura e mutabilidade (RN-120, RN-121). Conteúdo não entra aqui.
 */
export type CollabSubjectSnapshot =
  | {
      subjectType: "document";
      workspaceId: string | null;
      access: DocumentAccessLevel;
      disabled: boolean;
      status: DocumentStatus;
    }
  | { subjectType: "template"; workspaceId: string | null; isBuiltin: boolean; manageable: boolean }
  | { subjectType: "context_pack"; workspaceId: string; status: ContextPackStatus }
  | { subjectType: "implementation_plan"; workspaceId: string; revisionId: string | null }
  | { subjectType: "implementation_task"; workspaceId: string; status: ImplementationTaskStatus }
  | { subjectType: "project"; workspaceId: string }
  | { subjectType: "repository"; workspaceId: string };

/** Carta e gabarito sem porto são acervo legado, visível de qualquer porto; o resto é do porto. */
export function collabSubjectBelongsToWorkspace(
  snapshot: CollabSubjectSnapshot,
  workspaceId: string,
): boolean {
  if (snapshot.subjectType === "document" || snapshot.subjectType === "template") {
    return snapshot.workspaceId === null || snapshot.workspaceId === workspaceId;
  }
  return snapshot.workspaceId === workspaceId;
}

/**
 * Conteúdo que aceita operação colaborativa: rascunho de carta, gabarito que a pessoa
 * administra, Rumo em rascunho ou revisão, plano de rascunho e linha ainda não aceita
 * (RN-120). Release publicada, revisão aprovada, gabarito interno e Manobra aceita
 * entram na sala só em leitura.
 */
export function collabSubjectContentMutable(snapshot: CollabSubjectSnapshot): boolean {
  switch (snapshot.subjectType) {
    case "document":
      return (
        !snapshot.disabled &&
        (snapshot.status === "draft" || snapshot.status === "review")
      );
    case "template":
      return !snapshot.isBuiltin && snapshot.manageable;
    case "context_pack":
      return snapshot.status === "draft" || snapshot.status === "review";
    case "implementation_plan":
      return snapshot.revisionId === null;
    case "implementation_task":
      return snapshot.status !== "accepted";
    default:
      return true;
  }
}

/** Só a carta tem convite nominal; nos outros assuntos vale o papel na tripulação (RN-121). */
export function collabSubjectDocumentAccess(
  snapshot: CollabSubjectSnapshot,
): DocumentAccessLevel | undefined {
  return snapshot.subjectType === "document" ? snapshot.access : undefined;
}

export type CollabSubjectAuthorizationInput = {
  subjectType: CollabSubjectType;
  subjectId: string;
  workspaceId: string;
  workspaceRole: WorkspaceRole | null;
  /** `null` quando o artefato não foi encontrado com a leitura de quem pede. */
  snapshot: CollabSubjectSnapshot | null;
};

/**
 * Autoriza a sala pelo artefato de origem. Artefato que a pessoa não alcança — ou que
 * vive em outro porto — não abre sala: a sala projeta o direito, nunca o concede (RN-119).
 */
export function authorizeCollabSubject(
  input: CollabSubjectAuthorizationInput,
): CollabRoomAuthorization {
  const room = {
    workspaceId: input.workspaceId,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
  };

  if (!input.snapshot) {
    return { ok: false, error: "Este artefato não existe neste porto." };
  }
  if (input.snapshot.subjectType !== input.subjectType) {
    return { ok: false, error: "Este artefato não é do tipo pedido." };
  }
  if (!collabSubjectBelongsToWorkspace(input.snapshot, input.workspaceId)) {
    return { ok: false, error: "Esta sala não pertence a este porto." };
  }

  return authorizeCollabRoom({
    room,
    actorWorkspaceId: input.workspaceId,
    workspaceRole: input.workspaceRole,
    documentAccess: collabSubjectDocumentAccess(input.snapshot),
    contentMutable: collabSubjectContentMutable(input.snapshot),
  });
}
