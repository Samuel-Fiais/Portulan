"use client";

import { useEffect, useId, useRef, useState } from "react";
import { mermaidThemeVariables, withMermaidInit, type MermaidPalette } from "@/lib/mermaid-theme";

function readPalette(frame: HTMLElement | null): MermaidPalette {
  const root = frame?.closest(".report-paper") ?? frame;
  if (!root || !(root instanceof HTMLElement)) {
    return { primary: "#7c2be3", secondary: "#3d3580" };
  }

  const styles = getComputedStyle(root);
  return {
    primary: styles.getPropertyValue("--report-accent").trim() || styles.getPropertyValue("--accent").trim() || "#7c2be3",
    secondary: styles.getPropertyValue("--report-accent-2").trim() || styles.getPropertyValue("--accent-2").trim() || "#3d3580",
  };
}

function fixMermaidSvgColors(svg: SVGSVGElement, theme: ReturnType<typeof mermaidThemeVariables>) {
  const nodeFill = theme.primaryColor;
  const nodeStroke = theme.primaryBorderColor;
  const stateStroke = theme.nodeBorder;
  const stateFill = theme.stateBkg;
  const textFill = theme.primaryTextColor;
  const background = theme.background;

  svg.style.background = background;
  svg.querySelectorAll(".node rect,.node circle,.node ellipse,.node polygon,.node path:not(.arrowheadPath)").forEach((element) => {
    if (element instanceof SVGElement) {
      element.style.fill = nodeFill;
      element.style.stroke = nodeStroke;
    }
  });
  svg.querySelectorAll(".node .label,.nodeLabel,.node text,.label text").forEach((element) => {
    if (element instanceof SVGElement) {
      element.style.fill = textFill;
      element.style.color = textFill;
    }
  });
  svg.querySelectorAll(".edgePath .path,.flowchart-link,.actor-line,.messageLine0,.messageLine1,.transition").forEach((element) => {
    if (element instanceof SVGElement) element.style.stroke = nodeStroke;
  });
  svg.querySelectorAll(".arrowheadPath").forEach((element) => {
    if (element instanceof SVGElement) {
      element.style.fill = nodeStroke;
      element.style.stroke = nodeStroke;
    }
  });
  svg.querySelectorAll(".edgeLabel rect,.label-container").forEach((element) => {
    if (element instanceof SVGElement) {
      element.style.fill = background;
      element.style.stroke = "none";
    }
  });
  svg.querySelectorAll(".edgeLabel span,.edgeLabel .label span,.actor text,.messageText,.statediagram-state text").forEach((element) => {
    if (element instanceof HTMLElement || element instanceof SVGElement) {
      element.style.color = textFill;
      if (element instanceof SVGElement) element.style.fill = textFill;
    }
  });
  svg.querySelectorAll(".edgeLabel foreignObject div,.edgeLabel foreignObject,.labelBkg,[class*='labelBkg']").forEach((element) => {
    if (element instanceof HTMLElement) {
      element.style.background = background;
      element.style.backgroundColor = background;
    }
  });
  svg.querySelectorAll(".stateGroup rect,.statediagram-state rect").forEach((element) => {
    if (element instanceof SVGElement) {
      element.style.fill = stateFill;
      element.style.stroke = stateStroke;
    }
  });
  svg.querySelectorAll(".actor").forEach((element) => {
    if (element instanceof SVGElement) {
      element.style.fill = nodeFill;
      element.style.stroke = nodeStroke;
    }
  });
  svg.querySelectorAll("text").forEach((element) => {
    const fill = element.style.fill || element.getAttribute("fill") || "";
    if (fill === "white" || fill === "#fff" || fill === "#ffffff" || fill === "rgb(255, 255, 255)") {
      element.style.fill = textFill;
    }
  });
}

export function LivingMermaid({ source }: { source: string }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const renderId = useId().replace(/:/g, "");
  const [state, setState] = useState<"pending" | "ready" | "error">("pending");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      setState("pending");
      setError(null);

      try {
        const palette = readPalette(frameRef.current);
        const theme = mermaidThemeVariables(palette);
        const diagram = withMermaidInit(source, palette);
        const mermaid = (await import("mermaid")).default;

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
        });

        const { svg, bindFunctions } = await mermaid.render(`mermaid-${renderId}`, diagram);
        if (cancelled || !frameRef.current) return;

        frameRef.current.innerHTML = svg;
        const svgElement = frameRef.current.querySelector("svg");
        if (svgElement) fixMermaidSvgColors(svgElement, theme);
        bindFunctions?.(frameRef.current);
        setState("ready");
      } catch (cause) {
        if (cancelled) return;
        setState("error");
        setError(cause instanceof Error ? cause.message : "Não foi possível renderizar o diagrama.");
      }
    }

    void render();
    return () => {
      cancelled = true;
    };
  }, [renderId, source]);

  return (
    <div className="fp-mermaid-frame" data-mermaid-state={state}>
      {state === "error" ? (
        <div className="fp-mermaid-fallback" role="alert">
          <strong>Não foi possível desenhar o diagrama</strong>
          <p>Confira a sintaxe Mermaid no bloco de código.</p>
          {error ? <p className="fp-mermaid-error-detail">{error}</p> : null}
        </div>
      ) : (
        <>
          {state === "pending" ? (
            <p className="fp-mermaid-status" role="status" aria-live="polite">Carregando diagrama…</p>
          ) : null}
          <div
            ref={frameRef}
            className="fp-mermaid-output"
            aria-busy={state === "pending"}
            aria-label={state === "pending" ? "Carregando diagrama" : undefined}
          />
        </>
      )}
    </div>
  );
}
