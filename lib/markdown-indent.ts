export const MARKDOWN_INDENT = "  ";

export function applyMarkdownIndent(
  content: string,
  selectionStart: number,
  selectionEnd: number,
  outdent: boolean,
): { content: string; selectionStart: number; selectionEnd: number } {
  const blockStart = content.lastIndexOf("\n", selectionStart - 1) + 1;
  const endAnchor = selectionEnd > selectionStart ? selectionEnd - 1 : selectionStart;
  const nextNewline = content.indexOf("\n", endAnchor);
  const lineEnd = nextNewline === -1 ? content.length : nextNewline;

  const before = content.slice(0, blockStart);
  const block = content.slice(blockStart, lineEnd);
  const after = content.slice(lineEnd);

  const lines = block.split("\n");
  let startDelta = 0;
  let endDelta = 0;
  let cursorOffset = selectionStart - blockStart;

  const nextLines = lines.map((line, index) => {
    if (outdent) {
      const { line: nextLine, removed } = outdentLine(line);
      if (index === 0) {
        startDelta = -Math.min(removed, Math.max(0, cursorOffset));
      }
      endDelta -= removed;
      return nextLine;
    }

    const nextLine = `${MARKDOWN_INDENT}${line}`;
    if (index === 0) startDelta = MARKDOWN_INDENT.length;
    endDelta += MARKDOWN_INDENT.length;
    return nextLine;
  });

  const nextBlock = nextLines.join("\n");
  const nextContent = `${before}${nextBlock}${after}`;

  return {
    content: nextContent,
    selectionStart: Math.max(blockStart, selectionStart + startDelta),
    selectionEnd: Math.max(blockStart, selectionEnd + endDelta),
  };
}

function outdentLine(line: string): { line: string; removed: number } {
  if (line.startsWith(MARKDOWN_INDENT)) {
    return { line: line.slice(MARKDOWN_INDENT.length), removed: MARKDOWN_INDENT.length };
  }
  if (line.startsWith("\t")) {
    return { line: line.slice(1), removed: 1 };
  }
  if (line.startsWith(" ")) {
    return { line: line.slice(1), removed: 1 };
  }
  return { line, removed: 0 };
}
