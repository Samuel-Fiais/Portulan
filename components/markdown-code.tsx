import { markdownCodeProps } from "@/lib/markdown-code";

export function MarkdownCode({
  children,
  className,
  node,
}: {
  children?: React.ReactNode;
  className?: string;
  node?: unknown;
}) {
  const props = markdownCodeProps({ children, className, node });
  return <code className={props.className}>{props.children}</code>;
}
