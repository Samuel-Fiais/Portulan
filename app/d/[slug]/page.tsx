import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicDocumentView } from "@/components/public-document-view";
import { getLatestDocumentReleaseBySlug } from "@/lib/db";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const release = await getLatestDocumentReleaseBySlug(slug);
  return {
    title: release?.title ?? "Documento",
    robots: { index: false, follow: false },
  };
}

export default async function LatestDocumentPage({ params }: Props) {
  const { slug } = await params;
  const release = await getLatestDocumentReleaseBySlug(slug);
  if (!release) notFound();
  return <PublicDocumentView release={release} />;
}
