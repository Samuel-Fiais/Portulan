"use client";

import { Children, isValidElement, type ReactNode } from "react";
import { LivingCopyButton, flattenNodeText } from "@/components/living-copy-button";
import { LivingMermaid } from "@/components/living-mermaid";

export function LivingCodeBlock({
  children,
  interactive = false,
  language,
  text,
}: {
  children: ReactNode;
  interactive?: boolean;
  language?: string;
  text?: string;
}) {
  const child = Children.toArray(children)[0];
  const className = isValidElement<{ className?: string }>(child) ? child.props.className : undefined;
  const resolvedLanguage = language || className?.replace("language-", "") || "código";
  const resolvedText = text ?? flattenNodeText(children);

  if (resolvedLanguage === "mermaid" && resolvedText.trim()) {
    return <LivingMermaid source={resolvedText} />;
  }

  return (
    <div className="fp-code-block">
      <div className="fp-code-header">
        <span>{resolvedLanguage}</span>
        {interactive && resolvedText ? <LivingCopyButton compact text={resolvedText} label="Copiar" /> : null}
      </div>
      <pre className="report-code">{children}</pre>
    </div>
  );
}

export function LivingTable({ children }: { children: ReactNode; interactive?: boolean }) {
  return (
    <div className="fp-table-wrap">
      <table className="fp-table">{children}</table>
    </div>
  );
}
