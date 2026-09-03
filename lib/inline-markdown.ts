export function isPlaceholderToken(value?: string) {
  if (!value?.trim()) return true;
  return /^[-–—−•·.…]+$/u.test(value.trim());
}

export function prepareInlineMarkdown(source: string) {
  if (isPlaceholderToken(source)) return "";
  return source
    .split("\n")
    .map((line) => {
      if (/^(\s*)-(?= )/.test(line)) return line.replace(/^(\s*)-(?= )/, "$1\\-");
      return line;
    })
    .join("\n");
}
