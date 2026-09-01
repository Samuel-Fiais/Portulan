import Image from "next/image";
import type { DocumentType } from "@/lib/documents";
import { cn } from "@/lib/utils";

const logoTone: Record<DocumentType, string> = {
  feature: "navy",
  incident: "burgundy",
  report: "gold",
  reference: "navy",
};

export function PortulanLogo({ type = "feature", className }: { type?: DocumentType; className?: string }) {
  return <Image className={cn("portulan-real-logo", className)} src={`/api/brand/${logoTone[type]}`} alt="Portulan" width={1224} height={388} unoptimized />;
}
