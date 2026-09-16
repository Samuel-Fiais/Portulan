/** Ferramentas MCP registradas em `app/api/mcp/route.ts`, agrupadas para a UI de Instrumentos. */
export const MCP_TOOL_GROUPS = [
  {
    id: "porto",
    label: "Porto",
    tools: ["list_workspaces", "create_workspace"],
  },
  {
    id: "docs",
    label: "Cartas",
    tools: [
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
    ],
  },
  {
    id: "templates",
    label: "Gabaritos",
    tools: [
      "list_templates",
      "create_template",
      "update_template",
      "delete_template",
      "get_template",
      "duplicate_template",
      "preview_template",
    ],
  },
  {
    id: "share",
    label: "Compartilhamento",
    tools: [
      "list_document_shares",
      "share_document",
      "revoke_document_share",
    ],
  },
  {
    id: "review",
    label: "Revisão",
    tools: [
      "list_document_comments",
      "create_document_comment",
      "delete_document_comment",
    ],
  },
  {
    id: "media",
    label: "Mídia",
    tools: ["upload_image", "upload_file"],
  },
  {
    id: "catalog",
    label: "Catálogo e guia",
    tools: [
      "list_markdown_components",
      "explain_markdown_component",
      "get_system_guide",
    ],
  },
  {
    id: "dev-context",
    label: "Contexto de desenvolvimento",
    tools: [
      "get_agent_bootstrap",
      "find_context",
      "create_project",
      "create_repository",
      "get_project_context",
      "get_context_pack",
      "get_implementation_brief",
      "get_related_context",
      "propose_context_pack",
      "list_available_implementation_tasks",
      "claim_implementation_task",
      "renew_implementation_task_lease",
      "release_implementation_task",
      "report_implementation_progress",
      "report_implementation_result",
      "list_coordination_threads",
      "create_coordination_message",
      "resolve_coordination_thread",
    ],
  },
] as const;

export const MCP_TOOL_COUNT = MCP_TOOL_GROUPS.reduce(
  (total, group) => total + group.tools.length,
  0,
);

export type McpToolName = (typeof MCP_TOOL_GROUPS)[number]["tools"][number];

export function listAllMcpToolNames(): McpToolName[] {
  return MCP_TOOL_GROUPS.flatMap((group) => [...group.tools]);
}

const MCP_TOOL_NAME_SET = new Set<string>(listAllMcpToolNames());

export function isKnownMcpToolName(name: string): name is McpToolName {
  return MCP_TOOL_NAME_SET.has(name);
}
