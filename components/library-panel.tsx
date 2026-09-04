"use client";

import { useMemo, useState } from "react";
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
import type { DocumentSummary, TemplateRecord } from "@/lib/documents";

export function LibraryPanel({
  documents,
  templates,
}: {
  documents: DocumentSummary[];
  templates: TemplateRecord[];
}) {
  const [query, setQuery] = useState("");
  const [templateFilter, setTemplateFilter] = useState("all");
  const filtered = useMemo(
    () =>
      documents.filter((document) => {
        const matchesTemplate =
          templateFilter === "all" || document.templateId === templateFilter;
        const haystack =
          `${document.title} ${document.summary} ${document.tags.join(" ")}`.toLowerCase();
        return matchesTemplate && haystack.includes(query.toLowerCase());
      }),
    [documents, query, templateFilter],
  );

  return (
    <main className="page-wrap dashboard-main">
      <section className="doc-section">
        <div className="page-heading">
          <div>
            <h1 className="fp-h1">Biblioteca</h1>
            <p className="fp-lead">
              Documentos seus e compartilhados com você. Busque por título,
              tema ou tag.
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
              placeholder="Buscar por título, tema ou tag…"
              className="pl-9"
            />
          </div>
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
        <div className="section-header">
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
