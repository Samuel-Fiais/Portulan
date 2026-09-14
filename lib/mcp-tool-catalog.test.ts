import assert from "node:assert/strict";
import test from "node:test";
import { MCP_TOOL_COUNT, MCP_TOOL_GROUPS } from "./mcp-tool-catalog.ts";

test("MCP_TOOL_GROUPS lists every tool once", () => {
  const tools = MCP_TOOL_GROUPS.flatMap((group) => group.tools);
  assert.equal(tools.length, MCP_TOOL_COUNT);
  assert.equal(new Set(tools).size, MCP_TOOL_COUNT);
  assert.equal(MCP_TOOL_COUNT, 30);
});
