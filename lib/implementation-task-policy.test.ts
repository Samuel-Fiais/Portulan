import assert from "node:assert/strict";
import test from "node:test";
import {
  canRegisterTaskProgress,
  canRegisterTaskResult,
  canRetakeExpiredLease,
  childrenToAcceptWithParent,
  nextStatusAfterLastBlockerResolved,
  nextStatusAfterProgress,
  shouldCascadeAssignment,
  validateAcceptTaskResult,
  validateAssignTask,
  validateClaimLeaf,
  validateClaimTask,
  manualTaskStatusOptions,
  validateManualTaskStatusChange,
  validateParentResult,
  validateParentTask,
  validateProgressReportSummary,
  validateRegisterProgress,
  validateRegisterResult,
  validateReleaseTask,
  validateRenewLease,
  completionCartaProtocol,
  isTaskStatusFinalized,
  isTaskWorkFinalized,
  validateTaskDeletion,
  validateTaskObjective,
  validateTaskRevisionChoice,
} from "./implementation-task-policy.ts";
import type { TaskLeaseSnapshot } from "./implementation-task-policy.ts";

const available: TaskLeaseSnapshot = {
  status: "available",
  leaseHolderTokenId: null,
  leaseExpiresAt: null,
  packRevisionId: "rev-1",
  repositoryId: "repo-1",
};

test("claim atômico: disponível passa; segundo agente recusa enquanto o lease vale", () => {
  assert.equal(validateClaimTask({ task: available, actorTokenId: "t1" }).ok, true);
  const claimed: TaskLeaseSnapshot = {
    ...available,
    status: "claimed",
    leaseHolderTokenId: "t1",
    leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(),
  };
  assert.equal(validateClaimTask({ task: claimed, actorTokenId: "t2" }).ok, false);
  assert.equal(validateClaimTask({ task: claimed, actorTokenId: "t1" }).ok, true);
});

test("lease expirado pode ser retomado", () => {
  const expired: TaskLeaseSnapshot = {
    ...available,
    status: "in_progress",
    leaseHolderTokenId: "t1",
    leaseExpiresAt: new Date(Date.now() - 1_000).toISOString(),
  };
  assert.equal(canRetakeExpiredLease(expired), true);
  assert.equal(validateClaimTask({ task: expired, actorTokenId: "t2" }).ok, true);
});

test("renovar lease exige o mesmo agente e atividade", () => {
  const claimed: TaskLeaseSnapshot = {
    ...available,
    status: "claimed",
    leaseHolderTokenId: "t1",
    leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(),
  };
  assert.equal(validateRenewLease({ task: claimed, actorTokenId: "t1" }).ok, true);
  assert.equal(validateRenewLease({ task: claimed, actorTokenId: "t2" }).ok, false);
  assert.equal(validateReleaseTask({ task: claimed, actorTokenId: "t2" }).ok, false);
});

test("revisão nova do Rumo não troca o contexto em silêncio", () => {
  assert.equal(
    validateTaskRevisionChoice({
      taskRevisionId: "rev-1",
      currentApprovedRevisionId: "rev-2",
      explicitChoice: false,
    }).ok,
    false,
  );
  assert.equal(
    validateTaskRevisionChoice({
      taskRevisionId: "rev-1",
      currentApprovedRevisionId: "rev-2",
      explicitChoice: true,
    }).ok,
    true,
  );
});

test("Manobra reportada não é aceita automaticamente", () => {
  assert.equal(validateAcceptTaskResult({ status: "reported", canAccept: false }).ok, false);
  assert.equal(validateAcceptTaskResult({ status: "reported", canAccept: true }).ok, true);
  assert.equal(validateAcceptTaskResult({ status: "in_progress", canAccept: true }).ok, false);
});

test("Registro de bordo: progresso até aceite; resultado só antes de registrar", () => {
  assert.equal(canRegisterTaskProgress("in_progress"), true);
  assert.equal(canRegisterTaskProgress("reported"), true);
  assert.equal(canRegisterTaskProgress("accepted"), false);
  assert.equal(canRegisterTaskResult("in_progress"), true);
  assert.equal(canRegisterTaskResult("reported"), false);
  assert.equal(canRegisterTaskResult("accepted"), false);
  assert.equal(validateProgressReportSummary("   ").ok, false);
  assert.equal(validateProgressReportSummary("Caminho coberto").ok, true);
});

test("objetivo da Manobra não nasce vazio", () => {
  assert.equal(validateTaskObjective("  ").ok, false);
  assert.equal(validateTaskObjective("Cobrir o webhook de PIX").ok, true);
});

test("RN-103: progresso e resultado só pelo detentor do lease ativo", () => {
  const claimed: TaskLeaseSnapshot = {
    ...available,
    status: "in_progress",
    leaseHolderTokenId: "t1",
    leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(),
  };
  assert.equal(validateRegisterProgress({ task: claimed, actorTokenId: "t1" }).ok, true);
  assert.equal(validateRegisterProgress({ task: claimed, actorTokenId: "t2" }).ok, false);
  assert.equal(validateRegisterResult({ task: claimed, actorTokenId: "t2" }).ok, false);
  assert.equal(validateRegisterResult({ task: claimed, actorTokenId: "t1" }).ok, true);
});

test("RN-103: lease expirado não registra sem retomada", () => {
  const expired: TaskLeaseSnapshot = {
    ...available,
    status: "in_progress",
    leaseHolderTokenId: "t1",
    leaseExpiresAt: new Date(Date.now() - 1_000).toISOString(),
  };
  assert.equal(validateRegisterProgress({ task: expired, actorTokenId: "t1" }).ok, false);
  assert.equal(validateRegisterResult({ task: expired, actorTokenId: "t1" }).ok, false);
});

test("RN-103: accepted nunca volta por registro; resultado só uma vez", () => {
  const accepted: TaskLeaseSnapshot = {
    ...available,
    status: "accepted",
    leaseHolderTokenId: "t1",
    leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(),
  };
  const reported: TaskLeaseSnapshot = { ...accepted, status: "reported" };
  assert.equal(validateRegisterProgress({ task: accepted, actorTokenId: "t1" }).ok, false);
  assert.equal(validateRegisterResult({ task: reported, actorTokenId: "t1" }).ok, false);
  assert.equal(nextStatusAfterProgress("accepted"), "accepted");
  assert.equal(nextStatusAfterProgress("reported"), "reported");
  assert.equal(nextStatusAfterProgress("claimed"), "in_progress");
});

test("RN-109: última Maré resolvida volta ao estado anterior válido", () => {
  assert.equal(
    nextStatusAfterLastBlockerResolved({
      status: "blocked",
      leaseHolderTokenId: "t1",
      leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    }),
    "in_progress",
  );
  assert.equal(
    nextStatusAfterLastBlockerResolved({
      status: "blocked",
      leaseHolderTokenId: "t1",
      leaseExpiresAt: new Date(Date.now() - 1_000).toISOString(),
    }),
    "claimed",
  );
  assert.equal(
    nextStatusAfterLastBlockerResolved({
      status: "reported",
      leaseHolderTokenId: "t1",
      leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    }),
    "reported",
  );
});

test("RN-113: Lance só sob Manobra-raiz; pai com filhos não se assume", () => {
  assert.equal(
    validateParentTask({
      parent: { id: "p", parentTaskId: null, packId: "pack" },
      packId: "pack",
    }).ok,
    true,
  );
  assert.equal(
    validateParentTask({
      parent: { id: "p", parentTaskId: "other", packId: "pack" },
      packId: "pack",
    }).ok,
    false,
  );
  assert.equal(validateClaimLeaf({ childCount: 0 }).ok, true);
  assert.equal(validateClaimLeaf({ childCount: 2 }).ok, false);
});

test("RN-113: resultado do pai só com Lances reported/accepted", () => {
  assert.equal(validateParentResult({ children: [{ status: "reported" }, { status: "accepted" }] }).ok, true);
  assert.equal(validateParentResult({ children: [{ status: "in_progress" }] }).ok, false);
  assert.deepEqual(
    childrenToAcceptWithParent([
      { id: "a", status: "reported" },
      { id: "b", status: "accepted" },
      { id: "c", status: "available" },
    ]),
    ["a"],
  );
});

test("RN-117: estado manual só em Rumo editável; aceita e maré contrária ficam de fora", () => {
  assert.deepEqual(manualTaskStatusOptions("in_progress"), [
    "available",
    "claimed",
    "in_progress",
    "reported",
  ]);
  assert.deepEqual(manualTaskStatusOptions("accepted"), []);
  assert.equal(
    validateManualTaskStatusChange({
      current: "in_progress",
      next: "blocked",
      packEditable: true,
    }).ok,
    false,
  );
  assert.equal(
    validateManualTaskStatusChange({
      current: "accepted",
      next: "in_progress",
      packEditable: true,
    }).ok,
    false,
  );
  assert.equal(validateTaskDeletion({ packEditable: false }).ok, false);
  assert.equal(validateTaskDeletion({ packEditable: true }).ok, true);
});

test("RN-118: finalizada e protocolo de Carta de conclusão", () => {
  assert.equal(isTaskStatusFinalized("reported"), true);
  assert.equal(isTaskStatusFinalized("accepted"), true);
  assert.equal(isTaskStatusFinalized("in_progress"), false);
  assert.equal(
    isTaskWorkFinalized({
      status: "reported",
      children: [{ status: "accepted" }, { status: "reported" }],
    }),
    true,
  );
  assert.equal(
    isTaskWorkFinalized({
      status: "reported",
      children: [{ status: "in_progress" }],
    }),
    false,
  );
  const protocol = completionCartaProtocol().join(" ");
  assert.match(protocol, /Carta/);
  assert.match(protocol, /add_implementation_task_source/);
});

test("RN-115: cascata só se pai e filho estão sem dono", () => {
  assert.equal(shouldCascadeAssignment({ parentHadAssignee: false, childHasAssignee: false }), true);
  assert.equal(shouldCascadeAssignment({ parentHadAssignee: false, childHasAssignee: true }), false);
  assert.equal(shouldCascadeAssignment({ parentHadAssignee: true, childHasAssignee: false }), false);
  assert.equal(
    shouldCascadeAssignment({ parentHadAssignee: false, childHasAssignee: false, clearing: true }),
    false,
  );
  assert.equal(validateAssignTask({ assigneeUserId: "u", assigneeAgentIdentityId: "a" }).ok, false);
  assert.equal(validateAssignTask({ assigneeUserId: "u" }).ok, true);
});
