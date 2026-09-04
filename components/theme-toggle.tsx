"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    const theme = next ? "dark" : "light";
    localStorage.setItem("portulan-theme", theme);
    localStorage.removeItem("festpay-docs-theme");
  }

  return (
    <button
      type="button"
      className={cn("theme-toggle", className)}
      onClick={toggle}
      aria-label="Alternar tema claro ou escuro"
      title="Alternar tema"
    >
      <Sun className="theme-icon-sun" />
      <Moon className="theme-icon-moon" />
    </button>
  );
}
