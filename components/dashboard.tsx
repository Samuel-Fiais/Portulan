"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Bot, Copy, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { NewDocumentDialog } from "@/components/new-document-dialog";
import { StatusBadge, TypeBadge } from "@/components/document-badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { templates, typeMeta, type DocumentRecord, type DocumentType } from "@/lib/documents";
import { formatRelativeDate } from "@/lib/utils";

type Stats = { total: number; published: number; review: number; draft: number };
type DocumentSummary = Omit<DocumentRecord, "content">;

export function Dashboard({
  documents,
  stats,
  skillMarkdown,
}: {
  documents: DocumentSummary[];
  stats: Stats;
  skillMarkdown: string;
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const filtered = useMemo(() => documents.filter((document) => {
    const matchesType = type === "all" || document.type === type;
    const haystack = `${document.title} ${document.summary} ${document.tags.join(" ")}`.toLowerCase();
    return matchesType && haystack.includes(query.toLowerCase());
  }), [documents, query, type]);

  return (
    <AppShell>
      <main className="page-wrap dashboard-main">
        <section className="doc-section hero-section">
        <div className="page-heading">
          <div>
            <span className="eyebrow">Portulan · Knowledge base</span>
            <h1 className="fp-h1">Documentos que sustentam <span>decisões.</span></h1>
            <p className="fp-lead">Crie, revise e publique relatórios técnicos em um sistema visual consistente — por pessoas ou agentes.</p>
          </div>
          <NewDocumentDialog />
        </div>

        <div className="fp-stat-grid dashboard-stats" aria-label="Resumo da biblioteca">
          <StatCard label="Documentos" value={stats.total} note="na biblioteca" />
          <StatCard label="Publicados" value={stats.published} note="prontos para consulta" />
          <StatCard label="Em revisão" value={stats.review} note="aguardando validação" />
          <StatCard label="Rascunhos" value={stats.draft} note="em construção" />
        </div>
        </section>

        <section id="documents" className="doc-section">
          <div className="section-header">
            <span className="section-index">01</span><h2 className="section-title">Biblioteca</h2>
            <span className="section-desc">{filtered.length} documento{filtered.length === 1 ? "" : "s"}</span>
          </div>
          <div className="filter-bar">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por título, tema ou tag…" className="pl-9" />
            </div>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {(Object.keys(typeMeta) as DocumentType[]).map((item) => <SelectItem key={item} value={item}>{typeMeta[item].short}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="document-list">
            {filtered.map((document) => (
              <Link href={`/documents/${document.id}`} key={document.id} className="document-row group">
                <span className={`document-accent type-${document.type}`} />
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2"><TypeBadge type={document.type} /><StatusBadge status={document.status} /></div>
                  <h3>{document.title}</h3>
                  <p>{document.summary}</p>
                  <div className="document-meta">
                    <span>{document.team || "Sem time"}</span><i />
                    <span>{document.author || "Sem autor"}</span><i />
                    <span>v{document.version}</span><i />
                    <span>{formatRelativeDate(document.updatedAt)}</span>
                  </div>
                </div>
                <ArrowRight className="mt-2 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </Link>
            ))}
            {filtered.length === 0 && (
              <div className="empty-state"><Search /><h3>Nenhum documento encontrado</h3><p>Ajuste a busca ou crie um novo documento.</p></div>
            )}
          </div>
        </section>

        <section id="templates" className="doc-section">
          <div className="section-header"><span className="section-index">02</span><h2 className="section-title">Templates editoriais</h2><span className="section-desc">Estruturas prontas</span></div>
          <div className="fp-card-grid template-grid">
            {(Object.keys(templates) as DocumentType[]).map((item, index) => (
              <div key={item} className="fp-card template-card">
                  <div className={`template-index type-${item}`}>0{index + 1}</div>
                  <h3>{typeMeta[item].label}</h3>
                  <p>{templates[item].summary}</p>
                  <div className="mt-5 flex flex-wrap gap-1.5">{templates[item].tags.map((tag) => <span key={tag} className="mini-tag">{tag}</span>)}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="integrations" className="doc-section">
          <div className="section-header"><span className="section-index">03</span><h2 className="section-title">Agentes e integrações</h2><span className="section-desc">MCP Streamable HTTP</span></div>
          <div className="integration-panel">
            <div className="integration-icon"><Bot /></div>
            <div className="flex-1">
              <span className="eyebrow">Endpoint ativo no projeto</span>
              <h3>Uma biblioteca que agentes também conseguem manter.</h3>
              <p>Conecte qualquer cliente MCP ao endpoint abaixo para listar, ler, criar, editar e excluir documentos usando a mesma base SQLite.</p>
              <code>http://localhost:3000/api/mcp</code>
            </div>
            <div className="tool-list"><span>list_documents</span><span>get_document</span><span>create_document</span><span>update_document</span><span>publish_document</span><span>list_document_releases</span><span>delete_document</span></div>
          </div>
          <IntegrationSkillCopy skillMarkdown={skillMarkdown} />
        </section>
      </main>
    </AppShell>
  );
}

function StatCard({ label, value, note }: { label: string; value: number; note: string }) {
  return <div className="fp-stat"><div className="stat-label">{label}</div><div className="stat-value">{value.toString().padStart(2, "0")}</div><div className="stat-delta delta-up">{note}</div></div>;
}

function IntegrationSkillCopy({ skillMarkdown }: { skillMarkdown: string }) {
  async function copySkill() {
    if (!skillMarkdown.trim()) {
      toast.error("Skill não encontrada", { description: "Arquivo .cursor/skills/portulan-mcp/SKILL.md ausente no projeto." });
      return;
    }
    try {
      await navigator.clipboard.writeText(skillMarkdown);
      toast.success("Skill copiada", { description: "Cole em ~/.cursor/skills/ ou no skill do seu agente." });
    } catch {
      toast.message("Copie manualmente", { description: "Use .cursor/skills/portulan-mcp/SKILL.md do projeto." });
    }
  }

  return (
    <div className="integration-skill">
      <div className="integration-skill-meta">
        <span className="eyebrow">Skill para agentes</span>
        <h3>portulan-mcp</h3>
        <p>
          Markdown completo com instruções MCP, templates e diretivas. Instale em{" "}
          <code>.cursor/skills/portulan-mcp/</code> ou cole no cliente do agente.
        </p>
      </div>
      <div className="integration-skill-actions">
        <Button type="button" variant="outline" size="sm" onClick={copySkill} disabled={!skillMarkdown.trim()}>
          <Copy />
          Copiar skill
        </Button>
      </div>
    </div>
  );
}
