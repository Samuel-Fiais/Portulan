import assert from "node:assert/strict";
import test from "node:test";
import { listAllMcpToolNames } from "./mcp-tool-catalog.ts";

/** Capacidades editoriais que devem ter ferramenta MCP. */
const EDITORIAL_MCP_PARITY: Record<string, string> = {
  createDocumentAction: "create_document",
  updateDocumentAction: "update_document",
  deleteDocumentAction: "delete_document",
  publishDocumentAction: "publish_document",
  duplicateDocumentAction: "duplicate_document",
  setDocumentVisibilityAction: "update_document",
  setDocumentDisabledAction: "update_document",
  setDocumentWorkspaceAction: "update_document",
  restoreDocumentReleaseAction: "restore_document",
  setDocumentReleaseDisabledAction: "update_document_release",
  addDocumentShareAction: "share_document",
  updateDocumentShareAction: "update_document_share",
  revokeDocumentShareAction: "revoke_document_share",
  addDocumentCommentAction: "create_document_comment",
  deleteDocumentCommentAction: "delete_document_comment",
  setDocumentCommentResolvedAction: "resolve_document_comment",
  createTemplateAction: "create_template",
  updateTemplateAction: "update_template",
  deleteTemplateAction: "delete_template",
  duplicateTemplateAction: "duplicate_template",
};

/** Fora do escopo MCP — humano-only. */
const HUMAN_ONLY_ACTIONS = [
  "getAccountAction",
  "registerAccountAction",
  "updateAccountProfileAction",
  "setAccountPasswordAction",
  "removeAccountPasswordAction",
  "disconnectGitHubAction",
  "startGitHubLinkAction",
  "switchWorkspaceAction",
  "createWorkspaceAction",
  "updateWorkspaceAction",
  "setWorkspaceMemberRoleAction",
  "removeWorkspaceMemberAction",
  "leaveWorkspaceAction",
  "transferCaptaincyAction",
  "deleteWorkspaceAction",
  "createWorkspaceInviteAction",
  "revokeWorkspaceInviteAction",
  "acceptWorkspaceInviteAction",
  "listWorkspaceCrewAction",
  "currentWorkspaceRoleAction",
  "createMcpTokenAction",
  "listMcpTokensAction",
  "revokeMcpTokenAction",
] as const;

test("ações editoriais têm ferramenta MCP", () => {
  const tools = new Set(listAllMcpToolNames());
  for (const [action, tool] of Object.entries(EDITORIAL_MCP_PARITY)) {
    assert.ok(tools.has(tool as never), `${action} → falta ${tool}`);
  }
});

test("escopo humano-only documentado", () => {
  assert.ok(HUMAN_ONLY_ACTIONS.includes("createMcpTokenAction"));
  assert.ok(HUMAN_ONLY_ACTIONS.includes("updateWorkspaceAction"));
});
