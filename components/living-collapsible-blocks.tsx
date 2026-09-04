"use client";

import { useRef, useState } from "react";
import { InlineMarkdown } from "@/components/inline-markdown";
import { hrefFromValue } from "@/lib/report-links";

export function LivingFaq({
  items,
  expanded,
  interactive = false,
}: {
  items: Array<[string, string]>;
  expanded: boolean;
  interactive?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [openAll, setOpenAll] = useState(expanded);

  function setAllOpen(next: boolean) {
    setOpenAll(next);
    rootRef.current?.querySelectorAll("details").forEach((item) => {
      item.open = next;
    });
  }

  return (
    <div className="fp-faq" ref={rootRef}>
      {interactive && items.length > 1 ? (
        <div className="fp-living-toolbar fp-living-toolbar-inline">
          <button
            type="button"
            className="fp-living-text-btn"
            onClick={() => setAllOpen(!openAll)}
          >
            {openAll ? "Recolher tudo" : "Expandir tudo"}
          </button>
        </div>
      ) : null}
      {items.map(([question, answer], index) => (
        <details
          key={`${question}-${index}`}
          ref={(node) => {
            if (node && node.dataset.ready !== "1") {
              node.open = expanded;
              node.dataset.ready = "1";
            }
          }}
        >
          <summary>{question}</summary>
          <p><InlineMarkdown>{answer}</InlineMarkdown></p>
        </details>
      ))}
    </div>
  );
}

export function LivingGlossary({
  items,
  interactive = false,
}: {
  items: Array<[string, string]>;
  interactive?: boolean;
}) {
  if (!interactive) {
    return (
      <dl className="fp-glossary">
        {items.map(([term, definition], index) => (
          <div key={`${term}-${index}`}>
            <dt>{term}</dt>
            <dd><InlineMarkdown>{definition}</InlineMarkdown></dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <div className="fp-glossary fp-glossary-interactive">
      {items.map(([term, definition], index) => (
        <details key={`${term}-${index}`}>
          <summary>{term}</summary>
          <p><InlineMarkdown>{definition}</InlineMarkdown></p>
        </details>
      ))}
    </div>
  );
}

export function LivingProperties({
  rows,
  interactive = false,
}: {
  rows: Array<[string, string, string]>;
  interactive?: boolean;
}) {
  return (
    <dl className="fp-properties">
      {rows.map(([name, value, type = ""], index) => {
        const href = type === "url" ? (hrefFromValue(value) ?? value) : hrefFromValue(value);
        return (
          <div key={`${name}-${index}`}>
            <dt>{name}</dt>
            <dd className={type}>
              {href ? <a href={href}>{value}</a> : value}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export function LivingResources({
  items,
}: {
  items: Array<[string, string, string]>;
}) {
  return (
    <div className="fp-resources">
      {items.map(([resource, type, description], index) => {
        const href = hrefFromValue(resource) ?? hrefFromValue(description);
        return (
          <article key={`${resource}-${index}`}>
            <span>{type}</span>
            <strong>
              {href && hrefFromValue(resource) ? <a href={href}>{resource}</a> : <InlineMarkdown>{resource}</InlineMarkdown>}
            </strong>
            <small>
              {href && !hrefFromValue(resource) ? <a href={href}>{description}</a> : <InlineMarkdown>{description}</InlineMarkdown>}
            </small>
          </article>
        );
      })}
    </div>
  );
}

export function LivingRelated({
  items,
}: {
  items: Array<[string, string, string]>;
}) {
  return (
    <div className="fp-related">
      {items.map(([item, relation, status], index) => {
        const href = hrefFromValue(item);
        return (
          <article key={`${item}-${index}`}>
            <span className="fp-related-arrow">↗</span>
            <div>
              <strong>{href ? <a href={href}>{item}</a> : <InlineMarkdown>{item}</InlineMarkdown>}</strong>
              <small>{relation}</small>
            </div>
            <em>{status}</em>
          </article>
        );
      })}
    </div>
  );
}
