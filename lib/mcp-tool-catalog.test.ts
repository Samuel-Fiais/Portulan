import assert from "node:assert/strict";
import test from "node:test";
import { MCP_TOOL_COUNT, MCP_TOOL_GROUPS } from "./mcp-tool-catalog.ts";

test("MCP_TOOL_GROUPS lists every tool once", () => {
  const tools = MCP_TOOL_GROUPS.flatMap((group) => group.tools);
  assert.equal(tools.length, MCP_TOOL_COUNT);
  assert.equal(new Set(tools).size, MCP_TOOL_COUNT);
  assert.ok(MCP_TOOL_COUNT >= 30);
  assert.ok(tools.includes("get_agent_bootstrap"));
  assert.ok(tools.includes("list_documents"));
  assert.ok(tools.includes("add_context_pack_item"));
  assert.ok(tools.includes("assign_implementation_task"));
  assert.ok(tools.includes("approve_context_pack"));
});
