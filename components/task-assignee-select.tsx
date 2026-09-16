"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { assignImplementationTaskAction } from "@/app/dev-context-actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { WorkspaceRosterEntry } from "@/lib/workspace-roster";

export function TaskAssigneeSelect({
  taskId,
  assigneeUserId,
  assigneeAgentIdentityId,
  roster,
  compact = false,
}: {
  taskId: string;
  assigneeUserId: string | null;
  assigneeAgentIdentityId: string | null;
  roster: WorkspaceRosterEntry[];
  compact?: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const value = assigneeAgentIdentityId
    ? `agent:${assigneeAgentIdentityId}`
    : assigneeUserId
      ? `human:${assigneeUserId}`
      : "none";
  const label = rosterLabel(roster, assigneeUserId, assigneeAgentIdentityId);

  return (
    <Select
      value={value}
      disabled={pending}
      onValueChange={(next) => {
        start(async () => {
          const assigneeUserIdValue = next.startsWith("human:") ? next.slice(6) : null;
          const assigneeAgentIdentityIdValue = next.startsWith("agent:") ? next.slice(6) : null;
          const result = await assignImplementationTaskAction(taskId, {
            assigneeUserId: assigneeUserIdValue,
            assigneeAgentIdentityId: assigneeAgentIdentityIdValue,
          });
          if (!result.ok) toast.error(result.error);
          else {
            toast.success("Responsável atualizado");
            router.refresh();
          }
        });
      }}
    >
      <SelectTrigger
        className={cn("board-assignee", compact && "board-assignee--compact")}
        size={compact ? "sm" : "default"}
        aria-label="Delegar"
      >
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Sem responsável</SelectItem>
        {roster.map((entry) =>
          entry.kind === "human" ? (
            <SelectItem key={entry.member.userId} value={`human:${entry.member.userId}`}>
              {entry.member.name?.trim() || entry.member.login || "Tripulante"}
            </SelectItem>
          ) : (
            <SelectItem key={entry.agent.id} value={`agent:${entry.agent.id}`}>
              {entry.agent.name}
            </SelectItem>
          ),
        )}
      </SelectContent>
    </Select>
  );
}

export function rosterLabel(
  roster: WorkspaceRosterEntry[],
  userId: string | null,
  agentId: string | null,
) {
  if (agentId) {
    const agent = roster.find((entry) => entry.kind === "agent" && entry.agent.id === agentId);
    return agent?.kind === "agent" ? agent.agent.name : "Agente";
  }
  if (userId) {
    const human = roster.find((entry) => entry.kind === "human" && entry.member.userId === userId);
    return human?.kind === "human"
      ? human.member.name?.trim() || human.member.login || "Tripulante"
      : "Tripulante";
  }
  return "Sem responsável";
}
