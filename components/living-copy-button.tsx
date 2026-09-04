"use client";

import { Children, isValidElement, useCallback, useEffect, useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function nodeText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children);
  return "";
}

export function flattenNodeText(children: ReactNode) {
  return Children.toArray(children).map(nodeText).join("").replace(/\n$/, "");
}

async function writeClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const input = document.createElement("textarea");
  input.value = text;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.left = "-9999px";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}

export function LivingCopyButton({
  text,
  getText,
  label = "Copiar",
  compact = false,
  tone = "light",
  className,
  children,
}: {
  text?: string;
  getText?: () => string;
  label?: string;
  compact?: boolean;
  tone?: "light" | "dark";
  className?: string;
  children?: ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const copy = useCallback(async () => {
    const value = (getText?.() ?? text ?? "").trimEnd();
    if (!value) return;
    try {
      await writeClipboard(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }, [getText, text]);

  return (
    <button
      type="button"
      className={cn(
        !children && "fp-copy-btn",
        !children && tone === "dark" && "fp-copy-btn-on-dark",
        !children && compact && "fp-copy-btn-compact",
        className,
      )}
      onClick={(event) => {
        event.stopPropagation();
        void copy();
      }}
      aria-label={copied ? "Copiado" : label}
      title={copied ? "Copiado" : label}
      data-copied={copied || undefined}
    >
      {children ?? (
        <>
          {copied ? <Check /> : <Copy />}
          {compact ? null : <span>{copied ? "Copiado" : label}</span>}
        </>
      )}
    </button>
  );
}
