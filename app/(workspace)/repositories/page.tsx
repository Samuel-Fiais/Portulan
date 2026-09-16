import { auth } from "@/auth";
import { VesselsPanel } from "@/components/vessels-panel";
import { listRepositories } from "@/lib/db";
import { resolveWorkspaceContext } from "@/lib/active-workspace";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Embarcações" };

export default async function EmbarcacoesPage() {
  const session = await auth();
  const userId = session!.user!.id!;
  const { active } = await resolveWorkspaceContext(userId);
  if (!active) redirect("/");
  return <VesselsPanel repositories={await listRepositories(active.id)} />;
}
