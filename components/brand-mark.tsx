import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_LIGHT_WIDTH = 1702;
const LOGO_LIGHT_HEIGHT = 494;
const LOGO_DARK_WIDTH = 1693;
const LOGO_DARK_HEIGHT = 494;
const MARK_SIZE = 462;

export function BrandMark({
  compact = false,
  mark = false,
  className,
}: {
  compact?: boolean;
  mark?: boolean;
  className?: string;
}) {
  if (mark) {
    return (
      <div className={cn("brand-mark brand-mark--icon flex items-center", className)} aria-label="Portulan">
        <Image
          src="/portulan-mark.png"
          alt="Portulan"
          width={MARK_SIZE}
          height={MARK_SIZE}
          className="brand-mark-icon brand-mark-icon--light"
          priority
        />
        <Image
          src="/portulan-mark-on-dark.png"
          alt=""
          width={MARK_SIZE}
          height={MARK_SIZE}
          className="brand-mark-icon brand-mark-icon--dark"
          priority
          aria-hidden
        />
      </div>
    );
  }

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
