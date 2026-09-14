import { auth } from "@/auth";
import { WorkspaceSidebar } from "@/components/workspace-sidebar";
import { resolveWorkspaceContext } from "@/lib/active-workspace";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const { active, workspaces } = await resolveWorkspaceContext(session?.user?.id);

  return (
    <WorkspaceSidebar session={session} workspaces={workspaces} activeWorkspaceId={active?.id ?? null}>
      {children}
    </WorkspaceSidebar>
  );
}
