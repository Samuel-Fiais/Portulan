import type { Parent, Root } from "mdast";
import { visit } from "unist-util-visit";

/**
 * Inline HTML in Markdown (e.g. OpenAPI `<walletId>`) is parsed as html nodes.
 * remark-rehype drops unknown tags unless allowDangerousHtml is enabled.
 * Convert those nodes to plain text so path placeholders render literally.
 */
export function remarkLiteralHtml() {
  return (tree: Root) => {
    visit(tree, "html", (node, index, parent) => {
      if (!parent || typeof index !== "number") return;
      (parent as Parent).children[index] = { type: "text", value: node.value };
    });
  };
}
