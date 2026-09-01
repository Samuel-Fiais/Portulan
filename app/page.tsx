import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/components/dashboard";
import { getDocumentStats, listDocuments } from "@/lib/db";
import { getPortulanSkillMarkdown } from "@/lib/skill";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  const ctx = { userId: session?.user?.id ?? null };
  const documents = (await listDocuments(undefined, ctx)).map(({ content, ...document }) => {
    void content;
    return document;
  });

  return (
    <AppShell>
      <Dashboard
        documents={documents}
        stats={await getDocumentStats(ctx)}
        skillMarkdown={getPortulanSkillMarkdown()}
        isLoggedIn={Boolean(session?.user?.id)}
      />
    </AppShell>
  );
}
