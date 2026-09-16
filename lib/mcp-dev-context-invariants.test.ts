import assert from "node:assert/strict";
import test from "node:test";
import { validateAgentAction, validateSessionRepository } from "./agent-capability-policy.ts";
import { isPackServable } from "./context-pack-policy.ts";
import { validateCoordinationThreadScope } from "./coordination-policy.ts";
import { validateMcpWorkspaceAccess } from "./mcp-token-policy.ts";
import { validateManageAgentIdentity } from "./agent-identity-policy.ts";
import {
  validateRegisterProgress,
  validateRegisterResult,
  type TaskLeaseSnapshot,
} from "./implementation-task-policy.ts";

const leased: TaskLeaseSnapshot = {
  status: "in_progress",
  leaseHolderTokenId: "token-a",
  leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(),
  packRevisionId: "rev-1",
  repositoryId: "repo-1",
};

test("MCP: token de removido não passa da autenticação", () => {
  assert.equal(validateMcpWorkspaceAccess({ workspaceId: "ws-1", isMember: false }).ok, false);
});

test("MCP: outro token não registra em lease alheio", () => {
  assert.equal(validateRegisterProgress({ task: leased, actorTokenId: "token-b" }).ok, false);
  assert.equal(validateRegisterResult({ task: leased, actorTokenId: "token-b" }).ok, false);
});

test("MCP: lease expirado não registra", () => {
  const expired = { ...leased, leaseExpiresAt: new Date(Date.now() - 1_000).toISOString() };
  assert.equal(validateRegisterProgress({ task: expired, actorTokenId: "token-a" }).ok, false);
});

test("MCP: Rumo rascunho ou needs_review não é servível", () => {
  assert.equal(isPackServable({ status: "draft", validity: "current", items: [] }).ok, false);
  assert.equal(isPackServable({ status: "approved", validity: "needs_review", items: [] }).ok, false);
});

test("MCP: Embarcação incompatível recusa Manobra de código", () => {
  assert.equal(
    validateSessionRepository({
      providedId: "repo-2",
      repositoryExists: true,
      taskRepositoryId: "repo-1",
    }).ok,
    false,
  );
  assert.equal(
    validateAgentAction({
      mode: "context_and_coordination",
      action: "claim_code_task",
      isCodeTask: true,
      session: null,
    }).ok,
    false,
  );
});

test("MCP: conversa de outro porto não entra", () => {
  assert.equal(
    validateCoordinationThreadScope({ threadWorkspaceId: "ws-b", actorWorkspaceId: "ws-a" }).ok,
    false,
  );
});

test("MCP: emitir chave de identidade alheia é recusado", () => {
  assert.equal(
    validateManageAgentIdentity({ actorId: "u2", ownerUserId: "u1", action: "issue_key" }).ok,
    false,
  );
});
