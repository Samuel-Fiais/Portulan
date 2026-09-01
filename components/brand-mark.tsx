import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_LIGHT_WIDTH = 1702;
const LOGO_LIGHT_HEIGHT = 494;
const LOGO_DARK_WIDTH = 1693;
const LOGO_DARK_HEIGHT = 494;

export function BrandMark({ compact = false, className }: { compact?: boolean; className?: string }) {
  const sizeClass = compact ? "brand-logo--compact" : "brand-logo--header";

  return (
    <div className={cn("brand-mark flex items-center", className)} aria-label="Portulan">
      <Image
        src="/portulan-logo.png"
        alt="Portulan"
        width={LOGO_LIGHT_WIDTH}
        height={LOGO_LIGHT_HEIGHT}
        className={cn("brand-logo brand-logo--light", sizeClass)}
        priority
      />
      <Image
        src="/portulan-logo-on-dark.png"
        alt="Portulan"
        width={LOGO_DARK_WIDTH}
        height={LOGO_DARK_HEIGHT}
        className={cn("brand-logo brand-logo--dark", sizeClass)}
        priority
      />
    </div>
  );
}
