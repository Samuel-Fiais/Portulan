"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowRight, Bot, Copy, KeyRound, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createMcpTokenAction,
  createTemplateAction,
  deleteTemplateAction,
  revokeMcpTokenAction,
  updateTemplateAction,
} from "@/app/actions";
import { ColorPicker } from "@/components/color-picker";
import { NewDocumentDialog } from "@/components/new-document-dialog";
import { StatusBadge, TemplateBadge } from "@/components/document-badges";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DEFAULT_TEMPLATE_COLORS,
  type DocumentRecord,
  type TemplateRecord,
} from "@/lib/documents";
import { pickContrastInkColor } from "@/lib/color-utils";
import { formatRelativeDate } from "@/lib/utils";

type Stats = { total: number; published: number; review: number; draft: number };
type DocumentSummary = Omit<DocumentRecord, "content">;
type McpTokenSummary = {
  id: string;
  name: string;
  tokenPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export function Dashboard({
  documents,
  stats,
  templates,
  mcpTokens,
  skillMarkdown,
}: {
  documents: DocumentSummary[];
  stats: Stats;
  templates: TemplateRecord[];
  mcpTokens: McpTokenSummary[];
  skillMarkdown: string;
}) {
  const [query, setQuery] = useState("");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [mcpOrigin, setMcpOrigin] = useState("");
  const filtered = useMemo(() => documents.filter((document) => {
    const matchesTemplate = templateFilter === "all" || document.templateId === templateFilter;
    const haystack = `${document.title} ${document.summary} ${document.tags.join(" ")}`.toLowerCase();
    return matchesTemplate && haystack.includes(query.toLowerCase());
  }), [documents, query, templateFilter]);

  useEffect(() => {
    setMcpOrigin(`${window.location.origin}/api/mcp`);
  }, []);

  const mcpEndpoint = mcpOrigin || "/api/mcp";

  return (
    <main className="page-wrap dashboard-main">
      <section className="doc-section hero-section">
        <div className="page-heading">
          <div>
            <h1 className="fp-h1">Documentos que sustentam <span>decisões.</span></h1>
            <p className="fp-lead">Crie, revise e publique relatórios técnicos em um sistema visual consistente — por pessoas ou agentes.</p>
          </div>
          <NewDocumentDialog templates={templates} />
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
          <h2 className="section-title">Biblioteca</h2>
          <span className="section-desc">{filtered.length} documento{filtered.length === 1 ? "" : "s"}</span>
        </div>
        <div className="filter-bar">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por título, tema ou tag…" className="pl-9" />
          </div>
          <Select value={templateFilter} onValueChange={setTemplateFilter}>
            <SelectTrigger className="template-filter-select" aria-label="Filtrar por template">
              <SelectValue placeholder="Todos os templates" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os templates</SelectItem>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="document-list">
          {filtered.map((document) => (
            <Link href={`/documents/${document.slug}`} key={document.id} className="document-row group">
              <span
                className="document-accent"
                style={{ background: `linear-gradient(180deg, ${document.primaryColor}, ${document.secondaryColor})` }}
              />
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <TemplateBadge name={document.templateName} primaryColor={document.primaryColor} secondaryColor={document.secondaryColor} />
                  <StatusBadge status={document.status} />
                </div>
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
        <div className="section-header">
          <h2 className="section-title">Templates editoriais</h2>
          <TemplateFormDialog />
        </div>
        <div className="fp-card-grid template-grid">
          {templates.map((template, index) => (
            <TemplateCard key={template.id} template={template} index={index} />
          ))}
        </div>
      </section>

      <section id="integrations" className="doc-section">
        <div className="section-header"><h2 className="section-title">Agentes e integrações</h2></div>
        <div className="integration-panel">
          <div className="integration-icon"><Bot /></div>
          <div className="flex-1">
            <h3>Uma biblioteca que agentes também conseguem manter.</h3>
            <p>
              Conecte qualquer cliente MCP ao endpoint abaixo. Cada agente opera com a identidade do seu usuário Portulan —
              gere um token pessoal e envie <code>Authorization: Bearer &lt;token&gt;</code> em toda requisição.
            </p>
            <code>{mcpEndpoint}</code>
          </div>
          <div className="tool-list">
            <span>list_templates</span>
            <span>list_documents</span>
            <span>get_document</span>
            <span>create_document</span>
            <span>update_document</span>
            <span>publish_document</span>
            <span>list_document_releases</span>
            <span>delete_document</span>
          </div>
        </div>
        <McpTokenPanel initialTokens={mcpTokens} />
        <IntegrationSkillCopy skillMarkdown={skillMarkdown} />
      </section>
    </main>
  );
}

function StatCard({ label, value, note }: { label: string; value: number; note: string }) {
  return <div className="fp-stat"><div className="stat-label">{label}</div><div className="stat-value">{value.toString().padStart(2, "0")}</div><div className="stat-delta delta-up">{note}</div></div>;
}

function TemplateCard({ template, index }: { template: TemplateRecord; index: number }) {
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    if (template.isBuiltin) return;
    startTransition(async () => {
      const result = await deleteTemplateAction(template.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Template excluído");
    });
  }

  return (
    <>
      <div className="fp-card template-card">
        <div
          className="template-index"
          style={{
            background: `linear-gradient(135deg, ${template.primaryColor}, ${template.secondaryColor})`,
            color: pickContrastInkColor(template.primaryColor, template.secondaryColor),
          }}
        >
          {(index + 1).toString().padStart(2, "0")}
        </div>
        <h3>{template.name}</h3>
        <p>{template.isBuiltin ? "Template padrão Portulan (navy + burgundy)." : "Template personalizado com cores próprias."}</p>
        <div className="template-color-row">
          <span className="template-swatch" style={{ backgroundColor: template.primaryColor }} title="Cor primária" />
          <span className="template-swatch" style={{ backgroundColor: template.secondaryColor }} title="Cor secundária" />
          <code className="template-color-code">{template.primaryColor}</code>
          <code className="template-color-code">{template.secondaryColor}</code>
        </div>
        <div className="template-card-actions">
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil />
            Editar
          </Button>
          {!template.isBuiltin ? (
            <Button type="button" variant="ghost" size="sm" onClick={remove} disabled={pending}>
              <Trash2 />
              Excluir
            </Button>
          ) : null}
        </div>
      </div>
      <TemplateFormDialog template={template} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}

function TemplateFormDialog({
  template,
  open: controlledOpen,
  onOpenChange,
}: {
  template?: TemplateRecord;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isEdit = Boolean(template);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(template?.name ?? "");
  const [primaryColor, setPrimaryColor] = useState<string>(template?.primaryColor ?? DEFAULT_TEMPLATE_COLORS.primary);
  const [secondaryColor, setSecondaryColor] = useState<string>(template?.secondaryColor ?? DEFAULT_TEMPLATE_COLORS.secondary);

  useEffect(() => {
    if (!open) return;
    setName(template?.name ?? "");
    setPrimaryColor(template?.primaryColor ?? DEFAULT_TEMPLATE_COLORS.primary);
    setSecondaryColor(template?.secondaryColor ?? DEFAULT_TEMPLATE_COLORS.secondary);
  }, [open, template]);

  function submit() {
    startTransition(async () => {
      const payload = { name, primaryColor, secondaryColor };

      const result = isEdit && template
        ? await updateTemplateAction(template.id, payload)
        : await createTemplateAction({ ...payload, content: "" });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setOpen(false);
      if (!isEdit) {
        setName("");
        setPrimaryColor(DEFAULT_TEMPLATE_COLORS.primary);
        setSecondaryColor(DEFAULT_TEMPLATE_COLORS.secondary);
      }
      toast.success(isEdit ? "Template atualizado" : "Template criado");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isEdit ? (
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm"><Plus />Novo template</Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="template-form-dialog">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar template" : "Novo template"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize o nome e as cores editoriais deste template."
              : "Defina um nome e duas cores editoriais (primária e secundária)."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={isEdit ? `template-name-${template?.id}` : "template-name"}>Nome</Label>
            <Input
              id={isEdit ? `template-name-${template?.id}` : "template-name"}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Relatório executivo"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ColorPicker
              id={isEdit ? `template-primary-${template?.id}` : "template-primary"}
              label="Cor primária"
              value={primaryColor}
              onChange={setPrimaryColor}
            />
            <ColorPicker
              id={isEdit ? `template-secondary-${template?.id}` : "template-secondary"}
              label="Cor secundária"
              value={secondaryColor}
              onChange={setSecondaryColor}
              align="end"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={pending || name.trim().length < 1}>
            {isEdit ? "Salvar alterações" : "Criar template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function McpTokenPanel({ initialTokens }: { initialTokens: McpTokenSummary[] }) {
  const [pending, startTransition] = useTransition();
  const [revealedToken, setRevealedToken] = useState<string | null>(null);

  function createToken() {
    startTransition(async () => {
      const result = await createMcpTokenAction({ name: "Agente MCP" });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setRevealedToken(result.token);
      toast.success("Token MCP gerado", { description: "Copie agora — ele não será exibido novamente." });
    });
  }

  function revoke(tokenId: string) {
    startTransition(async () => {
      const result = await revokeMcpTokenAction(tokenId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Token revogado");
    });
  }

  async function copyToken() {
    if (!revealedToken) return;
    try {
      await navigator.clipboard.writeText(revealedToken);
      toast.success("Token copiado");
    } catch {
      toast.message("Copie manualmente", { description: revealedToken });
    }
  }

  return (
    <div className="integration-skill mcp-token-panel">
      <div className="integration-skill-meta">
        <span className="eyebrow">Autenticação MCP</span>
        <h3>Tokens pessoais</h3>
        <p>
          Gere um token por agente ou integração. Use-o no header HTTP{" "}
          <code>Authorization: Bearer ptl_…</code>. Revogue tokens comprometidos a qualquer momento.
        </p>
        {revealedToken ? (
          <div className="mcp-token-reveal">
            <code>{revealedToken}</code>
            <Button type="button" variant="outline" size="sm" onClick={copyToken}><Copy />Copiar token</Button>
          </div>
        ) : null}
        {initialTokens.length > 0 ? (
          <ul className="mcp-token-list">
            {initialTokens.map((token) => (
              <li key={token.id}>
                <span><KeyRound className="inline size-3.5" /> {token.name}</span>
                <code>{token.tokenPrefix}…</code>
                <Button type="button" variant="ghost" size="xs" onClick={() => revoke(token.id)} disabled={pending}>
                  Revogar
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum token ativo.</p>
        )}
      </div>
      <div className="integration-skill-actions">
        <Button type="button" variant="outline" size="sm" onClick={createToken} disabled={pending}>
          <KeyRound />
          Gerar token MCP
        </Button>
      </div>
    </div>
  );
}

function IntegrationSkillCopy({ skillMarkdown }: { skillMarkdown: string }) {
  async function copySkill() {
    if (!skillMarkdown.trim()) {
      toast.error("Skill não encontrada", { description: "Arquivo portulan-skill.md ausente no projeto." });
      return;
    }
    try {
      await navigator.clipboard.writeText(skillMarkdown);
      toast.success("Skill copiada", { description: "Cole no diretório de skills do seu agente ou cliente MCP." });
    } catch {
      toast.message("Copie manualmente", { description: "Use o arquivo portulan-skill.md do projeto." });
    }
  }

  return (
    <div className="integration-skill">
      <div className="integration-skill-meta">
        <span className="eyebrow">Skill para agentes</span>
        <h3>portulan-mcp</h3>
        <p>
          Markdown completo com instruções MCP, templates e diretivas. Compatível com qualquer cliente MCP —
          copie para o diretório de skills do seu agente ou anexe ao prompt do sistema.
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
