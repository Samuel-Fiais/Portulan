import { cn } from "@/lib/utils";

export function BrandMark({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)} aria-label="Portulan">
      <span className="brand-symbol" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {!compact && (
        <span className="font-mono text-[15px] font-bold tracking-[-0.04em] text-foreground">
          Portulan
        </span>
      )}
    </div>
  );
}
