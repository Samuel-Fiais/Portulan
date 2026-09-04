import { PublicDocumentShell } from "@/components/public-document-shell";
import { ReportPreview } from "@/components/report-preview";
import type { DocumentRecord } from "@/lib/documents";

export function DraftDocumentPreview({ document }: { document: DocumentRecord }) {
  return (
    <PublicDocumentShell notice="Prévia do rascunho · não publicada">
      <ReportPreview document={document} publicView interactive />
    </PublicDocumentShell>
  );
}
