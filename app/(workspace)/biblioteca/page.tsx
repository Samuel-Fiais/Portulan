import { auth } from "@/auth";
import { LibraryPanel } from "@/components/library-panel";
import { listDocuments, listTemplates } from "@/lib/db";
import { documentAccessContext } from "@/lib/access-context";
import { parseStatusFilter } from "@/lib/library-filters";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Biblioteca" };

export default async function BibliotecaPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  const userId = session!.user!.id!;
  const ctx = await documentAccessContext(userId);
  const { status } = await searchParams;
  const documents = await listDocuments(undefined, ctx);

  return (
    <LibraryPanel
      documents={documents}
      templates={await listTemplates(userId)}
      initialStatusFilter={parseStatusFilter(status)}
    />
  );
}
