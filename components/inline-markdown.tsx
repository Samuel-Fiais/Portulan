"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { isPlaceholderToken, prepareInlineMarkdown } from "@/lib/inline-markdown";

export function InlineMarkdown({ children }: { children: string }) {
  if (!children.trim() || isPlaceholderToken(children)) return null;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      allowedElements={["p", "strong", "em", "a", "code", "del"]}
      unwrapDisallowed
      components={{
        p: ({ children }) => <>{children}</>,
        strong: ({ children }) => <strong>{children}</strong>,
        em: ({ children }) => <em>{children}</em>,
        a: ({ children, href }) => <a href={href}>{children}</a>,
        code: ({ children }) => <code className="report-inline-code">{children}</code>,
      }}
    >
      {prepareInlineMarkdown(children)}
    </ReactMarkdown>
  );
}
