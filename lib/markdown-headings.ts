export type MarkdownHeading = {
  id: string;
  level: 2 | 3;
  text: string;
};

export function plainHeadingText(text: string): string {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

export function slugifyHeading(text: string): string {
  const slug = plainHeadingText(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return slug || "secao";
}

function uniqueHeadingId(base: string, used: Map<string, number>): string {
  const count = used.get(base) ?? 0;
  used.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
}

export function extractMarkdownHeadings(source: string): MarkdownHeading[] {
  const headings: MarkdownHeading[] = [];
  const usedIds = new Map<string, number>();

  for (const line of source.split("\n")) {
    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (!match) continue;

    const level = match[1].length as 2 | 3;
    const rawText = match[2].trim();
    const text = plainHeadingText(rawText);
    const id = uniqueHeadingId(slugifyHeading(text), usedIds);
    headings.push({ id, level, text });
  }

  return headings;
}

export function createHeadingIdSource(headings: MarkdownHeading[]) {
  let index = 0;

  return {
    consume(level: 2 | 3): string | undefined {
      while (index < headings.length) {
        const heading = headings[index];
        if (heading.level === level) {
          index += 1;
          return heading.id;
        }
        if (heading.level > level) return undefined;
        index += 1;
      }
      return undefined;
    },
  };
}

/** Idempotent lookup so React Strict Mode / hydration can render headings twice. */
export function createHeadingIdLookup(headings: MarkdownHeading[]) {
  const firstByKey = new Map<string, string>();
  for (const heading of headings) {
    const key = `${heading.level}:${heading.text}`;
    if (!firstByKey.has(key)) firstByKey.set(key, heading.id);
  }

  return {
    idFor(level: 2 | 3, text: string): string | undefined {
      return firstByKey.get(`${level}:${plainHeadingText(text)}`);
    },
  };
}
