import { auth } from "@/auth";
import { IntegrationsPanel } from "@/components/integrations-panel";
import { listMcpTokens } from "@/lib/db";
import { getPortulanSkillMarkdown } from "@/lib/skill";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Instrumentos" };

export default async function IntegrationsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  return (
    <IntegrationsPanel
      mcpTokens={await listMcpTokens(userId)}
      skillMarkdown={getPortulanSkillMarkdown()}
    />
  );
}
