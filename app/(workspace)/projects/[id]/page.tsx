import { auth } from "@/auth";
import { ExpeditionDetail } from "@/components/expedition-detail";
import { getProject, listContextPacks, listProjectRepositories, listRepositories } from "@/lib/db";
import { resolveWorkspaceContext } from "@/lib/active-workspace";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ExpeditionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user!.id!;
  const { active } = await resolveWorkspaceContext(userId);
  if (!active) redirect("/");
  const project = await getProject(id, active.id);
  if (!project) notFound();
  const [links, repositories, packs] = await Promise.all([
    listProjectRepositories(project.id, active.id),
    listRepositories(active.id),
    listContextPacks(active.id, project.id),
  ]);
  return (
    <ExpeditionDetail project={project} links={links} repositories={repositories} packs={packs} />
  );
}
