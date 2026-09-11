import { parseMarkdownBlocks, type MarkdownBlock, type MarkdownDirective } from "./directive-attrs.ts";
import { extractMarkdownHeadings } from "./markdown-headings.ts";
import { markdownComponents } from "./markdown-components.ts";
import { splitMarkdownSections } from "./markdown-sections.ts";

export const COVER_TITLE_ANCHOR = "cover-title";
export const COVER_SUMMARY_ANCHOR = "cover-summary";

export type CommentTarget = {
  id: string;
  label: string;
  kind: "cover" | "heading" | "block";
};

export function commentBlockAnchorId(sectionIndex: number, blockIndex: number) {
  return `block-${sectionIndex}-${blockIndex}`;
}

function directiveCatalogName(name: string) {
  return markdownComponents.find((component) => component.id === name)?.name ?? null;
}

function firstDirectiveRowLabel(directive: MarkdownDirective) {
  const first = directive.body.split("\n").map((line) => line.trim()).find(Boolean);
  if (!first) return "";
  return first.replace(/^[-*]\s+/, "").split("|")[0]?.trim() ?? "";
}

function directiveLabel(directive: MarkdownDirective) {
  const catalogName = directiveCatalogName(directive.name);
  const title = directive.attributes.title?.trim() || directive.attributes.id?.trim() || "";
  if (title && catalogName && title.toLocaleLowerCase("pt-BR") !== catalogName.toLocaleLowerCase("pt-BR")) {
    return `${catalogName} · ${title}`;
  }
  if (title) return title;
  const row = firstDirectiveRowLabel(directive);
  if (catalogName && row) return `${catalogName} · ${row}`;
  return catalogName || row || "Componente";
}

function blockLabel(block: MarkdownBlock) {
  if (block.kind === "directive") return directiveLabel(block.directive);

  const first = block.body.split("\n").find((line) => line.trim())?.trim() ?? "";
  if (!first) return "Texto";
  if (first.startsWith("|")) return "Tabela";
  return first.replace(/^#{1,6}\s+/, "").replace(/^[-*]\s+/, "").slice(0, 80) || "Texto";
}

export function extractCommentTargets(source: string): CommentTarget[] {
  const targets: CommentTarget[] = [
    { id: COVER_TITLE_ANCHOR, label: "Título", kind: "cover" },
    { id: COVER_SUMMARY_ANCHOR, label: "Resumo", kind: "cover" },
  ];
  const seen = new Set(targets.map((target) => target.id));

  for (const heading of extractMarkdownHeadings(source)) {
    if (seen.has(heading.id)) continue;
    seen.add(heading.id);
    targets.push({ id: heading.id, label: heading.text, kind: "heading" });
  }

  splitMarkdownSections(source).forEach((section, sectionIndex) => {
    parseMarkdownBlocks(section.body).forEach((block, blockIndex) => {
      const id = commentBlockAnchorId(sectionIndex, blockIndex);
      if (seen.has(id)) return;
      seen.add(id);
      targets.push({ id, label: blockLabel(block), kind: "block" });
    });
  });

  return targets;
}

export function commentTargetIds(source: string) {
  return extractCommentTargets(source).map((target) => target.id);
}

export function commentTargetLabel(source: string, anchor: string | null | undefined) {
  if (!anchor) return null;
  return extractCommentTargets(source).find((target) => target.id === anchor)?.label ?? anchor;
}
