"use client";

import { useEffect, useState, useTransition } from "react";
import { LoaderCircle, Share2, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  addDocumentShareAction,
  listDocumentSharesAction,
  revokeDocumentShareAction,
  updateDocumentShareAction,
} from "@/app/actions";
import { DocumentCollaboratorAvatars } from "@/components/document-collaborator-avatars";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DocumentCollaborator, DocumentShareRecord, DocumentShareRole } from "@/lib/documents";

const roleLabels: Record<DocumentShareRole, string> = {
  viewer: "Leitor",
  editor: "Editor",
};

export function DocumentShareDialog({
  documentId,
  initialCollaborators = [],
}: {
  documentId: string;
  initialCollaborators?: DocumentCollaborator[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<DocumentShareRole>("viewer");
  const [shares, setShares] = useState<DocumentShareRecord[]>([]);
  const [collaborators, setCollaborators] = useState(initialCollaborators);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCollaborators(initialCollaborators);
  }, [initialCollaborators]);

  function loadShares() {
    setLoading(true);
    startTransition(async () => {
      const result = await listDocumentSharesAction(documentId);
      setLoading(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setShares(result.shares);
      setCollaborators(result.collaborators);
    });
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) loadShares();
  }

  function addShare() {
    startTransition(async () => {
      const result = await addDocumentShareAction(documentId, { email, role });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setEmail("");
      toast.success("Compartilhamento adicionado");
      loadShares();
    });
  }

  function changeRole(shareId: string, nextRole: DocumentShareRole) {
    startTransition(async () => {
      const result = await updateDocumentShareAction(documentId, shareId, { role: nextRole });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setShares((current) => current.map((share) => (share.id === shareId ? result.share : share)));
      toast.success("Papel atualizado");
      loadShares();
    });
  }

  function removeShare(shareId: string) {
    startTransition(async () => {
      const result = await revokeDocumentShareAction(documentId, shareId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Acesso revogado");
      loadShares();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 />
          <span className="hidden sm:inline">Compartilhar</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Compartilhar documento</DialogTitle>
          <DialogDescription>
            Convide pessoas por e-mail com acesso de leitor ou editor. Se ainda não tiverem conta Portulan, o convite fica
            pendente até o primeiro login com GitHub usando o mesmo e-mail.
          </DialogDescription>
        </DialogHeader>

        {collaborators.length ? (
          <div className="flex items-center gap-3 rounded-lg border border-border p-3">
            <DocumentCollaboratorAvatars collaborators={collaborators} />
            <span className="text-sm text-muted-foreground">
              {collaborators.length} {collaborators.length === 1 ? "pessoa com acesso" : "pessoas com acesso"}
            </span>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end">
          <div className="grid gap-2">
            <Label htmlFor="share-email">E-mail</Label>
            <Input
              id="share-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="colega@empresa.com"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="share-role">Papel</Label>
            <Select value={role} onValueChange={(value: DocumentShareRole) => setRole(value)}>
              <SelectTrigger id="share-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">{roleLabels.viewer}</SelectItem>
                <SelectItem value="editor">{roleLabels.editor}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="button" onClick={addShare} disabled={pending || !email.trim()}>
            {pending ? <LoaderCircle className="animate-spin" /> : <UserPlus />}
            Adicionar
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Pessoas convidadas</Label>
            {loading ? <LoaderCircle className="size-4 animate-spin text-muted-foreground" /> : null}
          </div>
          {shares.length ? (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {shares.map((share) => (
                <li key={share.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar
                      name={share.userName}
                      login={share.userLogin}
                      email={share.email}
                      imageUrl={share.userAvatarUrl}
                    />
                    <div className="min-w-0">
                      <strong className="block truncate text-sm">{share.userLogin ?? share.email}</strong>
                      <span className="text-xs text-muted-foreground">
                        {share.userId ? share.email : `${share.email} · convite pendente`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={share.role}
                      onValueChange={(value: DocumentShareRole) => changeRole(share.id, value)}
                      disabled={pending}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">{roleLabels.viewer}</SelectItem>
                        <SelectItem value="editor">{roleLabels.editor}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeShare(share.id)} disabled={pending}>
                      <Trash2 />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              Nenhum convite ainda. Adicione e-mails acima para compartilhar acesso privado.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
