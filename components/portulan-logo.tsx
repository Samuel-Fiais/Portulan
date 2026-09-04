import Image from "next/image";
import { cn } from "@/lib/utils";

export const PORTULAN_LOGO_LIGHT = {
  src: "/portulan-logo.png",
  width: 1702,
  height: 494,
} as const;

export const PORTULAN_LOGO_DARK = {
  src: "/portulan-logo-on-dark.png",
  width: 1693,
  height: 494,
} as const;

export function PortulanLogo({ className }: { className?: string }) {
  return (
    <span className={cn("portulan-logo-swap", className)}>
      <Image
        className="portulan-real-logo portulan-logo-light"
        src={PORTULAN_LOGO_LIGHT.src}
        alt="Portulan"
        width={PORTULAN_LOGO_LIGHT.width}
        height={PORTULAN_LOGO_LIGHT.height}
        unoptimized
      />
      <Image
        className="portulan-real-logo portulan-logo-dark"
        src={PORTULAN_LOGO_DARK.src}
        alt=""
        width={PORTULAN_LOGO_DARK.width}
        height={PORTULAN_LOGO_DARK.height}
        unoptimized
        aria-hidden
      />
    </span>
  );
}
