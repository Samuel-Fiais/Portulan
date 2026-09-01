import { readFileSync } from "node:fs";
import { join } from "node:path";

const SKILL_FILES = [
  "festpay-docs-mcp-skill.md",
  join(".cursor", "skills", "festpay-docs-mcp", "SKILL.md"),
] as const;

export function getFestpayDocsSkillMarkdown(): string {
  for (const relativePath of SKILL_FILES) {
    try {
      return readFileSync(join(process.cwd(), relativePath), "utf8");
    } catch {
      // try next path
    }
  }
  return "";
}
