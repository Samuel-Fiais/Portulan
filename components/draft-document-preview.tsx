import { ReportPreview } from "@/components/report-preview";
import type { DocumentRecord } from "@/lib/documents";

export function DraftDocumentPreview({ document }: { document: DocumentRecord }) {
  return (
    <div className="public-document-shell">
      <div className="draft-preview-notice">Prévia do rascunho · não publicada</div>
      <main className="public-document-main">
        <ReportPreview document={document} publicView interactive />
      </main>
    </div>
  );
}
