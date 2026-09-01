import { notFound } from "next/navigation";
import { ReportPreview } from "@/components/report-preview";
import { getDocument } from "@/lib/db";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function DocumentExportPage({ params }: Props) {
  const { id } = await params;
  const document = getDocument(id);
  if (!document) notFound();

  return (
    <main className="pdf-export-page">
      <ReportPreview document={document} />
    </main>
  );
}
