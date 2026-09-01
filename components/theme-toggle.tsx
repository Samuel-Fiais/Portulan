"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ThemeToggle() {
  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    const theme = next ? "dark" : "light";
    localStorage.setItem("portulan-theme", theme);
    localStorage.removeItem("festpay-docs-theme");
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="sm" onClick={toggle} aria-label="Alternar tema">
          <Sun className="theme-icon-sun" />
          <Moon className="theme-icon-moon" />
          <span>Tema</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>Alternar tema</TooltipContent>
    </Tooltip>
  );
}
