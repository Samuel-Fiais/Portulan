import { COORDINATION_MESSAGE_MAX, coordinationSubjectTypes, type CoordinationSubjectType } from "./dev-context.ts";

export type PolicyResult = { ok: true } | { ok: false; error: string };

const ok: PolicyResult = { ok: true };

function deny(error: string): PolicyResult {
  return { ok: false, error };
}

export function validateCoordinationSubject(type: string): PolicyResult {
  if (!coordinationSubjectTypes.includes(type as CoordinationSubjectType)) {
    return deny("Conversa de bordo só ancora em Rumo, Manobra, item ou Marco.");
  }
  return ok;
}

export function validateCoordinationMessage(input: {
  body: string;
  parentId?: string | null;
  isRoot: boolean;
}): PolicyResult {
  const body = input.body.trim();
  if (!body) return deny("Escreva a mensagem da Conversa de bordo.");
  if (body.length > COORDINATION_MESSAGE_MAX) {
    return deny(`A mensagem vai até ${COORDINATION_MESSAGE_MAX} caracteres.`);
  }
  if (input.parentId && input.isRoot) {
    return deny("Resposta não inicia um fio novo.");
  }
  return ok;
}

export function validateResolveThread(input: { isRoot: boolean; resolved: boolean }): PolicyResult {
  if (!input.isRoot) return deny("Só o fio (mensagem raiz) é resolvido.");
  return ok;
}

export function validateCoordinationThreadScope(input: {
  threadWorkspaceId: string | null | undefined;
  actorWorkspaceId: string;
}): PolicyResult {
  if (!input.threadWorkspaceId || input.threadWorkspaceId !== input.actorWorkspaceId) {
    return deny("Esta Conversa de bordo não pertence a este porto.");
  }
  return ok;
}

export function taskRemainsBlocked(openBlockerCount: number) {
  return openBlockerCount > 0;
}
