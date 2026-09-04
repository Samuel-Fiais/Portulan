import type { CSSProperties } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
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

  const content = (
    <>
      <span className="fp-report-card-icon" aria-hidden><FileText /></span>
      <div className="fp-report-card-body">
        {templateName ? <span className="fp-report-card-template">{templateName}</span> : null}
        <strong className="fp-report-card-title">{title}</strong>
        {summary ? <p className="fp-report-card-summary">{summary}</p> : null}
        <small className="fp-report-card-path">/d/{slug}</small>
      </div>
    </>
  );

  if (interactive) {
    return (
      <button
        type="button"
        className={cn("fp-report-card", selected && "fp-report-card--selected", className)}
        style={paletteStyle}
        onClick={onSelect}
      >
        {content}
      </button>
    );
  }

  return (
    <Link href={`/d/${slug}`} className={cn("fp-report-card", className)} style={paletteStyle}>
      {content}
    </Link>
  );
}
