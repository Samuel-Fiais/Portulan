import type { MarkdownHeading } from "@/lib/markdown-headings";

export function ReportToc({ headings }: { headings: MarkdownHeading[] }) {
  if (headings.length === 0) return null;

  return (
    <nav className="report-toc" aria-label="Índice">
      <div className="report-toc-title">Índice</div>
      <ol>
        {headings.map((heading) => (
          <li key={heading.id} className={heading.level === 3 ? "report-toc-sub" : undefined}>
            <a href={`#${heading.id}`}>{heading.text}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
