import { CustomReportLogo } from "@/components/custom-report-logo";
import { PortulanLogo, PORTULAN_LOGO_LIGHT } from "@/components/portulan-logo";
import { portulanBlobAssetUrl, shouldProxyPortulanBlobUrl } from "@/lib/blob-storage";

function resolveReportLogoUrl(logoUrl: string) {
  return shouldProxyPortulanBlobUrl(logoUrl) ? portulanBlobAssetUrl(logoUrl) : logoUrl;
}

export function ReportBrandLogo({ logoUrl, className }: { logoUrl?: string | null; className?: string }) {
  if (logoUrl) {
    return <CustomReportLogo className={className} src={resolveReportLogoUrl(logoUrl)} />;
  }

  return <PortulanLogo key="portulan-default" className={className} />;
}

export function reportPrintLogoStyle(logoUrl?: string | null): string {
  if (!logoUrl) return `url("${PORTULAN_LOGO_LIGHT.src}")`;
  const resolved = resolveReportLogoUrl(logoUrl).replace(/"/g, '\\"');
  return `url("${resolved}")`;
}
