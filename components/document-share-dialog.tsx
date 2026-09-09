"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, Share2, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  addDocumentShareAction,
  listDocumentSharesAction,
  revokeDocumentShareAction,
  updateDocumentShareAction,
} from "@/app/actions";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DocumentCollaborator, DocumentShareRecord, DocumentShareRole } from "@/lib/documents";
import { normalizeShareEmail, validateShareInvite, validateShareRoleUpdate } from "@/lib/document-share-policy";

const roleLabels: Record<DocumentShareRole, string> = {
  viewer: "Leitor",
  editor: "Editor",
};

function personLabel(person: Pick<DocumentCollaborator, "name" | "login" | "email">) {
  return person.name ?? person.login ?? person.email ?? "Colaborador";
}

export function DocumentShareDialog({
  documentId,
  initialCollaborators = [],
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onCollaboratorsChange,
  hideTrigger = false,
}: {
  documentId: string;
  initialCollaborators?: DocumentCollaborator[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCollaboratorsChange?: (collaborators: DocumentCollaborator[]) => void;
  hideTrigger?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<DocumentShareRole>("viewer");
  const [shares, setShares] = useState<DocumentShareRecord[]>([]);
  const [collaborators, setCollaborators] = useState(initialCollaborators);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [updatingShareId, setUpdatingShareId] = useState<string | null>(null);
  const [removingShareId, setRemovingShareId] = useState<string | null>(null);

  const loadShares = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listDocumentSharesAction(documentId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setShares(result.shares);
      setCollaborators(result.collaborators);
      onCollaboratorsChange?.(result.collaborators);
    } finally {
      setLoading(false);
    }
  }, [documentId, onCollaboratorsChange]);

  useEffect(() => {
    if (open) void loadShares();
  }, [open, loadShares]);

  function handleOpenChange(next: boolean) {
    if (controlledOnOpenChange) controlledOnOpenChange(next);
    else setInternalOpen(next);
  }

  async function addShare() {
    const owner = collaborators.find((person) => person.role === "owner");
    const validation = validateShareInvite({
      email,
      role,
      ownerId: owner?.id ?? null,
      ownerEmail: owner?.email ?? null,
      existingShares: shares,
    });
    if (!validation.ok) {
      toast.error(validation.error);
      return;
    }

    setAdding(true);
    try {
      const result = await addDocumentShareAction(documentId, { email, role });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setEmail("");
      toast.success("Compartilhamento adicionado");
      await loadShares();
    } finally {
      setAdding(false);
    }
  }

  async function changeRole(shareId: string, nextRole: DocumentShareRole) {
    const share = shares.find((item) => item.id === shareId);
    if (!share) return;

    const validation = validateShareRoleUpdate(share.role, nextRole);
    if (!validation.ok) {
      toast.message(validation.error);
      return;
    }

    setUpdatingShareId(shareId);
    try {
      const result = await updateDocumentShareAction(documentId, shareId, { role: nextRole });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Papel atualizado");
      await loadShares();
    } finally {
      setUpdatingShareId(null);
    }
  }

  async function removeShare(shareId: string) {
    setRemovingShareId(shareId);
    try {
      const result = await revokeDocumentShareAction(documentId, shareId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Acesso revogado");
      await loadShares();
    } finally {
      setRemovingShareId(null);
    }
  }

  const owner = collaborators.find((person) => person.role === "owner");
  const hasAccessList = Boolean(owner) || shares.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {hideTrigger ? null : (
        <DialogTrigger asChild>
          <Button variant="outline">
            <Share2 />
            <span className="hidden sm:inline">Compartilhar</span>
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Compartilhar documento</DialogTitle>
          <DialogDescription>
            Convide pessoas por e-mail com acesso de leitor ou editor. Se ainda não tiverem conta Portulan, o convite fica
            pendente até o primeiro login com GitHub usando o mesmo e-mail.
          </DialogDescription>
        </DialogHeader>

        <div className="share-invite-controls">
          <div className="share-invite-field share-invite-field--email">
            <Label htmlFor="share-email" className="share-invite-control-label">E-mail</Label>
            <Input
              id="share-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="colega@empresa.com"
              className="share-invite-control-input"
            />
            {email.trim() && shares.some((share) => normalizeShareEmail(share.email) === normalizeShareEmail(email)) ? (
              <p className="share-invite-hint text-xs text-muted-foreground">Esta pessoa já tem acesso. Altere o papel na lista abaixo.</p>
            ) : null}
          </div>
          <div className="share-invite-field share-invite-field--role">
            <Label htmlFor="share-role" className="share-invite-control-label">Papel</Label>
            <Select value={role} onValueChange={(value: DocumentShareRole) => setRole(value)}>
              <SelectTrigger id="share-role" className="share-invite-control-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">{roleLabels.viewer}</SelectItem>
                <SelectItem value="editor">{roleLabels.editor}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="share-invite-action">
            <Button
              type="button"
              className="share-invite-control-button"
              onClick={() => void addShare()}
              disabled={
                adding
                || !email.trim()
                || shares.some((share) => normalizeShareEmail(share.email) === normalizeShareEmail(email))
              }
            >
              {adding ? <LoaderCircle className="animate-spin" /> : <UserPlus />}
              Adicionar
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Pessoas com acesso</Label>
            {loading ? <LoaderCircle className="size-4 animate-spin text-muted-foreground" /> : null}
          </div>
          {hasAccessList ? (
            <ul className="divide-y divide-border rounded-none border border-border">
              {owner ? (
                <li className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar
                      name={owner.name}
                      login={owner.login}
                      email={owner.email}
                      imageUrl={owner.avatarUrl}
                      size="md"
                    />
                    <div className="min-w-0">
                      <strong className="block truncate text-sm">{personLabel(owner)}</strong>
                      {owner.email ? <span className="text-xs text-muted-foreground">{owner.email}</span> : null}
                    </div>
                  </div>
                  <span className="rounded-none border border-border px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Responsável
                  </span>
                </li>
              ) : null}
              {shares.map((share) => (
                <li key={share.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar
                      name={share.userName}
                      login={share.userLogin}
                      email={share.email}
                      imageUrl={share.userAvatarUrl}
                      size="md"
                    />
                    <div className="min-w-0">
                      <strong className="block truncate text-sm">{share.userLogin ?? share.userName ?? share.email}</strong>
                      <span className="text-xs text-muted-foreground">
                        {share.userId ? share.email : `${share.email} · convite pendente`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={share.role}
                      onValueChange={(value: DocumentShareRole) => void changeRole(share.id, value)}
                      disabled={updatingShareId === share.id || removingShareId === share.id}
                    >
                      <SelectTrigger className="w-[120px]" aria-label={`Papel de ${share.userLogin ?? share.email}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">{roleLabels.viewer}</SelectItem>
                        <SelectItem value="editor">{roleLabels.editor}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => void removeShare(share.id)}
                      disabled={updatingShareId === share.id || removingShareId === share.id}
                      aria-label={`Remover acesso de ${share.userLogin ?? share.email}`}
                    >
                      {removingShareId === share.id ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : loading ? (
            <p className="rounded-none border border-dashed border-border p-4 text-sm text-muted-foreground">
              Carregando pessoas com acesso…
            </p>
          ) : (
            <p className="rounded-none border border-dashed border-border p-4 text-sm text-muted-foreground">
              Nenhum convite ainda. Adicione e-mails acima para compartilhar acesso privado.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
