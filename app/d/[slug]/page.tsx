import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { DocumentAccessDenied } from "@/components/document-access-denied";
import { PublicDocumentUnavailable } from "@/components/public-document-unavailable";
import { PublicDocumentView } from "@/components/public-document-view";
import { canEditDocument, getDocument, resolvePublicLatestReleaseBySlug } from "@/lib/db";
import { documentAccessContext } from "@/lib/access-context";
import type { PublicReleaseResult } from "@/lib/documents";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

function publishedDocumentTitle(result: PublicReleaseResult) {
  return result.access === "ok" ? result.release.title : "Documento indisponível";
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const session = await auth();
  const ctx = await documentAccessContext(session?.user?.id);
  const result = await resolvePublicLatestReleaseBySlug(slug, ctx);
  return {
    title: publishedDocumentTitle(result),
    robots: { index: false, follow: false },
  };
}

export default async function LatestDocumentPage({ params }: Props) {
  const { slug } = await params;
  const session = await auth();
  const ctx = await documentAccessContext(session?.user?.id);
  const result = await resolvePublicLatestReleaseBySlug(slug, ctx);

  if (result.access === "not_found") notFound();
  if (result.access === "login_required") {
    return <DocumentAccessDenied reason="unauthenticated" callbackUrl={`/d/${slug}`} />;
  }
  if (result.access === "forbidden") {
    return <DocumentAccessDenied reason="forbidden" />;
  }
  if (result.access === "document_disabled") {
    return <PublicDocumentUnavailable reason="document_disabled" />;
  }
  if (result.access === "no_enabled_release") {
    return <PublicDocumentUnavailable reason="no_enabled_release" />;
  }

  if (result.access === "ok") {
    const source = await getDocument(result.release.documentId, ctx);
    const persistable = source ? await canEditDocument(source, ctx) : false;
    return <PublicDocumentView release={result.release} persistable={persistable} />;
  }

  notFound();
}
