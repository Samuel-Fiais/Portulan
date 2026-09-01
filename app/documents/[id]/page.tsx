import { auth } from "@/auth";
import { canMutateDocument, getDocument, listDocumentReleases } from "@/lib/db";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocumentEditor } from "@/components/document-editor";

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
  const ctx = { userId: session!.user!.id! };
  const document = await getDocument(id, ctx);
  if (!document) notFound();
  const releases = await listDocumentReleases(document.id);
  const canEdit = canMutateDocument(document, ctx);

  return <DocumentEditor initialDocument={document} initialReleases={releases} canEdit={canEdit} />;
}
