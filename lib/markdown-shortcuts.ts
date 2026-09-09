export type MarkdownFormat = "bold" | "italic" | "link";

export function applyMarkdownFormat(
  content: string,
  start: number,
  end: number,
  format: MarkdownFormat,
): { content: string; selectionStart: number; selectionEnd: number } {
  const selected = content.slice(start, end);

  if (format === "bold") {
    const before = content.slice(Math.max(0, start - 2), start);
    const after = content.slice(end, end + 2);
    if (before === "**" && after === "**") {
      const next = `${content.slice(0, start - 2)}${selected}${content.slice(end + 2)}`;
      return { content: next, selectionStart: start - 2, selectionEnd: end - 2 };
    }
    const snippet = `**${selected}**`;
    const next = `${content.slice(0, start)}${snippet}${content.slice(end)}`;
    return { content: next, selectionStart: start + 2, selectionEnd: end + 2 };
  }

  if (format === "italic") {
    const before = content.slice(Math.max(0, start - 1), start);
    const after = content.slice(end, end + 1);
    if (before === "*" && after === "*" && content.slice(Math.max(0, start - 2), start) !== "**") {
      const next = `${content.slice(0, start - 1)}${selected}${content.slice(end + 1)}`;
      return { content: next, selectionStart: start - 1, selectionEnd: end - 1 };
    }
    const snippet = `*${selected}*`;
    const next = `${content.slice(0, start)}${snippet}${content.slice(end)}`;
    return { content: next, selectionStart: start + 1, selectionEnd: end + 1 };
  }

  const linkText = selected || "text";
  const snippet = `[${linkText}](url)`;
  const next = `${content.slice(0, start)}${snippet}${content.slice(end)}`;
  if (selected) {
    const urlStart = start + linkText.length + 3;
    return { content: next, selectionStart: urlStart, selectionEnd: urlStart + 3 };
  }
  return { content: next, selectionStart: start + 1, selectionEnd: start + 1 + linkText.length };
}

export function isMarkdownShortcut(event: Pick<KeyboardEvent, "metaKey" | "ctrlKey" | "shiftKey" | "key" | "altKey">) {
  if (event.altKey) return null;
  const mod = event.metaKey || event.ctrlKey;
  if (!mod) return null;

  const key = event.key.toLowerCase();
  if (!event.shiftKey && key === "b") return "bold" as const;
  if (!event.shiftKey && key === "i") return "italic" as const;
  if (!event.shiftKey && key === "k") return "link" as const;
  if (event.shiftKey && key === "c") return "component-picker" as const;
  return null;
}
