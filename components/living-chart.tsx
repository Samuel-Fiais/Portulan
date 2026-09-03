"use client";

import { useCallback, type CSSProperties, type MouseEvent } from "react";
import { toast } from "sonner";

export type ChartPoint = {
  label: string;
  value: number;
  target?: number;
};

type LivingChartProps = {
  title: string;
  type: string;
  points: ChartPoint[];
  interactive?: boolean;
};

const CHART_COLORS = ["var(--accent)", "var(--accent-2)", "var(--s-ok)", "var(--s-warn)"];

function showChartToast(title: string, label: string, value: number | string, interactive?: boolean) {
  if (!interactive) return;
  toast(`${label}`, {
    description: title ? `${title} · ${value}` : String(value),
    classNames: {
      toast: "portulan-toast",
      title: "portulan-toast-title",
      description: "portulan-toast-description",
    },
  });
}

function interactiveProps(
  interactive: boolean | undefined,
  title: string,
  label: string,
  value: number | string,
  onActivate?: (event: MouseEvent) => void,
) {
  if (!interactive) return {};
  return {
    className: "fp-chart-interactive",
    role: "button" as const,
    tabIndex: 0,
    onClick: (event: MouseEvent) => {
      event.stopPropagation();
      onActivate?.(event);
      showChartToast(title, label, value, interactive);
    },
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        showChartToast(title, label, value, interactive);
      }
    },
  };
}

export function LivingChart({ title, type, points, interactive = false }: LivingChartProps) {
  const notify = useCallback(
    (label: string, value: number | string) => {
      showChartToast(title, label, value, interactive);
    },
    [interactive, title],
  );

  const max = Math.max(...points.map((point) => point.value), 1);
  const total = Math.max(points.reduce((sum, point) => sum + point.value, 0), 1);

  if (type === "gauge") {
    const point = points[0];
    const value = Math.max(0, Math.min(100, point?.value ?? 0));
    return (
      <figure className="fp-chart fp-chart-gauge">
        <figcaption>{title}</figcaption>
        <div
          className={`fp-gauge ${interactive ? "fp-chart-interactive" : ""}`}
          style={{ "--gauge-value": `${value}%` } as CSSProperties}
          {...(interactive
            ? {
                role: "button",
                tabIndex: 0,
                onClick: () => notify(point?.label || "Resultado atual", `${value}%`),
                onKeyDown: (event: React.KeyboardEvent) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    notify(point?.label || "Resultado atual", `${value}%`);
                  }
                },
              }
            : {})}
        >
          <div>
            <strong>{value}%</strong>
            <span>{point?.label || "Resultado atual"}</span>
          </div>
        </div>
      </figure>
    );
  }

  if (type === "donut") {
    let offset = 0;
    const gradient = points
      .map((point, index) => {
        const start = offset;
        offset += (point.value / total) * 100;
        return `${CHART_COLORS[index % CHART_COLORS.length]} ${start}% ${offset}%`;
      })
      .join(", ");
    return (
      <figure className="fp-chart">
        <figcaption>{title}</figcaption>
        <div className="fp-chart-donut-row">
          <div
            className="fp-chart-donut"
            style={{ background: `conic-gradient(${gradient || "var(--border) 0 100%"})` }}
          >
            <span>{Math.round(total)}</span>
          </div>
          <ul className="fp-chart-legend">
            {points.map((point, index) => (
              <li
                key={point.label}
                {...interactiveProps(interactive, title, point.label, point.value)}
              >
                <i style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
                <span>{point.label}</span>
                <strong>{point.value}</strong>
              </li>
            ))}
          </ul>
        </div>
      </figure>
    );
  }

  if (type === "stacked") {
    return (
      <figure className="fp-chart">
        <figcaption>{title}</figcaption>
        <div className="fp-chart-stacked" aria-label={title}>
          {points.map((point, index) => (
            <span
              key={point.label}
              style={{
                width: `${Math.max((point.value / total) * 100, 2)}%`,
                background: CHART_COLORS[index % CHART_COLORS.length],
              }}
              title={interactive ? undefined : `${point.label}: ${point.value}`}
              {...interactiveProps(interactive, title, point.label, point.value)}
            />
          ))}
        </div>
        <ul className="fp-chart-legend">
          {points.map((point, index) => (
            <li
              key={point.label}
              {...interactiveProps(interactive, title, point.label, point.value)}
            >
              <i style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
              <span>{point.label}</span>
              <strong>{point.value}</strong>
            </li>
          ))}
        </ul>
      </figure>
    );
  }

  if (type === "target") {
    const targets = points.filter(
      (point) => point.label && Number.isFinite(point.value) && Number.isFinite(point.target),
    );
    const targetMaximum = Math.max(...targets.map((point) => Math.max(point.value, point.target ?? 0)), 1);
    return (
      <figure className="fp-chart">
        <figcaption>{title}</figcaption>
        <div className="fp-chart-targets">
          {targets.map((point) => (
            <div
              key={point.label}
              {...interactiveProps(interactive, title, point.label, `${point.value} (meta ${point.target})`)}
            >
              <div>
                <span>{point.label}</span>
                <strong>{point.value}</strong>
                <small>meta {point.target}</small>
              </div>
              <div className="fp-chart-target-track">
                <i style={{ width: `${Math.min((point.value / targetMaximum) * 100, 100)}%` }} />
                <b style={{ left: `${Math.min(((point.target ?? 0) / targetMaximum) * 100, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </figure>
    );
  }

  if (type === "line" || type === "area" || type === "column" || type === "spark") {
    const width = 720;
    const height = 180;
    const padding = 20;
    const horizontalPadding = 42;
    const steps = Math.max(points.length - 1, 1);
    const minimum = Math.min(...points.map((point) => point.value), 0);
    const maximum = Math.max(...points.map((point) => point.value), 0);
    const range = Math.max(maximum - minimum, 1);
    const pointY = (value: number) => height - padding - ((value - minimum) / range) * (height - padding * 2);
    const pointsWithCoordinates = points.map((point, index) => ({
      ...point,
      x: horizontalPadding + (index / steps) * (width - horizontalPadding * 2),
      y: pointY(point.value),
    }));
    const coordinates = pointsWithCoordinates.map((point) => `${point.x},${point.y}`).join(" ");
    const baseline = pointY(0);

    if (type === "column") {
      const columnMaximum = Math.max(...points.map((point) => Math.abs(point.value)), 1);
      return (
        <figure className="fp-chart">
          <figcaption>{title}</figcaption>
          <div
            className="fp-chart-columns"
            style={{ gridTemplateColumns: `repeat(${Math.max(points.length, 1)}, minmax(84px, 150px))` }}
          >
            {points.map((point) => (
              <div key={point.label}>
                <span>
                  <strong>{point.value}</strong>
                  <i
                    className={point.value < 0 ? "negative" : undefined}
                    style={{ height: `${Math.max((Math.abs(point.value) / columnMaximum) * 100, 3)}%` }}
                    {...interactiveProps(interactive, title, point.label, point.value)}
                  />
                </span>
                <small>{point.label}</small>
              </div>
            ))}
          </div>
        </figure>
      );
    }

    const areaCoordinates = `${coordinates} ${width - horizontalPadding},${baseline} ${horizontalPadding},${baseline}`;
    if (type === "spark") {
      return (
        <figure className="fp-chart fp-chart-spark">
          <figcaption>{title}</figcaption>
          <div className="fp-chart-line">
            <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" aria-label={title}>
              <polyline points={coordinates} />
              {pointsWithCoordinates.map((point) => (
                <circle
                  key={point.label}
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  {...interactiveProps(interactive, title, point.label, point.value)}
                />
              ))}
            </svg>
            <div>
              {points.map((point) => (
                <span key={point.label}>{point.label}</span>
              ))}
            </div>
          </div>
        </figure>
      );
    }

    return (
      <figure className="fp-chart">
        <figcaption>{title}</figcaption>
        <div className={`fp-chart-line ${type === "area" ? "fp-chart-area" : ""}`}>
          <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" aria-label={title}>
            <line x1={horizontalPadding} y1={baseline} x2={width - horizontalPadding} y2={baseline} />
            {type === "area" ? <polygon points={areaCoordinates} /> : null}
            <polyline points={coordinates} />
            {pointsWithCoordinates.map((point) => {
              const labelX = Math.max(20, Math.min(width - 20, point.x));
              const labelY = point.y < 42 ? point.y + 26 : point.y - 14;
              return (
                <g key={point.label}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    {...interactiveProps(interactive, title, point.label, point.value)}
                  />
                  <text x={labelX} y={labelY}>
                    {point.value}
                  </text>
                </g>
              );
            })}
          </svg>
          <div>
            {points.map((point) => (
              <span key={point.label}>{point.label}</span>
            ))}
          </div>
        </div>
      </figure>
    );
  }

  return (
    <figure className="fp-chart">
      <figcaption>{title}</figcaption>
      <div className="fp-chart-bars">
        {points.map((point, index) => (
          <div key={point.label}>
            <span>{point.label}</span>
            <div>
              <i
                style={{ width: `${(point.value / max) * 100}%`, background: CHART_COLORS[index % CHART_COLORS.length] }}
                {...interactiveProps(interactive, title, point.label, point.value)}
              />
              <strong>{point.value}</strong>
            </div>
          </div>
        ))}
      </div>
    </figure>
  );
}

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
