import { readFileSync } from "node:fs";
import { join } from "node:path";

const SKILL_FILES = [
  join(".cursor", "skills", "portulan-mcp", "SKILL.md"),
  "portulan-skill.md",
] as const;

export function getPortulanSkillMarkdown(): string {
  for (const relativePath of SKILL_FILES) {
    try {
      return readFileSync(join(process.cwd(), relativePath), "utf8");
    } catch {
      // try next path
    }
  }
  return "";
}
