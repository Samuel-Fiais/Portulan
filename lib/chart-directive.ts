export type ChartPoint = {
  label: string;
  value: number;
  target?: number;
};

export function parseChartDirective(body: string, attributes: Record<string, string>) {
  const points = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^[-–—−]\s*$/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").split("|").map((part) => part.trim()));

  const rawType = attributes.type ?? "";
  const type = ["bar", "line", "area", "column", "donut", "gauge", "spark", "stacked", "target"].includes(rawType)
    ? rawType
    : "bar";

  if (type === "target") {
    return {
      type,
      title: attributes.title || "Meta e realizado",
      points: points
        .map(([label, rawValue, rawTarget]) => ({
          label,
          value: Number.parseFloat((rawValue ?? "").replace(",", ".")),
          target: Number.parseFloat((rawTarget ?? "").replace(",", ".")),
        }))
        .filter((point) => point.label && Number.isFinite(point.value) && Number.isFinite(point.target)),
    };
  }

  return {
    type,
    title:
      attributes.title ||
      (type === "column"
        ? "Comparativo"
        : type === "gauge"
          ? "Indicador"
          : type === "donut" || type === "stacked"
            ? "Distribuição"
            : type === "line" || type === "area" || type === "spark"
              ? "Evolução"
              : "Comparativo"),
    points: points
      .map(([label, rawValue]) => ({ label, value: Number.parseFloat((rawValue ?? "").replace(",", ".")) }))
      .filter((point) => point.label && Number.isFinite(point.value)),
  };
}
