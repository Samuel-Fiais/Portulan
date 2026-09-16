import { auth } from "@/auth";
import { IntegrationsPanel } from "@/components/integrations-panel";
import { listAgentIdentities, listAuditEvents, listMcpTokens } from "@/lib/db";
import { getPortulanSkillMarkdown } from "@/lib/skill";
import { resolveWorkspaceContext } from "@/lib/active-workspace";
import { getUserById } from "@/lib/users";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Instrumentos" };

export default async function IntegrationsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const { active } = await resolveWorkspaceContext(userId);
  const user = await getUserById(userId);
  const identities = active ? await listAgentIdentities(active.id) : [];
  const events = active ? await listAuditEvents(active.id, 40) : [];
  const ownerIds = new Set([
    ...identities.map((identity) => identity.ownerUserId),
    ...events.map((event) => event.userId),
  ]);
  const ownerNames: Record<string, string> = {};
  await Promise.all(
    [...ownerIds].map(async (id) => {
      const owner = await getUserById(id);
      ownerNames[id] = owner?.name?.trim() || owner?.login || "Tripulante";
    }),
  );

  return (
    <IntegrationsPanel
      mcpTokens={await listMcpTokens(userId)}
      skillMarkdown={getPortulanSkillMarkdown()}
      identities={identities}
      auditEvents={events}
      ownerName={user?.name?.trim() || user?.login || "Você"}
      ownerNames={ownerNames}
      currentUserId={userId}
    />
  );
}
