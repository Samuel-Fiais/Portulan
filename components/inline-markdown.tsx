"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function isPlaceholderToken(value?: string) {
  if (!value?.trim()) return true;
  return /^[-–—−•·.…]+$/u.test(value.trim());
}

function prepareInlineMarkdown(source: string) {
  if (isPlaceholderToken(source)) return "";
  return source
    .split("\n")
    .map((line) => {
      if (/^(\s*)-(?= )/.test(line)) return line.replace(/^(\s*)-(?= )/, "$1\\-");
      return line;
    })
    .join("\n");
}

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

export { isPlaceholderToken };
