"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { hexToRgb, hsvToRgb, normalizeHex, rgbToHex, rgbToHsv } from "@/lib/color-utils";

type ColorPickerProps = {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  align?: "start" | "end";
  variant?: "field" | "inline";
};

export function ColorPicker({
  id,
  label,
  value,
  onChange,
  align = "start",
  variant = "field",
}: ColorPickerProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const rootRef = useRef<HTMLDivElement>(null);
  const sbRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(variant === "inline");
  const [hexInput, setHexInput] = useState(value);
  const [hsv, setHsv] = useState<[number, number, number]>(() => rgbToHsv(...hexToRgb(value)));

  useEffect(() => {
    setHexInput(value);
    setHsv(rgbToHsv(...hexToRgb(value)));
  }, [value]);

  useEffect(() => {
    if (!open || variant === "inline") return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, variant]);

  function commitHsv(next: [number, number, number]) {
    setHsv(next);
    const hex = rgbToHex(...hsvToRgb(...next));
    setHexInput(hex);
    onChange(hex);
  }

  function commitHex(raw: string) {
    const normalized = normalizeHex(raw, value);
    setHexInput(normalized);
    setHsv(rgbToHsv(...hexToRgb(normalized)));
    onChange(normalized);
  }

  function updateFromSb(clientX: number, clientY: number) {
    const bounds = sbRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const saturation = Math.max(0, Math.min(100, ((clientX - bounds.left) / bounds.width) * 100));
    const brightness = Math.max(0, Math.min(100, (1 - (clientY - bounds.top) / bounds.height) * 100));
    commitHsv([hsv[0], saturation, brightness]);
  }

  function startSbDrag(event: React.PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    updateFromSb(event.clientX, event.clientY);

    const onMove = (moveEvent: PointerEvent) => updateFromSb(moveEvent.clientX, moveEvent.clientY);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  const hueColor = rgbToHex(...hsvToRgb(hsv[0], 100, 100));
  const panel = (
    <div className="color-picker-panel" role="dialog" aria-label={`Seletor de ${label.toLowerCase()}`}>
      <div
        ref={sbRef}
        className="color-picker-sb"
        style={{ backgroundColor: hueColor }}
        onPointerDown={startSbDrag}
      >
        <div className="color-picker-sb-overlay color-picker-sb-overlay-white" />
        <div className="color-picker-sb-overlay color-picker-sb-overlay-black" />
        <span
          className="color-picker-sb-thumb"
          style={{ left: `${hsv[1]}%`, top: `${100 - hsv[2]}%` }}
        />
      </div>
      <input
        type="range"
        min={0}
        max={360}
        value={Math.round(hsv[0])}
        className="color-picker-hue"
        aria-label={`Matiz de ${label.toLowerCase()}`}
        onChange={(event) => commitHsv([Number(event.target.value), hsv[1], hsv[2]])}
      />
      <div className="color-picker-hex-row">
        <span className="color-picker-hex-label">HEX</span>
        <input
          type="text"
          id={variant === "inline" ? fieldId : undefined}
          className="color-picker-hex-input"
          value={hexInput}
          spellCheck={false}
          aria-label={`Código hex de ${label.toLowerCase()}`}
          onChange={(event) => setHexInput(event.target.value)}
          onBlur={() => commitHex(hexInput)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commitHex(hexInput);
              if (variant === "field") setOpen(false);
            }
          }}
        />
      </div>
    </div>
  );

  if (variant === "inline") {
    return (
      <div className="color-picker color-picker-inline" ref={rootRef}>
        {panel}
      </div>
    );
  }

  return (
    <div className={`color-picker color-picker-align-${align}`} ref={rootRef}>
      <Label htmlFor={fieldId}>{label}</Label>
      <div className="color-picker-control">
        <button
          type="button"
          id={fieldId}
          className="color-picker-trigger"
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen((current) => !current)}
        >
          <span className="color-picker-swatch" style={{ backgroundColor: value }} aria-hidden="true" />
          <span className="color-picker-value">{value}</span>
          <ChevronDown className="color-picker-chevron" aria-hidden="true" />
        </button>
        {open ? panel : null}
      </div>
    </div>
  );
}
