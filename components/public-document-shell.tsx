import { ThemeToggle } from "@/components/theme-toggle";

export function PublicDocumentShell({
  notice,
  children,
}: {
  notice?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="public-document-shell">
      {notice ? <div className="draft-preview-notice no-print">{notice}</div> : null}
      <main className="public-document-main">{children}</main>
      <div className="public-document-theme-toggle no-print">
        <ThemeToggle compact />
      </div>
    </div>
  );
}
