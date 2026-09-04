"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createTemplateAction,
  deleteTemplateAction,
  updateTemplateAction,
} from "@/app/actions";
import { BlobImageUpload } from "@/components/blob-image-upload";
import { ColorPicker } from "@/components/color-picker";
import { ReportPreview } from "@/components/report-preview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_TEMPLATE_COLORS,
  type DocumentRecord,
  type TemplateRecord,
} from "@/lib/documents";
import { pickContrastInkColor } from "@/lib/color-utils";

export function TemplatesPanel({ templates }: { templates: TemplateRecord[] }) {
  return (
    <main className="page-wrap dashboard-main">
      <section className="doc-section">
        <div className="page-heading">
          <div>
            <h1 className="fp-h1">Templates editoriais</h1>
            <p className="fp-lead">
              Paleta, logo e conteúdo-base dos relatórios. O Default interno
              não pode ser excluído.
            </p>
          </div>
          <TemplateFormDialog />
        </div>
        <div className="fp-card-grid template-grid">
          {templates.map((template, index) => (
            <TemplateCard key={template.id} template={template} index={index} />
          ))}
        </div>
      </section>
    </main>
  );
}

function TemplateCard({
  template,
  index,
}: {
  template: TemplateRecord;
  index: number;
}) {
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
            color: pickContrastInkColor(
              template.primaryColor,
              template.secondaryColor,
            ),
          }}
        >
          {(index + 1).toString().padStart(2, "0")}
        </div>
        <h3>{template.name}</h3>
        <p>
          {template.isBuiltin
            ? "Template padrão Portulan (navy + burgundy)."
            : "Template personalizado com cores próprias."}
        </p>
        <div className="template-color-row">
          <span
            className="template-swatch"
            style={{ backgroundColor: template.primaryColor }}
            title="Cor primária"
          />
          <span
            className="template-swatch"
            style={{ backgroundColor: template.secondaryColor }}
            title="Cor secundária"
          />
          <code className="template-color-code">{template.primaryColor}</code>
          <code className="template-color-code">{template.secondaryColor}</code>
        </div>
        <div className="template-card-actions">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditOpen(true)}
          >
            <Pencil />
            Editar
          </Button>
          {!template.isBuiltin ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={remove}
              disabled={pending}
            >
              <Trash2 />
              Excluir
            </Button>
          ) : null}
        </div>
      </div>
      <TemplateFormDialog
        template={template}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
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
  const [primaryColor, setPrimaryColor] = useState<string>(
    template?.primaryColor ?? DEFAULT_TEMPLATE_COLORS.primary,
  );
  const [secondaryColor, setSecondaryColor] = useState<string>(
    template?.secondaryColor ?? DEFAULT_TEMPLATE_COLORS.secondary,
  );
  const [logoUrl, setLogoUrl] = useState(template?.logoUrl ?? "");

  const templatePreviewDocument = useMemo<DocumentRecord>(
    () => ({
      id: "template-preview",
      slug: "template-preview",
      title: name.trim() || "Título do relatório",
      summary: "Resumo de exemplo para visualizar cabeçalho, cores e logo.",
      templateId: template?.id ?? "template-preview",
      templateName: name.trim() || "Template",
      primaryColor,
      secondaryColor,
      logoUrl: logoUrl.trim() || null,
      status: "draft",
      author: "Equipe",
      team: "Produto",
      tags: [],
      content: "## Seção de exemplo\n\nConteúdo ilustrativo do relatório.",
      version: 1,
      userId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: null,
      disabled: false,
    }),
    [name, primaryColor, secondaryColor, logoUrl, template?.id],
  );

  useEffect(() => {
    if (!open) return;
    setName(template?.name ?? "");
    setPrimaryColor(template?.primaryColor ?? DEFAULT_TEMPLATE_COLORS.primary);
    setSecondaryColor(
      template?.secondaryColor ?? DEFAULT_TEMPLATE_COLORS.secondary,
    );
    setLogoUrl(template?.logoUrl ?? "");
  }, [open, template]);

  function submit() {
    startTransition(async () => {
      const payload = {
        name,
        primaryColor,
        secondaryColor,
        logoUrl: logoUrl.trim() ? logoUrl.trim() : null,
      };

      const result =
        isEdit && template
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
        setLogoUrl("");
      }
      toast.success(isEdit ? "Template atualizado" : "Template criado");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isEdit ? (
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Plus />
            Novo template
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="template-form-dialog">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar template" : "Novo template"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize o nome, as cores editoriais e, se quiser, envie um logo personalizado."
              : "Defina um nome, duas cores editoriais e, se quiser, envie um logo para cabeçalho e rodapé."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor={
                isEdit ? `template-name-${template?.id}` : "template-name"
              }
            >
              Nome
            </Label>
            <Input
              id={isEdit ? `template-name-${template?.id}` : "template-name"}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Relatório executivo"
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor={
                isEdit ? `template-logo-${template?.id}` : "template-logo"
              }
            >
              Logo (opcional)
            </Label>
            <div className="flex items-center gap-2">
              <BlobImageUpload
                purpose="template-logo"
                templateId={template?.id}
                label="Enviar logo"
                onUploaded={setLogoUrl}
                disabled={pending}
              />
              {logoUrl.trim() ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLogoUrl("")}
                >
                  Padrão
                </Button>
              ) : null}
              <Input
                id={isEdit ? `template-logo-${template?.id}` : "template-logo"}
                value={logoUrl}
                onChange={(event) => setLogoUrl(event.target.value)}
                placeholder="https://… ou envie um arquivo acima"
                type="url"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Envie um arquivo ou cole uma URL pública. Deixe em branco para
              usar a marca Portulan.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ColorPicker
              id={
                isEdit ? `template-primary-${template?.id}` : "template-primary"
              }
              label="Cor primária"
              value={primaryColor}
              onChange={setPrimaryColor}
            />
            <ColorPicker
              id={
                isEdit
                  ? `template-secondary-${template?.id}`
                  : "template-secondary"
              }
              label="Cor secundária"
              value={secondaryColor}
              onChange={setSecondaryColor}
              align="end"
            />
          </div>
          <div className="template-preview-shell">
            <Label>Prévia do template</Label>
            <div className="template-preview-frame">
              <ReportPreview document={templatePreviewDocument} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending || name.trim().length < 1}>
            {isEdit ? "Salvar alterações" : "Criar template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
