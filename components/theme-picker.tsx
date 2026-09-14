"use client";

import "./theme-picker.css";

import { useEffect, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { ColorPicker } from "@/components/color-picker";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  applyThemePreference,
  CUSTOM_PAPER_ID,
  readDocumentThemePreference,
  WORKSPACE_PAPERS,
  type ThemeMode,
  type ThemePreference,
} from "@/lib/workspace-themes";

function customSwatchStyle(ink: string, mode: ThemeMode): CSSProperties {
  const wash = mode === "dark" ? "#111111" : "#ffffff";
  const edge = mode === "dark" ? "#404040" : "#d4d4d4";
  return {
    "--theme-swatch-paper": `color-mix(in srgb, ${ink} ${mode === "dark" ? 16 : 8}%, ${wash})`,
    "--theme-swatch-bar": ink,
    "--theme-swatch-muted": `color-mix(in srgb, ${ink} ${mode === "dark" ? 28 : 20}%, ${edge})`,
  } as CSSProperties;
}

function ThemeControl({
  selected,
  label,
  title,
  menuItem,
  keepOpen,
  style,
  onSelect,
}: {
  selected: boolean;
  label: string;
  title: string;
  menuItem: boolean;
  keepOpen?: boolean;
  style: CSSProperties;
  onSelect: () => void;
}) {
  const className = "theme-swatch";
  const body = (
    <>
      <span className="theme-swatch-chip" />
      <span className="theme-swatch-name">{label}</span>
    </>
  );

  if (menuItem) {
    return (
      <DropdownMenuItem
        className={className}
        data-selected={selected}
        title={title}
        aria-label={title}
        style={style}
        onSelect={(event) => {
          if (keepOpen) event.preventDefault();
          onSelect();
        }}
      >
        {body}
      </DropdownMenuItem>
    );
  }

  return (
    <button
      type="button"
      className={className}
      data-selected={selected}
      title={title}
      aria-label={title}
      aria-pressed={selected}
      style={style}
      onClick={onSelect}
    >
      {body}
    </button>
  );
}

export function ThemePicker({
  className,
  variant = "panel",
  onSelect,
}: {
  className?: string;
  variant?: "panel" | "menu";
  onSelect?: (preference: ThemePreference) => void;
}) {
  const [preference, setPreference] = useState<ThemePreference>(readDocumentThemePreference);

  useEffect(() => {
    const sync = () => setPreference(readDocumentThemePreference());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "data-user-ink"],
    });
    window.addEventListener("storage", sync);
    return () => {
      observer.disconnect();
      window.removeEventListener("storage", sync);
    };
  }, []);

  function choose(next: ThemePreference) {
    applyThemePreference(next);
    setPreference(next);
    onSelect?.(next);
  }

  const menuItem = variant === "menu";

  return (
    <div className={cn("theme-picker", className)} data-variant={variant}>
      {(["light", "dark"] as const).map((mode: ThemeMode) => (
        <div key={mode} className="theme-picker-group">
          <p className="theme-picker-label">{mode === "light" ? "Claro" : "Escuro"}</p>
          <div className="theme-picker-grid" role="group" aria-label={mode === "light" ? "Temas claros" : "Temas escuros"}>
            {WORKSPACE_PAPERS.map((paper) => {
              const swatch = paper[mode];
              return (
                <ThemeControl
                  key={`${paper.id}:${mode}`}
                  selected={preference.paper === paper.id && preference.mode === mode}
                  label={paper.name}
                  title={`${paper.name}, ${mode === "dark" ? "escuro" : "claro"} — ${paper.blurb}`}
                  menuItem={menuItem}
                  style={{
                    "--theme-swatch-paper": swatch.paper,
                    "--theme-swatch-bar": swatch.bar,
                    "--theme-swatch-muted": swatch.muted,
                  } as CSSProperties}
                  onSelect={() => choose({ ...preference, paper: paper.id, mode })}
                />
              );
            })}
            <ThemeControl
              selected={preference.paper === CUSTOM_PAPER_ID && preference.mode === mode}
              label="Livre"
              title={`${mode === "dark" ? "Escuro" : "Claro"} personalizado — escolher a cor`}
              menuItem={menuItem}
              keepOpen
              style={customSwatchStyle(preference.customInk, mode)}
              onSelect={() => choose({ ...preference, paper: CUSTOM_PAPER_ID, mode })}
            />
          </div>
        </div>
      ))}

      {preference.paper === CUSTOM_PAPER_ID ? (
        <div
          className="theme-picker-custom"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <p className="theme-picker-label">Cor</p>
          <ColorPicker
            label="Cor personalizada"
            value={preference.customInk}
            variant="inline"
            onChange={(customInk) => choose({ ...preference, customInk })}
          />
        </div>
      ) : null}
    </div>
  );
}
