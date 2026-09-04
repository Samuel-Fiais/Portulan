import { hrefFromValue, looksLikeHref } from "./report-links.ts";

export type PropertyValueRender =
  | { kind: "plain-href"; href: string; label: string }
  | { kind: "markdown"; source: string };

export function resolvePropertyValue(value: string, type: string): PropertyValueRender | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const plainHref = hrefFromValue(trimmed);
  if (type === "url") {
    const href = plainHref ?? trimmed;
    if (looksLikeHref(href)) {
      return { kind: "plain-href", href, label: trimmed };
    }
    return { kind: "markdown", source: value };
  }

  if (plainHref) {
    return { kind: "plain-href", href: plainHref, label: trimmed };
  }

  return { kind: "markdown", source: value };
}
