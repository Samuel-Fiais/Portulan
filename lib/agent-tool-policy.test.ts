import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultAgentAllowedTools,
  disabledAgentTools,
  isAgentToolAllowed,
  resolveAgentAllowedTools,
  validateAgentAllowedToolsSelection,
} from "./agent-tool-policy.ts";
import { MCP_TOOL_COUNT } from "./mcp-tool-catalog.ts";

test("padrão expõe todo o catálogo MCP", () => {
  assert.equal(defaultAgentAllowedTools().length, MCP_TOOL_COUNT);
});

test("identidade legada sem lista usa catálogo completo", () => {
  assert.equal(resolveAgentAllowedTools(null).length, MCP_TOOL_COUNT);
  assert.equal(resolveAgentAllowedTools([]).length, MCP_TOOL_COUNT);
});

test("seleção válida exige ao menos uma ferramenta conhecida", () => {
  assert.equal(validateAgentAllowedToolsSelection([]).ok, false);
  assert.equal(validateAgentAllowedToolsSelection(["create_document"]).ok, true);
  assert.equal(validateAgentAllowedToolsSelection(["nope"]).ok, false);
});

test("isAgentToolAllowed respeita lista gravada", () => {
  const subset = ["list_documents", "create_document"] as const;
  assert.equal(isAgentToolAllowed(subset, "create_document"), true);
  assert.equal(isAgentToolAllowed(subset, "delete_document"), false);
  assert.equal(disabledAgentTools(subset).includes("delete_document"), true);
});
