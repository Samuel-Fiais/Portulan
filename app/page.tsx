import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/components/dashboard";
import { getDocumentStats, listDocuments, listMcpTokens, listTemplates } from "@/lib/db";
import { documentAccessContext } from "@/lib/access-context";
import { getPortulanSkillMarkdown } from "@/lib/skill";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  const userId = session!.user!.id!;
  const ctx = await documentAccessContext(userId);
  const documents = (await listDocuments(undefined, ctx)).map(({ content, ...document }) => {
    void content;
    return document;
  });

  return (
    <AppShell>
      <Dashboard
        documents={documents}
        stats={await getDocumentStats(ctx)}
        templates={await listTemplates(userId)}
        mcpTokens={await listMcpTokens(userId)}
        skillMarkdown={getPortulanSkillMarkdown()}
      />
    </AppShell>
  );
}
