import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import { portulanRemarkPlugins } from "./markdown-renderer.ts";
import { resolvePropertyValue } from "./property-value.ts";
import { prepareInlineMarkdown } from "./inline-markdown.ts";

function renderInlineMarkdown(source: string) {
  return renderToStaticMarkup(
    React.createElement(ReactMarkdown, {
      remarkPlugins: portulanRemarkPlugins,
      allowedElements: ["p", "strong", "em", "a", "code", "del"],
      unwrapDisallowed: true,
      components: {
        p: ({ children }) => React.createElement(React.Fragment, null, children),
        strong: ({ children }) => React.createElement("strong", null, children),
        em: ({ children }) => React.createElement("em", null, children),
        a: ({ children, href }) => React.createElement("a", { href }, children),
        code: ({ children }) => React.createElement("code", { className: "report-inline-code" }, children),
      },
    }, prepareInlineMarkdown(source)),
  );
}

test("resolvePropertyValue usa Markdown inline para links no valor padrão", () => {
  const resolved = resolvePropertyValue(
    "[#23583](https://dev.azure.com/example/workitems/23583)",
    "",
  );
  assert.equal(resolved?.kind, "markdown");
  if (resolved?.kind === "markdown") {
    const html = renderInlineMarkdown(resolved.source);
    assert.match(html, /<a href="https:\/\/dev\.azure\.com\/example\/workitems\/23583">#23583<\/a>/);
  }
});

test("resolvePropertyValue mantém URL crua como link automático", () => {
  const resolved = resolvePropertyValue("https://example.com/docs", "");
  assert.deepEqual(resolved, {
    kind: "plain-href",
    href: "https://example.com/docs",
    label: "https://example.com/docs",
  });
});

test("resolvePropertyValue com tipo url aceita URL crua e Markdown inline", () => {
  assert.deepEqual(resolvePropertyValue("https://example.com", "url"), {
    kind: "plain-href",
    href: "https://example.com",
    label: "https://example.com",
  });

  const markdown = resolvePropertyValue("[#42](https://example.com/42)", "url");
  assert.equal(markdown?.kind, "markdown");
  if (markdown?.kind === "markdown") {
    const html = renderInlineMarkdown(markdown.source);
    assert.match(html, /<a href="https:\/\/example\.com\/42">#42<\/a>/);
  }
});

test("resolvePropertyValue preserva negrito inline para tipos sem URL", () => {
  const resolved = resolvePropertyValue("**In Progress**", "status");
  assert.equal(resolved?.kind, "markdown");
  if (resolved?.kind === "markdown") {
    const html = renderInlineMarkdown(resolved.source);
    assert.match(html, /<strong>In Progress<\/strong>/);
  }
});
