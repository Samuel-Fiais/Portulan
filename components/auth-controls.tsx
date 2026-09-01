"use client";

import { useEffect, useRef, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { ChevronDown, LogOut, Moon, Sun } from "lucide-react";

function toggleTheme() {
  const next = !document.documentElement.classList.contains("dark");
  document.documentElement.classList.toggle("dark", next);
  const theme = next ? "dark" : "light";
  localStorage.setItem("portulan-theme", theme);
  localStorage.removeItem("festpay-docs-theme");
}

export function AuthControls({ session }: { session: Session | null }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

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
    <div className="auth-menu" ref={menuRef}>
      <button
        type="button"
        className="auth-controls auth-menu-trigger"
        aria-label="Menu da conta"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="auth-avatar" width={28} height={28} />
        ) : null}
        <span className="auth-login">{login}</span>
        <ChevronDown className="auth-menu-chevron" aria-hidden="true" />
      </button>
      {open ? (
        <div className="auth-menu-panel" role="menu">
          <button
            type="button"
            className="auth-menu-item"
            role="menuitem"
            onClick={() => {
              toggleTheme();
              setOpen(false);
            }}
          >
            <Sun className="theme-icon-sun" />
            <Moon className="theme-icon-moon" />
            Tema
          </button>
          <div className="auth-menu-separator" role="separator" />
          <button
            type="button"
            className="auth-menu-item auth-menu-item-destructive"
            role="menuitem"
            onClick={() => signOut()}
          >
            <LogOut />
            Sair
          </button>
        </div>
      ) : null}
    </div>
  );
}
