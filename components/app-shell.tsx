import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <header className="site-header no-print">
        <div className="header-inner">
          <BrandMark />
          <span className="header-tag">Sistema de documentos</span>
          <span className="header-divider" />
          <nav className="site-nav" aria-label="Navegação principal">
            <Link href="/#documents">Biblioteca</Link>
            <Link href="/#templates">Templates</Link>
            <Link href="/#integrations">MCP</Link>
          </nav>
          <ThemeToggle />
        </div>
      </header>
      {children}
    </div>
  );
}
