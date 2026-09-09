export type TocHeading = {
  level: 2 | 3;
  title: string;
  id: string;
};

/** Slugify heading text for anchor ids (stable within a document). */
export function headingToAnchorId(title: string, usedIds: Set<string> = new Set()): string {
  const base = title
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "secao";

  let id = base;
  let counter = 2;
  while (usedIds.has(id)) {
    id = `${base}-${counter}`;
    counter += 1;
  }
  usedIds.add(id);
  return id;
}

/** Extract ## and ### headings from Markdown for table of contents. */
export function extractTocHeadings(source: string): TocHeading[] {
  const headings: TocHeading[] = [];
  const usedIds = new Set<string>();

  for (const line of source.split("\n")) {
    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (!match) continue;
    const level = match[1].length as 2 | 3;
    const title = match[2].replace(/\s+#+\s*$/, "").trim();
    if (!title) continue;
    headings.push({
      level,
      title,
      id: headingToAnchorId(title, usedIds),
    });
  }

  return headings;
}

/** Extract `##` headings only (for review-comment section anchors). */
export function extractSectionHeadings(source: string): Array<{ title: string; id: string }> {
  return extractTocHeadings(source)
    .filter((heading) => heading.level === 2)
    .map(({ title, id }) => ({ title, id }));
}

/** Build a map from heading title to anchor id for rendering. */
export function buildHeadingIdMap(source: string): Map<string, string> {
  const map = new Map<string, string>();
  const usedIds = new Set<string>();

  for (const line of source.split("\n")) {
    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (!match) continue;
    const title = match[2].replace(/\s+#+\s*$/, "").trim();
    if (!title || map.has(title)) continue;
    map.set(title, headingToAnchorId(title, usedIds));
  }

  return map;
}
