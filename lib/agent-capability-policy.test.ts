import assert from "node:assert/strict";
import test from "node:test";
import {
  bootstrapActionLists,
  sessionFromRecognizedRepository,
  validateAgentAction,
  validateSessionRepository,
} from "./agent-capability-policy.ts";

test("Agente de Bordo pode criar Expedição, Embarcação e Rumo", () => {
  for (const action of ["create_project", "create_repository", "propose_context_pack"] as const) {
    assert.equal(validateAgentAction({ mode: "local_implementation", action }).ok, true);
  }
});

test("Agente de Bordo assume Manobra de código com Embarcação reconhecida", () => {
  assert.equal(
    validateAgentAction({
      mode: "context_and_coordination",
      action: "claim_code_task",
      isCodeTask: true,
      session: { repositoryId: "repo-1", recognized: true },
    }).ok,
    true,
  );
  assert.equal(
    validateAgentAction({
      mode: "review",
      action: "report_local_test",
    }).ok,
    true,
  );
  assert.equal(
    validateAgentAction({
      mode: "local_implementation",
      action: "claim_non_code_task",
      isCodeTask: false,
    }).ok,
    true,
  );
});

test("implementação local só assume código com Embarcação reconhecida", () => {
  assert.equal(
    validateAgentAction({
      mode: "local_implementation",
      action: "claim_code_task",
      isCodeTask: true,
      session: { repositoryId: null, recognized: false },
    }).ok,
    false,
  );
  assert.equal(
    validateAgentAction({
      mode: "local_implementation",
      action: "claim_code_task",
      isCodeTask: true,
      session: { repositoryId: "repo-1", recognized: true },
    }).ok,
    true,
  );
});

test("Agente de Bordo pode aprovar Rumo e aceitar resultado (paridade humana)", () => {
  assert.equal(validateAgentAction({ mode: "review", action: "approve_context_pack" }).ok, true);
  assert.equal(validateAgentAction({ mode: "review", action: "accept_task_result" }).ok, true);
});

test("bootstrap sem Embarcação lista ações indisponíveis", () => {
  const result = bootstrapActionLists("local_implementation", null);
  assert.equal(result.repository, null);
  assert.ok(result.allowedActions.includes("find_context"));
  assert.ok(result.allowedActions.includes("report_local_test"));
  assert.ok(result.allowedActions.includes("approve_context_pack"));
  assert.ok(result.unavailableActions.includes("claim_code_task"));
});

test("RN-105: ausência de Embarcação não é reconhecida automaticamente", () => {
  assert.equal(sessionFromRecognizedRepository(undefined, true), null);
  assert.equal(sessionFromRecognizedRepository("repo-1", false), null);
  assert.deepEqual(sessionFromRecognizedRepository("repo-1", true), {
    repositoryId: "repo-1",
    recognized: true,
  });
});

test("RN-105: Embarcação incompatível ou inexistente recusa a sessão", () => {
  assert.equal(
    validateSessionRepository({
      providedId: "repo-2",
      repositoryExists: true,
      taskRepositoryId: "repo-1",
    }).ok,
    false,
  );
  assert.equal(
    validateSessionRepository({
      providedId: "repo-1",
      repositoryExists: false,
    }).ok,
    false,
  );
  assert.equal(
    validateSessionRepository({
      providedId: "repo-1",
      repositoryExists: true,
      taskRepositoryId: "repo-1",
    }).ok,
    true,
  );
  assert.equal(
    validateAgentAction({
      mode: "local_implementation",
      action: "claim_code_task",
      isCodeTask: true,
      session: null,
    }).ok,
    false,
  );
});
