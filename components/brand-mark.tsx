import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandMark({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center", className)} aria-label="Portulan">
      <Image
        src="/portulan-logo.png"
        alt="Portulan"
        width={compact ? 120 : 250}
        height={compact ? 48 : 100}
        className={cn("w-auto", compact ? "h-8" : "h-10")}
        priority
      />
    </div>
  );
}
