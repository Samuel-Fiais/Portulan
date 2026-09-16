import type { WorkspaceRole } from "./workspaces.ts";

export const PROJECT_NAME_MIN = 2;
export const PROJECT_NAME_MAX = 80;
export const REPOSITORY_NAME_MIN = 2;
export const REPOSITORY_NAME_MAX = 80;
export const CONTEXT_PACK_TITLE_MIN = 3;
export const CONTEXT_PACK_TITLE_MAX = 180;
export const CONTEXT_ITEM_BODY_MAX = 8_000;
export const COORDINATION_MESSAGE_MAX = 2_000;
export const TASK_LEASE_MS = 30 * 60 * 1000;

export const repositoryKinds = ["git", "local", "both"] as const;
export type RepositoryKind = (typeof repositoryKinds)[number];

export const projectRepositoryRoles = ["primary", "dependency", "consumer", "infrastructure"] as const;
export type ProjectRepositoryRole = (typeof projectRepositoryRoles)[number];

export const contextPackStatuses = ["draft", "review", "approved", "superseded"] as const;
export type ContextPackStatus = (typeof contextPackStatuses)[number];

export const contextPackValidities = ["current", "needs_review", "expired"] as const;
export type ContextPackValidity = (typeof contextPackValidities)[number];

export const contextItemTypes = ["decision", "rule", "contract", "risk", "assumption", "question"] as const;
export type ContextItemType = (typeof contextItemTypes)[number];

export const contextItemStrengths = ["required", "recommended", "reference"] as const;
export type ContextItemStrength = (typeof contextItemStrengths)[number];

export const documentSourceRoles = ["spec", "decision", "constraint", "reference", "background"] as const;
export type DocumentSourceRole = (typeof documentSourceRoles)[number];

export const implementationTaskStatuses = [
  "available",
  "claimed",
  "in_progress",
  "blocked",
  "reported",
  "accepted",
] as const;
export type ImplementationTaskStatus = (typeof implementationTaskStatuses)[number];

export const agentWorkModes = ["context_and_coordination", "local_implementation", "review"] as const;
export type AgentWorkMode = (typeof agentWorkModes)[number];

export const agentIdentityStatuses = ["active", "inactive"] as const;
export type AgentIdentityStatus = (typeof agentIdentityStatuses)[number];

export const coordinationSubjectTypes = ["pack", "task", "item", "criterion"] as const;
export type CoordinationSubjectType = (typeof coordinationSubjectTypes)[number];

export const agentActions = [
  "find_context",
  "create_project",
  "create_repository",
  "propose_context_pack",
  "update_context_pack",
  "update_repository",
  "link_project_repository",
  "list_repositories",
  "add_context_pack_item",
  "add_context_pack_source",
  "delete_context_pack_item",
  "delete_context_pack_source",
  "add_implementation_task_source",
  "delete_implementation_task_source",
  "add_acceptance_criterion",
  "delete_acceptance_criterion",
  "save_implementation_plan",
  "create_implementation_task",
  "assign_implementation_task",
  "submit_context_pack_review",
  "approve_context_pack",
  "start_new_context_pack_revision",
  "claim_non_code_task",
  "claim_code_task",
  "create_coordination_message",
  "review_report",
  "report_local_test",
  "report_own_commit",
  "accept_task_result",
] as const;
export type AgentAction = (typeof agentActions)[number];

export const AGENT_WORK_MODE_LABELS: Record<AgentWorkMode, string> = {
  context_and_coordination: "Contexto e coordenação",
  local_implementation: "Implementação local",
  review: "Revisão",
};

export const CONTEXT_PACK_STATUS_LABELS: Record<ContextPackStatus, string> = {
  draft: "Rascunho",
  review: "Em revisão",
  approved: "Aprovado",
  superseded: "Substituído",
};

export const CONTEXT_PACK_VALIDITY_LABELS: Record<ContextPackValidity, string> = {
  current: "Em vigor",
  needs_review: "Revisão de fonte disponível",
  expired: "Expirado",
};

export const TASK_STATUS_LABELS: Record<ImplementationTaskStatus, string> = {
  available: "To do",
  claimed: "Doing",
  in_progress: "In progress",
  blocked: "Blocked",
  reported: "Done",
  accepted: "Accepted",
};

export const PROJECT_REPOSITORY_ROLE_LABELS: Record<ProjectRepositoryRole, string> = {
  primary: "Principal",
  dependency: "Dependência",
  consumer: "Consumidora",
  infrastructure: "Infraestrutura",
};

export const CONTEXT_ITEM_TYPE_LABELS: Record<ContextItemType, string> = {
  decision: "Decisão",
  rule: "Regra",
  contract: "Contrato",
  risk: "Risco",
  assumption: "Suposição",
  question: "Pergunta",
};

export const CONTEXT_ITEM_STRENGTH_LABELS: Record<ContextItemStrength, string> = {
  required: "Obrigatório",
  recommended: "Recomendado",
  reference: "Referência",
};

export const DOCUMENT_SOURCE_ROLE_LABELS: Record<DocumentSourceRole, string> = {
  spec: "Especificação",
  decision: "Decisão",
  constraint: "Restrição",
  reference: "Referência",
  background: "Contexto",
};

export const REPOSITORY_KIND_LABELS: Record<RepositoryKind, string> = {
  git: "Git",
  local: "Local",
  both: "Git e local",
};

export type SessionRepository = {
  repositoryId: string | null;
  recognized: boolean;
};

export function isWorkspaceOfficer(role: WorkspaceRole | null | undefined) {
  return role === "owner" || role === "admin";
}

export function isCodeTask(repositoryId: string | null | undefined) {
  return Boolean(repositoryId);
}
