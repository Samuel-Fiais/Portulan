import { PortulanLogo } from "@/components/portulan-logo";
import { cn } from "@/lib/utils";

export function ReportBrandLogo({ logoUrl, className }: { logoUrl?: string | null; className?: string }) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img className={cn("portulan-real-logo", className)} src={logoUrl} alt="" />
    );
  }

  return <PortulanLogo className={className} />;
}

export function reportPrintLogoStyle(logoUrl?: string | null): string {
  return logoUrl ? `url("${logoUrl.replace(/"/g, '\\"')}")` : 'url("/portulan-logo.png")';
}
