import "server-only";

import { randomUUID } from "node:crypto";
import { sanitizeAuditPayload, type AuditEventDraft } from "@/lib/audit-policy";
import { trackMcpAuditRecorded } from "@/lib/collab-telemetry";
import { recordAuditEvent } from "@/lib/db/audit-events";

export type McpAuditOutcome = "success" | "error" | "denied";

export type McpAuditContext = {
  workspaceId: string;
  userId: string;
  agentIdentityId: string | null;
  mcpTokenId: string | null;
  clientInfo?: unknown;
};

export type McpAuditInput = {
  context: McpAuditContext;
  toolName: string;
  startedAtMs: number;
  outcome: McpAuditOutcome;
  correlationId?: string;
  targetType?: string;
  targetId?: string;
  argumentSummary?: Record<string, unknown> | null;
  errorMessage?: string | null;
};

export function createMcpCorrelationId(): string {
  return randomUUID();
}

function inferTarget(toolName: string, args: unknown): { targetType: string; targetId: string } {
  const record =
    args && typeof args === "object" && !Array.isArray(args) ? (args as Record<string, unknown>) : {};
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return null;
  };
  const id =
    pick(
      "document_id",
      "template_id",
      "pack_id",
      "task_id",
      "project_id",
      "repository_id",
      "comment_id",
      "thread_id",
    ) ?? toolName;
  const type = toolName.includes("document")
    ? "document"
    : toolName.includes("template")
      ? "template"
      : toolName.includes("pack") || toolName.includes("context")
        ? "pack"
        : toolName.includes("task")
          ? "task"
          : toolName.includes("project")
            ? "project"
            : toolName.includes("repository")
              ? "repository"
              : "mcp";
  return { targetType: type, targetId: id };
}

export async function recordMcpToolAudit(input: McpAuditInput) {
  const durationMs = Math.max(0, Date.now() - input.startedAtMs);
  const correlationId = input.correlationId ?? createMcpCorrelationId();
  const inferred = inferTarget(input.toolName, input.argumentSummary);
  const payload = sanitizeAuditPayload({
    tool: input.toolName,
    outcome: input.outcome,
    durationMs,
    ...(input.argumentSummary ?? {}),
    ...(input.errorMessage ? { error: input.errorMessage.slice(0, 240) } : {}),
  });

  const draft: AuditEventDraft = {
    workspaceId: input.context.workspaceId,
    userId: input.context.userId,
    agentIdentityId: input.context.agentIdentityId,
    mcpTokenId: input.context.mcpTokenId,
    action: input.toolName,
    targetType: input.targetType ?? inferred.targetType,
    targetId: input.targetId ?? inferred.targetId,
    correlationId,
    clientInfo: input.context.clientInfo,
    payload,
  };

  const row = await recordAuditEvent(draft);
  trackMcpAuditRecorded(input.outcome === "denied");
  return { event: row, correlationId, durationMs };
}
