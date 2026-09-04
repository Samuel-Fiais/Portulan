export function parseAttributes(source = "") {
  return Object.fromEntries(
    Array.from(source.matchAll(/([\w-]+)="([^"]*)"/g), (match) => [match[1], match[2]]),
  );
}

/** Matches a directive opener like `:::alert` or `:::api{method="GET" path="/x/{id}"}`. */
export function parseDirectiveOpener(line: string): { name: string; attributeSource: string } | null {
  const nameMatch = line.match(/^:::(\w+)/);
  if (!nameMatch) return null;

  const name = nameMatch[1];
  let index = nameMatch[0].length;

  if (index >= line.length || line[index] !== "{") {
    return /^\s*$/.test(line.slice(index)) ? { name, attributeSource: "" } : null;
  }

  let inQuote = false;
  index += 1;
  const start = index;

  while (index < line.length) {
    const char = line[index];
    if (char === '"') {
      inQuote = !inQuote;
    } else if (char === "}" && !inQuote) {
      const attributeSource = line.slice(start, index);
      const rest = line.slice(index + 1);
      return /^\s*$/.test(rest) ? { name, attributeSource } : null;
    }
    index += 1;
  }

  return null;
}

export type MarkdownDirective = {
  name: string;
  attributes: Record<string, string>;
  body: string;
};

export type MarkdownBlock =
  | { kind: "markdown"; body: string }
  | { kind: "directive"; directive: MarkdownDirective };

/** Single-line directives that do not use a closing `:::`. */
export const VOID_DIRECTIVES = new Set(["image", "report", "file"]);

function isClosingFence(line: string) {
  return line.trim() === ":::";
}

/** Discards accidental void-directive body until a blank line, closing `:::`, or another directive opener. */
export function skipVoidDirectiveTail(lines: string[], startIndex: number) {
  let index = startIndex;
  while (index < lines.length) {
    const line = lines[index];
    if (isClosingFence(line)) {
      index += 1;
      break;
    }
    if (line.trim() === "") break;
    if (parseDirectiveOpener(line)) break;
    index += 1;
  }
  return index;
}

export function parseMarkdownBlocks(source: string): MarkdownBlock[] {
  const lines = source.split("\n");
  const blocks: MarkdownBlock[] = [];
  let markdown: string[] = [];

  const flushMarkdown = () => {
    if (markdown.some((line) => line.trim())) {
      blocks.push({ kind: "markdown", body: markdown.join("\n") });
    }
    markdown = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const opener = parseDirectiveOpener(lines[index]);
    if (!opener || lines[index] === ":::") {
      markdown.push(lines[index]);
      continue;
    }

    flushMarkdown();
    const directiveName = opener.name.toLowerCase();

    if (VOID_DIRECTIVES.has(directiveName)) {
      blocks.push({
        kind: "directive",
        directive: {
          name: directiveName,
          attributes: parseAttributes(opener.attributeSource),
          body: "",
        },
      });
      index = skipVoidDirectiveTail(lines, index + 1) - 1;
      continue;
    }

    const body: string[] = [];
    const allowsNestedDirectives = directiveName === "columns";
    let depth = 1;
    index += 1;
    while (index < lines.length) {
      if (allowsNestedDirectives && parseDirectiveOpener(lines[index])) {
        depth += 1;
        body.push(lines[index]);
        index += 1;
        continue;
      }
      if (lines[index].trim() === ":::") {
        depth -= 1;
        if (depth === 0) break;
        body.push(lines[index]);
        index += 1;
        continue;
      }
      body.push(lines[index]);
      index += 1;
    }
    blocks.push({
      kind: "directive",
      directive: {
        name: directiveName,
        attributes: parseAttributes(opener.attributeSource),
        body: body.join("\n").trim(),
      },
    });
  }
  flushMarkdown();
  return blocks;
}
