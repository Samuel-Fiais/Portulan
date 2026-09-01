"use client";

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
        summary: summary || "Resumo do documento.",
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
      toast.success("Documento criado");
      router.push(`/documents/${result.document.id}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button><FilePlus2 />Novo documento</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo documento</DialogTitle>
          <DialogDescription>Escolha um template com as cores editoriais do documento.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 py-2 sm:grid-cols-3">
          {templates.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setTemplateId(item.id)}
              className={cn("template-choice", templateId === item.id && "active")}
            >
              <span
                className="template-choice-line"
                style={{ background: `linear-gradient(90deg, ${item.primaryColor}, ${item.secondaryColor})` }}
              />
              <strong>{item.name}</strong>
              <small>{item.isBuiltin ? "Padrão Portulan" : "Template personalizado"}</small>
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-title">Título</Label>
          <Input id="new-title" autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Relatório de estabilidade — agosto" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-summary">Resumo <span className="text-muted-foreground">(opcional)</span></Label>
          <Textarea id="new-summary" value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Resumo executivo do documento…" rows={3} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={pending || title.trim().length < 3 || !selectedTemplate}>
            {pending ? "Criando…" : "Criar e editar"}<ArrowRight />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
