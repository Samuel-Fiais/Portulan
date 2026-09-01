import Image from "next/image";
import type { DocumentType } from "@/lib/documents";
import { cn } from "@/lib/utils";

export function PortulanLogo({ type = "feature", className }: { type?: DocumentType; className?: string }) {
  // Use the official Portulan logo for all document types
  void type;
  return <Image className={cn("portulan-real-logo", className)} src="/portulan-logo.png" alt="Portulan" width={1224} height={388} unoptimized />;
}
