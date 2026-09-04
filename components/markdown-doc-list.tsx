import type { ReactNode } from "react";

/** Wraps list item content so mixed text + inline code share one grid cell in ol.fp-doc-list. */
export function MarkdownDocListItem({ children }: { children: ReactNode }) {
  return (
    <li>
      <span className="fp-doc-list-item-body">{children}</span>
    </li>
  );
}

export function MarkdownDocListUl({ children }: { children: ReactNode }) {
  return <ul className="fp-doc-list">{children}</ul>;
}

export function MarkdownDocListOl({ children }: { children: ReactNode }) {
  return <ol className="fp-doc-list">{children}</ol>;
}
