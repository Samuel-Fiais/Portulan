"use client";

import { Fragment, useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Anchor,
  Compass,
  Library,
  Map,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Ruler,
  Telescope,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Session } from "next-auth";
import { AuthControls } from "@/components/auth-controls";
import type { PublicAccount } from "@/lib/account-types";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

type NavGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  children: readonly NavLeaf[];
};

type NavEntry = NavLeaf | NavGroup;

const NAV: readonly NavEntry[] = [
  { href: "/", label: "Ponte", icon: Compass },
  {
    id: "acervo",
    label: "Acervo",
    icon: Library,
    children: [
      { href: "/biblioteca", label: "Cartoteca", icon: Map },
      { href: "/templates", label: "Gabaritos", icon: Ruler },
    ],
  },
  { href: "/integrations", label: "Instrumentos", icon: Telescope },
  { href: "/porto", label: "Porto", icon: Anchor },
];

function isGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isGroupActive(pathname: string, group: NavGroup) {
  return group.children.some((child) => isActive(pathname, child.href));
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
  expanded,
  children,
}: {
  label: string;
  expanded: boolean;
  children: React.ReactNode;
}) {
  if (expanded) return children;
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

function RailNavLinks({ pathname, expanded }: { pathname: string; expanded: boolean }) {
  const router = useRouter();

  return (
    <>
      {NAV.map((entry) => {
        if (!isGroup(entry)) {
          return (
            <RailTooltip key={entry.href} label={entry.label} expanded={expanded}>
              <RailLeafLink item={entry} pathname={pathname} />
            </RailTooltip>
          );
        }

        const groupActive = isGroupActive(pathname, entry);
        const GroupIcon = entry.icon;

        if (expanded) {
          return (
            <Fragment key={entry.id}>
              {entry.children.map((child) => (
                <RailTooltip key={child.href} label={child.label} expanded={expanded}>
                  <RailLeafLink item={child} pathname={pathname} />
                </RailTooltip>
              ))}
            </Fragment>
          );
        }

        return (
          <div key={entry.id} className="workspace-rail-group">
            <div className="workspace-rail-group-head">
              <div className="workspace-rail-group-head-inner">
                <DropdownMenu>
                  <RailTooltip label={entry.label} expanded={expanded}>
                    <DropdownMenuTrigger
                      className={cn(
                        "workspace-rail-link workspace-rail-group-trigger",
                        !expanded && groupActive && "active",
                      )}
                      aria-label={entry.label}
                      aria-haspopup="menu"
                      tabIndex={expanded ? -1 : undefined}
                    >
                      <GroupIcon />
                      <span className="workspace-rail-link-label">{entry.label}</span>
                    </DropdownMenuTrigger>
                  </RailTooltip>
                  <DropdownMenuContent align="start" side="right" sideOffset={10} className="workspace-rail-flyout">
                    <DropdownMenuLabel>{entry.label}</DropdownMenuLabel>
                    {entry.children.map((child) => {
                      const ChildIcon = child.icon;
                      const active = isActive(pathname, child.href);
                      return (
                        <DropdownMenuItem
                          key={child.href}
                          className={cn("workspace-rail-flyout-item", active && "active")}
                          onSelect={() => router.push(child.href)}
                        >
                          <ChildIcon />
                          {child.label}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="workspace-rail-group-body" aria-hidden={!expanded}>
              <div className="workspace-rail-group-body-inner">
                <p className="workspace-rail-group-caption">{entry.label}</p>
                {entry.children.map((child) => (
                  <RailLeafLink key={child.href} item={child} pathname={pathname} />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

function MobileNavLinks({ pathname }: { pathname: string }) {
  return (
    <>
      {NAV.map((entry) => {
        if (!isGroup(entry)) {
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
        }

        return (
          <div key={entry.id} className="workspace-mobile-group">
            <p className="workspace-mobile-section">{entry.label}</p>
            {entry.children.map((child) => {
              const Icon = child.icon;
              const active = isActive(pathname, child.href);
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={cn("workspace-mobile-link", active && "active")}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon />
                  <span>{child.label}</span>
                </Link>
              );
            })}
          </div>
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
            <RailNavLinks pathname={pathname} expanded={expanded} />
          </div>
          <div className="workspace-rail-footer">
            <RailTooltip label={expanded ? "Recolher menu" : "Mostrar menus"} expanded={expanded}>
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
