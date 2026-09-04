import { type ReactNode } from "react";

type HastText = { type: "text"; value: string };
type HastElement = { type: "element"; tagName: string; children?: HastText[] };

export function isFencedCode(node: unknown): boolean {
  if (!node || typeof node !== "object") return false;
  const element = node as HastElement;
  if (element.type !== "element" || element.tagName !== "code") return false;
  const text = element.children?.[0];
  return text?.type === "text" && text.value.endsWith("\n");
}

export function markdownCodeProps({
  children,
  className,
  node,
}: {
  children?: ReactNode;
  className?: string;
  node?: unknown;
}) {
  if (className) return { className, children };
  if (isFencedCode(node)) return { className: undefined, children };
  return { className: "report-inline-code", children };
}
