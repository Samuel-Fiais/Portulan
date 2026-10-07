import type { WorkspaceMemberRecord } from "@/lib/workspaces";

export type WorkspaceHumanRosterEntry = {
  kind: "human";
  member: WorkspaceMemberRecord;
};

export type WorkspaceRosterEntry = WorkspaceHumanRosterEntry;

export function buildWorkspaceRoster(members: WorkspaceMemberRecord[]): WorkspaceRosterEntry[] {
  return members.map((member) => ({
    kind: "human",
    member,
  }));
}

export function workspaceRosterStats(roster: WorkspaceRosterEntry[]) {
  const humanCount = roster.length;
  return { humanCount, total: humanCount };
}

export function workspaceRosterNote(stats: ReturnType<typeof workspaceRosterStats>) {
  return stats.humanCount === 1 ? "tripulante" : "tripulantes";
}
