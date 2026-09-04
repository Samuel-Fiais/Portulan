import { auth } from "@/auth";
import { HomeDashboard } from "@/components/home-dashboard";
import { getDocumentStats, listDocuments, listTemplates } from "@/lib/db";
import { documentAccessContext } from "@/lib/access-context";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;
  const ctx = await documentAccessContext(userId);
  const documents = (await listDocuments(undefined, ctx)).map(
    ({ content, ...document }) => {
      void content;
      return document;
    },
  );

  return (
    <HomeDashboard
      documents={documents}
      stats={await getDocumentStats(ctx)}
      templates={await listTemplates(userId)}
    />
  );
}
