import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import { isFencedCode, markdownCodeProps } from "./markdown-code.ts";
import { portulanRemarkPlugins } from "./markdown-renderer.ts";

function renderTestcaseBody(source: string) {
  return renderToStaticMarkup(
    React.createElement(ReactMarkdown, {
      remarkPlugins: portulanRemarkPlugins,
      components: {
        p: ({ children }) => React.createElement("p", { className: "fp-testcase-paragraph" }, children),
        ol: ({ children }) => React.createElement("ol", { className: "fp-doc-list" }, children),
        li: ({ children }) => React.createElement(
          "li",
          null,
          React.createElement("span", { className: "fp-doc-list-item-body" }, children),
        ),
        code: ({ children, className, node }) => {
          const props = markdownCodeProps({ children, className, node });
          return React.createElement("code", { className: props.className }, props.children);
        },
      },
    }, source),
  );
}

test("testcase body mantém inline code dentro de parágrafo em lista ordenada", () => {
  const source = `**Passos:**
1. Enviar PATCH em \`/items\` com \`walletDependentId\` e \`schoolGradeId\`
`;

  const html = renderTestcaseBody(source);
  assert.match(html, /<p class="fp-testcase-paragraph"><strong>Passos:<\/strong><\/p>/);
  assert.match(html, /<ol class="fp-doc-list">/);
  assert.match(html, /<span class="fp-doc-list-item-body">/);
  assert.match(html, /<code class="report-inline-code">\/items<\/code>/);
  assert.match(html, /walletDependentId/);
  assert.match(html, /schoolGradeId/);
  assert.equal((html.match(/<code class="report-inline-code">/g) ?? []).length, 3);
  assert.doesNotMatch(html, /<pre>/);
});

test("lista ordenada com texto misto e inline code fica num único corpo de item", () => {
  const source = "1. Chamar `GET /api/v1/wallets/{walletId}/grades/requests/active` para a carteira do responsável.";
  const html = renderTestcaseBody(source);

  assert.match(
    html,
    /<li><span class="fp-doc-list-item-body">Chamar <code class="report-inline-code">GET \/api\/v1\/wallets\/{walletId}\/grades\/requests\/active<\/code> para a carteira do responsável\.<\/span><\/li>/,
  );
});

test("MarkdownCode distingue inline code de bloco fenced", () => {
  const fenced = renderToStaticMarkup(
    React.createElement(ReactMarkdown, {
      remarkPlugins: portulanRemarkPlugins,
      components: {
        code: ({ children, className, node }) => {
          const props = markdownCodeProps({ children, className, node });
          return React.createElement("code", { className: props.className }, props.children);
        },
      },
    }, "```ts\nconst x = 1;\n```"),
  );
  assert.match(fenced, /language-ts/);
  assert.doesNotMatch(fenced, /report-inline-code/);
});

test("isFencedCode detecta blocos com newline final", () => {
  assert.equal(isFencedCode({
    type: "element",
    tagName: "code",
    children: [{ type: "text", value: "const x = 1;\n" }],
  }), true);
  assert.equal(isFencedCode({
    type: "element",
    tagName: "code",
    children: [{ type: "text", value: "inline" }],
  }), false);
});
