import { headers } from "next/headers";
import { auth } from "@/auth";
import { WorkspacePanel } from "@/components/workspace-panel";
import { countWorkspaceDocuments, listAgentIdentities, listWorkspaceInvites, listWorkspaceMembers } from "@/lib/db";
import { requireWorkspaceContext } from "@/lib/active-workspace";
import { canManageCrew } from "@/lib/workspace-policy";
import { buildWorkspaceRoster } from "@/lib/workspace-roster";
import { getUserById } from "@/lib/users";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Porto" };

export default async function PortoPage() {
  const session = await auth();
  const userId = session!.user!.id!;
  const { active, workspaces } = await requireWorkspaceContext(userId);

  const [members, agents, invites, documentCount, headerList] = await Promise.all([
    listWorkspaceMembers(active.id),
    listAgentIdentities(active.id),
    canManageCrew(active.role) ? listWorkspaceInvites(active.id) : Promise.resolve([]),
    countWorkspaceDocuments(active.id),
    headers(),
  ]);

  const ownerIds = [...new Set(agents.map((agent) => agent.ownerUserId))];
  const ownerNames: Record<string, string> = {};
  await Promise.all(
    ownerIds.map(async (id) => {
      const owner = await getUserById(id);
      ownerNames[id] = owner?.name?.trim() || owner?.login || "Tripulante";
    }),
  );
  const roster = buildWorkspaceRoster({ members, agents, ownerNames });

  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const protocol = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return (
    <WorkspacePanel
      workspace={active}
      roster={roster}
      invites={invites}
      currentUserId={userId}
      documentCount={documentCount}
      workspaceCount={workspaces.length}
      origin={host ? `${protocol}://${host}` : ""}
    />
  );
}
