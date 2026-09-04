import { auth } from "@/auth";
import { WorkspaceSidebar } from "@/components/workspace-sidebar";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <WorkspaceSidebar session={session}>{children}</WorkspaceSidebar>
  );
}
