"use client";

import { signIn, signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { ChevronDown, LogOut, Moon, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function toggleTheme() {
  const next = !document.documentElement.classList.contains("dark");
  document.documentElement.classList.toggle("dark", next);
  const theme = next ? "dark" : "light";
  localStorage.setItem("portulan-theme", theme);
  localStorage.removeItem("festpay-docs-theme");
}

export function AuthControls({ session }: { session: Session | null }) {
  if (!session?.user?.id) {
    return (
      <button
        type="button"
        className="auth-sign-in"
        onClick={() => signIn("github")}
      >
        Entrar com GitHub
      </button>
    );
  }

  const login = session.user.login ?? session.user.name ?? "Conta";
  const avatar = session.user.image;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="auth-controls auth-menu-trigger" aria-label="Menu da conta">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="auth-avatar" width={28} height={28} />
          ) : null}
          <span className="auth-login">{login}</span>
          <ChevronDown className="auth-menu-chevron" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="auth-menu-content">
        <DropdownMenuItem onClick={toggleTheme}>
          <Sun className="theme-icon-sun" />
          <Moon className="theme-icon-moon" />
          Tema
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => signOut()}>
          <LogOut />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
