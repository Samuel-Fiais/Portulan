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

test("auditoria mostra responsável humano, com agente quando a chave tem identidade", () => {
  assert.equal(actorDisplayName({ userName: "Samuel Fiais", agentName: "Claude Code" }), "Samuel Fiais via Claude Code");
  assert.equal(
    validateAuditEvent({
      workspaceId: "ws",
      userId: "u",
      agentIdentityId: "a",
      mcpTokenId: "t",
      action: "publish_document",
      targetType: "document",
      targetId: "doc-1",
    }).ok,
    true,
  );
});
