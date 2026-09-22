import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeAuditPayload } from "./audit-policy.ts";
test("auditoria MCP redige Markdown integral e mede correlação", () => {
  const correlation = crypto.randomUUID();
  assert.match(correlation, /^[0-9a-f-]{36}$/i);
  const sanitized = sanitizeAuditPayload({
    tool: "update_document",
    outcome: "success",
    durationMs: 12,
    content: "# ".repeat(400),
    markdown: "corpo longo",
    document_id: "doc-1",
  });
  assert.ok(sanitized);
  assert.equal(typeof sanitized!.content, "object");
  assert.equal(typeof sanitized!.markdown, "object");
  assert.equal(sanitized!.document_id, "doc-1");
  assert.equal(sanitized!.durationMs, 12);
});
