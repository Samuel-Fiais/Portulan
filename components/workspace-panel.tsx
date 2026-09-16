"use client";

import "./workspace-panel.css";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  Crown,
  LinkIcon,
  LoaderCircle,
  LogOut,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  createWorkspaceInviteAction,
  deleteWorkspaceAction,
  leaveWorkspaceAction,
  removeWorkspaceMemberAction,
  revokeWorkspaceInviteAction,
  setWorkspaceMemberRoleAction,
  transferCaptaincyAction,
  updateWorkspaceAction,
} from "@/app/workspace-actions";
import { StatCard } from "@/components/stat-card";
import { ThemePicker } from "@/components/theme-picker";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  canManageCrew,
  canManageWorkspaceIdentity,
  isCaptain,
} from "@/lib/workspace-policy";
import { formatRelativeDate } from "@/lib/utils";
import {
  workspaceRoleMeta,
  type WorkspaceInviteRecord,
  type WorkspaceInviteRole,
  type WorkspaceMemberRecord,
  type WorkspaceMembership,
  type WorkspaceRole,
} from "@/lib/workspaces";

const INVITE_EXPIRATION_LABELS = {
  "1d": "1 dia",
  "7d": "7 dias",
  "30d": "30 dias",
  never: "Sem prazo",
} as const;

type InviteExpiration = keyof typeof INVITE_EXPIRATION_LABELS;

function memberLabel(member: WorkspaceMemberRecord) {
  return member.name ?? member.login ?? member.email ?? "Tripulante";
}

export function WorkspacePanel({
  workspace,
  members,
  invites,
  currentUserId,
  documentCount,
  workspaceCount,
  origin,
}: {
  workspace: WorkspaceMembership;
  members: WorkspaceMemberRecord[];
  invites: WorkspaceInviteRecord[];
  currentUserId: string;
  documentCount: number;
  workspaceCount: number;
  origin: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(workspace.name);
  const [inviteRole, setInviteRole] = useState<WorkspaceInviteRole>("member");
  const [inviteExpiration, setInviteExpiration] = useState<InviteExpiration>("7d");
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  const role = workspace.role;
  const manageCrew = canManageCrew(role);
  const manageIdentity = canManageWorkspaceIdentity(role);
  const captain = isCaptain(role);
  const showCrewActions = manageCrew || captain;

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        if (result.error) toast.error(result.error);
        return;
      }
      toast.success(success);
      router.refresh();
    });
  }

  function saveName() {
    run(() => updateWorkspaceAction(workspace.id, { name }), "Nome do porto atualizado");
  }

  async function copyInvite(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link de convite copiado");
    } catch {
      toast.message("Copie o link manualmente", { description: url });
    }
  }

  function createInvite() {
    startTransition(async () => {
      const result = await createWorkspaceInviteAction(workspace.id, {
        role: inviteRole,
        expiration: inviteExpiration,
        maxUses: null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const url = `${origin}/invite/${result.token}`;
      setLastInviteUrl(url);
      await copyInvite(url);
      router.refresh();
    });
  }

  const activeInvites = invites.filter((invite) => !invite.revokedAt);
  const convitesStep = "03";
  const zarparStep = manageCrew ? "04" : "03";

  return (
    <main className="page-wrap workspace-page workspace-page--porto">
      <section className="doc-section">
        <header className="page-heading split-row">
          <div className="split-row__main workspace-heading">
            <span className="eyebrow">Porto</span>
            <h1 className="fp-h1">{workspace.name}</h1>
            <p className="workspace-lead">
              O porto reúne a tripulação, as cartas e os gabaritos. Você navega aqui como{" "}
              <strong>{workspaceRoleMeta[role].label.toLowerCase()}</strong>:{" "}
              {workspaceRoleMeta[role].blurb.toLowerCase()}.
            </p>
          </div>
          <div className="split-row__actions porto-header-stats">
            <div className="fp-stat-grid porto-header-stats__grid" aria-label="Resumo do porto">
              <StatCard label="Tripulação" value={members.length} note="tripulantes" />
              <StatCard label="Cartas" value={documentCount} note="no porto" />
            </div>
          </div>
        </header>

        <div className="workspace-page-body">
          <ol className="integration-rumos">
            <li className="integration-step" id="porto-identidade">
              <span className="section-number" aria-hidden="true">
                01
              </span>
              <div className="integration-step-body">
                <h2>Identidade</h2>

                <div className="porto-settings">
                  <div className="porto-setting">
                    <Label htmlFor="porto-nome" className="porto-setting-label">
                      Nome do porto
                    </Label>
                    <div className="porto-setting-control">
                      <div className="porto-setting-row">
                        <Input
                          id="porto-nome"
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          disabled={!manageIdentity || pending}
                          maxLength={60}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={saveName}
                          disabled={!manageIdentity || pending || name.trim() === workspace.name}
                        >
                          Salvar
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="porto-setting porto-setting--theme">
                    <span className="porto-setting-label">Tema</span>
                    <div className="porto-setting-control">
                      <ThemePicker workspaceId={workspace.id} />
                    </div>
                  </div>
                </div>
              </div>
            </li>

            <li className="integration-step" id="porto-tripulacao">
              <span className="section-number" aria-hidden="true">
                02
              </span>
              <div className="integration-step-body">
                <h2>Tripulação</h2>
                <p>
                  Capitão e imediato cuidam das pessoas. Tripulante cria as próprias cartas e lê o
                  que o porto abriu.
                </p>

                <div className="mcp-token-table-wrap">
                  <table className="mcp-token-table porto-crew-table">
                        <thead>
                          <tr>
                            <th scope="col">Tripulante</th>
                            <th scope="col">Papel</th>
                            {showCrewActions ? (
                              <th scope="col">
                                <span className="sr-only">Ações</span>
                              </th>
                            ) : null}
                          </tr>
                        </thead>
                        <tbody>
                          {members.map((member) => {
                            const isSelf = member.userId === currentUserId;
                            return (
                              <tr key={member.id}>
                                <td>
                                  <div className="porto-crew-person">
                                    <UserAvatar
                                      name={member.name}
                                      login={member.login}
                                      email={member.email}
                                      imageUrl={member.avatarUrl}
                                      size="md"
                                    />
                                    <div className="porto-crew-meta">
                                      <strong>
                                        {memberLabel(member)}
                                        {isSelf ? <span className="porto-tag">você</span> : null}
                                      </strong>
                                      <span>{member.email ?? member.login}</span>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  {manageCrew && member.role !== "owner" && !isSelf ? (
                                    <Select
                                      value={member.role}
                                      onValueChange={(value: WorkspaceRole) =>
                                        run(
                                          () =>
                                            setWorkspaceMemberRoleAction(
                                              workspace.id,
                                              member.userId,
                                              value,
                                            ),
                                          "Papel atualizado",
                                        )
                                      }
                                      disabled={pending}
                                    >
                                      <SelectTrigger
                                        className="w-[140px]"
                                        aria-label={`Papel de ${memberLabel(member)}`}
                                      >
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="admin">
                                          {workspaceRoleMeta.admin.label}
                                        </SelectItem>
                                        <SelectItem value="member">
                                          {workspaceRoleMeta.member.label}
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <span className="porto-role">
                                      {workspaceRoleMeta[member.role].label}
                                    </span>
                                  )}
                                </td>
                                {showCrewActions ? (
                                  <td className="mcp-token-table-actions">
                                    <div className="porto-crew-actions">
                                      {captain && !isSelf ? (
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              aria-label={`Passar a capitania para ${memberLabel(member)}`}
                                              disabled={pending}
                                            >
                                              <Crown />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Passar a capitania?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                {memberLabel(member)} vira capitão. Você passa a ser
                                                imediato.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                              <AlertDialogAction
                                                onClick={() =>
                                                  run(
                                                    () =>
                                                      transferCaptaincyAction(
                                                        workspace.id,
                                                        member.userId,
                                                      ),
                                                    "Capitania transferida",
                                                  )
                                                }
                                              >
                                                Passar a capitania
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      ) : null}
                                      {manageCrew && member.role !== "owner" && !isSelf ? (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          aria-label={`Desembarcar ${memberLabel(member)}`}
                                          onClick={() =>
                                            run(
                                              () =>
                                                removeWorkspaceMemberAction(
                                                  workspace.id,
                                                  member.userId,
                                                ),
                                              "Tripulante desembarcado",
                                            )
                                          }
                                          disabled={pending}
                                        >
                                          <Trash2 />
                                        </Button>
                                      ) : null}
                                    </div>
                                  </td>
                                ) : null}
                              </tr>
                            );
                          })}
                        </tbody>
                  </table>
                </div>
              </div>
            </li>

          {manageCrew ? (
            <li className="integration-step" id="porto-convites">
              <span className="section-number" aria-hidden="true">
                {convitesStep}
              </span>
              <div className="integration-step-body">
                <h2>Convites</h2>
                <p>
                  O convite é um link. Quem abrir com uma conta Portulan entra direto no porto com o
                  papel escolhido.
                </p>

              <div className="porto-invite-form">
                <div className="porto-field">
                  <Label htmlFor="porto-invite-role">Papel</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(value: WorkspaceInviteRole) => setInviteRole(value)}
                  >
                    <SelectTrigger id="porto-invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">{workspaceRoleMeta.member.label}</SelectItem>
                      <SelectItem value="admin">{workspaceRoleMeta.admin.label}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="porto-field">
                  <Label htmlFor="porto-invite-expiration">Validade</Label>
                  <Select
                    value={inviteExpiration}
                    onValueChange={(value: InviteExpiration) => setInviteExpiration(value)}
                  >
                    <SelectTrigger id="porto-invite-expiration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(INVITE_EXPIRATION_LABELS) as InviteExpiration[]).map((preset) => (
                        <SelectItem key={preset} value={preset}>
                          {INVITE_EXPIRATION_LABELS[preset]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" onClick={createInvite} disabled={pending}>
                  {pending ? <LoaderCircle className="animate-spin" /> : <LinkIcon />}
                  Gerar convite
                </Button>
              </div>

              {lastInviteUrl ? (
                <div className="integration-copy-block">
                  <span className="integration-copy-label">Link gerado</span>
                  <div className="integration-copy-row">
                    <code>{lastInviteUrl}</code>
                    <Button type="button" variant="outline" size="sm" onClick={() => copyInvite(lastInviteUrl)}>
                      <Copy />
                      Copiar
                    </Button>
                  </div>
                </div>
              ) : null}

              {activeInvites.length ? (
                <ul className="porto-invite-list">
                  {activeInvites.map((invite) => (
                    <li key={invite.id}>
                      <div>
                        <strong>{workspaceRoleMeta[invite.role].label}</strong>
                        <span>
                          {invite.expiresAt
                            ? `expira ${formatRelativeDate(invite.expiresAt)}`
                            : "sem prazo"}
                          {" · "}
                          {invite.uses} {invite.uses === 1 ? "uso" : "usos"}
                          {invite.createdByName ? ` · por ${invite.createdByName}` : ""}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          run(
                            () => revokeWorkspaceInviteAction(workspace.id, invite.id),
                            "Convite revogado",
                          )
                        }
                        disabled={pending}
                      >
                        Revogar
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="porto-empty">Nenhum convite aberto.</p>
              )}
              </div>
            </li>
          ) : null}

            <li className={cn("integration-step", "porto-step--risk")} id="porto-saida">
              <span className="section-number" aria-hidden="true">
                {zarparStep}
              </span>
              <div className="integration-step-body">
                <h2>Zarpar</h2>
                <p>
                  O porto inicial de cada conta não pode ser deixado nem excluído. Um porto só é
                  excluído quando não tem mais cartas.
                </p>
            <div className="porto-inline porto-inline--end">
              <Button
                type="button"
                variant="outline"
                onClick={() => run(() => leaveWorkspaceAction(workspace.id), "Você deixou o porto")}
                disabled={pending || workspace.isPersonal || captain || workspaceCount <= 1}
              >
                <LogOut />
                Deixar o porto
              </Button>
              {captain && !workspace.isPersonal ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" disabled={pending || documentCount > 0}>
                      <Trash2 />
                      Excluir porto
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir {workspace.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        O porto some para toda a tripulação. Não dá para desfazer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => run(() => deleteWorkspaceAction(workspace.id), "Porto excluído")}
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
            </div>
              </div>
            </li>
          </ol>
        </div>
      </section>
    </main>
  );
}
