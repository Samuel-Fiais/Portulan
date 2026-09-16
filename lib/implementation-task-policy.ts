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
