import Image from "next/image";
import type { DocumentType } from "@/lib/documents";
import { cn } from "@/lib/utils";

const logoTone: Record<DocumentType, string> = {
  feature: "purple",
  incident: "coral",
  report: "teal",
  reference: "indigo",
};

export function FestpayLogo({ type = "feature", className }: { type?: DocumentType; className?: string }) {
  return <Image className={cn("festpay-real-logo", className)} src={`/api/brand/${logoTone[type]}`} alt="Festpay" width={1224} height={388} unoptimized />;
}
