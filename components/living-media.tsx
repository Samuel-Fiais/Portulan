"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { InlineMarkdown } from "@/components/inline-markdown";
import { fileExtensionLabel } from "@/lib/blob-storage";

type GalleryItem = {
  src: string;
  caption?: string;
};

function Lightbox({
  items,
  index,
  onClose,
  onIndexChange,
}: {
  items: GalleryItem[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  const item = items[index];
  const hasMany = items.length > 1;

  const go = useCallback((delta: number) => {
    onIndexChange((index + delta + items.length) % items.length);
  }, [index, items.length, onIndexChange]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [go, onClose]);

  if (!item) return null;

  return (
    <div className="fp-lightbox" role="dialog" aria-modal="true" aria-label={item.caption || item.src} onClick={onClose}>
      <button type="button" className="fp-lightbox-close" aria-label="Fechar imagem" onClick={onClose}><X /></button>
      {hasMany ? (
        <button type="button" className="fp-lightbox-nav prev" aria-label="Imagem anterior" onClick={(event) => { event.stopPropagation(); go(-1); }}>
          <ChevronLeft />
        </button>
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.src} alt={item.caption || ""} onClick={(event) => event.stopPropagation()} />
      {hasMany ? (
        <button type="button" className="fp-lightbox-nav next" aria-label="Próxima imagem" onClick={(event) => { event.stopPropagation(); go(1); }}>
          <ChevronRight />
        </button>
      ) : null}
      {item.caption ? <p className="fp-lightbox-caption">{item.caption}</p> : null}
    </div>
  );
}

export function LivingFigure({
  src,
  alt = "",
  caption,
  size = "medium",
  align = "center",
  interactive = false,
}: {
  src?: string;
  alt?: string;
  caption?: string;
  size?: string;
  align?: string;
  interactive?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!src) return null;
  const sizeClass = ["small", "medium", "large", "full"].includes(size) ? size : "medium";
  const alignClass = ["left", "center", "right"].includes(align) ? align : "center";
  const label = caption || alt;

  return (
    <figure className={`fp-figure fp-figure--${sizeClass} fp-figure--${alignClass}`}>
      {interactive ? (
        <button type="button" className="fp-figure-zoom" onClick={() => setOpen(true)} aria-label={label ? `Ampliar: ${label}` : "Ampliar imagem"}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} loading="lazy" />
        </button>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" />
      )}
      {caption ? <figcaption><InlineMarkdown>{caption}</InlineMarkdown></figcaption> : null}
      {open ? (
        <Lightbox
          items={[{ src, caption: label }]}
          index={0}
          onClose={() => setOpen(false)}
          onIndexChange={() => undefined}
        />
      ) : null}
    </figure>
  );
}

function displayFileTitle(name: string, title?: string) {
  const trimmedTitle = title?.trim();
  if (trimmedTitle) return trimmedTitle;
  const base = name.trim().split(/[\\/]/).pop() ?? name;
  return base.replace(/\.[^.]+$/, "") || base;
}

export function LivingFileCard({
  url,
  name,
  title,
}: {
  url?: string;
  name?: string;
  title?: string;
}) {
  if (!url?.trim() || !name?.trim()) return null;

  const extension = fileExtensionLabel(name);
  const label = displayFileTitle(name, title);

  return (
    <a
      href={url}
      className="fp-file-card"
      target="_blank"
      rel="noopener noreferrer"
      download={name}
    >
      <span className="fp-file-card-badge" aria-label={`Tipo ${extension}`}>{extension}</span>
      <div className="fp-file-card-body">
        <strong className="fp-file-card-title">{label}</strong>
        <span className="fp-file-card-name">{name}</span>
        <span className="fp-file-card-action"><Download aria-hidden /> Abrir ou baixar</span>
      </div>
    </a>
  );
}

export function LivingGallery({
  items,
  columns,
  interactive = false,
}: {
  items: GalleryItem[];
  columns: 2 | 3;
  interactive?: boolean;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className={`fp-gallery fp-gallery--${columns}`}>
      {items.map((item, index) => (
        <figure className="fp-gallery-item" key={`${item.src}-${index}`}>
          {interactive ? (
            <button
              type="button"
              className="fp-figure-zoom"
              onClick={() => setOpenIndex(index)}
              aria-label={item.caption ? `Ampliar: ${item.caption}` : `Ampliar imagem ${index + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.src} alt={item.caption || `Imagem ${index + 1}`} loading="lazy" />
            </button>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.src} alt={item.caption || `Imagem ${index + 1}`} loading="lazy" />
          )}
          {item.caption ? <figcaption><InlineMarkdown>{item.caption}</InlineMarkdown></figcaption> : null}
        </figure>
      ))}
      {openIndex != null ? (
        <Lightbox
          items={items}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onIndexChange={setOpenIndex}
        />
      ) : null}
    </div>
  );
}
