import { readFileSync } from "node:fs";
import { join } from "node:path";
import embeddedSkill from "../portulan-skill.md";

const SKILL_FILES = ["portulan-skill.md"] as const;

export function getPortulanSkillMarkdown(): string {
  const embedded = embeddedSkill.trim();
  if (embedded) return embeddedSkill;

  for (const relativePath of SKILL_FILES) {
    try {
      return readFileSync(join(process.cwd(), relativePath), "utf8");
    } catch {
      // try next path
    }
  }
  return "";
}
