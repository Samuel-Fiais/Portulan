import assert from "node:assert/strict";
import test from "node:test";
import { shouldRevokeTokensOnMembershipLoss, validateMcpWorkspaceAccess } from "./mcp-token-policy.ts";

test("RN-104: chave de porto sem participação é recusada", () => {
  assert.equal(validateMcpWorkspaceAccess({ workspaceId: "ws-1", isMember: true }).ok, true);
  const denied = validateMcpWorkspaceAccess({ workspaceId: "ws-1", isMember: false });
  assert.equal(denied.ok, false);
  if (!denied.ok) assert.match(denied.error, /não tem mais acesso/);
});

test("token sem porto não é recusado só por participação", () => {
  assert.equal(validateMcpWorkspaceAccess({ workspaceId: null, isMember: false }).ok, true);
});

test("remoção da tripulação revoga as chaves daquele porto", () => {
  assert.equal(shouldRevokeTokensOnMembershipLoss(), true);
});
