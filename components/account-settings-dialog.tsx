"use client";

import "./account-settings-dialog.css";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { Github, LogOut } from "lucide-react";
import { toast } from "sonner";
import {
  disconnectGitHubAction,
  getAccountAction,
  removeAccountPasswordAction,
  setAccountPasswordAction,
  startGitHubLinkAction,
  updateAccountProfileAction,
} from "@/app/actions";
import { McpTokensPanel } from "@/components/mcp-tokens-panel";
import { ThemePicker } from "@/components/theme-picker";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AccountSnapshot = {
  name: string;
  login: string;
  email: string;
  image?: string | null;
  hasGithub: boolean;
  hasPassword: boolean;
};

export function AccountSettingsDialog({
  open,
  onOpenChange,
  account,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AccountSnapshot;
}) {
  const router = useRouter();
  const { update } = useSession();
  const [name, setName] = useState(account.name);
  const [login, setLogin] = useState(account.login);
  const [hasGithub, setHasGithub] = useState(account.hasGithub);
  const [hasPassword, setHasPassword] = useState(account.hasPassword);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [editingPassword, setEditingPassword] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [busyMethod, setBusyMethod] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(account.name);
    setLogin(account.login);
    setHasGithub(account.hasGithub);
    setHasPassword(account.hasPassword);

    void getAccountAction().then((result) => {
      if (!result.ok) return;
      setName(result.user.name ?? result.user.login);
      setLogin(result.user.login);
      setHasGithub(result.user.hasGithub);
      setHasPassword(result.user.hasPassword);
    });
  }, [open, account.name, account.login, account.hasGithub, account.hasPassword]);

  async function refreshSession(next?: {
    name?: string | null;
    login?: string;
    email?: string | null;
    image?: string | null;
    hasGithub?: boolean;
    hasPassword?: boolean;
  }) {
    await update({
      user: {
        name: next?.name ?? name,
        login: next?.login ?? login,
        email: next?.email ?? account.email,
        image: next?.image ?? account.image,
        hasGithub: next?.hasGithub ?? hasGithub,
        hasPassword: next?.hasPassword ?? hasPassword,
      },
    });
    router.refresh();
  }

  async function onSaveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProfile(true);
    try {
      const result = await updateAccountProfileAction({ name, login });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setName(result.user.name ?? result.user.login);
      setLogin(result.user.login);
      toast.success("Dados da conta salvos.");
      await refreshSession(result.user);
    } finally {
      setSavingProfile(false);
    }
  }

  async function onSavePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setSavingPassword(true);
    try {
      const result = await setAccountPasswordAction({
        currentPassword: hasPassword ? currentPassword : undefined,
        password,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setHasPassword(true);
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      setEditingPassword(false);
      toast.success(hasPassword ? "Senha alterada." : "Senha definida.");
      await refreshSession(result.user);
    } finally {
      setSavingPassword(false);
    }
  }

  function togglePasswordEditor() {
    if (editingPassword) {
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
    }
    setEditingPassword((value) => !value);
  }

  async function onRemovePassword() {
    setBusyMethod(true);
    try {
      const result = await removeAccountPasswordAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setHasPassword(false);
      setEditingPassword(false);
      toast.success("Senha removida.");
      await refreshSession(result.user);
    } finally {
      setBusyMethod(false);
    }
  }

  async function onConnectGitHub() {
    setBusyMethod(true);
    try {
      const result = await startGitHubLinkAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      await signIn("github", { callbackUrl: "/?conta=1" });
    } finally {
      setBusyMethod(false);
    }
  }

  async function onDisconnectGitHub() {
    setBusyMethod(true);
    try {
      const result = await disconnectGitHubAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setHasGithub(false);
      toast.success("GitHub desligado desta conta.");
      await refreshSession(result.user);
    } finally {
      setBusyMethod(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="workspace-dialog account-dialog sm:max-w-xl" showCloseButton>
        <DialogHeader className="account-dialog-header">
          <UserAvatar
            name={name}
            login={login}
            email={account.email}
            imageUrl={account.image}
            className="account-dialog-avatar"
          />
          <div className="account-dialog-heading">
            <DialogTitle>Conta</DialogTitle>
            <DialogDescription className="account-dialog-identity">
              <span className="account-dialog-login">{login}</span>
              <span className="account-dialog-identity-sep" aria-hidden="true">
                ·
              </span>
              <span className="account-dialog-email">{account.email || "Sem e-mail"}</span>
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="account-dialog-body">
        <form className="account-dialog-section" onSubmit={onSaveProfile}>
          <div className="account-section-heading">
            <p className="eyebrow">Perfil</p>
          </div>
          <div className="account-dialog-grid">
            <div className="login-field">
              <Label htmlFor="account-settings-name">Nome</Label>
              <Input
                id="account-settings-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            <div className="login-field">
              <Label htmlFor="account-settings-login">Usuário</Label>
              <Input
                id="account-settings-login"
                value={login}
                onChange={(event) => setLogin(event.target.value)}
                required
              />
            </div>
          </div>
          <Button type="submit" className="account-dialog-submit" disabled={savingProfile}>
            {savingProfile ? "Salvando…" : "Salvar dados"}
          </Button>
        </form>

        <section className="account-dialog-section">
          <div className="account-section-heading">
            <p className="eyebrow">Entrada</p>
          </div>
          <div className="account-method-list">
            <div className="account-method-card">
              <div>
                <p className="account-method-title">GitHub</p>
                <p className="account-method-status">{hasGithub ? "Ligado" : "Não ligado"}</p>
              </div>
              {hasGithub ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busyMethod || !hasPassword}
                  title={!hasPassword ? "Defina uma senha antes de desligar o GitHub." : undefined}
                  onClick={() => void onDisconnectGitHub()}
                >
                  Desligar
                </Button>
              ) : (
                <Button type="button" variant="outline" disabled={busyMethod} onClick={() => void onConnectGitHub()}>
                  <Github />
                  Conectar
                </Button>
              )}
            </div>
            <div className="account-method-card">
              <div>
                <p className="account-method-title">Senha</p>
                <p className="account-method-status">{hasPassword ? "Definida" : "Não definida"}</p>
              </div>
              <div className="account-method-actions">
                <Button type="button" variant="outline" onClick={togglePasswordEditor}>
                  {editingPassword ? "Cancelar" : hasPassword ? "Trocar" : "Definir"}
                </Button>
                {hasPassword ? (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busyMethod || !hasGithub}
                    title={!hasGithub ? "Conecte o GitHub antes de remover a senha." : undefined}
                    onClick={() => void onRemovePassword()}
                  >
                    Remover
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          {editingPassword ? (
            <form className="account-password-form" onSubmit={onSavePassword}>
              <div className="account-dialog-grid">
                {hasPassword ? (
                  <div className="login-field">
                    <Label htmlFor="account-current-password">Senha atual</Label>
                    <Input
                      id="account-current-password"
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      required
                    />
                  </div>
                ) : null}
                <div className="login-field">
                  <Label htmlFor="account-new-password">{hasPassword ? "Nova senha" : "Senha"}</Label>
                  <Input
                    id="account-new-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={8}
                    required
                  />
                </div>
                <div className="login-field">
                  <Label htmlFor="account-confirm-password">Confirmar</Label>
                  <Input
                    id="account-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    minLength={8}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="account-dialog-submit" disabled={savingPassword}>
                {savingPassword ? "Salvando…" : "Salvar senha"}
              </Button>
            </form>
          ) : null}

          {!hasGithub ? (
            <p className="account-dialog-hint">Sem GitHub não há recuperação de senha.</p>
          ) : null}
        </section>

        <McpTokensPanel />

        <section className="account-dialog-section">
          <div className="account-section-heading">
            <p className="eyebrow">Tema</p>
          </div>
          <ThemePicker variant="panel" />
        </section>
        </div>

        <div className="account-dialog-footer">
          <div className="account-dialog-footer-actions">
            <Button type="button" variant="ghost" className="account-sign-out" onClick={() => signOut()}>
              <LogOut />
              Sair
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
