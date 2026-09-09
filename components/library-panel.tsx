"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { DocumentSummaryList } from "@/components/document-summary-list";
import { NewDocumentDialog } from "@/components/new-document-dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { documentMatchesSearchQuery } from "@/lib/document-search";
import {
  documentStatuses,
  statusMeta,
  type DocumentLibraryItem,
  type TemplateRecord,
} from "@/lib/documents";
import {
  filterDocumentsByStatus,
  type StatusFilter,
} from "@/lib/library-filters";

export function LibraryPanel({
  documents,
  templates,
  initialStatusFilter = "all",
}: {
  documents: DocumentLibraryItem[];
  templates: TemplateRecord[];
  initialStatusFilter?: StatusFilter;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatusFilter);

  useEffect(() => {
    setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);

  function updateStatusFilter(value: StatusFilter) {
    setStatusFilter(value);
    const params = new URLSearchParams();
    if (value !== "all") params.set("status", value);
    router.replace(params.size ? `${pathname}?${params.toString()}` : pathname);
  }

  const filtered = useMemo(
    () =>
      filterDocumentsByStatus(documents, statusFilter).filter((document) => {
        const matchesTemplate =
          templateFilter === "all" || document.templateId === templateFilter;
        return (
          matchesTemplate && documentMatchesSearchQuery(document, query)
        );
      }),
    [documents, query, statusFilter, templateFilter],
  );

  return (
    <main className="page-wrap dashboard-main">
      <section className="doc-section">
        <div className="page-heading split-row">
          <div className="split-row__main">
            <h1 className="fp-h1">Biblioteca</h1>
            <p className="fp-lead">
              Documentos seus e compartilhados com você. Busque por título,
              tema, tag ou conteúdo.
            </p>
          </div>
          <NewDocumentDialog templates={templates} />
        </div>
        <div className="filter-bar">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por título, tema, tag ou conteúdo…"
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={updateStatusFilter}>
            <SelectTrigger
              className="template-filter-select"
              aria-label="Filtrar por status"
            >
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {documentStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusMeta[status].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={templateFilter} onValueChange={setTemplateFilter}>
            <SelectTrigger
              className="template-filter-select"
              aria-label="Filtrar por template"
            >
              <SelectValue placeholder="Todos os templates" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os templates</SelectItem>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="section-header split-row">
          <h2 className="section-title">Documentos</h2>
          <span className="section-desc">
            {filtered.length} documento{filtered.length === 1 ? "" : "s"}
          </span>
        </div>
        <DocumentSummaryList documents={filtered} />
      </section>
    </main>
  );
}
