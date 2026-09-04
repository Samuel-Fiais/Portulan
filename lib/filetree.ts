export type FileTreeNode = {
  name: string;
  path: string;
  kind: "dir" | "file";
  children: FileTreeNode[];
};

const TREE_GLYPHS = /[│├└─┌┐┘┬┴┼]/g;

function leadingSpaces(value: string) {
  const match = value.match(/^[ \t]*/);
  if (!match) return 0;
  return match[0].replaceAll("\t", "    ").length;
}

function parseLine(line: string) {
  const stripped = line.replace(TREE_GLYPHS, " ");
  const indent = leadingSpaces(stripped);
  const rawName = stripped.trim();
  if (!rawName) return null;
  const isDir = /[/\\]$/.test(rawName);
  return {
    indent,
    name: rawName.replace(/[/\\]+$/, "") || rawName,
    kind: isDir ? "dir" as const : "file" as const,
  };
}

export function parseFileTree(source: string): FileTreeNode[] {
  const parsed = source
    .split("\n")
    .map((line) => parseLine(line))
    .filter((line): line is NonNullable<typeof line> => Boolean(line));

  const roots: FileTreeNode[] = [];
  const stack: Array<{ indent: number; node: FileTreeNode }> = [];

  for (const line of parsed) {
    while (stack.length && stack[stack.length - 1]!.indent >= line.indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1];
    const path = parent ? `${parent.node.path}/${line.name}` : line.name;
    const node: FileTreeNode = {
      name: line.name,
      path,
      kind: line.kind,
      children: [],
    };

    if (parent) {
      parent.node.kind = "dir";
      parent.node.children.push(node);
    } else {
      roots.push(node);
    }

    stack.push({ indent: line.indent, node });
  }

  return roots;
}

export function fileTreeHasFolders(nodes: FileTreeNode[]): boolean {
  return nodes.some((node) => node.kind === "dir" && node.children.length > 0);
}
