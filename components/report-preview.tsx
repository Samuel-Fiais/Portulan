import type { CSSProperties } from "react";
import { ReportBrandLogo, reportPrintLogoStyle } from "@/components/report-brand-logo";
import { RichMarkdown } from "@/components/rich-markdown";
import { statusMeta, type DocumentRecord } from "@/lib/documents";
import { formatDate } from "@/lib/utils";

export function ReportPreview({
  document,
  publicView = false,
  interactive = false,
  documentKey,
}: {
  document: DocumentRecord;
  publicView?: boolean;
  interactive?: boolean;
  documentKey?: string;
}) {
  const paletteStyle = {
    "--report-accent": document.primaryColor,
    "--report-accent-2": document.secondaryColor,
    "--print-logo": reportPrintLogoStyle(document.logoUrl),
  } as CSSProperties;
  const livingKey = documentKey ?? `doc-${document.id}-v${document.version}`;
  const isLiving = interactive && Boolean(livingKey);

  return (
    <article className={`report-paper${isLiving ? " living-document" : ""}`} style={paletteStyle}>
      <table className="template-document-table">
      <thead><tr><th>
      <div className="tmpl-doc-header">
        <span className="tmpl-logo-slot"><ReportBrandLogo logoUrl={document.logoUrl} /></span>
        <div className="tmpl-doc-right">
          <span className="tmpl-doc-type">{document.templateName}</span>
          <span className="tmpl-doc-date">v{document.version} · {formatDate(document.updatedAt)}</span>
        </div>
      </div>
      <div className="tmpl-header-bar" />
      </th></tr></thead>
      <tbody className="tmpl-cover"><tr><td>
      <header className="tmpl-header keep-together">
        <div className="tmpl-heading-row">
          <div>
            <div className="tmpl-label">{document.templateName}</div>
            <h1 className="fp-h2">{document.title}</h1>
            {document.summary ? <p className="fp-body tmpl-summary">{document.summary}</p> : null}
          </div>
          <span className={`fp-badge status-badge status-${document.status}`}><span className="dot" />{statusMeta[document.status].label}</span>
        </div>
        <dl className="tmpl-meta-bar">
          <div className="tmpl-meta-item"><dt className="tmpl-meta-k">Status</dt><dd className="tmpl-meta-v">{statusMeta[document.status].label}</dd></div>
          <div className="tmpl-meta-item"><dt className="tmpl-meta-k">Responsável</dt><dd className="tmpl-meta-v">{document.author || "—"}</dd></div>
          <div className="tmpl-meta-item"><dt className="tmpl-meta-k">Time</dt><dd className="tmpl-meta-v">{document.team || "—"}</dd></div>
          <div className="tmpl-meta-item"><dt className="tmpl-meta-k">Atualizado</dt><dd className="tmpl-meta-v">{formatDate(document.updatedAt)}</dd></div>
        </dl>
      </header>
      </td></tr></tbody>
      <tbody className="tmpl-body report-content">
        <RichMarkdown source={document.content} tableRows interactive={isLiving} documentKey={livingKey} />
      </tbody>
      <tfoot><tr><td>
      <footer className="tmpl-footer keep-together">
        <span className="tmpl-footer-logo"><ReportBrandLogo logoUrl={document.logoUrl} /></span>
        <span className="tmpl-footer-text">
          {publicView ? `Portulan · v${document.version} · ${formatDate(document.updatedAt)}` : `Portulan · Confidencial · ${formatDate(document.updatedAt)}`}
        </span>
      </footer>
      </td></tr></tfoot>
      </table>
    </article>
  );
}
