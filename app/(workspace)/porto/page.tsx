import { headers } from "next/headers";
import { auth } from "@/auth";
import { WorkspacePanel } from "@/components/workspace-panel";
import { countWorkspaceDocuments, listWorkspaceInvites, listWorkspaceMembers } from "@/lib/db";
import { requireWorkspaceContext } from "@/lib/active-workspace";
import { canManageCrew } from "@/lib/workspace-policy";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Porto" };

export default async function PortoPage() {
  const session = await auth();
  const userId = session!.user!.id!;
  const { active, workspaces } = await requireWorkspaceContext(userId);

  const [members, invites, documentCount, headerList] = await Promise.all([
    listWorkspaceMembers(active.id),
    canManageCrew(active.role) ? listWorkspaceInvites(active.id) : Promise.resolve([]),
    countWorkspaceDocuments(active.id),
    headers(),
  ]);

  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "";
  const protocol = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return (
    <WorkspacePanel
      workspace={active}
      members={members}
      invites={invites}
      currentUserId={userId}
      documentCount={documentCount}
      workspaceCount={workspaces.length}
      origin={host ? `${protocol}://${host}` : ""}
    />
  );
}
