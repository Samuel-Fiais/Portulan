"use client";

import "./workspace-panel.css";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Anchor,
  Copy,
  Crown,
  LinkIcon,
  LoaderCircle,
  LogOut,
  Palette,
  Trash2,
  UserPlus,
  Users,
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
import { ThemePicker } from "@/components/theme-picker";
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
import {
  clearThemeOverride,
  hasThemeOverride,
  type ThemePreference,
} from "@/lib/workspace-themes";
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
  const [themeDraft, setThemeDraft] = useState<ThemePreference | null>(null);
  const [inviteRole, setInviteRole] = useState<WorkspaceInviteRole>("member");
  const [inviteExpiration, setInviteExpiration] = useState<InviteExpiration>("7d");
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  const role = workspace.role;
  const manageCrew = canManageCrew(role);
  const manageIdentity = canManageWorkspaceIdentity(role);
  const captain = isCaptain(role);

  function run(action: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error ?? "Não foi possível concluir.");
        return;
      }
      toast.success(success);
      router.refresh();
    });
  }

  function saveName() {
    run(() => updateWorkspaceAction(workspace.id, { name }), "Nome do porto atualizado");
  }

  function saveTheme() {
    const preference = themeDraft ?? {
      paper: workspace.themePaper,
      mode: workspace.themeMode,
      customInk: workspace.themeInk,
    };
    startTransition(async () => {
      const result = await updateWorkspaceAction(workspace.id, {
        themePaper: preference.paper,
        themeMode: preference.mode,
        themeInk: preference.customInk,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      clearThemeOverride(workspace.id);
      toast.success("Tema do porto salvo", {
        description: "Vale para toda a tripulação, em qualquer dispositivo.",
      });
      router.refresh();
    });
  }

  function restoreWorkspaceTheme() {
    clearThemeOverride(workspace.id);
    toast.success("Tema do porto restaurado neste navegador");
    window.location.reload();
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
      const url = `${origin}/convite/${result.token}`;
      setLastInviteUrl(url);
      await copyInvite(url);
      router.refresh();
    });
  }

  const activeInvites = invites.filter((invite) => !invite.revokedAt);

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
          <dl className="porto-stats split-row__actions">
            <div>
              <dt>Tripulação</dt>
              <dd>{members.length}</dd>
            </div>
            <div>
              <dt>Cartas</dt>
              <dd>{documentCount}</dd>
            </div>
          </dl>
        </header>

        <div className="workspace-page-body porto-body">
          <section className="porto-card" aria-labelledby="porto-identidade">
            <h2 id="porto-identidade" className="porto-card__title">
              <Anchor aria-hidden="true" />
              Identidade
            </h2>
            <p className="porto-card__lead">
              Nome e tema valem para toda a tripulação. O tema viaja com a conta: abra em outro
              aparelho e o papel é o mesmo.
            </p>

            <div className="porto-field">
              <Label htmlFor="porto-nome">Nome do porto</Label>
              <div className="porto-inline">
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
              {manageIdentity ? null : (
                <p className="porto-hint">Só capitão e imediato mudam o nome.</p>
              )}
            </div>

            <div className="porto-field">
              <Label>
                <Palette aria-hidden="true" /> Papel do porto
              </Label>
              <ThemePicker workspaceId={workspace.id} persist={!manageIdentity} onSelect={setThemeDraft} />
              <div className="porto-inline porto-inline--end">
                <Button type="button" variant="ghost" onClick={restoreWorkspaceTheme} disabled={pending}>
                  Usar o tema do porto
                </Button>
                {manageIdentity ? (
                  <Button type="button" onClick={saveTheme} disabled={pending}>
                    {pending ? <LoaderCircle className="animate-spin" /> : <Palette />}
                    Definir como tema do porto
                  </Button>
                ) : null}
              </div>
              <p className="porto-hint">
                {manageIdentity
                  ? "Escolher aqui só pinta a sua tela até você salvar para o porto."
                  : hasThemeOverride(workspace.id)
                    ? "Você está com um papel próprio neste navegador."
                    : "Você vê o papel definido pelo capitão."}
              </p>
            </div>
          </section>

          <section className="porto-card" aria-labelledby="porto-tripulacao">
            <h2 id="porto-tripulacao" className="porto-card__title">
              <Users aria-hidden="true" />
              Tripulação
            </h2>
            <p className="porto-card__lead">
              Capitão e imediato cuidam das pessoas. Tripulante cria as próprias cartas e lê o que o
              porto abriu.
            </p>

            <ul className="porto-crew">
              {members.map((member) => {
                const isSelf = member.userId === currentUserId;
                return (
                  <li key={member.id} className="porto-crew__row">
                    <div className="porto-crew__person">
                      <UserAvatar
                        name={member.name}
                        login={member.login}
                        email={member.email}
                        imageUrl={member.avatarUrl}
                        size="md"
                      />
                      <div>
                        <strong>
                          {memberLabel(member)}
                          {isSelf ? <span className="porto-tag">você</span> : null}
                        </strong>
                        <span>{member.email ?? member.login}</span>
                      </div>
                    </div>
                    <div className="porto-crew__actions">
                      {manageCrew && member.role !== "owner" && !isSelf ? (
                        <Select
                          value={member.role}
                          onValueChange={(value: WorkspaceRole) =>
                            run(
                              () => setWorkspaceMemberRoleAction(workspace.id, member.userId, value),
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
                            <SelectItem value="admin">{workspaceRoleMeta.admin.label}</SelectItem>
                            <SelectItem value="member">{workspaceRoleMeta.member.label}</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="porto-role">{workspaceRoleMeta[member.role].label}</span>
                      )}

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
                                {memberLabel(member)} assume o comando do porto e você continua como
                                imediato.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  run(
                                    () => transferCaptaincyAction(workspace.id, member.userId),
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
                              () => removeWorkspaceMemberAction(workspace.id, member.userId),
                              "Tripulante desembarcado",
                            )
                          }
                          disabled={pending}
                        >
                          <Trash2 />
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {manageCrew ? (
            <section className="porto-card" aria-labelledby="porto-convites">
              <h2 id="porto-convites" className="porto-card__title">
                <UserPlus aria-hidden="true" />
                Convites
              </h2>
              <p className="porto-card__lead">
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
                <div className="porto-invite-fresh">
                  <code>{lastInviteUrl}</code>
                  <Button type="button" variant="outline" size="sm" onClick={() => copyInvite(lastInviteUrl)}>
                    <Copy />
                    Copiar
                  </Button>
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
            </section>
          ) : null}

          <section className="porto-card porto-card--risk" aria-labelledby="porto-saida">
            <h2 id="porto-saida" className="porto-card__title">
              <LogOut aria-hidden="true" />
              Zarpar
            </h2>
            <p className="porto-card__lead">
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
                        A tripulação perde o acesso ao porto. Esta ação não tem volta.
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
          </section>
        </div>
      </section>
    </main>
  );
}
