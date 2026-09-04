import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { PublicDocumentUnavailable } from "@/components/public-document-unavailable";
import { PublicDocumentView } from "@/components/public-document-view";
import { canEditDocument, getDocument, resolvePublicLatestReleaseBySlug } from "@/lib/db";
import { documentAccessContext } from "@/lib/access-context";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await resolvePublicLatestReleaseBySlug(slug);
  return {
    title: result.access === "ok" ? result.release.title : "Documento indisponível",
    robots: { index: false, follow: false },
  };
}

export default async function LatestDocumentPage({ params }: Props) {
  const { slug } = await params;
  const result = await resolvePublicLatestReleaseBySlug(slug);

  if (result.access === "not_found") notFound();
  if (result.access === "document_disabled") {
    return <PublicDocumentUnavailable reason="document_disabled" />;
  }
  if (result.access === "no_enabled_release") {
    return <PublicDocumentUnavailable reason="no_enabled_release" />;
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
