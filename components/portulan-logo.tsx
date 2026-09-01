import Image from "next/image";
import { cn } from "@/lib/utils";

export function PortulanLogo({ className }: { className?: string }) {
  return (
    <Image
      className={cn("portulan-real-logo", className)}
      src="/portulan-logo.png"
      alt="Portulan"
      width={1702}
      height={494}
      unoptimized
    />
  );
}
