"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  addImplementationTaskSourceAction,
  deleteImplementationTaskSourceAction,
} from "@/app/dev-context-actions";
import { BoardId } from "@/components/board-id";
import type { CartaOption } from "@/components/context-pack-detail";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DOCUMENT_SOURCE_ROLE_LABELS, documentSourceRoles } from "@/lib/dev-context";
import type { ImplementationTaskSourceRecord } from "@/lib/db/implementation-task-sources";

export function TaskSourceSection({
  taskId,
  kindLabel,
  sources,
  documents,
}: {
  taskId: string;
  kindLabel: string;
  sources: ImplementationTaskSourceRecord[];
  documents: CartaOption[];
}) {
  const cartaById = new Map(documents.map((document) => [document.id, document]));

  return (
    <section className="manobra-panel">
      <div className="section-header split-row manobra-panel__header">
        <h2 className="manobra-panel__title">Cartas-fonte</h2>
        <AddTaskSourceDialog taskId={taskId} documents={documents} />
      </div>
      {sources.length === 0 ? (
        <p className="dev-empty">Nenhuma carta-fonte. Vincule referências ou a Carta de conclusão.</p>
      ) : (
        <ul className="rumo-dense-list">
          {sources.map((source) => {
            const carta = cartaById.get(source.documentId);
            const release = carta?.releases.find((item) => item.id === source.releaseId);
            return (
              <li key={source.id} className="rumo-dense-row">
                <BoardId number={source.boardNumber} />
                <span className="rumo-type-chip">{DOCUMENT_SOURCE_ROLE_LABELS[source.sourceRole]}</span>
                {source.releaseId ? (
                  <Link href={`/p/${source.releaseId}`}>{carta?.title ?? "Carta"}</Link>
                ) : (
                  <Link href={carta ? `/documents/${carta.slug}` : `/documents/${source.documentId}`}>
                    {carta?.title ?? "Carta"}
                  </Link>
                )}
                <span className="dev-item-meta">
                  {release ? `edição ${release.version}` : source.releaseId ? "edição fixada" : "carta viva"}
                  {source.reason ? ` · ${source.reason}` : ""}
                </span>
                <RemoveTaskSourceButton taskId={taskId} sourceId={source.id} label={carta?.title ?? kindLabel} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function RemoveTaskSourceButton({
  taskId,
  sourceId,
  label,
}: {
  taskId: string;
  sourceId: string;
  label: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={pending}
      aria-label={`Remover carta-fonte ${label}`.trim()}
      onClick={() =>
        start(async () => {
          const result = await deleteImplementationTaskSourceAction(taskId, sourceId);
          if (!result.ok) toast.error(result.error);
          else {
            toast.success("Carta-fonte removida");
            router.refresh();
          }
        })
      }
    >
      <Trash2 />
    </Button>
  );
}

function AddTaskSourceDialog({ taskId, documents }: { taskId: string; documents: CartaOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Vincular carta</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vincular carta-fonte</DialogTitle>
        </DialogHeader>
        <AddTaskSourceForm
          taskId={taskId}
          documents={documents}
          onSuccess={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function AddTaskSourceForm({
  taskId,
  documents,
  onSuccess,
}: {
  taskId: string;
  documents: CartaOption[];
  onSuccess?: () => void;
}) {
  const [documentId, setDocumentId] = useState(documents[0]?.id ?? "");
  const [releaseId, setReleaseId] = useState("__live__");
  const [required, setRequired] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const selected = documents.find((document) => document.id === documentId);
  const published = selected?.releases.filter((release) => !release.disabled) ?? [];
  const resolvedReleaseId = releaseId === "__live__" ? null : releaseId || null;
  const canSubmit = Boolean(documentId) && reason.trim() && (!required || Boolean(resolvedReleaseId));

  return (
    <form
      className="dev-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSubmit) return;
        start(async () => {
          const result = await addImplementationTaskSourceAction(taskId, {
            documentId,
            releaseId: resolvedReleaseId,
            sourceRole: documentSourceRoles[0],
            reason,
            required,
          });
          if (!result.ok) toast.error(result.error);
          else {
            toast.success("Carta-fonte vinculada");
            setReason("");
            onSuccess?.();
          }
        });
      }}
    >
      <div className="dev-field">
        <Label>Carta</Label>
        {documents.length === 0 ? (
          <p className="dev-empty">Abra uma Carta na Cartoteca para usá-la como fonte.</p>
        ) : (
          <Select
            value={documentId}
            onValueChange={(value) => {
              setDocumentId(value);
              const next = documents.find((document) => document.id === value);
              setReleaseId("__live__");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Escolha uma Carta" />
            </SelectTrigger>
            <SelectContent>
              {documents.map((document) => (
                <SelectItem key={document.id} value={document.id}>
                  {document.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="dev-field">
        <Label>Edição publicada</Label>
        {published.length === 0 ? (
          <p className="dev-empty">Esta Carta ainda não tem edição publicada. Use carta viva ou publique antes.</p>
        ) : (
          <Select value={releaseId} onValueChange={setReleaseId}>
            <SelectTrigger>
              <SelectValue placeholder="Opcional — carta viva se vazio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__live__">Carta viva</SelectItem>
              {published.map((release) => (
                <SelectItem key={release.id} value={release.id}>
                  Edição {release.version} · {new Date(release.publishedAt).toLocaleDateString("pt-BR")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <CheckboxField
        className="dev-item-body"
        checked={required}
        onCheckedChange={(value) => setRequired(value === true)}
        label="Fonte formal (exige edição imutável)"
      />
      <div className="dev-field">
        <Label htmlFor={`task-source-reason-${taskId}`}>Por que entra nesta Manobra</Label>
        <Input
          id={`task-source-reason-${taskId}`}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          required
        />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending || !canSubmit}>
          Vincular
        </Button>
      </DialogFooter>
    </form>
  );
}
