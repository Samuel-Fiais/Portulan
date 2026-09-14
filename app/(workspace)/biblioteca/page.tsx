import { auth } from "@/auth";
import { LibraryPanel } from "@/components/library-panel";
import { listDocuments, listTemplates } from "@/lib/db";
import { documentAccessContext, templateAccessContext } from "@/lib/access-context";
import { parseOwnershipFilter, parseStatusFilter } from "@/lib/library-filters";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Biblioteca" };

export default async function BibliotecaPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; ownership?: string }>;
}) {
  const session = await auth();
  const userId = session!.user!.id!;
  const ctx = await documentAccessContext(userId);
  const { status, ownership } = await searchParams;
  const documents = await listDocuments(undefined, ctx);

  return (
    <LibraryPanel
      documents={documents}
      templates={await listTemplates(await templateAccessContext(userId))}
      currentUserId={userId}
      initialStatusFilter={parseStatusFilter(status)}
      initialOwnershipFilter={parseOwnershipFilter(ownership)}
    />
  );
}
