import Link from "next/link";
import { auth } from "@/auth";
import { AuthControls } from "@/components/auth-controls";
import { BrandMark } from "@/components/brand-mark";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="app-shell">
      <header className="site-header no-print">
        <div className="header-inner">
          <BrandMark />
          <span className="header-divider" />
          <nav className="site-nav" aria-label="Navegação principal">
            <Link href="/#documents">Biblioteca</Link>
            <Link href="/#templates">Templates</Link>
            <Link href="/#integrations">MCP</Link>
          </nav>
          <AuthControls session={session} />
        </div>
      </header>
      {children}
    </div>
  );
}
