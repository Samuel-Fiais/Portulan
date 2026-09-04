"use client";

import { useEffect, useRef, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { ChevronDown, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function AuthControls({
  session,
  menuPlacement = "bottom",
  compact = false,
}: {
  session: Session | null;
  menuPlacement?: "bottom" | "top" | "rail";
  compact?: boolean;
}) {
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
        title={login}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="auth-avatar" width={28} height={28} />
        ) : null}
        {compact ? null : <span className="auth-login">{login}</span>}
        {compact ? null : (
          <ChevronDown className="auth-menu-chevron" aria-hidden="true" />
        )}
      </button>
      {open ? (
        <div
          className={cn(
            "auth-menu-panel",
            menuPlacement === "top" && "auth-menu-panel--top",
            menuPlacement === "rail" && "auth-menu-panel--rail",
          )}
          role="menu"
        >
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
