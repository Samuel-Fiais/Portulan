"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useRef, useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ban, Blocks, Check, ChevronRight, Copy, Download, ExternalLink, Eye, FileText, Globe, History, Link2, LoaderCircle, MoreHorizontal, PanelRight, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createDocumentAction, deleteDocumentAction, listLinkableDocumentsAction, publishDocumentAction, setDocumentDisabledAction, setDocumentReleaseDisabledAction, updateDocumentAction } from "@/app/actions";
import { BrandMark } from "@/components/brand-mark";
import { ReportPreview } from "@/components/report-preview";
import { RichMarkdown } from "@/components/rich-markdown";
import { StatusBadge, TemplateBadge, DisabledBadge } from "@/components/document-badges";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { documentStatuses, statusMeta, type DocumentRecord, type DocumentRelease, type TemplateRecord } from "@/lib/documents";
import {
  applyComponentProperties,
  defaultComponentProperties,
  markdownComponents,
  type MarkdownComponent,
} from "@/lib/markdown-components";
import { cn, formatRelativeDate } from "@/lib/utils";

type LinkableDocument = { id: string; slug: string; title: string };

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
  const [componentPickerOpen, setComponentPickerOpen] = useState(false);
  const [reportLinkPickerOpen, setReportLinkPickerOpen] = useState(false);
  const [linkableDocuments, setLinkableDocuments] = useState<LinkableDocument[]>([]);
  const [reportLinkSearch, setReportLinkSearch] = useState("");
  const [componentSearch, setComponentSearch] = useState("");
  const [selectedMarkdownComponentId, setSelectedMarkdownComponentId] = useState(markdownComponents[0].id);
  const [componentPropertyValues, setComponentPropertyValues] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const markdownEditorRef = useRef<HTMLTextAreaElement>(null);
  const markdownSelectionRef = useRef({ start: 0, end: 0 });
  const dirty = useMemo(() => JSON.stringify(document) !== JSON.stringify(savedDocument), [document, savedDocument]);
  const deferredDocument = useDeferredValue(document);
  const visibleLinkableDocuments = useMemo(() => {
    const query = reportLinkSearch.trim().toLocaleLowerCase("pt-BR");
    return query
      ? linkableDocuments.filter((item) => `${item.title} ${item.slug}`.toLocaleLowerCase("pt-BR").includes(query))
      : linkableDocuments;
  }, [linkableDocuments, reportLinkSearch]);
  const visibleMarkdownComponents = useMemo(() => {
    const query = componentSearch.trim().toLocaleLowerCase("pt-BR");
    return query
      ? markdownComponents.filter((component) => `${component.name} ${component.description}`.toLocaleLowerCase("pt-BR").includes(query))
      : markdownComponents;
  }, [componentSearch]);
  const selectedMarkdownComponent = visibleMarkdownComponents.find((component) => component.id === selectedMarkdownComponentId)
    ?? visibleMarkdownComponents[0]
    ?? markdownComponents[0];
  const previewPaletteStyle = useMemo(() => ({
    "--report-accent": deferredDocument.primaryColor,
    "--report-accent-2": deferredDocument.secondaryColor,
  }) as CSSProperties, [deferredDocument.primaryColor, deferredDocument.secondaryColor]);
  const selectedMarkdownComponentPreview = useMemo(
    () => applyComponentProperties(selectedMarkdownComponent.preview, componentPropertyValues),
    [selectedMarkdownComponent, componentPropertyValues],
  );

  function patch<K extends keyof DocumentRecord>(key: K, value: DocumentRecord[K]) {
    setDocument((current) => ({ ...current, [key]: value }));
  }

  function openReportLinkPicker() {
    const editor = markdownEditorRef.current;
    markdownSelectionRef.current = {
      start: editor?.selectionStart ?? document.content.length,
      end: editor?.selectionEnd ?? document.content.length,
    };
    setReportLinkSearch("");
    setReportLinkPickerOpen(true);
    startTransition(async () => {
      const result = await listLinkableDocumentsAction(document.id);
      if (!result.ok) {
        toast.error(result.error);
        setReportLinkPickerOpen(false);
        return;
      }
      setLinkableDocuments(result.documents);
    });
  }

  function insertReportLink(item: LinkableDocument) {
    const { start, end } = markdownSelectionRef.current;
    const snippet = `[${item.title}](/d/${item.slug})`;
    const prefix = start > 0 && !document.content.slice(0, start).endsWith("\n\n") ? "\n\n" : "";
    const suffix = end < document.content.length && !document.content.slice(end).startsWith("\n\n") ? "\n\n" : "";
    const content = `${document.content.slice(0, start)}${prefix}${snippet}${suffix}${document.content.slice(end)}`;
    patch("content", content);
    setReportLinkPickerOpen(false);
    requestAnimationFrame(() => {
      markdownEditorRef.current?.focus();
      const cursor = start + prefix.length + snippet.length;
      markdownEditorRef.current?.setSelectionRange(cursor, cursor);
    });
  }

  function openComponentPicker() {
    const editor = markdownEditorRef.current;
    markdownSelectionRef.current = {
      start: editor?.selectionStart ?? document.content.length,
      end: editor?.selectionEnd ?? document.content.length,
    };
    setComponentSearch("");
    setSelectedMarkdownComponentId(markdownComponents[0].id);
    setComponentPropertyValues(defaultComponentProperties(markdownComponents[0]));
    setComponentPickerOpen(true);
  }

  function insertMarkdownComponent(component: MarkdownComponent) {
    const { start, end } = markdownSelectionRef.current;
    const selectedText = document.content.slice(start, end);
    const placeholder = "{{conteúdo}}";
    const configuredSnippet = applyComponentProperties(component.snippet, componentPropertyValues);
    const placeholderIndex = configuredSnippet.indexOf(placeholder);
    const snippet = configuredSnippet.replace(placeholder, selectedText || "Escreva aqui.");
    const prefix = start > 0 && !document.content.slice(0, start).endsWith("\n\n") ? "\n\n" : "";
    const suffix = end < document.content.length && !document.content.slice(end).startsWith("\n\n") ? "\n\n" : "";
    const content = `${document.content.slice(0, start)}${prefix}${snippet}${suffix}${document.content.slice(end)}`;
    const cursorStart = start + prefix.length + Math.max(placeholderIndex, 0);
    const cursorEnd = cursorStart + (selectedText || "Escreva aqui.").length;

    patch("content", content);
    setComponentPickerOpen(false);
    requestAnimationFrame(() => {
      markdownEditorRef.current?.focus();
      markdownEditorRef.current?.setSelectionRange(cursorStart, cursorEnd);
    });
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
      toast.success("Rascunho salvo");
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

  function toggleDocumentDisabled(disabled: boolean) {
    startTransition(async () => {
      const result = await setDocumentDisabledAction(document.id, disabled);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDocument(result.document);
      setSavedDocument(result.document);
      toast.success(disabled ? "Documento desativado" : "Documento reativado", {
        description: disabled
          ? "Todos os links públicos deste documento exibem uma mensagem de indisponibilidade."
          : "O acesso público foi restaurado conforme as versões ativas.",
      });
    });
  }

  function toggleReleaseDisabled(releaseId: string, disabled: boolean) {
    startTransition(async () => {
      const result = await setDocumentReleaseDisabledAction(document.id, releaseId, disabled);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setReleases((current) => current.map((release) => (release.id === releaseId ? result.release : release)));
      toast.success(disabled ? "Versão desativada" : "Versão reativada");
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
      const stableUrl = `${window.location.origin}/d/${result.document.slug}`;
      const pinnedUrl = `${window.location.origin}/p/${result.release.id}`;
      try {
        await navigator.clipboard.writeText(stableUrl);
        toast.success("Versão publicada", {
          description: `Link estável copiado. Use ${pinnedUrl} para fixar esta versão.`,
        });
      } catch {
        toast.success("Versão publicada", {
          description: `Link estável: ${stableUrl}. Versão fixa: ${pinnedUrl}`,
        });
      }
    });
  }

  async function copyShareUrl(path: string, label: string) {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado", { description: label });
    } catch {
      toast.message("Link público", { description: url });
    }
  }

  function openDraftPreview() {
    const previewWindow = window.open("", "_blank");
    if (!previewWindow) {
      toast.message("Permita pop-ups para abrir a prévia em outra aba.");
      return;
    }
    startTransition(async () => {
      if (dirty) {
        const result = await updateDocumentAction(document.id, savePayload());
        if (!result.ok) {
          toast.error(result.error);
          previewWindow.close();
          return;
        }
        setDocument(result.document);
        setSavedDocument(result.document);
      }
      previewWindow.location.href = `/documents/${document.id}/preview`;
    });
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
          <Button variant="outline" size="sm" onClick={openDraftPreview}><Eye /><span className="hidden sm:inline">Abrir prévia</span></Button>
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
                  {document.disabled ? (
                    <DropdownMenuItem onClick={() => toggleDocumentDisabled(false)}><RotateCcw />Reativar documento</DropdownMenuItem>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(event) => event.preventDefault()} className="text-destructive"><Ban />Desativar documento</DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Desativar este documento?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Todos os links públicos (/d/{document.slug} e /p/…) deixarão de exibir o conteúdo. Você poderá reativar depois.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => toggleDocumentDisabled(true)}>Desativar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
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
              {document.disabled ? <DisabledBadge /> : null}
            </div>
            <Textarea className="editor-title-input" value={document.title} onChange={(event) => patch("title", event.target.value)} aria-label="Título do documento" readOnly={!canEdit} />
            <Textarea className="editor-summary-input" value={document.summary} onChange={(event) => patch("summary", event.target.value)} placeholder="Resumo executivo do documento…" aria-label="Resumo do documento" readOnly={!canEdit} />
          </div>
          <Tabs defaultValue="content" className="editor-tabs">
            <TabsList variant="line" className="editor-tabs-list"><TabsTrigger value="content"><FileText />Conteúdo</TabsTrigger><TabsTrigger value="metadata">Metadados</TabsTrigger><TabsTrigger value="history"><History />Histórico</TabsTrigger></TabsList>
            <TabsContent value="content" className="editor-tab-content">
              <div className="markdown-hint">
                <span>Markdown</span>
                {canEdit ? (
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="xs" onClick={openReportLinkPicker}><Link2 />Link para relatório</Button>
                    <Button type="button" variant="ghost" size="xs" onClick={openComponentPicker}><Plus />Adicionar componente</Button>
                  </div>
                ) : null}
              </div>
              <Textarea ref={markdownEditorRef} className="markdown-editor" value={document.content} onChange={(event) => patch("content", event.target.value)} spellCheck={false} aria-label="Conteúdo em Markdown" readOnly={!canEdit} />
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
              {canEdit ? (
                <div className="metadata-public-access">
                  <span>Acesso público</span>
                  <p>
                    {document.disabled
                      ? "Este documento está desativado. Links /d/ e /p/ exibem mensagem de indisponibilidade."
                      : "Links públicos permanecem ativos. Desative para interromper o acesso sem excluir o documento."}
                  </p>
                  {document.disabled ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => toggleDocumentDisabled(false)} disabled={pending}><RotateCcw />Reativar documento</Button>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button type="button" variant="destructive" size="sm" disabled={pending}><Ban />Desativar documento</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Desativar este documento?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Todos os links públicos deixarão de exibir o conteúdo até você reativar o documento.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => toggleDocumentDisabled(true)}>Desativar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              ) : null}
              <div className="metadata-summary"><span>ID</span><code>{document.id}</code><span>Slug</span><code>{document.slug}</code><span>Versão</span><code>{document.version}</code></div>
            </TabsContent>
            <TabsContent value="history" className="editor-tab-content version-history">
              <div className="version-history-heading">
                <div>
                  <span>Versões publicadas</span>
                  <p>Salvar atualiza apenas o rascunho. Cada publicação cria um snapshot imutável e um novo link de versão fixa.</p>
                </div>
                <strong>{releases.length} {releases.length === 1 ? "versão" : "versões"}</strong>
              </div>
              {releases.length ? (
                <>
                  <div className="version-history-stable">
                    <div>
                      <strong>Link estável (sempre a última versão)</strong>
                      <span>Atualiza automaticamente a cada nova publicação</span>
                      <code>/d/{document.slug}</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="xs" onClick={() => copyShareUrl(`/d/${document.slug}`, "Link estável")}><Link2 />Copiar link</Button>
                      <Button type="button" variant="outline" size="xs" asChild><Link href={`/d/${document.slug}`} target="_blank"><ExternalLink />Abrir</Link></Button>
                    </div>
                  </div>
                  <ol className="version-history-list">
                    {releases.map((release) => (
                      <li key={release.id} className={cn(release.disabled && "version-history-item-disabled")}>
                        <div>
                          <strong>
                            v{release.version} · versão fixa
                            {release.disabled ? " · desativada" : ""}
                          </strong>
                          <span>Publicada em {formatRelativeDate(release.publishedAt)}</span>
                          <code>/p/{release.id}</code>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button type="button" variant="outline" size="xs" onClick={() => copyShareUrl(`/p/${release.id}`, `Versão fixa v${release.version}`)}><Link2 />Copiar link</Button>
                          <Button type="button" variant="outline" size="xs" asChild><Link href={`/p/${release.id}`} target="_blank"><ExternalLink />Abrir</Link></Button>
                          {canEdit ? (
                            release.disabled ? (
                              <Button type="button" variant="outline" size="xs" onClick={() => toggleReleaseDisabled(release.id, false)} disabled={pending || document.disabled}><RotateCcw />Reativar</Button>
                            ) : (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button type="button" variant="destructive" size="xs" disabled={pending || document.disabled}><Ban />Desativar</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Desativar versão v{release.version}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      O link /p/{release.id} deixará de exibir o conteúdo. Outras versões e o link estável /d/{document.slug} (se houver versões ativas) continuam funcionando.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => toggleReleaseDisabled(release.id, true)}>Desativar versão</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ol>
                </>
              ) : (
                <div className="version-history-empty">Ainda não há versões publicadas. Use “Publicar” quando quiser registrar a primeira versão.</div>
              )}
            </TabsContent>
          </Tabs>
        </section>
        <section className="preview-pane">
          <div className="preview-label no-print"><span>Visualização</span><small>A impressão continua em A4</small></div>
          <div className="preview-scroll"><ReportPreview document={deferredDocument} interactive /></div>
        </section>
      </main>
      <Dialog open={componentPickerOpen} onOpenChange={setComponentPickerOpen}>
        <DialogContent className="markdown-component-dialog max-w-5xl rounded-none p-0 shadow-none sm:max-w-5xl">
          <DialogHeader className="markdown-component-dialog-header">
            <div><DialogTitle>Adicionar componente</DialogTitle><DialogDescription>Escolha um bloco para inserir no ponto atual do Markdown.</DialogDescription></div>
            <Input value={componentSearch} onChange={(event) => setComponentSearch(event.target.value)} placeholder="Buscar componente…" aria-label="Buscar componente" autoFocus />
          </DialogHeader>
          <div className="markdown-component-browser">
            <div className="markdown-component-groups">
              {(["Destaques", "Métricas e análise", "Planejamento e acompanhamento", "Gráficos", "Código e integrações", "Pessoas e colaboração", "Produto e pesquisa", "Operações e qualidade", "Documentação e referência", "Layout e composição", "Markdown"] as const).map((category) => {
                const components = visibleMarkdownComponents.filter((component) => component.category === category);
                if (!components.length) return null;
              return <section className="markdown-component-section" key={category}><div className="markdown-component-category">{category}</div><div className="markdown-component-grid">{components.map((component) => <button type="button" className="markdown-component-option" data-active={component.id === selectedMarkdownComponent.id || undefined} key={component.id} onClick={() => { setSelectedMarkdownComponentId(component.id); setComponentPropertyValues(defaultComponentProperties(component)); }}><Blocks /><span><strong>{component.name}</strong><small>{component.description}</small></span></button>)}</div></section>;
              })}
              {!visibleMarkdownComponents.length ? <p className="markdown-component-empty">Nenhum componente encontrado.</p> : null}
            </div>
            <aside className="markdown-component-preview-panel">
              <div className="markdown-component-category">Prévia</div>
              <div className="markdown-component-preview"><article className="report-paper markdown-component-preview-paper" style={previewPaletteStyle}><div className="tmpl-body report-content"><RichMarkdown source={selectedMarkdownComponentPreview} /></div></article></div>
              <strong>{selectedMarkdownComponent.name}</strong>
              <p>{selectedMarkdownComponent.description}</p>
              {selectedMarkdownComponent.properties?.some((property) => property.options?.length) ? <div className="markdown-component-controls"><span>Testar propriedades</span>{selectedMarkdownComponent.properties.filter((property) => property.options?.length).map((property) => <label key={property.name}><code>{property.name}</code><select value={componentPropertyValues[property.name] ?? property.defaultValue ?? property.options?.[0] ?? ""} onChange={(event) => setComponentPropertyValues((current) => ({ ...current, [property.name]: event.target.value }))}>{property.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>)}</div> : null}
              {selectedMarkdownComponent.properties?.length ? <div className="markdown-component-details"><span>Propriedades</span>{selectedMarkdownComponent.properties.map((property) => <div key={property.name}><code>{property.name}</code><small>{property.values}</small></div>)}</div> : null}
              {selectedMarkdownComponent.rules?.length ? <div className="markdown-component-details"><span>Regras</span><ul>{selectedMarkdownComponent.rules.map((rule) => <li key={rule}>{rule}</li>)}</ul></div> : null}
            </aside>
          </div>
          <DialogFooter className="markdown-component-dialog-footer"><Button type="button" variant="outline" onClick={() => setComponentPickerOpen(false)}>Cancelar</Button><Button type="button" onClick={() => insertMarkdownComponent(selectedMarkdownComponent)}><Plus />Inserir componente</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={reportLinkPickerOpen} onOpenChange={setReportLinkPickerOpen}>
        <DialogContent className="max-w-lg rounded-none p-0 shadow-none">
          <DialogHeader className="markdown-component-dialog-header">
            <div><DialogTitle>Link para relatório</DialogTitle><DialogDescription>Insere um link Markdown para a última versão publicada de outro documento.</DialogDescription></div>
            <Input value={reportLinkSearch} onChange={(event) => setReportLinkSearch(event.target.value)} placeholder="Buscar relatório…" aria-label="Buscar relatório" autoFocus />
          </DialogHeader>
          <div className="report-link-picker-list">
            {pending && !linkableDocuments.length ? <p className="report-link-picker-empty">Carregando relatórios…</p> : null}
            {!pending && !visibleLinkableDocuments.length ? <p className="report-link-picker-empty">Nenhum relatório publicado encontrado.</p> : null}
            {visibleLinkableDocuments.map((item) => (
              <button type="button" className="report-link-picker-option" key={item.id} onClick={() => insertReportLink(item)}>
                <FileText />
                <span><strong>{item.title}</strong><small>/d/{item.slug}</small></span>
              </button>
            ))}
          </div>
          <DialogFooter className="markdown-component-dialog-footer"><Button type="button" variant="outline" onClick={() => setReportLinkPickerOpen(false)}>Cancelar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
