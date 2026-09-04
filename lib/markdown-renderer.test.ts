import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { visit } from "unist-util-visit";
import { portulanRemarkPlugins } from "./markdown-renderer.ts";
import { remarkLiteralHtml } from "./remark-literal-html.ts";

test("remarkLiteralHtml preserva placeholders OpenAPI como texto", () => {
  const source = "/api/v1/wallets/<walletId>/grades";
  const tree = unified()
    .use(remarkParse)
    .use(remarkLiteralHtml)
    .use(remarkRehype, { allowDangerousHtml: false })
    .runSync(unified().use(remarkParse).parse(source));

  const chunks: string[] = [];
  visit(tree, "text", (node) => chunks.push(node.value));
  assert.equal(chunks.join(""), source);
});

test("portulanRemarkPlugins renderiza <walletId> no HTML estático", () => {
  const source = "GET /api/v1/wallets/<walletId>/grades";
  const html = renderToStaticMarkup(
    React.createElement(ReactMarkdown, { remarkPlugins: portulanRemarkPlugins }, source),
  );
  assert.match(html, /&lt;walletId&gt;/);
  assert.doesNotMatch(html, /wallets\/\/grades/);
});

test("portulanRemarkPlugins preserva placeholders dentro de inline code", () => {
  const source = "Use `/api/v1/wallets/<walletId>/grades` na requisição.";
  const html = renderToStaticMarkup(
    React.createElement(ReactMarkdown, { remarkPlugins: portulanRemarkPlugins }, source),
  );
  assert.match(html, /&lt;walletId&gt;/);
});
