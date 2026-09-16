import assert from "node:assert/strict";
import test from "node:test";
import {
  canManageAgentIdentity,
  validateAgentIdentityLifecycle,
  validateManageAgentIdentity,
} from "./agent-identity-policy.ts";

test("RN-110: só o responsável edita ou emite chave", () => {
  assert.equal(canManageAgentIdentity({ actorId: "u1", ownerUserId: "u1" }), true);
  assert.equal(canManageAgentIdentity({ actorId: "u2", ownerUserId: "u1" }), false);
  const issue = validateManageAgentIdentity({ actorId: "u2", ownerUserId: "u1", action: "issue_key" });
  assert.equal(issue.ok, false);
  if (!issue.ok) assert.match(issue.error, /responsável/);
  assert.equal(
    validateManageAgentIdentity({ actorId: "u1", ownerUserId: "u1", action: "issue_key" }).ok,
    true,
  );
});

test("RN-110: desativar e excluir segue o mesmo responsável", () => {
  assert.equal(
    validateManageAgentIdentity({ actorId: "u2", ownerUserId: "u1", action: "delete" }).ok,
    false,
  );
  assert.equal(
    validateManageAgentIdentity({ actorId: "u1", ownerUserId: "u1", action: "deactivate" }).ok,
    true,
  );
});

test("identidade inativa não emite chave", () => {
  assert.equal(validateAgentIdentityLifecycle({ status: "inactive", action: "issue_key" }).ok, false);
  assert.equal(validateAgentIdentityLifecycle({ status: "active", action: "deactivate" }).ok, true);
  assert.equal(validateAgentIdentityLifecycle({ status: "inactive", action: "reactivate" }).ok, true);
});
