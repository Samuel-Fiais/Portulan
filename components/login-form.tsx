"use client";

import { signIn } from "next-auth/react";
import { Github } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  return (
    <div className="login-page">
      <header className="login-header no-print">
        <BrandMark />
        <ThemeToggle />
      </header>
      <main className="login-main">
        <div className="login-card">
          <span className="eyebrow">Acesso</span>
          <h1 className="fp-h1 login-title">Entre para usar o Portulan</h1>
          <p className="fp-lead login-lead">
            Biblioteca, editor e publicação de documentos técnicos — disponíveis após autenticação com GitHub.
          </p>
          <Button
            type="button"
            size="lg"
            className="login-github-button"
            onClick={() => signIn("github", { callbackUrl })}
          >
            <Github />
            Entrar com GitHub
          </Button>
        </div>
      </main>
    </div>
  );
}
