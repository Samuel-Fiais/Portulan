"use client";

import { TooltipProvider } from "@/components/ui/tooltip";

export function LivingReportProvider({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={120} skipDelayDuration={80}>
      {children}
    </TooltipProvider>
  );
}
