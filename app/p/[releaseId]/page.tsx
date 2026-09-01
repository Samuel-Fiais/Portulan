import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicDocumentView } from "@/components/public-document-view";
import { getDocumentRelease } from "@/lib/db";

type Props = { params: Promise<{ releaseId: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { releaseId } = await params;
  const release = await getDocumentRelease(releaseId);
  return {
    title: release?.title ?? "Documento",
    robots: { index: false, follow: false },
  };
}

export default async function PublicDocumentPage({ params }: Props) {
  const { releaseId } = await params;
  const release = await getDocumentRelease(releaseId);
  if (!release) notFound();
  return <PublicDocumentView release={release} />;
}
