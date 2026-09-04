import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import {
  DisabledBadge,
  StatusBadge,
  TemplateBadge,
} from "@/components/document-badges";
import type { DocumentSummary } from "@/lib/documents";
import { formatRelativeDate } from "@/lib/utils";

export function DocumentSummaryList({
  documents,
  emptyTitle = "Nenhum documento encontrado",
  emptyDescription = "Ajuste a busca ou crie um novo documento.",
}: {
  documents: DocumentSummary[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  return (
    <div className="document-list">
      {documents.map((document) => (
        <Link
          href={`/documents/${document.slug}`}
          key={document.id}
          className="document-row group"
        >
          <span
            className="document-accent"
            style={{
              background: `linear-gradient(180deg, ${document.primaryColor}, ${document.secondaryColor})`,
            }}
          />
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <TemplateBadge
                name={document.templateName}
                primaryColor={document.primaryColor}
                secondaryColor={document.secondaryColor}
              />
              <StatusBadge status={document.status} />
              {document.disabled ? <DisabledBadge /> : null}
            </div>
            <h3>{document.title}</h3>
            <p>{document.summary}</p>
            <div className="document-meta">
              <span>{document.team || "Sem time"}</span>
              <i />
              <span>{document.author || "Sem autor"}</span>
              <i />
              <span>v{document.version}</span>
              <i />
              <span>{formatRelativeDate(document.updatedAt)}</span>
            </div>
          </div>
          <ArrowRight className="mt-2 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
        </Link>
      ))}
      {documents.length === 0 && (
        <div className="empty-state">
          <Search />
          <h3>{emptyTitle}</h3>
          <p>{emptyDescription}</p>
        </div>
      )}
    </div>
  );
}
