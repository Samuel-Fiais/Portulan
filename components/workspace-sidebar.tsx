"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Anchor, Compass, Map, Menu, Ruler, Telescope, X } from "lucide-react";
import type { Session } from "next-auth";
import { AuthControls } from "@/components/auth-controls";
import type { PublicAccount } from "@/lib/account-types";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import type { WorkspaceMembership } from "@/lib/workspaces";

const NAV = [
  { href: "/", label: "Ponte", icon: Compass },
  { href: "/biblioteca", label: "Cartoteca", icon: Map },
  { href: "/templates", label: "Gabaritos", icon: Ruler },
  { href: "/integrations", label: "Instrumentos", icon: Telescope },
  { href: "/porto", label: "Porto", icon: Anchor },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function RailNavLinks({ pathname }: { pathname: string }) {
  return (
    <>
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Tooltip key={item.href}>
            <TooltipTrigger asChild>
              <Link
                href={item.href}
                className={cn("workspace-rail-link", active && "active")}
                aria-current={active ? "page" : undefined}
              >
                <Icon />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              {item.label}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </>
  );
}

function MobileNavLinks({ pathname }: { pathname: string }) {
  return (
    <>
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn("workspace-mobile-link", active && "active")}
            aria-current={active ? "page" : undefined}
          >
            <Icon />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </>
  );
}

export function WorkspaceSidebar({
  session,
  account,
  workspaces = [],
  activeWorkspaceId = null,
  children,
}: {
  session: Session | null;
  account?: PublicAccount | null;
  workspaces?: WorkspaceMembership[];
  activeWorkspaceId?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className={cn("workspace-shell", mobileOpen && "sidebar-open")}>
      <header className="workspace-mobile-bar no-print">
        <button
          type="button"
          className="workspace-menu-toggle"
          aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={mobileOpen}
          aria-controls="workspace-mobile-drawer"
          onClick={() => setMobileOpen((value) => !value)}
        >
          {mobileOpen ? <X /> : <Menu />}
        </button>
        <Link href="/" aria-label="Portulan" className="workspace-mobile-brand">
          <BrandMark compact />
        </Link>
        <ThemeToggle className="workspace-rail-link" side="bottom" workspaceId={activeWorkspaceId} />
      </header>

      <nav
        className="workspace-desktop-nav no-print"
        aria-label="Navegação do porto"
      >
        <div className="workspace-rail">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/" className="workspace-rail-brand" aria-label="Portulan">
                <BrandMark mark />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              Portulan
            </TooltipContent>
          </Tooltip>
          {workspaces.length ? (
            <div className="workspace-rail-porto">
              <WorkspaceSwitcher workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} />
            </div>
          ) : null}
          <div className="workspace-rail-nav">
            <RailNavLinks pathname={pathname} />
          </div>
          <div className="workspace-rail-footer">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="workspace-rail-tooltip-wrap">
                  <ThemeToggle className="workspace-rail-link" workspaceId={activeWorkspaceId} />
                </span>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}>
                Escolher tema
              </TooltipContent>
            </Tooltip>
            <AuthControls session={session} account={account} compact />
          </div>
        </div>
      </nav>

      {mobileOpen ? (
        <button
          type="button"
          className="workspace-backdrop no-print"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      <aside
        id="workspace-mobile-drawer"
        className="workspace-mobile-drawer no-print"
        aria-label="Navegação do porto"
      >
        <div className="workspace-mobile-drawer-header">
          <Link href="/" className="workspace-mobile-brand" aria-label="Portulan">
            <BrandMark compact />
          </Link>
        </div>
        {workspaces.length ? (
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            variant="drawer"
          />
        ) : null}
        <p className="workspace-mobile-section">Navegação</p>
        <nav className="workspace-mobile-nav">
          <MobileNavLinks pathname={pathname} />
        </nav>
        <div className="workspace-mobile-drawer-footer">
          <AuthControls session={session} account={account} />
        </div>
      </aside>

      <div className="workspace-main">{children}</div>
    </div>
  );
}
