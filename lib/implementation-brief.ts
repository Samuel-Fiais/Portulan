import { untrustedContentNote } from "./context-pack-policy.ts";

export type BriefItem = { id: string; type: string; body: string; strength?: string };
export type BriefCriterion = { id: string; description: string };
export type BriefSource = {
  documentId: string;
  releaseId: string | null;
  required: boolean;
  reason: string;
};

export type BriefTaskSource = BriefSource & {
  id: string;
  sourceRole: string;
};

export function buildImplementationBrief(input: {
  pack: {
    id: string;
    title: string;
    objective: string;
    expectedOutcome: string;
    scope: string;
    outOfScope: string;
  };
  revisionId: string | null;
  items: readonly BriefItem[];
  criteria: readonly BriefCriterion[];
  task?: { id: string; objective: string; pathScopes: string[] } | null;
  mode: "brief" | "full";
  sources?: readonly BriefSource[];
  taskSources?: readonly BriefTaskSource[];
  repository?: { id: string; name: string } | null;
  taskFull?: unknown;
}) {
  const requiredItems = input.items
    .filter((item) => item.strength === "required")
    .map((item) => ({ id: item.id, type: item.type, body: item.body }));
  const brief = {
    packId: input.pack.id,
    revisionId: input.revisionId,
    title: input.pack.title,
    objective: input.pack.objective,
    expectedOutcome: input.pack.expectedOutcome,
    scope: input.pack.scope,
    outOfScope: input.pack.outOfScope,
    requiredItems,
    criteria: input.criteria.map((criterion) => ({
      id: criterion.id,
      description: criterion.description,
    })),
    task: input.task
      ? { id: input.task.id, objective: input.task.objective, pathScopes: input.task.pathScopes }
      : null,
    untrustedContent: untrustedContentNote(),
  };
  if (input.mode === "brief") return brief;
  return {
    ...brief,
    items: input.items,
    sources: input.sources ?? [],
    taskSources: input.taskSources ?? [],
    repository: input.repository ?? null,
    taskFull: input.taskFull ?? input.task ?? null,
  };
}
