"use client";

import { signIn, signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AuthControls({ session }: { session: Session | null }) {
  if (!session?.user?.id) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => signIn("github")}>
        Entrar com GitHub
      </Button>
    );
  }

  const login = session.user.login ?? session.user.name ?? "Conta";
  const avatar = session.user.image;

  return (
    <div className="auth-controls">
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="auth-avatar" width={28} height={28} />
      ) : null}
      <span className="auth-login">{login}</span>
      <Button type="button" variant="ghost" size="sm" onClick={() => signOut()} aria-label="Sair">
        <LogOut className="size-4" />
        Sair
      </Button>
    </div>
  );
}
