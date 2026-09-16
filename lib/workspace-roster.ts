import type { AgentIdentityRecord } from "@/lib/db/agent-identities";
import type { WorkspaceMemberRecord } from "@/lib/workspaces";

export const workspaceRosterKinds = ["human", "agent"] as const;
export type WorkspaceRosterKind = (typeof workspaceRosterKinds)[number];

export type WorkspaceHumanRosterEntry = {
  kind: "human";
  member: WorkspaceMemberRecord;
};

export type WorkspaceAgentRosterEntry = {
  kind: "agent";
  agent: AgentIdentityRecord;
  ownerName: string;
};

export type WorkspaceRosterEntry = WorkspaceHumanRosterEntry | WorkspaceAgentRosterEntry;

export function buildWorkspaceRoster(input: {
  members: WorkspaceMemberRecord[];
  agents: AgentIdentityRecord[];
  ownerNames: Record<string, string>;
}): WorkspaceRosterEntry[] {
  const humans: WorkspaceHumanRosterEntry[] = input.members.map((member) => ({
    kind: "human",
    member,
  }));
  const agents: WorkspaceAgentRosterEntry[] = input.agents.map((agent) => ({
    kind: "agent",
    agent,
    ownerName: input.ownerNames[agent.ownerUserId] ?? "Tripulante",
  }));
  return [...humans, ...agents];
}

export function workspaceRosterStats(roster: WorkspaceRosterEntry[]) {
  const humanCount = roster.filter((entry) => entry.kind === "human").length;
  const agentCount = roster.filter((entry) => entry.kind === "agent").length;
  const activeAgentCount = roster.filter(
    (entry) => entry.kind === "agent" && entry.agent.status === "active",
  ).length;
  return { humanCount, agentCount, activeAgentCount, total: humanCount + agentCount };
}

export function workspaceRosterNote(stats: ReturnType<typeof workspaceRosterStats>) {
  if (stats.agentCount === 0) {
    return stats.humanCount === 1 ? "tripulante" : "tripulantes";
  }
  const humanPart =
    stats.humanCount === 1 ? "1 humano" : `${stats.humanCount} humanos`;
  const agentPart =
    stats.agentCount === 1 ? "1 agente" : `${stats.agentCount} agentes`;
  return `${humanPart} · ${agentPart}`;
}
