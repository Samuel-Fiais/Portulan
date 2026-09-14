"use client";

import "./workspace-dialogs.css";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, FilePlus2 } from "lucide-react";
import { toast } from "sonner";
import { createDocumentAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_TEMPLATE_ID, type TemplateRecord } from "@/lib/documents";
import { cn } from "@/lib/utils";

export function NewDocumentDialog({
  templates,
  trigger,
}: {
  templates: TemplateRecord[];
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const defaultTemplate = templates.find((item) => item.id === DEFAULT_TEMPLATE_ID) ?? templates[0];
  const [templateId, setTemplateId] = useState(defaultTemplate?.id ?? DEFAULT_TEMPLATE_ID);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");

  const selectedTemplate = templates.find((item) => item.id === templateId) ?? defaultTemplate;

  function submit() {
    if (!selectedTemplate) {
      toast.error("Selecione um template.");
      return;
    }

    startTransition(async () => {
      const result = await createDocumentAction({
        title,
        summary: summary || "Resumo da carta.",
        templateId: selectedTemplate.id,
        status: "draft",
        tags: [],
        content: selectedTemplate.content,
        author: "",
        team: "",
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      toast.success("Carta criada");
      router.push(`/documents/${result.document.id}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button><FilePlus2 />Nova carta</Button>}</DialogTrigger>
      <DialogContent className="workspace-dialog new-document-dialog sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova carta</DialogTitle>
          <DialogDescription>Escolha um gabarito com as cores editoriais da carta.</DialogDescription>
        </DialogHeader>
        <div className="template-choice-grid">
          {templates.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setTemplateId(item.id)}
              className={cn("template-choice", templateId === item.id && "active")}
              aria-pressed={templateId === item.id}
            >
              <span
                className="template-choice-line"
                style={{ background: `linear-gradient(90deg, ${item.primaryColor}, ${item.secondaryColor})` }}
              />
              <strong>{item.name}</strong>
              <small>{item.isBuiltin ? "Padrão Portulan" : "Gabarito personalizado"}</small>
            </button>
          ))}
        </div>
        <div className="field-stack">
          <div>
            <Label htmlFor="new-title">Título</Label>
            <Input id="new-title" autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Relatório de estabilidade — agosto" />
          </div>
          <div>
            <Label htmlFor="new-summary">Resumo <span className="normal-case tracking-normal">(opcional)</span></Label>
            <Textarea id="new-summary" value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Resumo executivo da carta…" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={pending || title.trim().length < 3 || !selectedTemplate}>
            {pending ? "Criando…" : "Criar e editar"}<ArrowRight />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
