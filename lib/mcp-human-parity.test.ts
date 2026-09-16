import assert from "node:assert/strict";
import test from "node:test";
import { listAllMcpToolNames } from "./mcp-tool-catalog.ts";

/** Capacidades de tripulação/editorial/dev que devem ter ferramenta MCP (RN-105). */
const TRIPULACAO_MCP_PARITY: Record<string, string> = {
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
  createProjectAction: "create_project",
  createRepositoryAction: "create_repository",
  updateRepositoryAction: "update_repository",
  linkRepositoryAction: "link_project_repository",
  createContextPackAction: "propose_context_pack",
  addContextPackItemAction: "add_context_pack_item",
  addContextPackSourceAction: "add_context_pack_source",
  addImplementationTaskSourceAction: "add_implementation_task_source",
  deleteContextPackItemAction: "delete_context_pack_item",
  deleteContextPackSourceAction: "delete_context_pack_source",
  deleteImplementationTaskSourceAction: "delete_implementation_task_source",
  addAcceptanceCriterionAction: "add_acceptance_criterion",
  deleteAcceptanceCriterionAction: "delete_acceptance_criterion",
  savePlanAction: "save_implementation_plan",
  addImplementationTaskAction: "create_implementation_task",
  assignImplementationTaskAction: "assign_implementation_task",
  submitContextPackReviewAction: "submit_context_pack_review",
  approveContextPackAction: "approve_context_pack",
  startNewContextPackRevisionAction: "start_new_context_pack_revision",
  acceptTaskResultAction: "accept_implementation_task_result",
  createCoordinationMessageAction: "create_coordination_message",
  resolveCoordinationThreadAction: "resolve_coordination_thread",
};

/** Fora do escopo MCP — humano-only ou proibido ao agente (RN-110). */
const HUMAN_ONLY_ACTIONS = [
  "createMcpKeyAction",
  "createAgentIdentityAction",
  "updateAgentIdentityAction",
  "createAgentMcpTokenAction",
  "deactivateAgentIdentityAction",
  "reactivateAgentIdentityAction",
  "deleteAgentIdentityAction",
  "getAgentGuidePreview",
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
  "addProgressReportAction",
  "updateProjectAction",
  "deleteProjectAction",
  "unlinkRepositoryAction",
] as const;

test("RN-105: ações de tripulação editorial/dev têm ferramenta MCP", () => {
  const tools = new Set(listAllMcpToolNames());
  for (const [action, tool] of Object.entries(TRIPULACAO_MCP_PARITY)) {
    assert.ok(tools.has(tool as never), `${action} → falta ${tool}`);
  }
});

test("RN-105: escopo humano-only documentado", () => {
  assert.ok(HUMAN_ONLY_ACTIONS.includes("createMcpKeyAction"));
  assert.ok(HUMAN_ONLY_ACTIONS.includes("updateWorkspaceAction"));
});
