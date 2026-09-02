import { auth } from "@/auth";
import { DraftDocumentPreview } from "@/components/draft-document-preview";
import { getDocument } from "@/lib/db";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const document = await getDocument(id, { bypassOwnership: true });
  return { title: document ? `Prévia — ${document.title}` : "Prévia" };
}

export default async function DraftPreviewPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const document = await getDocument(id, { userId: session!.user!.id! });
  if (!document) notFound();
  return <DraftDocumentPreview document={document} />;
}
