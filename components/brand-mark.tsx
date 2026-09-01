import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_WIDTH = 1421;
const LOGO_HEIGHT = 657;

export function BrandMark({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center", className)} aria-label="Portulan">
      <Image
        src="/portulan-logo.png"
        alt="Portulan"
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        className={cn(
          "brand-logo object-contain object-left",
          compact ? "brand-logo--compact" : "brand-logo--header",
        )}
        priority
      />
    </div>
  );
}
