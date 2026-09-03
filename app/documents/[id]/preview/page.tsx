import { auth } from "@/auth";
import { DocumentAccessDenied } from "@/components/document-access-denied";
import { DraftDocumentPreview } from "@/components/draft-document-preview";
import { getDocument } from "@/lib/db";
import { documentAccessContext } from "@/lib/access-context";
import { documentHasAnyShares, isPrivateOwnedDocument } from "@/lib/db/document-shares";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const document = await getDocument(id, { bypassOwnership: true });
  return { title: document ? `Prévia — ${document.title}` : "Prévia" };
}

export default async function DraftPreviewPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const ctx = await documentAccessContext(session?.user?.id);
  const exists = await getDocument(id, { bypassOwnership: true });
  if (!exists) notFound();

  const document = await getDocument(id, ctx);
  if (!document) {
    const isPrivate = await isPrivateOwnedDocument(exists.id);
    const hasShares = isPrivate ? await documentHasAnyShares(exists.id) : false;
    if (isPrivate || hasShares) {
      return <DocumentAccessDenied reason={session?.user?.id ? "forbidden" : "unauthenticated"} />;
    }
    notFound();
  }

  return <DraftDocumentPreview document={document} />;
}
