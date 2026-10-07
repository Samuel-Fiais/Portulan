import assert from "node:assert/strict";
import test from "node:test";
import { MCP_TOOL_COUNT, MCP_TOOL_GROUPS, listAllMcpToolNames } from "./mcp-tool-catalog.ts";

const KEPT_TOOLS = [
  "list_workspaces",
  "list_documents",
  "get_document",
  "create_document",
  "update_document",
  "duplicate_document",
  "delete_document",
  "publish_document",
  "list_document_releases",
  "update_document_release",
  "restore_document",
  "list_templates",
  "create_template",
  "update_template",
  "delete_template",
  "get_template",
  "duplicate_template",
  "preview_template",
  "list_document_shares",
  "share_document",
  "update_document_share",
  "revoke_document_share",
  "list_document_comments",
  "create_document_comment",
  "resolve_document_comment",
  "delete_document_comment",
  "upload_image",
  "upload_file",
  "list_markdown_components",
  "explain_markdown_component",
  "get_system_guide",
] as const;

test("MCP_TOOL_GROUPS lists every document tool once", () => {
  const tools = listAllMcpToolNames();
  assert.equal(tools.length, MCP_TOOL_COUNT);
  assert.equal(new Set(tools).size, MCP_TOOL_COUNT);
  assert.deepEqual([...tools].sort(), [...KEPT_TOOLS].sort());
  assert.deepEqual(
    MCP_TOOL_GROUPS.map((group) => group.id),
    ["porto", "docs", "templates", "share", "review", "media", "catalog"],
  );
  assert.equal(tools.includes("create_workspace"), false);
  assert.ok(tools.includes("list_documents"));
  assert.ok(tools.includes("get_system_guide"));
});
