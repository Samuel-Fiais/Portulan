import "server-only";

import { documentAccessContext, templateAccessContext } from "@/lib/access-context";
import { resolveWorkspaceContext } from "@/lib/active-workspace";
import type { CollabActor } from "@/lib/collab-events";
import {
  isCollabSubjectType,
  validateCollabSubject,
  type CollabRoomRecord,
  type CollabSubjectType,
} from "@/lib/collab-rooms";
import { authorizeCollabSubject, type CollabSubjectSnapshot } from "@/lib/collab-subjects";
import { ensureCollabRoom, getCollabRoom } from "@/lib/db/collab-rooms";
import { getContextPack, getImplementationPlan } from "@/lib/db/context-packs";
import { getDocument, getDocumentAccessLevel } from "@/lib/db/documents";
import { getImplementationTask } from "@/lib/db/implementation-tasks";
import { getProject, getRepository } from "@/lib/db/projects";
import { canManageTemplate, getTemplateForUser } from "@/lib/db/templates";

export type CollabRoomAccessDenial = {
  ok: false;
  status: 400 | 403 | 404;
  error: string;
};

export type CollabRoomAccessGrant = {
  ok: true;
  room: CollabRoomRecord;
  workspaceId: string;
  /** `true` quando a sala aceita operação colaborativa naquele conteúdo (RN-120). */
  canOperate: boolean;
  actor: CollabActor;
};

export type CollabRoomAccess = CollabRoomAccessGrant | CollabRoomAccessDenial;

export type CollabRoomAccessInput = {
  userId: string;
  subjectType: string;
  subjectId: string;
  /** Porto pedido pelo cliente; sem ele vale o porto ativo da sessão. */
  workspaceId?: string | null;
  /** `true` abre a sala do assunto quando ela ainda não existe (RN-119). */
  ensure?: boolean;
};

/** O assunto resolvido: identificador canônico do artefato e o porto onde ele vive. */
type ResolvedSubject = {
  subjectId: string;
  workspaceId: string;
  snapshot: CollabSubjectSnapshot;
};

/**
 * Traduz sessão + assunto na sala autorizada, com a mesma leitura da superfície
 * equivalente (RN-121). A sala projeta o direito — nunca concede nem amplia:
 * artefato fora do alcance de quem pede não abre sala.
 */
export async function resolveCollabRoomAccess(
  input: CollabRoomAccessInput,
): Promise<CollabRoomAccess> {
  const subject = validateCollabSubject(input);
  if (!subject.ok) return { ok: false, status: 400, error: subject.error };
  if (!isCollabSubjectType(input.subjectType)) {
    return { ok: false, status: 400, error: "Sala ao vivo só existe para artefatos do porto." };
  }

  const { active, workspaces } = await resolveWorkspaceContext(input.userId);
  const requested = input.workspaceId
    ? workspaces.find((item) => item.id === input.workspaceId)
    : undefined;
  if (input.workspaceId && !requested) {
    return { ok: false, status: 403, error: "Esta sala não pertence a este porto." };
  }

  const resolved = await resolveSubject({
    userId: input.userId,
    subjectType: input.subjectType,
    subjectId: input.subjectId.trim(),
    workspaceId: (requested ?? active)?.id ?? null,
  });
  if (!resolved) {
    return { ok: false, status: 404, error: "Este artefato não existe neste porto." };
  }

  const authorization = authorizeCollabSubject({
    subjectType: input.subjectType,
    subjectId: resolved.subjectId,
    workspaceId: resolved.workspaceId,
    workspaceRole: workspaces.find((item) => item.id === resolved.workspaceId)?.role ?? null,
    snapshot: resolved.snapshot,
  });
  if (!authorization.ok) return { ok: false, status: 403, error: authorization.error };

  const roomSubject = {
    workspaceId: resolved.workspaceId,
    subjectType: input.subjectType,
    subjectId: resolved.subjectId,
  };
  const room = input.ensure
    ? await ensureCollabRoom(roomSubject)
    : await getCollabRoom(roomSubject);
  if (!room) {
    return { ok: false, status: 404, error: "Este artefato ainda não tem sala ao vivo." };
  }

  return {
    ok: true,
    room,
    workspaceId: resolved.workspaceId,
    canOperate: authorization.canOperate,
    actor: { userId: input.userId },
  };
}

async function resolveSubject(input: {
  userId: string;
  subjectType: CollabSubjectType;
  subjectId: string;
  workspaceId: string | null;
}): Promise<ResolvedSubject | null> {
  // A carta pode vir por convite nominal de outro porto: o porto da sala é o da carta.
  if (input.subjectType === "document") {
    const ctx = await documentAccessContext(input.userId);
    const document = await getDocument(input.subjectId, ctx);
    if (!document) return null;

    const workspaceId = document.workspaceId ?? input.workspaceId;
    if (!workspaceId) return null;

    return {
      subjectId: document.id,
      workspaceId,
      snapshot: {
        subjectType: "document",
        workspaceId: document.workspaceId,
        access: await getDocumentAccessLevel(document, ctx),
        disabled: document.disabled,
      },
    };
  }

  const workspaceId = input.workspaceId;
  if (!workspaceId) return null;

  switch (input.subjectType) {
    case "template": {
      const ctx = await templateAccessContext(input.userId, workspaceId);
      const template = await getTemplateForUser(input.subjectId, ctx);
      if (!template) return null;
      return {
        subjectId: template.id,
        workspaceId,
        snapshot: {
          subjectType: "template",
          workspaceId: template.workspaceId,
          isBuiltin: template.isBuiltin,
          manageable: canManageTemplate(template, ctx),
        },
      };
    }
    case "context_pack": {
      const pack = await getContextPack(input.subjectId, workspaceId);
      if (!pack) return null;
      return {
        subjectId: pack.id,
        workspaceId,
        snapshot: { subjectType: "context_pack", workspaceId: pack.workspaceId, status: pack.status },
      };
    }
    case "implementation_plan": {
      const plan = await getImplementationPlan(input.subjectId, workspaceId);
      if (!plan) return null;
      return {
        subjectId: plan.id,
        workspaceId,
        snapshot: {
          subjectType: "implementation_plan",
          workspaceId: plan.workspaceId,
          revisionId: plan.revisionId,
        },
      };
    }
    case "implementation_task": {
      const task = await getImplementationTask(input.subjectId, workspaceId);
      if (!task) return null;
      return {
        subjectId: task.id,
        workspaceId,
        snapshot: {
          subjectType: "implementation_task",
          workspaceId: task.workspaceId,
          status: task.status,
        },
      };
    }
    case "project": {
      const project = await getProject(input.subjectId, workspaceId);
      if (!project) return null;
      return {
        subjectId: project.id,
        workspaceId,
        snapshot: { subjectType: "project", workspaceId: project.workspaceId },
      };
    }
    case "repository": {
      const repository = await getRepository(input.subjectId, workspaceId);
      if (!repository) return null;
      return {
        subjectId: repository.id,
        workspaceId,
        snapshot: { subjectType: "repository", workspaceId: repository.workspaceId },
      };
    }
  }
}
