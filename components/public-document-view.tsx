import { PublicDocumentShell } from "@/components/public-document-shell";
import { ReportPreview } from "@/components/report-preview";
import { releaseToDocumentRecord, type DocumentRelease } from "@/lib/documents";

export function PublicDocumentView({ release }: { release: DocumentRelease }) {
  const document = releaseToDocumentRecord(release);

  return (
    <PublicDocumentShell>
      <ReportPreview
        document={document}
        publicView
        interactive
        documentKey={release.id}
        publishedBy={release.publishedByLogin ?? release.publishedByName}
      />
    </PublicDocumentShell>
  );
}
