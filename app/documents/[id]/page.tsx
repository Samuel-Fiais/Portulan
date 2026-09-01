import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocumentEditor } from "@/components/document-editor";
import { getDocument, listDocumentReleases } from "@/lib/db";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const document = getDocument(id);
  return { title: document?.title ?? "Documento" };
}

export default async function DocumentPage({ params }: Props) {
  const { id } = await params;
  const document = getDocument(id);
  if (!document) notFound();
  const releases = listDocumentReleases(document.id);
  return <DocumentEditor initialDocument={document} initialReleases={releases} />;
}
