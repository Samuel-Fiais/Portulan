import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { PublicDocumentUnavailable } from "@/components/public-document-unavailable";
import { PublicDocumentView } from "@/components/public-document-view";
import { canEditDocument, getDocument, resolvePublicReleaseById } from "@/lib/db";
import { documentAccessContext } from "@/lib/access-context";

type Props = { params: Promise<{ releaseId: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { releaseId } = await params;
  const result = await resolvePublicReleaseById(releaseId);
  return {
    title: result.access === "ok" ? result.release.title : "Documento indisponível",
    robots: { index: false, follow: false },
  };
}

export default async function PublicDocumentPage({ params }: Props) {
  const { releaseId } = await params;
  const result = await resolvePublicReleaseById(releaseId);

  if (result.access === "not_found") notFound();
  if (result.access === "document_disabled") {
    return <PublicDocumentUnavailable reason="document_disabled" />;
  }
  if (result.access === "release_disabled") {
    return <PublicDocumentUnavailable reason="release_disabled" />;
  }

  if (result.access === "ok") {
    const session = await auth();
    const ctx = await documentAccessContext(session?.user?.id);
    const source = await getDocument(result.release.documentId, ctx);
    const persistable = source ? await canEditDocument(source, ctx) : false;
    return <PublicDocumentView release={result.release} persistable={persistable} />;
  }

  notFound();
}
