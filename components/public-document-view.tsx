import { ReportPreview } from "@/components/report-preview";
import { releaseToDocumentRecord, type DocumentRelease } from "@/lib/documents";

export function PublicDocumentView({ release }: { release: DocumentRelease }) {
  const document = releaseToDocumentRecord(release);

  return (
    <div className="public-document-shell">
      <main className="public-document-main">
        <ReportPreview document={document} publicView interactive documentKey={release.id} />
      </main>
    </div>
  );
}
