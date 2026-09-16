import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateAgentIdentityGate,
  mcpTokenAuthErrorMessage,
  normalizeMcpToken,
} from "./mcp-token-auth.ts";

test("normalizeMcpToken remove aspas externas", () => {
  assert.equal(normalizeMcpToken('"ptl_abc"'), "ptl_abc");
  assert.equal(normalizeMcpToken("'ptl_abc'"), "ptl_abc");
  assert.equal(normalizeMcpToken("  ptl_abc  "), "ptl_abc");
});

test("evaluateAgentIdentityGate aceita chave legada sem identidade", () => {
  assert.deepEqual(evaluateAgentIdentityGate({ agentIdentityId: null, workspaceId: "ws-1", identity: null }), {
    ok: true,
    workspaceId: "ws-1",
  });
});

test("evaluateAgentIdentityGate preenche porto a partir da identidade", () => {
  assert.deepEqual(
    evaluateAgentIdentityGate({
      agentIdentityId: "agent-1",
      workspaceId: null,
      identity: { workspaceId: "ws-1", status: "active" },
    }),
    { ok: true, workspaceId: "ws-1" },
  );
});

test("evaluateAgentIdentityGate recusa agente ausente ou inativo", () => {
  assert.equal(
    evaluateAgentIdentityGate({
      agentIdentityId: "agent-1",
      workspaceId: "ws-1",
      identity: null,
    }).ok,
    false,
  );
  assert.equal(
    evaluateAgentIdentityGate({
      agentIdentityId: "agent-1",
      workspaceId: "ws-1",
      identity: { workspaceId: "ws-1", status: "inactive" },
    }).ok,
    false,
  );
});

test("mensagens de falha de autenticação MCP", () => {
  assert.match(mcpTokenAuthErrorMessage("not_found"), /revogada/);
  assert.match(mcpTokenAuthErrorMessage("agent_inactive"), /desativado/);
});
