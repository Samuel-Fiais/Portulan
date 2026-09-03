import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicDocumentUnavailable } from "@/components/public-document-unavailable";
import { PublicDocumentView } from "@/components/public-document-view";
import { resolvePublicLatestReleaseBySlug } from "@/lib/db";

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
    return <PublicDocumentView release={result.release} />;
  }

  notFound();
}
