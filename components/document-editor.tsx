"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronRight, Copy, Download, FileText, Globe, Link2, LoaderCircle, MoreHorizontal, PanelRight, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createDocumentAction, deleteDocumentAction, publishDocumentAction, updateDocumentAction } from "@/app/actions";
import { BrandMark } from "@/components/brand-mark";
import { ReportPreview } from "@/components/report-preview";
import { StatusBadge, TemplateBadge } from "@/components/document-badges";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { documentStatuses, statusMeta, type DocumentRecord, type DocumentRelease, type TemplateRecord } from "@/lib/documents";
import { cn, formatRelativeDate } from "@/lib/utils";

export function DocumentEditor({
  initialDocument,
  initialReleases = [],
  templates,
  canEdit = true,
}: {
  initialDocument: DocumentRecord;
  initialReleases?: DocumentRelease[];
  templates: TemplateRecord[];
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [document, setDocument] = useState(initialDocument);
  const [savedDocument, setSavedDocument] = useState(initialDocument);
  const [releases, setReleases] = useState(initialReleases);
  const [previewVisible, setPreviewVisible] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [pending, startTransition] = useTransition();
  const dirty = useMemo(() => JSON.stringify(document) !== JSON.stringify(savedDocument), [document, savedDocument]);
  const deferredDocument = useDeferredValue(document);

  function patch<K extends keyof DocumentRecord>(key: K, value: DocumentRecord[K]) {
    setDocument((current) => ({ ...current, [key]: value }));
  }

  function changeTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    setDocument((current) => ({
      ...current,
      templateId: template.id,
      templateName: template.name,
      primaryColor: template.primaryColor,
      secondaryColor: template.secondaryColor,
    }));
  }

  function savePayload() {
    return {
      title: document.title,
      summary: document.summary,
      templateId: document.templateId,
      status: document.status,
      author: document.author,
      team: document.team,
      tags: document.tags,
      content: document.content,
    };
  }

  function save() {
    startTransition(async () => {
      const result = await updateDocumentAction(document.id, savePayload());
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDocument(result.document);
      setSavedDocument(result.document);
      toast.success("Alterações salvas", { description: `Versão ${result.document.version}` });
    });
  }

  async function exportPdf() {
    setExporting(true);
    try {
      let current = document;
      if (dirty) {
        const result = await updateDocumentAction(document.id, savePayload());
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        current = result.document;
        setDocument(result.document);
        setSavedDocument(result.document);
      }

      const response = await fetch(`/api/documents/${current.id}/pdf`);
      if (!response.ok) throw new Error("Não foi possível gerar o PDF");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = `${current.slug}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("PDF gerado", { description: "O arquivo foi baixado com cabeçalho e rodapé em todas as páginas." });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar o PDF");
    } finally {
      setExporting(false);
    }
  }

  function duplicate() {
    startTransition(async () => {
      const result = await createDocumentAction({
        title: `${document.title} — cópia`,
        summary: document.summary,
        templateId: document.templateId,
        status: "draft",
        author: document.author,
        team: document.team,
        tags: document.tags,
        content: document.content,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Cópia criada");
      router.push(`/documents/${result.document.id}`);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteDocumentAction(document.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Documento excluído");
      router.push("/");
    });
  }

  function publish() {
    startTransition(async () => {
      const result = await publishDocumentAction(document.id, savePayload());
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDocument(result.document);
      setSavedDocument(result.document);
      setReleases((current) => [result.release, ...current.filter((item) => item.id !== result.release.id)]);
      const url = `${window.location.origin}/p/${result.release.id}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Documento publicado", {
          description: `Versão ${result.release.version} · link copiado para a área de transferência.`,
        });
      } catch {
        toast.success("Documento publicado", { description: `Versão ${result.release.version} · ${url}` });
      }
    });
  }

  async function copyShareUrl(releaseId: string, version: number) {
    const url = `${window.location.origin}/p/${releaseId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado", { description: `Versão ${version}` });
    } catch {
      toast.message("Link público", { description: url });
    }
  }

  return (
    <div className="editor-shell">
      <header className="editor-topbar no-print">
        <div className="editor-topbar-inner">
        <div className="editor-context flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link href="/" aria-label="Voltar"><ArrowLeft /></Link></Button>
          <BrandMark className="hidden sm:flex" />
          <ChevronRight className="hidden size-3.5 text-border sm:block" />
          <div className="min-w-0"><strong className="block truncate text-sm">{document.title}</strong><small className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{dirty ? "Alterações não salvas" : `Salvo ${formatRelativeDate(document.updatedAt)}`}</small></div>
        </div>
        <div className="editor-actions flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="hidden md:flex" onClick={() => setPreviewVisible(!previewVisible)}><PanelRight />{previewVisible ? "Ocultar preview" : "Mostrar preview"}</Button>
          <Button variant="outline" size="sm" onClick={exportPdf} disabled={exporting || pending}>{exporting ? <LoaderCircle className="animate-spin" /> : <Download />}<span className="hidden sm:inline">{exporting ? "Gerando PDF" : "Exportar PDF"}</span></Button>
          {canEdit ? (
            <>
              <Button variant="outline" size="sm" onClick={publish} disabled={pending}><Globe /><span className="hidden sm:inline">Publicar</span></Button>
              <Button size="sm" onClick={save} disabled={!dirty || pending}>{pending ? <span className="saving-dot" /> : dirty ? <Save /> : <Check />}<span className="hidden sm:inline">{pending ? "Salvando" : dirty ? "Salvar" : "Salvo"}</span></Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={duplicate}><Copy />Duplicar documento</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <AlertDialog>
                    <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(event) => event.preventDefault()} className="text-destructive"><Trash2 />Excluir documento</DropdownMenuItem></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Excluir este documento?</AlertDialogTitle><AlertDialogDescription>“{document.title}” será removido permanentemente. Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={remove}>Excluir definitivamente</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : null}
        </div>
        </div>
      </header>

      <main className={cn("editor-workspace", !previewVisible && "preview-hidden")}>
        <section className="editor-pane no-print">
          <div className="editor-document-heading">
            <div className="flex flex-wrap items-center gap-2">
              <TemplateBadge name={document.templateName} primaryColor={document.primaryColor} secondaryColor={document.secondaryColor} />
              <StatusBadge status={document.status} />
            </div>
            <Textarea className="editor-title-input" value={document.title} onChange={(event) => patch("title", event.target.value)} aria-label="Título do documento" readOnly={!canEdit} />
            <Textarea className="editor-summary-input" value={document.summary} onChange={(event) => patch("summary", event.target.value)} placeholder="Resumo executivo do documento…" aria-label="Resumo do documento" readOnly={!canEdit} />
          </div>
          <Tabs defaultValue="content" className="editor-tabs">
            <TabsList><TabsTrigger value="content"><FileText />Conteúdo</TabsTrigger><TabsTrigger value="metadata">Metadados</TabsTrigger></TabsList>
            <TabsContent value="content" className="editor-tab-content">
              <div className="markdown-hint"><span>Markdown</span></div>
              <Textarea className="markdown-editor" value={document.content} onChange={(event) => patch("content", event.target.value)} spellCheck={false} aria-label="Conteúdo em Markdown" readOnly={!canEdit} />
            </TabsContent>
            <TabsContent value="metadata" className="editor-tab-content metadata-form">
              <Field label="Template">
                <Select value={document.templateId} onValueChange={changeTemplate} disabled={!canEdit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Status"><Select value={document.status} onValueChange={(value: DocumentRecord["status"]) => patch("status", value)} disabled={!canEdit}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{documentStatuses.map((status) => <SelectItem key={status} value={status}>{statusMeta[status].label}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Responsável"><Input value={document.author} onChange={(event) => patch("author", event.target.value)} readOnly={!canEdit} /></Field>
              <Field label="Time"><Input value={document.team} onChange={(event) => patch("team", event.target.value)} readOnly={!canEdit} /></Field>
              <Field label="Tags"><Input value={document.tags.join(", ")} onChange={(event) => patch("tags", event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean))} placeholder="pagamentos, api, arquitetura" readOnly={!canEdit} /><p>Separe as tags por vírgula.</p></Field>
              {releases.length > 0 ? (
                <div className="metadata-summary">
                  <span>Links públicos</span>
                  <div className="space-y-2">
                    {releases.map((release) => (
                      <div key={release.id} className="flex flex-wrap items-center gap-2">
                        <code className="max-w-full truncate">/p/{release.id}</code>
                        <Button type="button" variant="outline" size="xs" onClick={() => copyShareUrl(release.id, release.version)}>
                          <Link2 />v{release.version}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="metadata-summary"><span>ID</span><code>{document.id}</code><span>Slug</span><code>{document.slug}</code><span>Versão</span><code>{document.version}</code></div>
            </TabsContent>
          </Tabs>
        </section>
        <section className="preview-pane">
          <div className="preview-label no-print"><span>Pré-visualização A4</span><small>O resultado da impressão</small></div>
          <div className="preview-scroll"><ReportPreview document={deferredDocument} /></div>
        </section>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
