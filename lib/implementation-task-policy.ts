import {
  TASK_LEASE_MS,
  implementationTaskStatuses,
  isCodeTask,
  type ImplementationTaskStatus,
} from "./dev-context.ts";

export type PolicyResult = { ok: true } | { ok: false; error: string };

const ok: PolicyResult = { ok: true };

function deny(error: string): PolicyResult {
  return { ok: false, error };
}

export type TaskLeaseSnapshot = {
  status: ImplementationTaskStatus;
  leaseHolderTokenId: string | null;
  leaseExpiresAt: string | null;
  packRevisionId: string;
  repositoryId: string | null;
};

export function isLeaseActive(leaseExpiresAt: string | null | undefined, now = Date.now()) {
  if (!leaseExpiresAt) return false;
  return new Date(leaseExpiresAt).getTime() > now;
}

export function nextLeaseExpiry(now = Date.now()) {
  return new Date(now + TASK_LEASE_MS).toISOString();
}

export function canRetakeExpiredLease(task: TaskLeaseSnapshot, now = Date.now()) {
  if (task.status !== "claimed" && task.status !== "in_progress" && task.status !== "blocked") {
    return false;
  }
  return !isLeaseActive(task.leaseExpiresAt, now);
}

export function validateTaskObjective(objective: string): PolicyResult {
  if (!objective.trim()) return deny("A Manobra precisa de um objetivo.");
  return ok;
}

export function validateLanceObjective(objective: string): PolicyResult {
  if (!objective.trim()) return deny("O Lance precisa de um objetivo.");
  return ok;
}

export function validateParentTask(input: {
  parent: { id: string; parentTaskId: string | null; packId: string } | null;
  packId: string;
}): PolicyResult {
  if (!input.parent) return deny("A Manobra-pai não foi encontrada.");
  if (input.parent.packId !== input.packId) return deny("O Lance precisa pertencer ao mesmo Rumo.");
  if (input.parent.parentTaskId) return deny("Lance só pode existir sob uma Manobra, não sob outro Lance.");
  return ok;
}

export function validateClaimLeaf(input: { childCount: number }): PolicyResult {
  if (input.childCount > 0) {
    return deny("Esta Manobra tem Lances. Assuma um Lance, não o pai.");
  }
  return ok;
}

export function validateParentResult(input: {
  children: Array<{ status: ImplementationTaskStatus }>;
}): PolicyResult {
  const open = input.children.filter(
    (child) => child.status !== "reported" && child.status !== "accepted",
  );
  if (open.length > 0) {
    return deny("Registre o resultado da Manobra só depois que todos os Lances estiverem registrados ou aceitos.");
  }
  return ok;
}

export function validateAssignTask(input: {
  assigneeUserId?: string | null;
  assigneeAgentIdentityId?: string | null;
}): PolicyResult {
  if (input.assigneeUserId && input.assigneeAgentIdentityId) {
    return deny("Delegue para um tripulante ou um agente, não os dois.");
  }
  return ok;
}

export function shouldCascadeAssignment(input: {
  parentHadAssignee: boolean;
  childHasAssignee: boolean;
  clearing?: boolean;
}): boolean {
  if (input.clearing) return false;
  return !input.parentHadAssignee && !input.childHasAssignee;
}

export function childrenToAcceptWithParent(
  children: Array<{ id: string; status: ImplementationTaskStatus }>,
) {
  return children.filter((child) => child.status === "reported").map((child) => child.id);
}

export function validateClaimTask(input: {
  task: TaskLeaseSnapshot;
  actorTokenId: string;
  now?: number;
}): PolicyResult {
  const now = input.now ?? Date.now();
  if (input.task.status === "accepted" || input.task.status === "reported") {
    return deny("Esta Manobra já foi registrada ou aceita.");
  }
  if (input.task.status === "available") return ok;
  if (canRetakeExpiredLease(input.task, now)) return ok;
  if (isLeaseActive(input.task.leaseExpiresAt, now) && input.task.leaseHolderTokenId !== input.actorTokenId) {
    return deny("Outro Agente de Bordo já assumiu o comando desta Manobra.");
  }
  if (input.task.leaseHolderTokenId === input.actorTokenId) return ok;
  return deny("Esta Manobra não está disponível.");
}

export function validateRenewLease(input: {
  task: TaskLeaseSnapshot;
  actorTokenId: string;
  now?: number;
}): PolicyResult {
  const now = input.now ?? Date.now();
  if (input.task.leaseHolderTokenId !== input.actorTokenId) {
    return deny("Só quem assumiu o comando renova o lease.");
  }
  if (!isLeaseActive(input.task.leaseExpiresAt, now) && !canRetakeExpiredLease(input.task, now)) {
    return deny("O lease desta Manobra expirou.");
  }
  return ok;
}

export function validateReleaseTask(input: {
  task: TaskLeaseSnapshot;
  actorTokenId: string;
}): PolicyResult {
  if (input.task.leaseHolderTokenId !== input.actorTokenId) {
    return deny("Só quem assumiu o comando solta esta Manobra.");
  }
  return ok;
}

export function validateTaskRevisionChoice(input: {
  taskRevisionId: string;
  currentApprovedRevisionId: string;
  explicitChoice: boolean;
}): PolicyResult {
  if (input.taskRevisionId === input.currentApprovedRevisionId) return ok;
  if (!input.explicitChoice) {
    return deny("Há uma revisão nova do Rumo. Escolha se continua nesta revisão ou troca o contexto.");
  }
  return ok;
}

export function validateAcceptTaskResult(input: {
  status: ImplementationTaskStatus;
  canAccept: boolean;
}): PolicyResult {
  if (!input.canAccept) return deny("Só o responsável do Rumo, o capitão ou o imediato aceitam o resultado.");
  if (input.status !== "reported") return deny("Só Manobra registrada pode ser aceita.");
  return ok;
}

export function canRegisterTaskProgress(status: ImplementationTaskStatus) {
  return status !== "accepted";
}

export function canRegisterTaskResult(status: ImplementationTaskStatus) {
  return status !== "accepted" && status !== "reported";
}

export function validateRegisterProgress(input: {
  task: TaskLeaseSnapshot;
  actorTokenId: string;
  now?: number;
}): PolicyResult {
  const now = input.now ?? Date.now();
  if (input.task.status === "accepted") {
    return deny("Esta Manobra já foi aceita.");
  }
  if (input.task.leaseHolderTokenId !== input.actorTokenId) {
    return deny("Só o Agente de Bordo com o comando ativo registra progresso.");
  }
  if (!isLeaseActive(input.task.leaseExpiresAt, now)) {
    return deny("O lease desta Manobra expirou. Retome o comando antes de registrar.");
  }
  return ok;
}

export function validateRegisterResult(input: {
  task: TaskLeaseSnapshot;
  actorTokenId: string;
  now?: number;
}): PolicyResult {
  const now = input.now ?? Date.now();
  if (!canRegisterTaskResult(input.task.status)) {
    if (input.task.status === "accepted") return deny("Esta Manobra já foi aceita.");
    return deny("O resultado desta Manobra já foi registrado.");
  }
  if (input.task.leaseHolderTokenId !== input.actorTokenId) {
    return deny("Só o Agente de Bordo com o comando ativo registra o resultado.");
  }
  if (!isLeaseActive(input.task.leaseExpiresAt, now)) {
    return deny("O lease desta Manobra expirou. Retome o comando antes de registrar.");
  }
  return ok;
}

export function nextStatusAfterProgress(status: ImplementationTaskStatus): ImplementationTaskStatus {
  if (status === "accepted" || status === "reported" || status === "blocked") return status;
  return "in_progress";
}

export function nextStatusAfterLastBlockerResolved(input: {
  status: ImplementationTaskStatus;
  leaseHolderTokenId: string | null;
  leaseExpiresAt: string | null;
  now?: number;
}): ImplementationTaskStatus {
  if (input.status === "accepted" || input.status === "reported") return input.status;
  if (isLeaseActive(input.leaseExpiresAt, input.now) && input.leaseHolderTokenId) {
    return "in_progress";
  }
  if (input.leaseHolderTokenId) return "claimed";
  return "available";
}

export function taskLeaseSnapshot(task: TaskLeaseSnapshot): TaskLeaseSnapshot {
  return task;
}

export function validateProgressReportSummary(summary: string): PolicyResult {
  if (!summary.trim()) return deny("O Registro de bordo precisa de um resumo.");
  return ok;
}

export function nextStatusAfterClaim(): ImplementationTaskStatus {
  return "claimed";
}

export function claimWhereClause(nowIso: string) {
  return {
    availableOrExpired: true as const,
    nowIso,
    statuses: implementationTaskStatuses,
  };
}

export function isCodeImplementationTask(repositoryId: string | null | undefined) {
  return isCodeTask(repositoryId);
}

const MANUAL_TASK_STATUSES = ["available", "claimed", "in_progress", "reported"] as const;
export type ManualTaskStatus = (typeof MANUAL_TASK_STATUSES)[number];

export function manualTaskStatusOptions(status: ImplementationTaskStatus): ManualTaskStatus[] {
  if (status === "accepted") return [];
  return [...MANUAL_TASK_STATUSES];
}

export function validateManualTaskStatusChange(input: {
  current: ImplementationTaskStatus;
  next: ImplementationTaskStatus;
  packEditable: boolean;
}): PolicyResult {
  if (!input.packEditable) {
    return deny("Só o rascunho ou a revisão em edição pode alterar o estado da Manobra.");
  }
  if (input.current === "accepted") {
    return deny("Manobra aceita não muda de estado manualmente.");
  }
  if (input.next === "accepted") {
    return deny("Use aceitar resultado para marcar como aceita.");
  }
  if (input.next === "blocked") {
    return deny("Maré contrária só via Conversa de bordo.");
  }
  if (!(MANUAL_TASK_STATUSES as readonly string[]).includes(input.next)) {
    return deny("Estado inválido para alteração manual.");
  }
  return ok;
}

export function validateTaskDeletion(input: { packEditable: boolean }): PolicyResult {
  if (!input.packEditable) {
    return deny("Só o rascunho ou a revisão em edição pode remover Manobras e Lances.");
  }
  return ok;
}

export function isTaskStatusFinalized(status: ImplementationTaskStatus) {
  return status === "reported" || status === "accepted";
}

export function isTaskWorkFinalized(input: {
  status: ImplementationTaskStatus;
  children?: Array<{ status: ImplementationTaskStatus }>;
}) {
  if (input.children && input.children.length > 0) {
    const openChildren = input.children.filter((child) => !isTaskStatusFinalized(child.status));
    if (openChildren.length > 0) return false;
  }
  return isTaskStatusFinalized(input.status);
}

export function completionCartaProtocol() {
  return [
    "Ao registrar resultado ou aceitar Manobra/Lance, crie ou atualize uma Carta documentando: objetivo, o que foi feito, decisões tomadas e links de código/PR quando relevante.",
    "Vincule essa Carta como carta-fonte da Manobra ou do Lance com add_implementation_task_source.",
    "Use get_system_guide antes de escrever a Carta.",
  ];
}
