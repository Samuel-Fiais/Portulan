"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Anchor,
  Compass,
  Map,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Ruler,
  Sailboat,
  Ship,
  Telescope,
  Waypoints,
  X,
  type LucideIcon,
} from "lucide-react";
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

const NAV_EXPANDED_KEY = "portulan-nav-expanded";

type NavLeaf = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const NAV_GROUPS: readonly (readonly NavLeaf[])[] = [
  [
    { href: "/", label: "Ponte", icon: Compass },
    { href: "/library", label: "Cartoteca", icon: Map },
    { href: "/templates", label: "Gabaritos", icon: Ruler },
  ],
  [
    { href: "/projects", label: "Expedições", icon: Ship },
    { href: "/repositories", label: "Embarcações", icon: Sailboat },
    { href: "/context-packs", label: "Rumos", icon: Waypoints },
  ],
  [
    { href: "/integrations", label: "Instrumentos", icon: Telescope },
    { href: "/workspace", label: "Porto", icon: Anchor },
  ],
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function readNavExpanded() {
  return document.documentElement.getAttribute("data-nav-expanded") === "1";
}

function writeNavExpanded(expanded: boolean) {
  document.documentElement.setAttribute("data-nav-expanded", expanded ? "1" : "0");
  localStorage.setItem(NAV_EXPANDED_KEY, expanded ? "1" : "0");
}

function RailTooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function RailLeafLink({
  item,
  pathname,
}: {
  item: NavLeaf;
  pathname: string;
}) {
  const Icon = item.icon;
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      className={cn("workspace-rail-link", active && "active")}
      aria-current={active ? "page" : undefined}
    >
      <Icon />
      <span className="workspace-rail-link-label">{item.label}</span>
    </Link>
  );
}

function RailNavLinks({ pathname }: { pathname: string }) {
  return (
    <>
      {NAV_GROUPS.map((group, index) => (
        <div
          key={group[0]?.href ?? index}
          className={cn("workspace-rail-group", index > 0 && "workspace-rail-group--ruled")}
        >
          {group.map((entry) => (
            <RailTooltip key={entry.href} label={entry.label}>
              <RailLeafLink item={entry} pathname={pathname} />
            </RailTooltip>
          ))}
        </div>
      ))}
    </>
  );
}

function MobileNavLinks({ pathname }: { pathname: string }) {
  return (
    <>
      {NAV_GROUPS.map((group, index) => (
        <div
          key={group[0]?.href ?? index}
          className={cn("workspace-mobile-group", index > 0 && "workspace-mobile-group--ruled")}
        >
          {group.map((entry) => {
            const Icon = entry.icon;
            const active = isActive(pathname, entry.href);
            return (
              <Link
                key={entry.href}
                href={entry.href}
                className={cn("workspace-mobile-link", active && "active")}
                aria-current={active ? "page" : undefined}
              >
                <Icon />
                <span>{entry.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
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
  const [expanded, setExpanded] = useState(() => {
    if (typeof document === "undefined") return false;
    return readNavExpanded();
  });

  useLayoutEffect(() => {
    setExpanded(readNavExpanded());
  }, []);

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

  function toggleExpanded() {
    const next = !readNavExpanded();
    writeNavExpanded(next);
    setExpanded(next);
  }

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
          <Link href="/" className="workspace-rail-brand" aria-label="Portulan">
            <span className="workspace-rail-brand-mark">
              <BrandMark mark />
            </span>
            <span className="workspace-rail-brand-logo">
              <BrandMark compact />
            </span>
          </Link>
          {workspaces.length ? (
            <div className="workspace-rail-porto">
              <WorkspaceSwitcher workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} />
            </div>
          ) : null}
          <div className="workspace-rail-nav">
            <RailNavLinks pathname={pathname} />
          </div>
          <div className="workspace-rail-footer">
            <RailTooltip label={expanded ? "Recolher menu" : "Mostrar menus"}>
              <button
                type="button"
                className="workspace-rail-link workspace-rail-toggle"
                aria-pressed={expanded}
                aria-label={expanded ? "Recolher menu" : "Mostrar menus"}
                onClick={toggleExpanded}
              >
                <PanelLeftOpen className="workspace-rail-toggle-expand" />
                <PanelLeftClose className="workspace-rail-toggle-collapse" />
                <span className="workspace-rail-link-label workspace-rail-toggle-expand">Mostrar menus</span>
                <span className="workspace-rail-link-label workspace-rail-toggle-collapse">Recolher</span>
              </button>
            </RailTooltip>
            <ThemeToggle
              className="workspace-rail-link"
              workspaceId={activeWorkspaceId}
              railLabel
              compactTitle={expanded ? undefined : "Escolher tema"}
            />
            <AuthControls session={session} account={account} compact={false} />
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
