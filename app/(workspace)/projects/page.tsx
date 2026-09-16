import { auth } from "@/auth";
import { ExpeditionsPanel } from "@/components/expeditions-panel";
import { listContextPacks, listProjects } from "@/lib/db";
import { resolveWorkspaceContext } from "@/lib/active-workspace";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Expedições" };

export default async function ExpeditionsPage() {
  const session = await auth();
  const userId = session!.user!.id!;
  const { active } = await resolveWorkspaceContext(userId);
  if (!active) redirect("/");
  const [projects, packs] = await Promise.all([
    listProjects(active.id),
    listContextPacks(active.id),
  ]);
  const packCounts: Record<string, number> = {};
  for (const pack of packs) {
    packCounts[pack.projectId] = (packCounts[pack.projectId] ?? 0) + 1;
  }
  return <ExpeditionsPanel projects={projects} packCounts={packCounts} />;
}
