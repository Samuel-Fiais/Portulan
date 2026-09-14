"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemePicker } from "@/components/theme-picker";

export function ThemeToggle({
  className,
  side = "right",
  workspaceId,
}: {
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
  workspaceId?: string | null;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn("theme-toggle theme-picker-trigger", className)}
        aria-label="Escolher tema"
        title="Escolher tema"
      >
        <Sun className="theme-icon-sun" />
        <Moon className="theme-icon-moon" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side={side} sideOffset={8} className="theme-picker-menu">
        <ThemePicker variant="menu" workspaceId={workspaceId} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
