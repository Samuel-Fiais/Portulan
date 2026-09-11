export function splitMarkdownSections(source: string) {
  const sections: Array<{ title?: string; body: string }> = [];
  let title: string | undefined;
  let body: string[] = [];

  const flush = () => {
    if (title || body.some((line) => line.trim())) sections.push({ title, body: body.join("\n").trim() });
    body = [];
  };

  for (const line of source.split("\n")) {
    const match = line.match(/^##\s+(.+)$/);
    if (match) {
      flush();
      title = match[1];
    } else {
      body.push(line);
    }
  }
  flush();
  return sections;
}
