"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Session } from "next-auth";
import { AccountSettingsDialog } from "@/components/account-settings-dialog";
import { UserAvatar } from "@/components/user-avatar";
import type { PublicAccount } from "@/lib/account-types";
import { cn } from "@/lib/utils";

export function AuthControls({
  session,
  account,
  compact = false,
}: {
  session: Session | null;
  account?: PublicAccount | null;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shouldOpen = params.get("conta") === "1";
    const error = params.get("error");
    if (error === "github_in_use") {
      toast.error("Este GitHub já está ligado a outra conta.");
    }
    if (shouldOpen) setOpen(true);
    if (shouldOpen || error) {
      params.delete("conta");
      params.delete("error");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState({}, "", next);
    }
  }, []);

  if (!session?.user?.id) {
    return (
      <Link href="/login" className="auth-sign-in">
        Entrar
      </Link>
    );
  }

  const login = account?.login ?? session.user.login ?? session.user.name ?? "Conta";
  const name = account?.name ?? session.user.name ?? login;
  const email = account?.email ?? session.user.email ?? "";
  const image = account?.image ?? session.user.image;
  const hasGithub = account?.hasGithub ?? Boolean(session.user.hasGithub);
  const hasPassword = account?.hasPassword ?? Boolean(session.user.hasPassword);

  return (
    <>
      <button
        type="button"
        className={cn("auth-controls auth-menu-trigger", compact && "auth-menu-trigger--compact")}
        aria-label="Configurações da conta"
        title={login}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <UserAvatar
          name={name}
          login={login}
          email={email}
          imageUrl={image}
          className="auth-avatar"
        />
        {compact ? null : <span className="auth-login">{login}</span>}
      </button>
      <AccountSettingsDialog
        open={open}
        onOpenChange={setOpen}
        account={{
          name,
          login,
          email,
          image,
          hasGithub,
          hasPassword,
        }}
      />
    </>
  );
}
