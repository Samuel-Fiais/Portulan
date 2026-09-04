"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type LogoTone = "light" | "dark" | "unknown";

function averageVisibleLuminance(image: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  const width = Math.min(image.naturalWidth || 1, 96);
  const height = Math.min(image.naturalHeight || 1, 96);
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(image, 0, 0, width, height);
  const { data } = context.getImageData(0, 0, width, height);
  let luminance = 0;
  let count = 0;
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] < 32) continue;
    luminance += 0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2];
    count += 1;
  }
  return count ? luminance / count / 255 : null;
}

export function CustomReportLogo({ src, className }: { src: string; className?: string }) {
  const [tone, setTone] = useState<LogoTone>("unknown");

  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.decoding = "async";
    image.crossOrigin = "anonymous";
    image.onload = () => {
      if (cancelled) return;
      try {
        const luminance = averageVisibleLuminance(image);
        if (luminance == null) {
          setTone("unknown");
          return;
        }
        setTone(luminance >= 0.55 ? "light" : "dark");
      } catch {
        setTone("unknown");
      }
    };
    image.onerror = () => {
      if (!cancelled) setTone("unknown");
    };
    image.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={src}
      className={cn("portulan-real-logo custom-report-logo", className)}
      src={src}
      alt=""
      data-logo-tone={tone}
    />
  );
}
