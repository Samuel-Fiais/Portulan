import assert from "node:assert/strict";
import test from "node:test";
import { actorDisplayName, sanitizeAuditPayload, validateAuditEvent } from "./audit-policy.ts";

test("auditoria não registra token em texto puro", () => {
  const sanitized = sanitizeAuditPayload({
    token: "ptl_secret",
    summary: "ok",
    authorization: "Bearer ptl_secret",
    note: "ptl_should_skip_if_value",
  });
  assert.ok(sanitized);
  assert.equal("token" in sanitized!, false);
  assert.equal("authorization" in sanitized!, false);
  assert.equal(sanitized!.summary, "ok");
});

test("Diário de bordo mostra responsável via Agente de Bordo", () => {
  assert.equal(actorDisplayName({ userName: "Samuel Fiais", agentName: "Claude Code" }), "Samuel Fiais via Claude Code");
  assert.equal(
    validateAuditEvent({
      workspaceId: "ws",
      userId: "u",
      agentIdentityId: "a",
      mcpTokenId: "t",
      action: "claim_implementation_task",
      targetType: "task",
      targetId: "task-1",
    }).ok,
    true,
  );
});
