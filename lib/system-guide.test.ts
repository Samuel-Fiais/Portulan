import assert from "node:assert/strict";
import test from "node:test";
import { buildSystemGuide, getMcpServerVersion } from "./system-guide.ts";

test("buildSystemGuide inclui catálogo, testcase e avoidErrors", () => {
  const guide = buildSystemGuide();
  assert.equal(getMcpServerVersion(), "0.10.0");
  assert.ok(guide.markdownCatalog.total > 50);
  assert.ok(guide.markdownCatalog.summary.some((component) => component.id === "testcase"));
  assert.ok(guide.livingBehavior.components.some((component) => component.id === "testcase"));
  assert.ok(guide.blobUpload.tools.some((tool) => tool.name === "upload_image"));
  assert.match(guide.qaGuidelines.example, /:::testcase/);
  assert.equal(guide.avoidErrors.title, "Como evitar erros");
});
