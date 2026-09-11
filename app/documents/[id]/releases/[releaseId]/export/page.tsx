import { auth } from "@/auth";
import { ReportPreview } from "@/components/report-preview";
import { getDocument, getDocumentRelease } from "@/lib/db";
import { documentAccessContext } from "@/lib/access-context";
import { releaseToDocumentRecord } from "@/lib/documents";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string; releaseId: string }> };

export const dynamic = "force-dynamic";

export default async function DocumentReleaseExportPage({ params }: Props) {
  const { id, releaseId } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const ctx = await documentAccessContext(session.user.id);
  const document = await getDocument(id, ctx);
  if (!document) notFound();

  const release = await getDocumentRelease(releaseId);
  if (!release || release.documentId !== document.id) notFound();

  const snapshot = {
    ...releaseToDocumentRecord(release),
    slug: document.slug,
  };

  return (
    <main className="pdf-export-page">
      <ReportPreview
        document={snapshot}
        exportMode
        releaseId={release.id}
        publishedBy={release.publishedByLogin ?? release.publishedByName}
      />
    </main>
  );
}
