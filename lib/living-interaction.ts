import { cn } from "@/lib/utils";

export type LivingTooltipProps = {
  className?: string;
  "data-living-tip"?: string;
  "data-living-detail"?: string;
  tabIndex?: number;
};

/** Tooltip no hover — usar só quando o dado não está visível (ex.: segmentos de gráfico). */
export function livingTooltipProps(
  interactive: boolean,
  label: string,
  detail?: string,
  className?: string,
): LivingTooltipProps {
  if (!interactive) return className ? { className } : {};
  return {
    className: cn(className, "fp-living-tip"),
    "data-living-tip": label,
    ...(detail ? { "data-living-detail": detail } : {}),
    tabIndex: 0,
  };
}

export function livingChartTip(
  interactive: boolean,
  chartTitle: string,
  label: string,
  value: number | string,
  className?: string,
) {
  const detail = chartTitle ? `${chartTitle} · ${value}` : String(value);
  return livingTooltipProps(interactive, label, detail, cn("fp-chart-interactive", className));
}
