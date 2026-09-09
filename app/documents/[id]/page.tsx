import { auth } from "@/auth";
import { DocumentAccessDenied } from "@/components/document-access-denied";
import { DocumentEditor } from "@/components/document-editor";
import {
  canEditDocument,
  getDocument,
  isDocumentOwner,
  listDocumentCollaborators,
  listDocumentReleases,
  listTemplates,
} from "@/lib/db";
import { documentAccessContext } from "@/lib/access-context";
import { documentHasAnyShares, isPrivateOwnedDocument } from "@/lib/db/document-shares";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const document = await getDocument(id, { bypassOwnership: true });
  return { title: document?.title ?? "Documento" };
}

export default async function DocumentPage({ params }: Props) {
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

  const releases = await listDocumentReleases(document.id);
  const canEdit = await canEditDocument(document, ctx);
  const isOwner = isDocumentOwner(document, ctx);
  const collaborators = await listDocumentCollaborators(document.id, document.userId);
  const templates = canEdit && ctx.userId ? await listTemplates(ctx.userId) : [];

  return (
    <DocumentEditor
      initialDocument={document}
      initialReleases={releases}
      templates={templates}
      canEdit={canEdit}
      isOwner={isOwner}
      collaborators={collaborators}
      currentUserId={session?.user?.id ?? null}
    />
  );
}
