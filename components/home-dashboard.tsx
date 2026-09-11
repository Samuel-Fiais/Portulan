import Link from "next/link";
import { ArrowRight, Bot, Palette } from "lucide-react";
import { DocumentSummaryList } from "@/components/document-summary-list";
import { NewDocumentDialog } from "@/components/new-document-dialog";
import { StatCard } from "@/components/stat-card";
import type {
  DocumentStats,
  DocumentSummary,
  TemplateRecord,
} from "@/lib/documents";
import { bibliotecaUrl } from "@/lib/library-filters";

const RECENT_LIMIT = 8;

export function HomeDashboard({
  documents,
  stats,
  templates,
  currentUserId,
}: {
  documents: DocumentSummary[];
  stats: DocumentStats;
  templates: TemplateRecord[];
  currentUserId: string;
}) {
  const recent = documents.slice(0, RECENT_LIMIT);

  return (
    <main className="page-wrap dashboard-main">
      <section className="doc-section hero-section">
        <div className="page-heading split-row">
          <div className="split-row__main">
            <h1 className="fp-h1">
              O que está em <span>andamento.</span>
            </h1>
            <p className="fp-lead">
              Resumo da biblioteca, documentos recentes e atalhos para
              templates e agentes.
            </p>
          </div>
          <NewDocumentDialog templates={templates} />
        </div>

        <div
          className="fp-stat-grid dashboard-stats"
          aria-label="Resumo da biblioteca"
        >
          <Link href={bibliotecaUrl()} className="stat-link">
            <StatCard
              label="Documentos"
              value={stats.total}
              note="na biblioteca"
            />
          </Link>
          <Link href={bibliotecaUrl("published")} className="stat-link">
            <StatCard
              label="Publicados"
              value={stats.published}
              note="prontos para consulta"
            />
          </Link>
          <Link href={bibliotecaUrl("review")} className="stat-link">
            <StatCard
              label="Em revisão"
              value={stats.review}
              note="aguardando validação"
            />
          </Link>
          <Link href={bibliotecaUrl("draft")} className="stat-link">
            <StatCard
              label="Rascunhos"
              value={stats.draft}
              note="em construção"
            />
          </Link>
          <Link href={bibliotecaUrl("archived")} className="stat-link">
            <StatCard
              label="Arquivados"
              value={stats.archived}
              note="fora do fluxo ativo"
            />
          </Link>
        </div>
      </section>

      <section className="doc-section">
        <div className="section-header split-row">
          <h2 className="section-title">Recentes</h2>
          <Link href="/biblioteca" className="section-desc section-link">
            Ver biblioteca
            <ArrowRight />
          </Link>
        </div>
        <DocumentSummaryList
          documents={recent}
          currentUserId={currentUserId}
          emptyTitle="Nenhum documento ainda"
          emptyDescription="Crie o primeiro relatório para começar a biblioteca."
        />
      </section>

      <section className="doc-section">
        <div className="section-header split-row">
          <h2 className="section-title">Atalhos</h2>
        </div>
        <div className="dashboard-shortcuts">
          <Link href="/templates" className="fp-card dashboard-shortcut">
            <Palette />
            <div>
              <h3>Templates</h3>
              <p>Paleta, logo e identidade editorial dos relatórios.</p>
            </div>
            <ArrowRight />
          </Link>
          <Link href="/integrations" className="fp-card dashboard-shortcut">
            <Bot />
            <div>
              <h3>Integrações</h3>
              <p>Tokens MCP e skill para agentes manterem a biblioteca.</p>
            </div>
            <ArrowRight />
          </Link>
        </div>
      </section>
    </main>
  );
}
