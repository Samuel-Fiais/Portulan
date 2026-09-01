import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandMark({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center", className)} aria-label="Portulan">
      <Image
        src="/portulan-logo.png"
        alt="Portulan"
        width={1536}
        height={1024}
        className={cn("brand-logo w-auto max-w-none object-contain", compact ? "h-9 sm:h-10" : "h-11 sm:h-14")}
        priority
      />
    </div>
  );
}
