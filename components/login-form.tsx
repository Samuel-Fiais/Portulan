"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Github } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerAccountAction } from "@/app/actions";

const AUTH_ERRORS: Record<string, string> = {
  CredentialsSignin: "Usuário ou senha incorretos.",
  github_in_use: "Este GitHub já está ligado a outra conta.",
  OAuthAccountNotLinked: "Este GitHub já está ligado a outra conta.",
  Configuration: "Não foi possível entrar. Tente de novo.",
  Default: "Não foi possível entrar. Tente de novo.",
};

export function LoginForm({
  callbackUrl,
  initialMode = "login",
  errorCode,
}: {
  callbackUrl: string;
  initialMode?: "login" | "register";
  errorCode?: string;
}) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [identifier, setIdentifier] = useState("");
  const [name, setName] = useState("");
  const [login, setLogin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(errorCode ? AUTH_ERRORS[errorCode] ?? AUTH_ERRORS.Default : "");

  async function signInWithPassword(user: string) {
    const result = await signIn("credentials", {
      identifier: user,
      password,
      callbackUrl,
      redirect: false,
    });
    if (result?.error) {
      setError(AUTH_ERRORS[result.error] ?? AUTH_ERRORS.Default);
      return;
    }
    window.location.assign(result?.url ?? callbackUrl);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    try {
      if (mode === "login") {
        await signInWithPassword(identifier);
        return;
      }

      if (password !== confirmPassword) {
        setError("As senhas não coincidem.");
        return;
      }

      const registered = await registerAccountAction({ name, login, email, password });
      if (!registered.ok) {
        setError(registered.error);
        return;
      }

      await signInWithPassword(login);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="login-page">
      <header className="login-header no-print">
        <BrandMark />
        <ThemeToggle side="bottom" />
      </header>
      <main className="login-main">
        <div className="login-card">
          <span className="eyebrow">Acesso</span>
          <h1 className="fp-h1 login-title">
            {mode === "login" ? "Entre para usar o Portulan" : "Crie sua conta"}
          </h1>
          <p className="fp-lead login-lead">
            {mode === "login"
              ? "Cartoteca, editor e publicação de cartas técnicas — com GitHub ou usuário e senha."
              : "Informe nome, usuário, e-mail e senha. Depois você pode ligar o GitHub na mesma conta."}
          </p>

          {error ? <p className="login-error">{error}</p> : null}

          <form className="login-form" onSubmit={onSubmit}>
            {mode === "register" ? (
              <>
                <div className="login-field">
                  <Label htmlFor="account-name">Nome</Label>
                  <Input
                    id="account-name"
                    name="name"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </div>
                <div className="login-field">
                  <Label htmlFor="account-login">Usuário</Label>
                  <Input
                    id="account-login"
                    name="login"
                    autoComplete="username"
                    value={login}
                    onChange={(event) => setLogin(event.target.value)}
                    required
                  />
                </div>
                <div className="login-field">
                  <Label htmlFor="account-email">E-mail</Label>
                  <Input
                    id="account-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
              </>
            ) : (
              <div className="login-field">
                <Label htmlFor="account-identifier">Usuário ou e-mail</Label>
                <Input
                  id="account-identifier"
                  name="identifier"
                  autoComplete="username"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  required
                />
              </div>
            )}

            <div className="login-field">
              <Label htmlFor="account-password">Senha</Label>
              <Input
                id="account-password"
                name="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
            </div>

            {mode === "register" ? (
              <div className="login-field">
                <Label htmlFor="account-confirm">Confirmar senha</Label>
                <Input
                  id="account-confirm"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </div>
            ) : null}

            <Button type="submit" size="lg" className="login-submit" disabled={pending}>
              {pending ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <p className="login-switch">
            {mode === "login" ? (
              <>
                Não tem conta?{" "}
                <button type="button" onClick={() => { setMode("register"); setError(""); }}>
                  Criar conta
                </button>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <button type="button" onClick={() => { setMode("login"); setError(""); }}>
                  Entrar
                </button>
              </>
            )}
          </p>

          <div className="login-divider">
            <span>ou</span>
          </div>

          <Button
            type="button"
            size="lg"
            variant="outline"
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
