"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function formatBoardNumber(value: number | null | undefined) {
  if (!value || value <= 0) return "";
  return `#${value}`;
}

export function BoardId({
  number,
  className,
}: {
  number: number | null | undefined;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  if (!number || number <= 0) return null;
  const label = formatBoardNumber(number);
  return (
    <button
      type="button"
      className={cn("board-id", className)}
      title="Copiar identificador"
      onClick={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        try {
          await navigator.clipboard.writeText(String(number));
          setCopied(true);
          toast.success(`Copiado ${label}`);
          window.setTimeout(() => setCopied(false), 1200);
        } catch {
          toast.error("Não foi possível copiar");
        }
      }}
    >
      {copied ? "copiado" : label}
    </button>
  );
}
