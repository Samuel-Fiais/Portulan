import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicDocumentUnavailable } from "@/components/public-document-unavailable";
import { PublicDocumentView } from "@/components/public-document-view";
import { resolvePublicReleaseById } from "@/lib/db";

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
    return <PublicDocumentView release={result.release} />;
  }

  notFound();
}
