import { auth } from "@/auth";
import { VesselDetail } from "@/components/vessel-detail";
import { getRepository, listProjects, listProjectsForRepository } from "@/lib/db";
import { resolveWorkspaceContext } from "@/lib/active-workspace";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EmbarcacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user!.id!;
  const { active } = await resolveWorkspaceContext(userId);
  if (!active) redirect("/");
  const repository = await getRepository(id, active.id);
  if (!repository) notFound();
  const [expeditions, projects] = await Promise.all([
    listProjectsForRepository(repository.id, active.id),
    listProjects(active.id),
  ]);
  return <VesselDetail repository={repository} expeditions={expeditions} projects={projects} />;
}
