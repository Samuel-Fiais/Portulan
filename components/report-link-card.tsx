import type { CSSProperties } from "react";
import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import { reportPaletteStyle } from "@/lib/color-utils";
import { cn } from "@/lib/utils";

export type ReportLinkCardData = {
  slug: string;
  title: string;
  summary?: string | null;
  templateName?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
};

type ReportLinkCardProps = ReportLinkCardData & {
  className?: string;
  selected?: boolean;
  interactive?: boolean;
  onSelect?: () => void;
};

export function ReportLinkCard({
  slug,
  title,
  summary,
  templateName,
  primaryColor,
  secondaryColor,
  className,
  selected,
  interactive = false,
  onSelect,
}: ReportLinkCardProps) {
  const paletteStyle = reportPaletteStyle(primaryColor ?? "#1a2847", secondaryColor ?? "#c45c26") as CSSProperties;
  const destinationHint = `/d/${slug}`;

  const content = (
    <>
      <span className="fp-report-card-icon" aria-hidden>
        <FileText />
      </span>
      <div className="fp-report-card-body">
        {templateName ? <span className="fp-report-card-template">{templateName}</span> : null}
        <span className="fp-report-card-title">{title}</span>
        {summary ? <p className="fp-report-card-summary">{summary}</p> : null}
      </div>
      {!interactive ? (
        <ChevronRight className="fp-report-card-chevron" aria-hidden />
      ) : null}
    </>
  );

  if (interactive) {
    return (
      <button
        type="button"
        className={cn("fp-report-card", selected && "fp-report-card--selected", className)}
        style={paletteStyle}
        title={destinationHint}
        aria-label={`Selecionar relatório: ${title}`}
        aria-pressed={selected}
        onClick={onSelect}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={destinationHint}
      className={cn("fp-report-card", className)}
      style={paletteStyle}
      title={destinationHint}
      aria-label={`Abrir relatório: ${title}`}
    >
      {content}
    </Link>
  );
}
