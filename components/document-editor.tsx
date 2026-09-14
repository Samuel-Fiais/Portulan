"use client";

import "./editor-screen.css";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ban, Blocks, Copy, Download, ExternalLink, Eye, FileText, GitCompareArrows, Globe, History, Link2, LoaderCircle, MessageSquare, MoreHorizontal, Plus, RotateCcw, Save, Share2, Tags, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { createDocumentAction, deleteDocumentAction, listLinkableDocumentsAction, publishDocumentAction, restoreDocumentReleaseAction, setDocumentDisabledAction, setDocumentReleaseDisabledAction, setDocumentVisibilityAction, setDocumentWorkspaceAction, updateDocumentAction } from "@/app/actions";
import { BlobImageUpload } from "@/components/blob-image-upload";
import { BlobFileUpload } from "@/components/blob-file-upload";
import { DocumentCollaboratorAvatars } from "@/components/document-collaborator-avatars";
import { DocumentCommentsBoundary, useOptionalDocumentComments } from "@/components/document-comments-context";
import { DocumentReviewPanel } from "@/components/document-review-panel";
import { DocumentShareDialog } from "@/components/document-share-dialog";
import { ReportLinkCard } from "@/components/report-link-card";
import { ReportPreview } from "@/components/report-preview";
import { PreviewCommentRail, PreviewCommentsHost } from "@/components/preview-comments";
import { VersionDiffDialog } from "@/components/version-diff-dialog";
import { RichMarkdown } from "@/components/rich-markdown";
import { StatusBadge, TemplateBadge, DisabledBadge, VisibilityBadge, VisibilityIcon } from "@/components/document-badges";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { documentStatuses, statusMeta, hasUnpublishedChanges, type DocumentCollaborator, type DocumentRecord, type DocumentRelease, type TemplateRecord } from "@/lib/documents";
import {
  applyComponentProperties,
  defaultComponentProperties,
  groupMarkdownComponentsByCategory,
  markdownComponents,
  type MarkdownComponent,
} from "@/lib/markdown-components";
import { uploadBlobImage } from "@/lib/blob-client";
import { validateBlobImage } from "@/lib/blob-storage";
import { reportPaletteStyle } from "@/lib/color-utils";
import { applyMarkdownIndent } from "@/lib/markdown-indent";
import { applyMarkdownFormat, isMarkdownShortcut } from "@/lib/markdown-shortcuts";
import { documentVisibilities, documentVisibilityMeta, type DocumentVisibility } from "@/lib/workspaces";
import { cn, formatRelativeDate } from "@/lib/utils";
import { releaseSideId, type VersionDiffSideId } from "@/lib/version-diff";

type LinkableDocument = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  templateName: string;
  primaryColor: string;
  secondaryColor: string;
};

const SPLIT_HANDLE_WIDTH = 5;
const EDITOR_MIN_PX = 320;
const PREVIEW_MIN_PX = 360;

function clampEditorPaneWidth(width: number, workspaceWidth: number) {
  const maxEditorWidth = workspaceWidth - PREVIEW_MIN_PX - SPLIT_HANDLE_WIDTH;
  return Math.max(EDITOR_MIN_PX, Math.min(maxEditorWidth, width));
}

export function DocumentEditor({
  initialDocument,
  initialReleases = [],
  templates,
  canEdit = true,
  isOwner = true,
  collaborators = [],
  currentUserId,
  workspaces = [],
}: {
  initialDocument: DocumentRecord;
  initialReleases?: DocumentRelease[];
  templates: TemplateRecord[];
  canEdit?: boolean;
  isOwner?: boolean;
  collaborators?: DocumentCollaborator[];
  currentUserId?: string | null;
  workspaces?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [document, setDocument] = useState(initialDocument);
  const [savedDocument, setSavedDocument] = useState(initialDocument);
  const [releases, setReleases] = useState(initialReleases);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [editorPaneWidth, setEditorPaneWidth] = useState<number | null>(null);
  const [splitDragging, setSplitDragging] = useState(false);
  const [documentCollaborators, setDocumentCollaborators] = useState(collaborators);
  const [exporting, setExporting] = useState(false);
  const [exportingReleaseId, setExportingReleaseId] = useState<string | null>(null);
  const [componentPickerOpen, setComponentPickerOpen] = useState(false);
  const [linkableDocuments, setLinkableDocuments] = useState<LinkableDocument[]>([]);
  const [reportLinkSearch, setReportLinkSearch] = useState("");
  const [componentSearch, setComponentSearch] = useState("");
  const [selectedMarkdownComponentId, setSelectedMarkdownComponentId] = useState(markdownComponents[0].id);
  const [componentPropertyValues, setComponentPropertyValues] = useState<Record<string, string>>({});
  const [versionDiffOpen, setVersionDiffOpen] = useState(false);
  const [versionDiffLeft, setVersionDiffLeft] = useState<VersionDiffSideId>("draft");
  const [versionDiffRight, setVersionDiffRight] = useState<VersionDiffSideId>("draft");
  const [pending, startTransition] = useTransition();
  const markdownEditorRef = useRef<HTMLTextAreaElement>(null);
  const markdownSelectionRef = useRef({ start: 0, end: 0 });
  const pasteImageUploadingRef = useRef(false);
  const workspaceRef = useRef<HTMLElement>(null);
  const dirty = useMemo(() => JSON.stringify(document) !== JSON.stringify(savedDocument), [document, savedDocument]);
  const latestRelease = releases[0];
  const canPublish = useMemo(() => hasUnpublishedChanges(document, latestRelease), [document, latestRelease]);

  function openVersionDiff(left: VersionDiffSideId, right: VersionDiffSideId) {
    setVersionDiffLeft(left);
    setVersionDiffRight(right);
    setVersionDiffOpen(true);
  }

  useEffect(() => {
    setDocumentCollaborators(collaborators);
  }, [collaborators]);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;

    const syncEditorPaneWidth = () => {
      setEditorPaneWidth((current) => {
        if (current === null) return null;
        return clampEditorPaneWidth(current, workspace.clientWidth);
      });
    };

    const observer = new ResizeObserver(syncEditorPaneWidth);
    observer.observe(workspace);
    return () => observer.disconnect();
  }, []);

  const deferredDocument = useDeferredValue(document);
  const previewDocument = useMemo(() => {
    const template = templates.find((item) => item.id === document.templateId);
    return {
      ...deferredDocument,
      templateId: document.templateId,
      templateName: template?.name ?? document.templateName,
      primaryColor: template?.primaryColor ?? document.primaryColor,
      secondaryColor: template?.secondaryColor ?? document.secondaryColor,
      logoUrl: template?.logoUrl ?? document.logoUrl ?? null,
    };
  }, [
    deferredDocument,
    document.templateId,
    document.templateName,
    document.primaryColor,
    document.secondaryColor,
    document.logoUrl,
    templates,
  ]);
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
  const previewPaletteStyle = useMemo(
    () => reportPaletteStyle(previewDocument.primaryColor, previewDocument.secondaryColor) as CSSProperties,
    [previewDocument.primaryColor, previewDocument.secondaryColor],
  );
  const componentGroups = useMemo(
    () => groupMarkdownComponentsByCategory(visibleMarkdownComponents),
    [visibleMarkdownComponents],
  );
  const selectedMarkdownComponentPreview = useMemo(() => {
    const previewProperties = { ...componentPropertyValues };
    if (selectedMarkdownComponent.pickerAction === "image-upload" && !previewProperties.src?.startsWith("http")) {
      previewProperties.src = "/portulan-logo.png";
    }
    if (selectedMarkdownComponent.pickerAction === "file-upload" && !previewProperties.url?.startsWith("http")) {
      previewProperties.url = "https://example.com/especificacao.pdf";
      previewProperties.name = previewProperties.name || "especificacao.pdf";
      previewProperties.title = previewProperties.title || "Especificação técnica";
    }
    return applyComponentProperties(selectedMarkdownComponent.preview, previewProperties);
  }, [selectedMarkdownComponent, componentPropertyValues]);
  const canInsertSelectedComponent = useMemo(() => {
    if (selectedMarkdownComponent.pickerAction === "image-upload") {
      return Boolean(componentPropertyValues.src?.startsWith("http"));
    }
    if (selectedMarkdownComponent.pickerAction === "file-upload") {
      return Boolean(componentPropertyValues.url?.startsWith("http") && componentPropertyValues.name?.trim());
    }
    if (selectedMarkdownComponent.pickerAction === "report-select") {
      return Boolean(componentPropertyValues.slug && componentPropertyValues.title);
    }
    return true;
  }, [selectedMarkdownComponent, componentPropertyValues]);

  function patch<K extends keyof DocumentRecord>(key: K, value: DocumentRecord[K]) {
    setDocument((current) => ({ ...current, [key]: value }));
  }

  function applyMarkdownShortcut(format: "bold" | "italic" | "link") {
    const editor = markdownEditorRef.current;
    if (!editor) return;

    const { selectionStart, selectionEnd } = editor;
    const result = applyMarkdownFormat(document.content, selectionStart, selectionEnd, format);
    patch("content", result.content);
    requestAnimationFrame(() => {
      editor.focus();
      editor.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  }

  function applyMarkdownIndentation(outdent: boolean) {
    const editor = markdownEditorRef.current;
    if (!editor) return;

    const { selectionStart, selectionEnd } = editor;
    const result = applyMarkdownIndent(document.content, selectionStart, selectionEnd, outdent);
    patch("content", result.content);
    requestAnimationFrame(() => {
      editor.focus();
      editor.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  }

  function handleMarkdownKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!canEdit) return;

    if (event.key === "Tab") {
      event.preventDefault();
      applyMarkdownIndentation(event.shiftKey);
      return;
    }

    const shortcut = isMarkdownShortcut(event.nativeEvent);
    if (!shortcut) return;

    event.preventDefault();
    if (shortcut === "component-picker") {
      openComponentPicker();
      return;
    }
    applyMarkdownShortcut(shortcut);
  }

  function openComponentPicker() {
    const editor = markdownEditorRef.current;
    markdownSelectionRef.current = {
      start: editor?.selectionStart ?? document.content.length,
      end: editor?.selectionEnd ?? document.content.length,
    };
    setComponentSearch("");
    setReportLinkSearch("");
    setSelectedMarkdownComponentId(markdownComponents[0].id);
    setComponentPropertyValues(defaultComponentProperties(markdownComponents[0]));
    setComponentPickerOpen(true);
    startTransition(async () => {
      const result = await listLinkableDocumentsAction(document.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setLinkableDocuments(result.documents);
    });
  }

  function insertMarkdownComponent(component: MarkdownComponent) {
    const { start, end } = markdownSelectionRef.current;
    const selectedText = document.content.slice(start, end);
    const placeholder = "{{conteúdo}}";
    const configuredSnippet = applyComponentProperties(component.snippet, componentPropertyValues);
    const placeholderText = component.pickerAction === "image-upload"
      ? selectedText
      : (selectedText || "Escreva aqui.");
    const placeholderIndex = configuredSnippet.indexOf(placeholder);
    const snippet = configuredSnippet.replace(placeholder, placeholderText);
    const prefix = start > 0 && !document.content.slice(0, start).endsWith("\n\n") ? "\n\n" : "";
    const suffix = end < document.content.length && !document.content.slice(end).startsWith("\n\n") ? "\n\n" : "";
    const content = `${document.content.slice(0, start)}${prefix}${snippet}${suffix}${document.content.slice(end)}`;
    const cursorStart = start + prefix.length + Math.max(placeholderIndex, 0);
    const cursorEnd = cursorStart + placeholderText.length;

    patch("content", content);
    setComponentPickerOpen(false);
    requestAnimationFrame(() => {
      markdownEditorRef.current?.focus();
      markdownEditorRef.current?.setSelectionRange(cursorStart, cursorEnd);
    });
  }

  function insertFigureAtCursor(input: { url: string; alt: string; start: number; end: number }) {
    const imageComponent = markdownComponents.find((component) => component.id === "image");
    if (!imageComponent) return;

    const selectedCaption = document.content.slice(input.start, input.end);
    const properties = {
      ...defaultComponentProperties(imageComponent),
      src: input.url,
      alt: input.alt,
    };
    const snippet = applyComponentProperties(imageComponent.snippet, properties).replace("{{conteúdo}}", selectedCaption);
    const prefix = input.start > 0 && !document.content.slice(0, input.start).endsWith("\n\n") ? "\n\n" : "";
    const suffix = input.end < document.content.length && !document.content.slice(input.end).startsWith("\n\n") ? "\n\n" : "";
    const content = `${document.content.slice(0, input.start)}${prefix}${snippet}${suffix}${document.content.slice(input.end)}`;
    const cursorPos = input.start + prefix.length + snippet.length;

    patch("content", content);
    requestAnimationFrame(() => {
      markdownEditorRef.current?.focus();
      markdownEditorRef.current?.setSelectionRange(cursorPos, cursorPos);
    });
  }

  async function handleMarkdownPaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    if (!canEdit || pasteImageUploadingRef.current) return;

    const imageItem = Array.from(event.clipboardData?.items ?? []).find((item) => item.type.startsWith("image/"));
    if (!imageItem) return;

    event.preventDefault();

    const editor = markdownEditorRef.current;
    if (!editor) return;

    const rawFile = imageItem.getAsFile();
    if (!rawFile) {
      toast.error("Não foi possível ler a imagem da área de transferência.");
      return;
    }

    const extension = rawFile.type.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
    const file = rawFile.name.trim()
      ? rawFile
      : new File([rawFile], `imagem.${extension}`, { type: rawFile.type });

    const validation = validateBlobImage(file);
    if (!validation.ok) {
      toast.error(validation.error);
      return;
    }

    const { selectionStart, selectionEnd } = editor;
    const altFromSelection = document.content.slice(selectionStart, selectionEnd).trim();
    const altFromName = file.name.replace(/\.[^.]+$/, "").trim();
    const alt = altFromSelection || altFromName || "Imagem colada";

    pasteImageUploadingRef.current = true;
    try {
      const url = await uploadBlobImage({
        file,
        purpose: "report-image",
        documentId: document.id,
      });
      insertFigureAtCursor({ url, alt, start: selectionStart, end: selectionEnd });
      toast.success(
        url.startsWith("/api/blob/asset")
          ? "Imagem salva localmente (Vercel Blob indisponível)"
          : "Imagem colada",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a imagem.");
    } finally {
      pasteImageUploadingRef.current = false;
    }
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
      logoUrl: template.logoUrl,
    }));
  }

  const savePayload = useCallback(
    () => ({
      title: document.title,
      summary: document.summary,
      templateId: document.templateId,
      status: document.status,
      author: document.author,
      team: document.team,
      tags: document.tags,
      content: document.content,
    }),
    [document],
  );

  const save = useCallback(() => {
    if (!canEdit || !dirty) return;
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
  }, [canEdit, dirty, document.id, savePayload]);

  useEffect(() => {
    if (!canEdit) return;

    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        save();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canEdit, save]);

  useEffect(() => {
    if (!canEdit || !dirty) return;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [canEdit, dirty]);

  async function ensureSavedForExport() {
    if (!dirty) return document;
    const result = await updateDocumentAction(document.id, savePayload());
    if (!result.ok) {
      toast.error(result.error);
      return null;
    }
    setDocument(result.document);
    setSavedDocument(result.document);
    return result.document;
  }

  async function exportPdf() {
    setExporting(true);
    try {
      const current = await ensureSavedForExport();
      if (!current) return;

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

  async function exportReleasePdf(release: DocumentRelease) {
    setExportingReleaseId(release.id);
    try {
      const response = await fetch(`/api/documents/${document.id}/releases/${release.id}/pdf`);
      if (!response.ok) throw new Error("Não foi possível gerar o PDF");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = `${document.slug}-v${release.version}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("PDF gerado", {
        description: `Versão v${release.version} baixada com cabeçalho e rodapé em todas as páginas.`,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar o PDF");
    } finally {
      setExportingReleaseId(null);
    }
  }

  async function exportMarkdown() {
    setExporting(true);
    try {
      const current = await ensureSavedForExport();
      if (!current) return;

      const blob = new Blob([current.content], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = `${current.slug}.md`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Markdown baixado", { description: "O arquivo .md foi salvo no seu dispositivo." });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível baixar o Markdown");
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

  function changeDocumentVisibility(visibility: DocumentVisibility) {
    startTransition(async () => {
      const result = await setDocumentVisibilityAction(document.id, visibility);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDocument(result.document);
      setSavedDocument(result.document);
      toast.success(`Carta em ${documentVisibilityMeta[visibility].label.toLowerCase()}`, {
        description: documentVisibilityMeta[visibility].blurb,
      });
    });
  }

  function moveDocumentToWorkspace(workspaceId: string) {
    startTransition(async () => {
      const result = await setDocumentWorkspaceAction(document.id, workspaceId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDocument(result.document);
      setSavedDocument(result.document);
      toast.success("Carta movida de porto");
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
          ? "Todos os links deste documento exibem uma mensagem de indisponibilidade."
          : "O acesso foi restaurado conforme as versões ativas.",
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

  function restoreRelease(releaseId: string, version: number) {
    startTransition(async () => {
      const result = await restoreDocumentReleaseAction(document.id, releaseId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDocument(result.document);
      setSavedDocument(result.document);
      toast.success(`Rascunho restaurado a partir da v${version}`, {
        description: "O conteúdo publicado foi copiado para o rascunho. Use Publicar para gerar uma nova versão.",
      });
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
          description: result.document.visibility === "public"
            ? `Link estável copiado. Use ${pinnedUrl} para fixar esta versão.`
            : `Link estável copiado. A carta segue em ${documentVisibilityMeta[result.document.visibility].label.toLowerCase()}.`,
        });
      } catch {
        toast.success("Versão publicada", {
          description: result.document.visibility === "public"
            ? `Link estável: ${stableUrl}. Versão fixa: ${pinnedUrl}`
            : `Link estável: ${stableUrl}. A carta segue em ${documentVisibilityMeta[result.document.visibility].label.toLowerCase()}.`,
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
      toast.message("Link copiado", { description: url });
    }
  }

  function startSplitResize(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const workspace = workspaceRef.current;
    if (!workspace) return;

    setSplitDragging(true);
    window.document.body.style.cursor = "col-resize";
    window.document.body.style.userSelect = "none";

    const onMove = (moveEvent: PointerEvent) => {
      const rect = workspace.getBoundingClientRect();
      const nextWidth = moveEvent.clientX - rect.left;
      setEditorPaneWidth(clampEditorPaneWidth(nextWidth, rect.width));
    };

    const onUp = () => {
      setSplitDragging(false);
      window.document.body.style.cursor = "";
      window.document.body.style.userSelect = "";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    onMove(event.nativeEvent);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
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
    <DocumentCommentsBoundary documentId={document.id} currentUserId={currentUserId} content={document.content}>
    <div className="editor-shell">
      <header className="editor-topbar no-print">
        <div className="editor-topbar-inner">
        <div className="editor-context flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon-sm" asChild><Link href="/biblioteca" aria-label="Voltar à biblioteca"><ArrowLeft /></Link></Button>
          <div className="min-w-0">
            <strong className="block truncate text-sm">{document.title}</strong>
            <small className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{dirty ? "Alterações não salvas" : `Salvo ${formatRelativeDate(document.updatedAt)}`}</small>
          </div>
        </div>
        <div className="editor-actions flex items-center gap-2">
          {documentCollaborators.length ? (
            <DocumentCollaboratorAvatars
              collaborators={documentCollaborators}
              className="hidden md:flex"
              onClick={isOwner ? () => setShareDialogOpen(true) : undefined}
            />
          ) : null}
          <div className="editor-actions-group">
          {canEdit ? (
            <>
              {dirty ? (
                <Button onClick={() => save()} disabled={pending}>
                  {pending ? <LoaderCircle className="animate-spin" /> : <Save />}
                  <span className="hidden sm:inline">{pending ? "Salvando" : "Salvar"}</span>
                </Button>
              ) : null}
              {canPublish ? (
                <Button variant="outline" onClick={publish} disabled={pending}>
                  <Globe />
                  <span className="hidden sm:inline">Publicar</span>
                </Button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button variant="outline" disabled>
                        <Globe />
                        <span className="hidden sm:inline">Publicar</span>
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={6}>Não há alterações em relação à última versão publicada</TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  {isOwner ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label={`${documentVisibilityMeta[document.visibility].label}. Alterar visibilidade.`}
                      onClick={() => setShareDialogOpen(true)}
                      disabled={pending}
                    >
                      <VisibilityIcon visibility={document.visibility} />
                    </Button>
                  ) : (
                    <span className="inline-flex">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        disabled
                        aria-label={documentVisibilityMeta[document.visibility].label}
                      >
                        <VisibilityIcon visibility={document.visibility} />
                      </Button>
                    </span>
                  )}
                </TooltipTrigger>
                <TooltipContent sideOffset={6}>
                  {`${documentVisibilityMeta[document.visibility].label} — ${documentVisibilityMeta[document.visibility].blurb}`}
                  {isOwner ? ". Clique para alterar." : ""}
                </TooltipContent>
              </Tooltip>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="Mais ações"><MoreHorizontal /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={openDraftPreview}><Eye />Abrir prévia</DropdownMenuItem>
                  <DropdownMenuItem onClick={exportPdf} disabled={exporting || pending}>
                    {exporting ? <LoaderCircle className="animate-spin" /> : <Download />}
                    {exporting ? "Gerando PDF" : "Exportar PDF"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportMarkdown} disabled={exporting || pending}>
                    <FileText />
                    Baixar Markdown
                  </DropdownMenuItem>
                  {isOwner ? <DropdownMenuItem onClick={() => setShareDialogOpen(true)}><Share2 />Compartilhar</DropdownMenuItem> : null}
                  <DropdownMenuSeparator />
                  {isOwner ? <DropdownMenuItem onClick={duplicate}><Copy />Duplicar documento</DropdownMenuItem> : null}
                  {isOwner ? (
                    document.disabled ? (
                      <DropdownMenuItem onClick={() => toggleDocumentDisabled(false)}><RotateCcw />Reativar documento</DropdownMenuItem>
                    ) : (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem variant="destructive" onSelect={(event) => event.preventDefault()}><Ban />Desativar documento</DropdownMenuItem>
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
                    )
                  ) : null}
                  {isOwner ? (
                    <>
                      <DropdownMenuSeparator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild><DropdownMenuItem variant="destructive" onSelect={(event) => event.preventDefault()}><Trash2 />Excluir documento</DropdownMenuItem></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Excluir este documento?</AlertDialogTitle><AlertDialogDescription>“{document.title}” será removido permanentemente. Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={remove}>Excluir definitivamente</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="Mais ações"><MoreHorizontal /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={openDraftPreview}><Eye />Abrir prévia</DropdownMenuItem>
                <DropdownMenuItem onClick={exportPdf} disabled={exporting || pending}>
                  {exporting ? <LoaderCircle className="animate-spin" /> : <Download />}
                  {exporting ? "Gerando PDF" : "Exportar PDF"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportMarkdown} disabled={exporting || pending}>
                  <FileText />
                  Baixar Markdown
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          </div>
        </div>
        </div>
      </header>
      {isOwner ? (
        <DocumentShareDialog
          documentId={document.id}
          visibility={document.visibility}
          workspaceName={workspaces.find((workspace) => workspace.id === document.workspaceId)?.name ?? null}
          onVisibilityChange={(visibility) => {
            setDocument((current) => ({ ...current, visibility, isPublic: visibility === "public" }));
            setSavedDocument((current) => ({ ...current, visibility, isPublic: visibility === "public" }));
          }}
          initialCollaborators={documentCollaborators}
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          onCollaboratorsChange={setDocumentCollaborators}
          hideTrigger
        />
      ) : null}

      <main
        ref={workspaceRef}
        className="editor-workspace"
        style={
          editorPaneWidth !== null
            ? { gridTemplateColumns: `${editorPaneWidth}px ${SPLIT_HANDLE_WIDTH}px minmax(0, 1fr)` }
            : undefined
        }
      >
        <section className="editor-pane no-print">
          <div className="editor-document-heading">
            <div className="flex flex-wrap items-center gap-2">
              <TemplateBadge name={document.templateName} primaryColor={document.primaryColor} secondaryColor={document.secondaryColor} />
              <StatusBadge status={document.status} />
              <VisibilityBadge visibility={document.visibility} />
              {document.disabled ? <DisabledBadge /> : null}
            </div>
            <Textarea className="editor-title-input" value={document.title} onChange={(event) => patch("title", event.target.value)} aria-label="Título do documento" readOnly={!canEdit} />
            <Textarea className="editor-summary-input" value={document.summary} onChange={(event) => patch("summary", event.target.value)} placeholder="Resumo executivo do documento…" aria-label="Resumo do documento" readOnly={!canEdit} />
          </div>
          <Tabs defaultValue="content" className="editor-tabs">
            <TabsList variant="line" className="editor-tabs-list"><TabsTrigger value="content"><FileText />Conteúdo</TabsTrigger>{currentUserId ? <TabsTrigger value="review"><EditorReviewTabLabel /></TabsTrigger> : null}<TabsTrigger value="metadata"><Tags />Metadados</TabsTrigger><TabsTrigger value="history"><History />Histórico</TabsTrigger></TabsList>
            <TabsContent value="content" className="editor-tab-content editor-tab-content-markdown">
              <div className="markdown-hint">
                <span>Markdown</span>
                {canEdit ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="sm" onClick={openComponentPicker}><Plus />Adicionar componente</Button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6}>⌘⇧C / Ctrl+Shift+C</TooltipContent>
                  </Tooltip>
                ) : null}
              </div>
              <Textarea ref={markdownEditorRef} className="markdown-editor" value={document.content} onChange={(event) => patch("content", event.target.value)} onKeyDown={handleMarkdownKeyDown} onPaste={handleMarkdownPaste} spellCheck={false} aria-label="Conteúdo em Markdown" readOnly={!canEdit} />
            </TabsContent>
            {currentUserId ? (
              <TabsContent value="review" className="editor-tab-content review-tab-content">
                <DocumentReviewPanel />
              </TabsContent>
            ) : null}
            <TabsContent value="metadata" className="editor-tab-content metadata-form">
              <section className="metadata-properties" aria-label="Propriedades">
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
                <Field label="Tags" className="metadata-field--full"><Input value={document.tags.join(", ")} onChange={(event) => patch("tags", event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean))} placeholder="pagamentos, api, arquitetura" readOnly={!canEdit} aria-describedby="metadata-tags-hint" /><p id="metadata-tags-hint">Separe as tags por vírgula.</p></Field>
              </section>
              {isOwner ? (
                <section className="metadata-actions" aria-label="Ações do documento">
                  <div className="metadata-action-panel">
                    <h3 className="metadata-action-panel__title">Visibilidade</h3>
                    <p>{documentVisibilityMeta[document.visibility].blurb}.</p>
                    <div className="metadata-action-panel__footer metadata-visibility-choices">
                      {documentVisibilities.map((level) => (
                        <Button
                          key={level}
                          type="button"
                          variant={document.visibility === level ? "default" : "outline"}
                          size="sm"
                          onClick={() => changeDocumentVisibility(level)}
                          disabled={pending || (level === "workspace" && !document.workspaceId)}
                        >
                          <VisibilityIcon visibility={level} />
                          {documentVisibilityMeta[level].label}
                        </Button>
                      ))}
                    </div>
                    {workspaces.length > 1 ? (
                      <div className="metadata-action-panel__footer">
                        <Select value={document.workspaceId ?? ""} onValueChange={moveDocumentToWorkspace} disabled={pending}>
                          <SelectTrigger aria-label="Porto da carta"><SelectValue placeholder="Sem porto" /></SelectTrigger>
                          <SelectContent>
                            {workspaces.map((workspace) => (
                              <SelectItem key={workspace.id} value={workspace.id}>{workspace.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                  </div>
                  <div className="metadata-action-panel metadata-action-panel--destructive">
                    <h3 className="metadata-action-panel__title">Interromper links</h3>
                    <p>
                      {document.disabled
                        ? "Este documento está desativado. Links /d/ e /p/ exibem mensagem de indisponibilidade."
                        : "Desative para interromper /d e /p sem excluir o documento, inclusive para convidados nessas URLs."}
                    </p>
                    <div className="metadata-action-panel__footer">
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
                  </div>
                </section>
              ) : null}
              <dl className="metadata-summary">
                <dt>ID</dt><dd><code>{document.id}</code></dd>
                <dt>Link estável</dt><dd><code>{document.slug}</code></dd>
                <dt>Versão</dt><dd><code>{document.version}</code></dd>
              </dl>
            </TabsContent>
            <TabsContent value="history" className="editor-tab-content version-history">
              <div className="version-history-heading split-row">
                <div className="split-row__main">
                  <span>Versões publicadas</span>
                  <p>Salvar atualiza apenas o rascunho. Cada publicação cria um snapshot imutável e um novo link de versão fixa.</p>
                </div>
                <div className="version-history-heading-actions split-row__actions split-row__actions--stacked">
                  <strong>{releases.length} {releases.length === 1 ? "versão" : "versões"}</strong>
                  {releases.length > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        openVersionDiff(
                          releaseSideId(releases[1]!.id),
                          releaseSideId(releases[0]!.id),
                        )
                      }
                    >
                      <GitCompareArrows />
                      Comparar releases
                    </Button>
                  ) : null}
                </div>
              </div>
              {canPublish && latestRelease ? (
                <div className="version-history-pending split-row">
                  <div className="split-row__main">
                    <strong>Rascunho com alterações não publicadas</strong>
                    <span>Compare o rascunho atual com a última versão publicada antes de publicar.</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openVersionDiff(releaseSideId(latestRelease.id), "draft")}
                  >
                    <GitCompareArrows />
                    Comparar com v{latestRelease.version}
                  </Button>
                </div>
              ) : null}
              {releases.length ? (
                <section className="version-history-catalog" aria-label="Links publicados">
                  <div className="version-history-stable split-row">
                    <div className="split-row__main">
                      <strong>Link estável (UUID — sempre a última versão)</strong>
                      <span>
                        {document.visibility === "public"
                          ? "Identificador fixo; qualquer pessoa com o link vê a última versão publicada."
                          : document.visibility === "workspace"
                            ? "Identificador fixo; a tripulação do porto e os convidados abrem este link."
                            : "Identificador fixo; só o cartógrafo e convidados autenticados abrem este link."}
                      </span>
                      <code>/d/{document.slug}</code>
                    </div>
                    <div className="version-history-actions split-row__actions">
                      <Button type="button" variant="outline" size="sm" onClick={() => copyShareUrl(`/d/${document.slug}`, "Link estável")}><Link2 />Copiar link</Button>
                      <Button type="button" variant="outline" size="sm" asChild><Link href={`/d/${document.slug}`} target="_blank"><ExternalLink />Abrir</Link></Button>
                    </div>
                  </div>
                  <ol className="version-history-list">
                    {releases.map((release) => (
                      <li key={release.id} className={cn("split-row", release.disabled && "version-history-item-disabled")}>
                        <div className="split-row__main">
                          <strong>
                            v{release.version} · versão fixa
                            {release.disabled ? " · desativada" : ""}
                          </strong>
                          <span>
                            Publicada em {formatRelativeDate(release.publishedAt)}
                            {release.publishedByLogin || release.publishedByName
                              ? ` · por ${release.publishedByLogin ?? release.publishedByName}`
                              : ""}
                          </span>
                          <code>/p/{release.id}</code>
                        </div>
                        <div className="version-history-actions split-row__actions">
                          <Button type="button" variant="outline" size="sm" onClick={() => copyShareUrl(`/p/${release.id}`, `Versão fixa v${release.version}`)}><Link2 />Copiar link</Button>
                          <Button type="button" variant="outline" size="sm" asChild><Link href={`/p/${release.id}`} target="_blank"><ExternalLink />Abrir</Link></Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="outline" size="sm" aria-label={`Mais ações da versão v${release.version}`}>
                                <MoreHorizontal />
                                Mais
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => exportReleasePdf(release)}
                                disabled={exportingReleaseId === release.id || pending}
                              >
                                {exportingReleaseId === release.id ? <LoaderCircle className="animate-spin" /> : <Download />}
                                {exportingReleaseId === release.id ? "Gerando PDF" : "Baixar PDF"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  openVersionDiff(
                                    releaseSideId(release.id),
                                    canPublish ? "draft" : releaseSideId((releases.find((item) => item.id !== release.id) ?? release).id),
                                  )
                                }
                              >
                                <GitCompareArrows />
                                Comparar
                              </DropdownMenuItem>
                              {canEdit ? (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(event) => event.preventDefault()} disabled={pending || document.disabled}>
                                      <Undo2 />
                                      Restaurar no rascunho
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Restaurar v{release.version} no rascunho?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        O conteúdo, metadados e template desta versão publicada substituirão o rascunho atual. As versões já publicadas não são alteradas — use Publicar depois para registrar uma nova release.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => restoreRelease(release.id, release.version)}>Restaurar no rascunho</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              ) : null}
                              {canEdit ? (
                                release.disabled ? (
                                  <DropdownMenuItem onClick={() => toggleReleaseDisabled(release.id, false)} disabled={pending || document.disabled}>
                                    <RotateCcw />
                                    Reativar versão
                                  </DropdownMenuItem>
                                ) : (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem variant="destructive" onSelect={(event) => event.preventDefault()} disabled={pending || document.disabled}>
                                        <Ban />
                                        Desativar versão
                                      </DropdownMenuItem>
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
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              ) : (
                <div className="version-history-empty">Ainda não há versões publicadas. Use “Publicar” quando quiser registrar a primeira versão.</div>
              )}
            </TabsContent>
          </Tabs>
        </section>
        <div
          className="editor-split-handle no-print"
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionar editor e visualização"
          data-dragging={splitDragging || undefined}
          onPointerDown={startSplitResize}
        />
        <section className="preview-pane">
          <div className="preview-label no-print"><span>Visualização</span><small>Selecione um trecho ou use o marcador ao lado do bloco para comentar</small></div>
          <div className="preview-with-comments">
            <PreviewCommentsHost>
              <ReportPreview document={previewDocument} interactive persistable={canEdit} onContentChange={(content) => patch("content", content)} />
            </PreviewCommentsHost>
            {currentUserId ? <PreviewCommentRail /> : null}
          </div>
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
              {componentGroups.map(({ category, components }) => (
              <section className="markdown-component-section" key={category}>
                <div className="markdown-component-category">{category}</div>
                <div className="markdown-component-grid">
                  {components.map((component) => (
                    <button
                      type="button"
                      className="markdown-component-option"
                      data-active={component.id === selectedMarkdownComponent.id || undefined}
                      key={component.id}
                      onClick={() => {
                        setSelectedMarkdownComponentId(component.id);
                        setComponentPropertyValues(defaultComponentProperties(component));
                      }}
                    >
                      <Blocks />
                      <span><strong>{component.name}</strong><small>{component.description}</small></span>
                    </button>
                  ))}
                </div>
              </section>
              ))}
              {!visibleMarkdownComponents.length ? <p className="markdown-component-empty">Nenhum componente encontrado.</p> : null}
            </div>
            <aside className="markdown-component-preview-panel">
              <div className="markdown-component-category">Prévia</div>
              <div className="markdown-component-preview"><article className="report-paper markdown-component-preview-paper living-document" style={previewPaletteStyle}><div className="tmpl-body report-content"><RichMarkdown source={selectedMarkdownComponentPreview} interactive /></div></article></div>
              <strong>{selectedMarkdownComponent.name}</strong>
              <p>{selectedMarkdownComponent.description}</p>
              {selectedMarkdownComponent.pickerAction === "image-upload" ? (
                <div className="markdown-component-picker-action">
                  <span>Arquivo</span>
                  <BlobImageUpload
                    purpose="report-image"
                    documentId={document.id}
                    label="Enviar imagem"
                    disabled={pending}
                    onUploaded={(url) => setComponentPropertyValues((current) => ({ ...current, src: url }))}
                  />
                  {!componentPropertyValues.src?.startsWith("http") ? (
                    <p className="markdown-component-picker-hint">Envie uma imagem para habilitar a inserção.</p>
                  ) : null}
                </div>
              ) : null}
              {selectedMarkdownComponent.pickerAction === "file-upload" ? (
                <div className="markdown-component-picker-action">
                  <span>Arquivo</span>
                  <BlobFileUpload
                    documentId={document.id}
                    label="Enviar arquivo"
                    disabled={pending}
                    onUploaded={({ url, name }) => setComponentPropertyValues((current) => ({
                      ...current,
                      url,
                      name,
                      title: current.title?.trim() || name.replace(/\.[^.]+$/, ""),
                    }))}
                  />
                  {!componentPropertyValues.url?.startsWith("http") ? (
                    <p className="markdown-component-picker-hint">Envie um arquivo (qualquer tipo, até 5 MB) para habilitar a inserção.</p>
                  ) : null}
                </div>
              ) : null}
              {selectedMarkdownComponent.pickerAction === "report-select" ? (
                <div className="markdown-component-report-picker">
                  <span>Relatório publicado</span>
                  <Input
                    value={reportLinkSearch}
                    onChange={(event) => setReportLinkSearch(event.target.value)}
                    placeholder="Buscar relatório…"
                    aria-label="Buscar relatório"
                  />
                  <div className="markdown-component-report-list">
                    {pending && !linkableDocuments.length ? (
                      <p className="markdown-component-picker-hint">Carregando relatórios…</p>
                    ) : null}
                    {!pending && !visibleLinkableDocuments.length ? (
                      <p className="markdown-component-picker-hint">Nenhum relatório publicado encontrado.</p>
                    ) : null}
                    {visibleLinkableDocuments.map((item) => (
                      <ReportLinkCard
                        key={item.id}
                        slug={item.slug}
                        title={item.title}
                        summary={item.summary}
                        templateName={item.templateName}
                        primaryColor={item.primaryColor}
                        secondaryColor={item.secondaryColor}
                        interactive
                        selected={componentPropertyValues.slug === item.slug}
                        onSelect={() => setComponentPropertyValues({
                          slug: item.slug,
                          title: item.title,
                          summary: item.summary,
                        })}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              {selectedMarkdownComponent.properties?.some((property) => property.options?.length) ? <div className="markdown-component-controls"><span>Testar propriedades</span>{selectedMarkdownComponent.properties.filter((property) => property.options?.length).map((property) => <label key={property.name}><code>{property.name}</code><select value={componentPropertyValues[property.name] ?? property.defaultValue ?? property.options?.[0] ?? ""} onChange={(event) => setComponentPropertyValues((current) => ({ ...current, [property.name]: event.target.value }))}>{property.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>)}</div> : null}
              {selectedMarkdownComponent.properties?.length ? <div className="markdown-component-details"><span>Propriedades</span>{selectedMarkdownComponent.properties.map((property) => <div key={property.name}><code>{property.name}</code><small>{property.values}</small></div>)}</div> : null}
              {selectedMarkdownComponent.rules?.length ? <div className="markdown-component-details"><span>Regras</span><ul>{selectedMarkdownComponent.rules.map((rule) => <li key={rule}>{rule}</li>)}</ul></div> : null}
            </aside>
          </div>
          <DialogFooter className="markdown-component-dialog-footer"><Button type="button" variant="outline" onClick={() => setComponentPickerOpen(false)}>Cancelar</Button><Button type="button" disabled={!canInsertSelectedComponent} onClick={() => insertMarkdownComponent(selectedMarkdownComponent)}><Plus />Inserir componente</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <VersionDiffDialog
        open={versionDiffOpen}
        onOpenChange={setVersionDiffOpen}
        document={document}
        releases={releases}
        initialLeft={versionDiffLeft}
        initialRight={versionDiffRight}
        canRestore={canEdit && !document.disabled}
        restorePending={pending}
        onRestore={(releaseId, version) => {
          restoreRelease(releaseId, version);
          setVersionDiffOpen(false);
        }}
      />
    </div>
    </DocumentCommentsBoundary>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className ? `metadata-field ${className}` : "metadata-field"}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function EditorReviewTabLabel() {
  const comments = useOptionalDocumentComments();
  const count = comments?.threads.length ?? 0;
  return (
    <>
      <MessageSquare />Revisão
      {count ? <span className="editor-tab-count">{count}</span> : null}
    </>
  );
}
