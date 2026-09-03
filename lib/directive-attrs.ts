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
