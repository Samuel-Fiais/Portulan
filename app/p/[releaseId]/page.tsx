import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { DocumentAccessDenied } from "@/components/document-access-denied";
import { PublicDocumentUnavailable } from "@/components/public-document-unavailable";
import { PublicDocumentView } from "@/components/public-document-view";
import { canEditDocument, getDocument, resolvePublicReleaseById } from "@/lib/db";
import { documentAccessContext } from "@/lib/access-context";
import type { PublicReleaseResult } from "@/lib/documents";

type Props = { params: Promise<{ releaseId: string }> };

export const dynamic = "force-dynamic";

function publishedDocumentTitle(result: PublicReleaseResult) {
  return result.access === "ok" ? result.release.title : "Carta indisponível";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { releaseId } = await params;
  const session = await auth();
  const ctx = await documentAccessContext(session?.user?.id);
  const result = await resolvePublicReleaseById(releaseId, ctx);
  return {
    title: publishedDocumentTitle(result),
    robots: { index: false, follow: false },
  };
}

export default async function PublicDocumentPage({ params }: Props) {
  const { releaseId } = await params;
  const session = await auth();
  const ctx = await documentAccessContext(session?.user?.id);
  const result = await resolvePublicReleaseById(releaseId, ctx);

  if (result.access === "not_found") notFound();
  if (result.access === "login_required") {
    return <DocumentAccessDenied reason="unauthenticated" callbackUrl={`/p/${releaseId}`} />;
  }
  if (result.access === "forbidden") {
    return <DocumentAccessDenied reason="forbidden" />;
  }
  if (result.access === "document_disabled") {
    return <PublicDocumentUnavailable reason="document_disabled" />;
  }
  if (result.access === "release_disabled") {
    return <PublicDocumentUnavailable reason="release_disabled" />;
  }

  if (result.access === "ok") {
    const source = await getDocument(result.release.documentId, ctx);
    const persistable = source ? await canEditDocument(source, ctx) : false;
    return <PublicDocumentView release={result.release} persistable={persistable} />;
  }

  notFound();
}
