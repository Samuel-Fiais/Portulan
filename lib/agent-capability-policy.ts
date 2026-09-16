import {
  agentActions,
  type AgentAction,
  type AgentWorkMode,
  type SessionRepository,
} from "./dev-context.ts";

export type PolicyResult = { ok: true } | { ok: false; error: string };

function deny(error: string): PolicyResult {
  return { ok: false, error };
}

/** Capacidades internas do Agente de Bordo — paridade com humano; travas finas ficam na lista de ferramentas MCP (RN-111). */
const AGENT_CAPABILITIES: readonly AgentAction[] = agentActions;

export function allowedActionsForMode(
  _mode: AgentWorkMode,
  session: SessionRepository | null,
): AgentAction[] {
  return AGENT_CAPABILITIES.filter((action) => {
    if (action === "claim_code_task") {
      return Boolean(session?.recognized && session.repositoryId);
    }
    return true;
  });
}

export function unavailableActionsForMode(
  mode: AgentWorkMode,
  session: SessionRepository | null,
): AgentAction[] {
  const allowed = new Set(allowedActionsForMode(mode, session));
  return agentActions.filter((action) => !allowed.has(action));
}

export function validateAgentAction(input: {
  mode: AgentWorkMode | null;
  action: AgentAction;
  session?: SessionRepository | null;
  isCodeTask?: boolean;
}): PolicyResult {
  if (!input.mode) {
    return deny("Esta chave não está ligada a um Agente de Bordo.");
  }
  if (input.action === "claim_code_task" || (input.action === "claim_non_code_task" && input.isCodeTask)) {
    if (input.isCodeTask && (!input.session?.recognized || !input.session.repositoryId)) {
      return deny("Sem Embarcação reconhecida nesta sessão, Manobra de código não pode ser assumida.");
    }
  }
  const allowed = new Set(allowedActionsForMode(input.mode, input.session ?? null));
  if (input.action === "claim_non_code_task" && input.isCodeTask) {
    return deny("Esta Manobra é de código.");
  }
  if (!allowed.has(input.action) && input.action !== "claim_non_code_task") {
    return deny("Esta ação não está disponível para o Agente de Bordo.");
  }
  return { ok: true };
}

export function bootstrapActionLists(mode: AgentWorkMode, session: SessionRepository | null) {
  return {
    workMode: mode,
    repository: session?.recognized ? session.repositoryId : null,
    allowedActions: allowedActionsForMode(mode, session),
    unavailableActions: unavailableActionsForMode(mode, session),
  };
}

export function sessionFromRecognizedRepository(
  repositoryId: string | null | undefined,
  recognized: boolean,
): SessionRepository | null {
  if (!repositoryId || !recognized) return null;
  return { repositoryId, recognized: true };
}

export function validateSessionRepository(input: {
  providedId?: string | null;
  repositoryExists: boolean;
  taskRepositoryId?: string | null;
}): PolicyResult {
  if (!input.providedId) return { ok: true };
  if (!input.repositoryExists) {
    return deny("Embarcação não encontrada neste porto.");
  }
  if (input.taskRepositoryId && input.taskRepositoryId !== input.providedId) {
    return deny("A Embarcação informada não corresponde a esta Manobra.");
  }
  return { ok: true };
}
