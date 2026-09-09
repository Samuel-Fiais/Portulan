import assert from "node:assert/strict";
import test from "node:test";
import { mermaidThemeVariables, withMermaidInit } from "./mermaid-theme.ts";

test("mermaidThemeVariables maps template palette to mermaid colors", () => {
  const theme = mermaidThemeVariables({ primary: "#7c2be3", secondary: "#3d3580" });
  assert.equal(theme.primaryBorderColor, "#7c2be3");
  assert.equal(theme.lineColor, "#7c2be3");
  assert.equal(theme.transitionColor, "#3d3580");
  assert.equal(theme.background, "#FFFFFF");
  assert.match(theme.primaryColor, /^#[0-9a-f]{6}$/i);
});

test("withMermaidInit prepends palette init when missing", () => {
  const source = "flowchart LR\n  A --> B";
  const rendered = withMermaidInit(source, { primary: "#7c2be3", secondary: "#3d3580" });
  assert.match(rendered, /^%%\{init:/);
  assert.ok(rendered.includes("flowchart LR"));
  assert.ok(rendered.includes("#7c2be3"));
});

test("withMermaidInit preserves author init block", () => {
  const source = '%%{init: {"theme":"dark"}}%%\nflowchart LR\n  A --> B';
  assert.equal(
    withMermaidInit(source, { primary: "#7c2be3", secondary: "#3d3580" }),
    source,
  );
});
