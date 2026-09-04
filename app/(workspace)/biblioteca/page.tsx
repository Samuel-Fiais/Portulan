import { auth } from "@/auth";
import { LibraryPanel } from "@/components/library-panel";
import { listDocuments, listTemplates } from "@/lib/db";
import { documentAccessContext } from "@/lib/access-context";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Biblioteca" };

export default async function BibliotecaPage() {
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
    <LibraryPanel
      documents={documents}
      templates={await listTemplates(userId)}
    />
  );
}
