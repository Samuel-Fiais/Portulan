import { CustomReportLogo } from "@/components/custom-report-logo";
import { PortulanLogo, PORTULAN_LOGO_LIGHT } from "@/components/portulan-logo";

export function ReportBrandLogo({ logoUrl, className }: { logoUrl?: string | null; className?: string }) {
  if (logoUrl) {
    return <CustomReportLogo className={className} src={logoUrl} />;
  }

  return <PortulanLogo key="portulan-default" className={className} />;
}

export function reportPrintLogoStyle(logoUrl?: string | null): string {
  return logoUrl ? `url("${logoUrl.replace(/"/g, '\\"')}")` : `url("${PORTULAN_LOGO_LIGHT.src}")`;
}
