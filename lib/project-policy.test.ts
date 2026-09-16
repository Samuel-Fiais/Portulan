import assert from "node:assert/strict";
import test from "node:test";
import {
  validateAbsoluteLocalPath,
  validateProjectDeletion,
  validateProjectMutation,
  validateRepositoryMutation,
  validateWorkspaceScope,
} from "./project-policy.ts";

test("tripulante cria Expedição, imediato exclui", () => {
  assert.equal(validateProjectMutation({ role: "member", name: "FestPay API" }).ok, true);
  assert.equal(validateProjectMutation({ role: "member", name: "  " }).ok, false);
  assert.equal(validateProjectMutation({ role: "member", name: "A" }).ok, false);
  assert.equal(validateProjectMutation({ role: null, name: "FestPay API" }).ok, false);
  assert.equal(validateProjectDeletion({ role: "member" }).ok, false);
  assert.equal(validateProjectDeletion({ role: "admin" }).ok, true);
});

test("path absoluto local não é verdade do porto", () => {
  assert.equal(validateAbsoluteLocalPath("/Users/sam/repo").ok, false);
  assert.equal(validateAbsoluteLocalPath("C:\\code\\repo").ok, false);
  assert.equal(validateAbsoluteLocalPath("packages/api").ok, true);
});

test("isolamento por porto", () => {
  assert.equal(
    validateWorkspaceScope({ actorWorkspaceId: "ws-a", resourceWorkspaceId: "ws-b" }).ok,
    false,
  );
  assert.equal(
    validateWorkspaceScope({ actorWorkspaceId: "ws-a", resourceWorkspaceId: "ws-a" }).ok,
    true,
  );
});

test("Embarcação Git ou local, sem path absoluto", () => {
  assert.equal(
    validateRepositoryMutation({
      role: "member",
      name: "portulan",
      kind: "git",
      remoteUrl: "https://github.com/fiais/portulan.git",
    }).ok,
    true,
  );
  assert.equal(
    validateRepositoryMutation({
      role: "member",
      name: "  ",
      kind: "git",
    }).ok,
    false,
  );
});
