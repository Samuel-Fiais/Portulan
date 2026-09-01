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
import { templates, typeMeta, type DocumentType } from "@/lib/documents";
import { cn } from "@/lib/utils";

export function NewDocumentDialog({ trigger }: { trigger?: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<DocumentType>("report");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
  }

  function submit() {
    startTransition(async () => {
      const template = templates[type];
      const result = await createDocumentAction({
        ...template,
        title,
        summary: summary || template.summary,
        author: "Samuel Fiais",
        team: "Festlab",
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger ?? <Button><FilePlus2 />Novo documento</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo documento</DialogTitle>
          <DialogDescription>Comece com uma estrutura pensada para o tipo de comunicação.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 py-2 sm:grid-cols-4">
          {(Object.keys(typeMeta) as DocumentType[]).map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => setType(item)}
              className={cn("template-choice", type === item && "active")}
            >
              <span className={cn("template-choice-line", `type-${item}`)} />
              <strong>{typeMeta[item].short}</strong>
              <small>{templates[item].tags.slice(0, 2).join(" · ")}</small>
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-title">Título</Label>
          <Input id="new-title" autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Relatório de estabilidade — agosto" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-summary">Resumo <span className="text-muted-foreground">(opcional)</span></Label>
          <Textarea id="new-summary" value={summary} onChange={(event) => setSummary(event.target.value)} placeholder={templates[type].summary} rows={3} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={pending || title.trim().length < 3}>
            {pending ? "Criando…" : "Criar e editar"}<ArrowRight />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
