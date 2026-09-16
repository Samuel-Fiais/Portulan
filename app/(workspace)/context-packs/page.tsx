import { auth } from "@/auth";
import { RumosPanel } from "@/components/rumos-panel";
import { listContextPacks } from "@/lib/db";
import { resolveWorkspaceContext } from "@/lib/active-workspace";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Rumos" };

export default async function RumosPage() {
  const session = await auth();
  const userId = session!.user!.id!;
  const { active } = await resolveWorkspaceContext(userId);
  if (!active) redirect("/");
  return <RumosPanel packs={await listContextPacks(active.id)} />;
}
